// Share Card API Route
// GET /api/share-card - Generate shareable stats card data

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Response interface
interface ShareCardResponse {
  timeSaved: number; // minutes
  compliancePercentage: number;
  currentStreak: number;
  watermark: string;
}

// Helper function to get current week date range
function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days since last Monday
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

// Helper function to get all dates in a range
function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  
  return dates;
}

// GET /api/share-card - Generate shareable stats card data
export async function GET() {
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

    // Get current week date range
    const currentWeek = getCurrentWeekRange();
    const allDates = getDatesInRange(currentWeek.start, currentWeek.end);

    // 1. Fetch current week usage sessions for time saved calculation
    const { data: currentWeekSessions, error: sessionsError } = await supabase
      .from('usage_sessions')
      .select('minutes_used, date')
      .eq('user_id', user.id)
      .gte('date', currentWeek.start)
      .lte('date', currentWeek.end)
      .not('minutes_used', 'is', null);

    if (sessionsError) {
      console.error('Error fetching usage sessions:', sessionsError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch usage sessions', 
            details: sessionsError.message 
          } 
        },
        { status: 500 }
      );
    }

    // 2. Fetch override logs for compliance calculation
    const { data: overrideLogs, error: overrideError } = await supabase
      .from('override_logs')
      .select('overridden_at')
      .eq('user_id', user.id)
      .gte('overridden_at', `${currentWeek.start}T00:00:00`)
      .lte('overridden_at', `${currentWeek.end}T23:59:59`);

    if (overrideError) {
      console.error('Error fetching override logs:', overrideError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch override logs', 
            details: overrideError.message 
          } 
        },
        { status: 500 }
      );
    }

    // 3. Fetch current streak
    const { data: streak, error: streakError } = await supabase
      .from('streaks')
      .select('current_streak')
      .eq('user_id', user.id)
      .single();

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

    // Calculate compliance percentage
    const datesWithOverrides = new Set(
      (overrideLogs || []).map(log => log.overridden_at.split('T')[0])
    );
    
    const daysWithoutOverride = allDates.filter(date => !datesWithOverrides.has(date)).length;
    const totalDays = allDates.length;
    const compliancePercentage = totalDays > 0
      ? Math.round((daysWithoutOverride / totalDays) * 100 * 10) / 10 // Round to 1 decimal
      : 0;

    // Calculate time saved
    // Time saved = (days without override) * average daily usage
    const currentWeekMinutes = (currentWeekSessions || [])
      .reduce((sum, s) => sum + (s.minutes_used || 0), 0);
    const avgDailyUsage = totalDays > 0 ? currentWeekMinutes / totalDays : 0;
    const timeSaved = Math.round(daysWithoutOverride * avgDailyUsage);

    // Return share card data
    const response: ShareCardResponse = {
      timeSaved,
      compliancePercentage,
      currentStreak: streak?.current_streak ?? 0,
      watermark: 'focuslock.app',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/share-card:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
