// Statistics API Route
// GET /api/stats - Weekly aggregated statistics

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Response interfaces
interface DailyUsageData {
  date: string;
  apps: Array<{
    app_name: string;
    minutes: number;
  }>;
}

interface PerAppBreakdown {
  app_name: string;
  total_minutes: number;
  override_count: number;
}

interface WeekOverWeek {
  current_week_minutes: number;
  previous_week_minutes: number;
  change_percentage: number;
}

interface Compliance {
  days_without_override: number;
  total_days: number;
  percentage: number;
}

interface StatsResponse {
  dailyUsage: DailyUsageData[];
  perAppBreakdown: PerAppBreakdown[];
  weekOverWeek: WeekOverWeek;
  compliance: Compliance;
  timeSaved: number; // minutes
}

// Helper function to get date range for a week
function getWeekRange(weeksAgo: number = 0): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days since last Monday
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday - (weeksAgo * 7));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

// Helper function to get all dates in a range
function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  
  return dates;
}

// GET /api/stats - Weekly aggregated statistics
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

    // Get period from query params (defaults to 'week')
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';

    if (period !== 'week') {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Only "week" period is currently supported' 
          } 
        },
        { status: 400 }
      );
    }

    // Get current week and previous week date ranges
    const currentWeek = getWeekRange(0);
    const previousWeek = getWeekRange(1);

    // 1. Fetch daily usage for current week
    const { data: currentWeekSessions, error: sessionsError } = await supabase
      .from('usage_sessions')
      .select('app_name, minutes_used, date')
      .eq('user_id', user.id)
      .gte('date', currentWeek.start)
      .lte('date', currentWeek.end)
      .not('minutes_used', 'is', null);

    if (sessionsError) {
      console.error('Error fetching usage sessions:', sessionsError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch usage sessions', 
            details: sessionsError.message 
          } 
        },
        { status: 500 }
      );
    }

    // 2. Fetch previous week usage for comparison
    const { data: previousWeekSessions, error: prevSessionsError } = await supabase
      .from('usage_sessions')
      .select('minutes_used')
      .eq('user_id', user.id)
      .gte('date', previousWeek.start)
      .lte('date', previousWeek.end)
      .not('minutes_used', 'is', null);

    if (prevSessionsError) {
      console.error('Error fetching previous week sessions:', prevSessionsError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch previous week sessions', 
            details: prevSessionsError.message 
          } 
        },
        { status: 500 }
      );
    }

    // 3. Fetch override logs for current week
    const { data: overrideLogs, error: overrideError } = await supabase
      .from('override_logs')
      .select('app_name, overridden_at')
      .eq('user_id', user.id)
      .gte('overridden_at', `${currentWeek.start}T00:00:00`)
      .lte('overridden_at', `${currentWeek.end}T23:59:59`);

    if (overrideError) {
      console.error('Error fetching override logs:', overrideError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch override logs', 
            details: overrideError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Process daily usage data
    const dailyUsageMap = new Map<string, Map<string, number>>();
    
    // Initialize all dates in the week with empty maps
    const allDates = getDatesInRange(currentWeek.start, currentWeek.end);
    allDates.forEach(date => {
      dailyUsageMap.set(date, new Map());
    });

    // Aggregate usage by date and app
    for (const session of currentWeekSessions || []) {
      const date = session.date;
      const appName = session.app_name;
      const minutes = session.minutes_used || 0;

      if (!dailyUsageMap.has(date)) {
        dailyUsageMap.set(date, new Map());
      }

      const dayMap = dailyUsageMap.get(date)!;
      dayMap.set(appName, (dayMap.get(appName) || 0) + minutes);
    }

    // Convert to response format
    const dailyUsage: DailyUsageData[] = Array.from(dailyUsageMap.entries())
      .map(([date, appsMap]) => ({
        date,
        apps: Array.from(appsMap.entries()).map(([app_name, minutes]) => ({
          app_name,
          minutes,
        })),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Process per-app breakdown
    const appBreakdownMap = new Map<string, { total_minutes: number; override_count: number }>();

    for (const session of currentWeekSessions || []) {
      const appName = session.app_name;
      const minutes = session.minutes_used || 0;

      if (!appBreakdownMap.has(appName)) {
        appBreakdownMap.set(appName, { total_minutes: 0, override_count: 0 });
      }

      const breakdown = appBreakdownMap.get(appName)!;
      breakdown.total_minutes += minutes;
    }

    // Count overrides per app
    for (const log of overrideLogs || []) {
      const appName = log.app_name;

      if (!appBreakdownMap.has(appName)) {
        appBreakdownMap.set(appName, { total_minutes: 0, override_count: 0 });
      }

      const breakdown = appBreakdownMap.get(appName)!;
      breakdown.override_count += 1;
    }

    const perAppBreakdown: PerAppBreakdown[] = Array.from(appBreakdownMap.entries())
      .map(([app_name, data]) => ({
        app_name,
        total_minutes: data.total_minutes,
        override_count: data.override_count,
      }))
      .sort((a, b) => b.total_minutes - a.total_minutes);

    // Calculate week-over-week comparison
    const currentWeekMinutes = (currentWeekSessions || [])
      .reduce((sum, s) => sum + (s.minutes_used || 0), 0);
    
    const previousWeekMinutes = (previousWeekSessions || [])
      .reduce((sum, s) => sum + (s.minutes_used || 0), 0);

    const changePercentage = previousWeekMinutes > 0
      ? ((currentWeekMinutes - previousWeekMinutes) / previousWeekMinutes) * 100
      : 0;

    const weekOverWeek: WeekOverWeek = {
      current_week_minutes: currentWeekMinutes,
      previous_week_minutes: previousWeekMinutes,
      change_percentage: Math.round(changePercentage * 10) / 10, // Round to 1 decimal
    };

    // Calculate compliance percentage
    const datesWithOverrides = new Set(
      (overrideLogs || []).map(log => log.overridden_at.split('T')[0])
    );
    
    const daysWithoutOverride = allDates.filter(date => !datesWithOverrides.has(date)).length;
    const totalDays = allDates.length;
    const compliancePercentage = totalDays > 0
      ? (daysWithoutOverride / totalDays) * 100
      : 0;

    const compliance: Compliance = {
      days_without_override: daysWithoutOverride,
      total_days: totalDays,
      percentage: Math.round(compliancePercentage * 10) / 10, // Round to 1 decimal
    };

    // Calculate time saved
    // Time saved = total time that would have been used if all locks were overridden
    // For simplicity, we estimate this as: (number of days without override) * average daily usage
    const avgDailyUsage = totalDays > 0 ? currentWeekMinutes / totalDays : 0;
    const timeSaved = Math.round(daysWithoutOverride * avgDailyUsage);

    // Return success response
    const response: StatsResponse = {
      dailyUsage,
      perAppBreakdown,
      weekOverWeek,
      compliance,
      timeSaved,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/stats:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
