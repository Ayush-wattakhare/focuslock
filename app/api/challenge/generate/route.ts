// Weekly Challenge Generation API Route (Cron Endpoint)
// POST /api/challenge/generate - Generate new weekly challenges for all users
// Runs every Monday at 6:00 AM UTC via Vercel Cron

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Response interface
interface GenerateChallengeResponse {
  challenges_created: number;
  users_processed: number;
}

// POST /api/challenge/generate - Cron endpoint to generate weekly challenges
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid authorization' } },
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
        // Requirement 11.1: Identify worst app from previous week's usage data
        const { data: worstApp, error: worstAppError } = await supabase
          .rpc('get_worst_performing_app', {
            p_user_id: user.id,
            p_start_date: prevWeekStart.toISOString().split('T')[0],
            p_end_date: prevWeekEnd.toISOString().split('T')[0]
          });

        if (worstAppError || !worstApp || worstApp.length === 0) {
          // Skip users with no override data
          usersProcessed++;
          continue;
        }

        const targetApp = worstApp[0];

        // Requirement 11.2: Generate weekly challenge with 5-day goal (reduce usage by 30%)
        // Calculate daily limit based on previous week's average usage
        const { data: prevWeekUsage, error: usageError } = await supabase
          .from('usage_sessions')
          .select('minutes_used')
          .eq('user_id', user.id)
          .eq('app_name', targetApp.app_name)
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

        // Set goal: 30% reduction from average
        const dailyLimit = Math.max(1, Math.ceil(avgDailyMinutes * 0.7));

        // Create the challenge
        const { error: insertError } = await supabase
          .from('weekly_challenges')
          .insert({
            user_id: user.id,
            app_name: targetApp.app_name,
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

          // Requirement 11.6: Send notification when new challenge is generated
          // Create a buddy notification for the user (self-notification)
          await supabase
            .from('buddy_notifications')
            .insert({
              from_user_id: user.id,
              to_user_id: user.id,
              event_type: 'weekly_summary',
              app_name: targetApp.app_name,
              message: `New weekly challenge: Limit ${targetApp.app_name} to ${dailyLimit} minutes/day for 5 days`,
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

    const response: GenerateChallengeResponse = {
      challenges_created: challengesCreated,
      users_processed: usersProcessed
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in POST /api/challenge/generate:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
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
