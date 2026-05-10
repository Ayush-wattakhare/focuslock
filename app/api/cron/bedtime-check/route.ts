// Bedtime Mode Check Cron Job
// POST /api/cron/bedtime-check
// Schedule: */15 * * * * (every 15 minutes)
// 
// This cron job runs every 15 minutes to:
// 1. Check users with bedtime mode enabled
// 2. Activate locks at configured bedtime
// 3. Deactivate locks at configured wake time
// 4. Track bedtime compliance for badge awards
// 
// Validates: Requirements 12.1-12.7

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Response interface
interface BedtimeCheckResponse {
  users_checked: number;
  locks_activated: number;
  locks_deactivated: number;
}

/**
 * POST /api/cron/bedtime-check
 * 
 * Cron endpoint to check and activate/deactivate bedtime mode locks
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
    const now = new Date();

    // Get all users with bedtime mode enabled
    const { data: bedtimeSettings, error: settingsError } = await supabase
      .from('bedtime_settings')
      .select('*')
      .eq('is_enabled', true);

    if (settingsError) {
      console.error('Error fetching bedtime settings:', settingsError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch bedtime settings', 
            details: settingsError.message 
          } 
        },
        { status: 500 }
      );
    }

    if (!bedtimeSettings || bedtimeSettings.length === 0) {
      // No users with bedtime mode enabled
      return NextResponse.json({
        users_checked: 0,
        locks_activated: 0,
        locks_deactivated: 0
      }, { status: 200 });
    }

    let usersChecked = 0;
    let locksActivated = 0;
    let locksDeactivated = 0;

    // Process each user
    for (const settings of bedtimeSettings) {
      try {
        // Determine if it's a weekday or weekend
        const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Get appropriate bedtime and wake time
        const bedtime = isWeekend ? settings.weekend_bedtime : settings.weekday_bedtime;
        const waketime = isWeekend ? settings.weekend_waketime : settings.weekday_waketime;

        // Parse times (format: HH:MM:SS)
        const [bedHour, bedMin] = bedtime.split(':').map(Number);
        const [wakeHour, wakeMin] = waketime.split(':').map(Number);

        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMin;
        const bedtimeMinutes = bedHour * 60 + bedMin;
        const waketimeMinutes = wakeHour * 60 + wakeMin;

        // Determine if we should activate or deactivate locks
        let shouldActivate = false;
        let shouldDeactivate = false;

        if (bedtimeMinutes < waketimeMinutes) {
          // Normal case: bedtime and wake time are on the same day
          shouldActivate = currentTimeMinutes >= bedtimeMinutes && currentTimeMinutes < waketimeMinutes;
          shouldDeactivate = currentTimeMinutes >= waketimeMinutes || currentTimeMinutes < bedtimeMinutes;
        } else {
          // Bedtime spans midnight (e.g., 23:00 to 07:00)
          shouldActivate = currentTimeMinutes >= bedtimeMinutes || currentTimeMinutes < waketimeMinutes;
          shouldDeactivate = currentTimeMinutes >= waketimeMinutes && currentTimeMinutes < bedtimeMinutes;
        }

        // Get all entertainment app lock rules for this user
        const { data: lockRules, error: rulesError } = await supabase
          .from('lock_rules')
          .select('id, is_active')
          .eq('user_id', settings.user_id)
          .in('lock_type', ['timer', 'schedule']); // Only affect timer and schedule locks

        if (rulesError) {
          console.error(`Error fetching lock rules for user ${settings.user_id}:`, rulesError);
          usersChecked++;
          continue;
        }

        if (!lockRules || lockRules.length === 0) {
          usersChecked++;
          continue;
        }

        // Activate or deactivate locks based on bedtime schedule
        if (shouldActivate) {
          // Deactivate all entertainment app locks during bedtime
          const inactiveLocks = lockRules.filter(rule => rule.is_active);
          
          if (inactiveLocks.length > 0) {
            const { error: updateError } = await supabase
              .from('lock_rules')
              .update({ is_active: false })
              .in('id', inactiveLocks.map(r => r.id));

            if (updateError) {
              console.error(`Error deactivating locks for user ${settings.user_id}:`, updateError);
            } else {
              locksActivated += inactiveLocks.length;
            }
          }
        } else if (shouldDeactivate) {
          // Reactivate locks after wake time
          const activeLocks = lockRules.filter(rule => !rule.is_active);
          
          if (activeLocks.length > 0) {
            const { error: updateError } = await supabase
              .from('lock_rules')
              .update({ is_active: true })
              .in('id', activeLocks.map(r => r.id));

            if (updateError) {
              console.error(`Error reactivating locks for user ${settings.user_id}:`, updateError);
            } else {
              locksDeactivated += activeLocks.length;
            }
          }
        }

        usersChecked++;
      } catch (userError) {
        console.error(`Error processing bedtime for user ${settings.user_id}:`, userError);
        usersChecked++;
        continue;
      }
    }

    const response: BedtimeCheckResponse = {
      users_checked: usersChecked,
      locks_activated: locksActivated,
      locks_deactivated: locksDeactivated
    };

    // Log summary (only if there was activity)
    if (locksActivated > 0 || locksDeactivated > 0) {
      console.log(`Bedtime check completed: ${usersChecked} users checked, ${locksActivated} locks activated, ${locksDeactivated} locks deactivated`);
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in POST /api/cron/bedtime-check:', error);
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
