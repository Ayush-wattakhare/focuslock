// Daily Streak Check Cron Job
// POST /api/cron/streak-check
// Schedule: 0 0 * * * (midnight UTC)
// 
// This cron job runs daily at midnight UTC to:
// 1. Check all users for yesterday's compliance (no overrides)
// 2. Increment streaks for compliant users
// 3. Reset streaks for users who overrode locks
// 4. Send buddy notifications for broken streaks
// 
// Validates: Requirements 6.6

import { NextRequest, NextResponse } from 'next/server';
import { checkAndUpdateStreaks } from '@/lib/core/streakManager';

// Response interface
interface StreakCheckResponse {
  streaks_incremented: number;
  streaks_broken: number;
  errors: Array<{ user_id: string; error: string }>;
}

/**
 * POST /api/cron/streak-check
 * 
 * Cron endpoint to check and update all user streaks
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

    // Check and update all user streaks
    const result = await checkAndUpdateStreaks();

    const response: StreakCheckResponse = {
      streaks_incremented: result.streaksIncremented,
      streaks_broken: result.streaksBroken,
      errors: result.errors.map(e => ({
        user_id: e.userId,
        error: e.error
      }))
    };

    // Log summary
    console.log(`Streak check completed: ${result.streaksIncremented} incremented, ${result.streaksBroken} broken, ${result.errors.length} errors`);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in POST /api/cron/streak-check:', error);
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
