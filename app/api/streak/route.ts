// Streak API Route
// GET /api/streak - Fetch user's current streak data

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Response interface
interface StreakResponse {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

// GET /api/streak - Fetch user's current streak data
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

    // Fetch streak data for the user
    const { data: streak, error } = await supabase
      .from('streaks')
      .select('current_streak, longest_streak, last_active_date')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching streak:', error);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch streak data', 
            details: error.message 
          } 
        },
        { status: 500 }
      );
    }

    // Return streak data (or default values if not found)
    const response: StreakResponse = {
      current_streak: streak?.current_streak ?? 0,
      longest_streak: streak?.longest_streak ?? 0,
      last_active_date: streak?.last_active_date ?? null,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/streak:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
