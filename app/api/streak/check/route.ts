// Streak Check Cron API Route
// POST /api/streak/check - Daily cron job to check and update all user streaks

import { NextRequest, NextResponse } from 'next/server';
import { checkAndUpdateStreaks } from '@/lib/core/streakManager';

// Response interface
interface StreakCheckResponse {
  success: boolean;
  streaksIncremented: number;
  streaksBroken: number;
  errors: Array<{ userId: string; error: string }>;
}

// POST /api/streak/check - Cron endpoint for daily streak checks
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Check if CRON_SECRET is configured
    if (!cronSecret) {
      console.error('CRON_SECRET environment variable is not configured');
      return NextResponse.json(
        { 
          error: { 
            code: 'SERVER_CONFIG_ERROR', 
            message: 'Cron authentication is not configured' 
          } 
        },
        { status: 500 }
      );
    }

    // Verify the authorization header
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron request attempt');
      return NextResponse.json(
        { 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Invalid or missing cron secret' 
          } 
        },
        { status: 401 }
      );
    }

    // Execute streak check and update
    console.log('Starting daily streak check...');
    const result = await checkAndUpdateStreaks();
    console.log('Streak check completed:', result);

    // Return success response
    const response: StreakCheckResponse = {
      success: true,
      streaksIncremented: result.streaksIncremented,
      streaksBroken: result.streaksBroken,
      errors: result.errors,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in POST /api/streak/check:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'An unexpected error occurred during streak check',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}
