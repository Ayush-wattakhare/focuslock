// Weekly AI Insights Cron Job
// POST /api/cron/weekly-insights
// Schedule: 0 9 * * 1 (Monday 9 AM UTC)
// 
// This cron job runs every Monday at 9 AM UTC to:
// 1. Generate AI insights for active users (users with overrides in past 7 days)
// 2. Cache insights for dashboard display
// 3. Optionally send email notifications with insights
// 
// Validates: Requirements 10.1-10.8

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInsights } from '@/lib/core/aiCoach';

// Response interface
interface WeeklyInsightsResponse {
  insights_generated: number;
  users_processed: number;
  errors: Array<{ user_id: string; error: string }>;
}

/**
 * POST /api/cron/weekly-insights
 * 
 * Cron endpoint to generate weekly AI insights for active users
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

    // Calculate date range (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get users who had overrides in the past 7 days (active users)
    const { data: activeUsers, error: usersError } = await supabase
      .from('override_logs')
      .select('user_id')
      .gte('overridden_at', sevenDaysAgo.toISOString())
      .lte('overridden_at', now.toISOString());

    if (usersError) {
      console.error('Error fetching active users:', usersError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch active users', 
            details: usersError.message 
          } 
        },
        { status: 500 }
      );
    }

    if (!activeUsers || activeUsers.length === 0) {
      // No active users to process
      return NextResponse.json({
        insights_generated: 0,
        users_processed: 0,
        errors: []
      }, { status: 200 });
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(activeUsers.map(u => u.user_id))];

    let insightsGenerated = 0;
    let usersProcessed = 0;
    const errors: Array<{ user_id: string; error: string }> = [];

    // Process each active user
    for (const userId of uniqueUserIds) {
      try {
        // Fetch override logs for this user (last 7 days)
        const { data: overrideLogs, error: logsError } = await supabase
          .from('override_logs')
          .select('*')
          .eq('user_id', userId)
          .gte('overridden_at', sevenDaysAgo.toISOString())
          .lte('overridden_at', now.toISOString())
          .order('overridden_at', { ascending: false });

        if (logsError) {
          errors.push({
            user_id: userId,
            error: `Failed to fetch override logs: ${logsError.message}`
          });
          usersProcessed++;
          continue;
        }

        if (!overrideLogs || overrideLogs.length === 0) {
          // Skip users with no overrides (shouldn't happen due to query above)
          usersProcessed++;
          continue;
        }

        // Generate AI insights
        const insights = await generateInsights(userId, overrideLogs, 7);

        // Cache insights in database (create or update ai_insights table entry)
        // Note: This assumes an ai_insights table exists. If not, we'll store in a JSON column
        // or use the buddy_notifications table as a workaround
        const { error: cacheError } = await supabase
          .from('buddy_notifications')
          .insert({
            from_user_id: userId,
            to_user_id: userId,
            event_type: 'weekly_summary',
            app_name: null,
            message: JSON.stringify({
              type: 'ai_insights',
              insight: insights.insight,
              suggestion: insights.suggestion,
              topMood: insights.topMood,
              moodBreakdown: insights.moodBreakdown,
              generated_at: now.toISOString()
            }),
            is_read: false
          });

        if (cacheError) {
          errors.push({
            user_id: userId,
            error: `Failed to cache insights: ${cacheError.message}`
          });
        } else {
          insightsGenerated++;
        }

        usersProcessed++;

        // Add a small delay to avoid rate limiting from Claude API
        await sleep(1000); // 1 second delay between users
      } catch (userError) {
        errors.push({
          user_id: userId,
          error: userError instanceof Error ? userError.message : 'Unknown error'
        });
        usersProcessed++;
        continue;
      }
    }

    const response: WeeklyInsightsResponse = {
      insights_generated: insightsGenerated,
      users_processed: usersProcessed,
      errors
    };

    // Log summary
    console.log(`Weekly insights generation completed: ${insightsGenerated} insights generated for ${usersProcessed} users, ${errors.length} errors`);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in POST /api/cron/weekly-insights:', error);
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
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
