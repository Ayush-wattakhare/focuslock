// Family Mode API - Child Statistics
// GET /api/family/child-stats - Get compliance statistics for a specific child

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Response interfaces
interface LockRuleInfo {
  id: string;
  app_name: string;
  lock_type: string;
  is_active: boolean;
  created_at: string;
}

interface OverrideInfo {
  id: string;
  app_name: string;
  mood: string | null;
  overridden_at: string;
}

interface ComplianceStats {
  current_streak: number;
  longest_streak: number;
  total_overrides_this_week: number;
  total_overrides_all_time: number;
  compliance_percentage: number;
}

interface ChildStatsResponse {
  child_info: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  lock_rules: LockRuleInfo[];
  recent_overrides: OverrideInfo[];
  compliance: ComplianceStats;
}

// Helper function to get week range
function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    start: monday.toISOString(),
    end: sunday.toISOString(),
  };
}

// GET /api/family/child-stats - Get child compliance statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get child_user_id from query params
    const { searchParams } = new URL(request.url);
    const childUserId = searchParams.get('child_user_id');

    if (!childUserId) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Missing required query parameter: child_user_id' 
          } 
        },
        { status: 400 }
      );
    }

    // Verify that this child is linked to the authenticated parent
    const { data: childProfile, error: linkError } = await supabase
      .from('child_profiles')
      .select('id, child_user_id')
      .eq('parent_user_id', user.id)
      .eq('child_user_id', childUserId)
      .maybeSingle();

    if (linkError) {
      console.error('Error verifying child link:', linkError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to verify child account', 
            details: linkError.message 
          } 
        },
        { status: 500 }
      );
    }

    if (!childProfile) {
      return NextResponse.json(
        { 
          error: { 
            code: 'FORBIDDEN', 
            message: 'This child account is not linked to your account' 
          } 
        },
        { status: 403 }
      );
    }

    // Fetch child's profile information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', childUserId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching child profile:', profileError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch child profile', 
            details: profileError?.message 
          } 
        },
        { status: 500 }
      );
    }

    // Fetch child's lock rules (respecting privacy - no detailed content)
    const { data: lockRules, error: rulesError } = await supabase
      .from('lock_rules')
      .select('id, app_name, lock_type, is_active, created_at')
      .eq('user_id', childUserId)
      .order('created_at', { ascending: false });

    if (rulesError) {
      console.error('Error fetching lock rules:', rulesError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch lock rules', 
            details: rulesError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Fetch child's streak information
    const { data: streak, error: streakError } = await supabase
      .from('streaks')
      .select('current_streak, longest_streak')
      .eq('user_id', childUserId)
      .maybeSingle();

    if (streakError) {
      console.error('Error fetching streak:', streakError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch streak data', 
            details: streakError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Fetch recent overrides (last 10, respecting privacy - no reason_text)
    const { data: recentOverrides, error: overridesError } = await supabase
      .from('override_logs')
      .select('id, app_name, mood, overridden_at')
      .eq('user_id', childUserId)
      .order('overridden_at', { ascending: false })
      .limit(10);

    if (overridesError) {
      console.error('Error fetching overrides:', overridesError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch override logs', 
            details: overridesError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Fetch this week's overrides for compliance calculation
    const weekRange = getCurrentWeekRange();
    const { data: weekOverrides, error: weekOverridesError } = await supabase
      .from('override_logs')
      .select('id, overridden_at')
      .eq('user_id', childUserId)
      .gte('overridden_at', weekRange.start)
      .lte('overridden_at', weekRange.end);

    if (weekOverridesError) {
      console.error('Error fetching week overrides:', weekOverridesError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch weekly overrides', 
            details: weekOverridesError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Fetch total overrides count
    const { count: totalOverrides, error: countError } = await supabase
      .from('override_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', childUserId);

    if (countError) {
      console.error('Error counting overrides:', countError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to count overrides', 
            details: countError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Calculate compliance percentage
    // Compliance = days without override / total days this week
    const datesWithOverrides = new Set(
      (weekOverrides || []).map(log => log.overridden_at.split('T')[0])
    );
    
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Convert Sunday from 0 to 7
    const daysInWeekSoFar = dayOfWeek; // Monday = 1, Tuesday = 2, etc.
    const daysWithoutOverride = daysInWeekSoFar - datesWithOverrides.size;
    const compliancePercentage = daysInWeekSoFar > 0
      ? (daysWithoutOverride / daysInWeekSoFar) * 100
      : 100;

    // Build response
    const response: ChildStatsResponse = {
      child_info: {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      },
      lock_rules: (lockRules || []).map(rule => ({
        id: rule.id,
        app_name: rule.app_name,
        lock_type: rule.lock_type,
        is_active: rule.is_active,
        created_at: rule.created_at,
      })),
      recent_overrides: (recentOverrides || []).map(override => ({
        id: override.id,
        app_name: override.app_name,
        mood: override.mood,
        overridden_at: override.overridden_at,
      })),
      compliance: {
        current_streak: streak?.current_streak || 0,
        longest_streak: streak?.longest_streak || 0,
        total_overrides_this_week: (weekOverrides || []).length,
        total_overrides_all_time: totalOverrides || 0,
        compliance_percentage: Math.round(compliancePercentage * 10) / 10,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/family/child-stats:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
