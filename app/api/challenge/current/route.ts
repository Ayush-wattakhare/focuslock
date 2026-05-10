// Current Challenge API Route
// GET /api/challenge/current - Fetch the active challenge for the current user

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { WeeklyChallenge } from '@/types/database';

// Response interface
interface CurrentChallengeResponse {
  challenge: WeeklyChallenge | null;
  progress: {
    days_completed: number;
    days_remaining: number;
    current_day_usage?: number;
    is_today_completed: boolean;
  } | null;
}

// GET /api/challenge/current - Fetch active challenge for current user
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

    // Fetch the most recent active challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('weekly_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (challengeError) {
      console.error('Error fetching challenge:', challengeError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch challenge', 
            details: challengeError.message 
          } 
        },
        { status: 500 }
      );
    }

    // If no active challenge, return null
    if (!challenge) {
      const response: CurrentChallengeResponse = {
        challenge: null,
        progress: null
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Calculate progress
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(challenge.week_end);

    // Calculate days remaining
    const daysRemaining = Math.max(0, Math.ceil((weekEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    // Get today's usage for the challenge app
    const { data: todayUsage } = await supabase
      .from('usage_sessions')
      .select('minutes_used')
      .eq('user_id', user.id)
      .eq('app_name', challenge.app_name)
      .eq('date', today.toISOString().split('T')[0]);

    const currentDayUsage = todayUsage?.reduce((sum, session) => sum + (session.minutes_used || 0), 0) || 0;
    const isTodayCompleted = currentDayUsage <= challenge.daily_limit;

    const response: CurrentChallengeResponse = {
      challenge,
      progress: {
        days_completed: challenge.days_completed,
        days_remaining: daysRemaining,
        current_day_usage: currentDayUsage,
        is_today_completed: isTodayCompleted
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/challenge/current:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
