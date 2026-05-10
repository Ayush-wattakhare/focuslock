// Data Export API Route
// GET /api/export - Generate JSON export of all user data

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Export metadata interface
interface ExportMetadata {
  export_date: string;
  user_id: string;
  user_email: string;
  full_name: string | null;
  timezone: string;
}

// Complete export response interface
interface DataExportResponse {
  metadata: ExportMetadata;
  lock_rules: Record<string, unknown>[];
  override_logs: Record<string, unknown>[];
  usage_sessions: Record<string, unknown>[];
  streaks: Record<string, unknown> | null;
  badges: Record<string, unknown>[];
  buddies: Record<string, unknown>[];
  pomodoro_sessions: Record<string, unknown>[];
  weekly_challenges: Record<string, unknown>[];
}

// GET /api/export - Generate JSON export of all user data
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

    // Fetch user profile for metadata
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, timezone')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch user profile', 
            details: profileError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Fetch all lock rules
    const { data: lockRules, error: lockRulesError } = await supabase
      .from('lock_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (lockRulesError) {
      console.error('Error fetching lock rules:', lockRulesError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch lock rules', 
            details: lockRulesError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Fetch all override logs
    const { data: overrideLogs, error: overrideLogsError } = await supabase
      .from('override_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('overridden_at', { ascending: false });

    if (overrideLogsError) {
      console.error('Error fetching override logs:', overrideLogsError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch override logs', 
            details: overrideLogsError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Fetch all usage sessions
    const { data: usageSessions, error: usageSessionsError } = await supabase
      .from('usage_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('session_start', { ascending: false });

    if (usageSessionsError) {
      console.error('Error fetching usage sessions:', usageSessionsError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch usage sessions', 
            details: usageSessionsError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Fetch streak data
    const { data: streaks, error: streaksError } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Note: streaks might not exist for new users, so we handle null gracefully
    if (streaksError && streaksError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching streaks:', streaksError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch streaks', 
            details: streaksError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Fetch user badges with badge definitions
    const { data: badges, error: badgesError } = await supabase
      .from('user_badges')
      .select(`
        id,
        badge_id,
        earned_at,
        badge_definitions (
          id,
          name,
          description,
          icon,
          condition
        )
      `)
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false });

    if (badgesError) {
      console.error('Error fetching badges:', badgesError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch badges', 
            details: badgesError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Fetch buddy relationships (both as user and as buddy)
    const { data: buddiesAsUser, error: buddiesAsUserError } = await supabase
      .from('buddies')
      .select('*')
      .eq('user_id', user.id);

    if (buddiesAsUserError) {
      console.error('Error fetching buddies (as user):', buddiesAsUserError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch buddy relationships', 
            details: buddiesAsUserError.message 
          } 
        },
        { status: 500 }
      );
    }

    const { data: buddiesAsBuddy, error: buddiesAsBuddyError } = await supabase
      .from('buddies')
      .select('*')
      .eq('buddy_user_id', user.id);

    if (buddiesAsBuddyError) {
      console.error('Error fetching buddies (as buddy):', buddiesAsBuddyError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch buddy relationships', 
            details: buddiesAsBuddyError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Combine buddy relationships
    const allBuddies = [
      ...(buddiesAsUser || []).map(b => ({ ...b, relationship_type: 'user' })),
      ...(buddiesAsBuddy || []).map(b => ({ ...b, relationship_type: 'buddy' }))
    ];

    // Fetch pomodoro sessions
    const { data: pomodoroSessions, error: pomodoroSessionsError } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });

    if (pomodoroSessionsError) {
      console.error('Error fetching pomodoro sessions:', pomodoroSessionsError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch pomodoro sessions', 
            details: pomodoroSessionsError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Fetch weekly challenges
    const { data: weeklyChallenges, error: weeklyChallengesError } = await supabase
      .from('weekly_challenges')
      .select('*')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false });

    if (weeklyChallengesError) {
      console.error('Error fetching weekly challenges:', weeklyChallengesError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch weekly challenges', 
            details: weeklyChallengesError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Build export metadata
    const metadata: ExportMetadata = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email || '',
      full_name: profile?.full_name || null,
      timezone: profile?.timezone || 'Asia/Kolkata',
    };

    // Construct complete export response
    const exportData: DataExportResponse = {
      metadata,
      lock_rules: lockRules || [],
      override_logs: overrideLogs || [],
      usage_sessions: usageSessions || [],
      streaks: streaks || null,
      badges: badges || [],
      buddies: allBuddies,
      pomodoro_sessions: pomodoroSessions || [],
      weekly_challenges: weeklyChallenges || [],
    };

    // Return JSON export with appropriate headers for download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="focuslock-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/export:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
