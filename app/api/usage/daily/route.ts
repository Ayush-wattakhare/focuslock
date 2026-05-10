// Usage Daily Aggregation API Route
// GET /api/usage/daily - Aggregate daily usage minutes per app

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Response interface
interface DailyUsageResponse {
  date: string;
  usage: Array<{
    app_name: string;
    total_minutes: number;
    session_count: number;
  }>;
  total_minutes: number;
}

// GET /api/usage/daily - Aggregate daily usage minutes per app
export async function GET(request: NextRequest) {
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

    // Get date from query params (defaults to today)
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const targetDate = dateParam || new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(targetDate)) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid date format. Use YYYY-MM-DD' 
          } 
        },
        { status: 400 }
      );
    }

    // Fetch all usage sessions for the specified date
    const { data: sessions, error } = await supabase
      .from('usage_sessions')
      .select('app_name, minutes_used')
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .not('minutes_used', 'is', null); // Only include completed sessions

    if (error) {
      console.error('Error fetching usage sessions:', error);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch usage sessions', 
            details: error.message 
          } 
        },
        { status: 500 }
      );
    }

    // Aggregate usage by app
    const usageMap = new Map<string, { total_minutes: number; session_count: number }>();
    let totalMinutes = 0;

    for (const session of sessions || []) {
      const appName = session.app_name;
      const minutes = session.minutes_used || 0;

      if (usageMap.has(appName)) {
        const existing = usageMap.get(appName)!;
        existing.total_minutes += minutes;
        existing.session_count += 1;
      } else {
        usageMap.set(appName, {
          total_minutes: minutes,
          session_count: 1,
        });
      }

      totalMinutes += minutes;
    }

    // Convert map to array
    const usage = Array.from(usageMap.entries()).map(([app_name, data]) => ({
      app_name,
      total_minutes: data.total_minutes,
      session_count: data.session_count,
    }));

    // Sort by total minutes descending
    usage.sort((a, b) => b.total_minutes - a.total_minutes);

    // Return success response
    const response: DailyUsageResponse = {
      date: targetDate,
      usage,
      total_minutes: totalMinutes,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/usage/daily:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
