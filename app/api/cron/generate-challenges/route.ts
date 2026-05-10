// Weekly Challenge Generation Cron Job
// POST /api/cron/generate-challenges
// Schedule: 0 6 * * 1 (Monday 6 AM UTC)
// 
// This cron job runs every Monday at 6 AM UTC to:
// 1. Identify each user's worst-performing app from the previous week
// 2. Create a new weekly challenge with a 5-day goal
// 3. Send notification to users about their new challenge
// 
// Validates: Requirements 11.1-11.7

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Response interface
interface GenerateChallengesResponse {
  challenges_created: number;
  users_processed: number;
}

/**
 * POST /api/cron/generate-challenges
 * 
 * Cron endpoint to generate weekly challenges for all users
 * Secured with CRON_SECRET authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate with CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Invalid authorization' 
          } 
        },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Calculate week range (Monday to Friday)
    const now = new Date();
    const weekStart = getNextMonday(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 4); // Friday (5 days total)

    // Calculate previous week range for analysis
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 1); // Sunday
    const prevWeekStart = new Date(prevWeekEnd);
    prevWeekStart.setDate(prevWeekStart.getDate() - 6); // Previous Monday

    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id');

    if (usersError || !users) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch users', 
            details: usersError?.message 
          } 
        },
        { status: 500 }
      );
    }

    let challengesCreated = 0;
    let usersProcessed = 0;

    // Process each user
    for (const user of users) {
      try {
        // Requirement 11.2: Identify worst app from previous week based on override count
        const { data: overrideLogs, error: overrideError } = await supabase
          .from('override_logs')
          .select('app_name')
          .eq('user_id', user.id)
          .gte('overridden_at', prevWeekStart.toISOString())
          .lte('overridden_at', prevWeekEnd.toISOString());

        if (overrideError) {
          console.error(`Error fetching overrides for user ${user.id}:`, overrideError);
          usersProcessed++;
          continue;
        }

        // Skip users with no overrides
        if (!overrideLogs || overrideLogs.length === 0) {
          usersProcessed++;
          continue;
        }

        // Count overrides per app
        const appOverrideCounts: Record<string, number> = {};
        overrideLogs.forEach(log => {
          appOverrideCounts[log.app_name] = (appOverrideCounts[log.app_name] || 0) + 1;
        });

        // Find worst app (most overrides)
        const worstApp = Object.entries(appOverrideCounts)
          .sort((a, b) => b[1] - a[1])[0];

        if (!worstApp) {
          usersProcessed++;
          continue;
        }

        const [appName, overrideCount] = worstApp;

        // Requirement 11.3: Calculate daily limit based on previous week's usage
        // Fetch previous week's usage for this app
        const { data: prevWeekUsage, error: usageError } = await supabase
          .from('usage_sessions')
          .select('minutes_used')
          .eq('user_id', user.id)
          .eq('app_name', appName)
          .gte('date', prevWeekStart.toISOString().split('T')[0])
          .lte('date', prevWeekEnd.toISOString().split('T')[0]);

        if (usageError) {
          console.error(`Error fetching usage for user ${user.id}:`, usageError);
          usersProcessed++;
          continue;
        }

        // Calculate average daily usage
        const totalMinutes = prevWeekUsage?.reduce((sum, session) => sum + (session.minutes_used || 0), 0) || 0;
        const avgDailyMinutes = Math.ceil(totalMinutes / 7);

        // Set goal: 30% reduction from average (minimum 1 minute)
        const dailyLimit = Math.max(1, Math.ceil(avgDailyMinutes * 0.7));

        // Create the challenge
        const { error: insertError } = await supabase
          .from('weekly_challenges')
          .insert({
            user_id: user.id,
            app_name: appName,
            daily_limit: dailyLimit,
            week_start: weekStart.toISOString().split('T')[0],
            week_end: weekEnd.toISOString().split('T')[0],
            days_completed: 0,
            status: 'active'
          });

        if (insertError) {
          console.error(`Error creating challenge for user ${user.id}:`, insertError);
        } else {
          challengesCreated++;

          // Requirement 11.1: Send notification when new challenge is generated
          await supabase
            .from('buddy_notifications')
            .insert({
              from_user_id: user.id,
              to_user_id: user.id,
              event_type: 'weekly_summary',
              app_name: appName,
              message: `New weekly challenge: Limit ${appName} to ${dailyLimit} minutes/day for 5 days`,
              is_read: false
            });
        }

        usersProcessed++;
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        usersProcessed++;
        continue;
      }
    }

    const response: GenerateChallengesResponse = {
      challenges_created: challengesCreated,
      users_processed: usersProcessed
    };

    // Log summary
    console.log(`Challenge generation completed: ${challengesCreated} challenges created for ${usersProcessed} users`);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in POST /api/cron/generate-challenges:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'An unexpected error occurred',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get the next Monday from a given date
 * If today is Monday, returns today
 */
function getNextMonday(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  
  const dayOfWeek = result.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  
  result.setDate(result.getDate() + daysUntilMonday);
  return result;
}
