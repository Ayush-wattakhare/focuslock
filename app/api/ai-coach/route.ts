// AI Coach API Route
// POST /api/ai-coach - Generate AI insights based on override patterns

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInsights } from '@/lib/core/aiCoach';
import type { OverrideLog } from '@/types/database';

// Rate limiting: 1 request per hour per user
// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Clear rate limit store (for testing purposes)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Check if user has exceeded rate limit
 * @param userId - User ID to check
 * @returns true if rate limited, false if allowed
 */
function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const lastRequestTime = rateLimitStore.get(userId);

  if (!lastRequestTime) {
    // First request, allow it
    rateLimitStore.set(userId, now);
    return false;
  }

  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_WINDOW_MS) {
    // Still within rate limit window
    return true;
  }

  // Rate limit window has passed, allow request
  rateLimitStore.set(userId, now);
  return false;
}

/**
 * Get remaining time until rate limit resets
 * @param userId - User ID to check
 * @returns milliseconds until reset, or 0 if not rate limited
 */
function getRateLimitResetTime(userId: string): number {
  const lastRequestTime = rateLimitStore.get(userId);
  if (!lastRequestTime) return 0;

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const remaining = RATE_LIMIT_WINDOW_MS - timeSinceLastRequest;

  return remaining > 0 ? remaining : 0;
}

// Request interface
interface AICoachRequest {
  days?: number; // Number of days to analyze (default 7)
}

// Response interface
interface AICoachResponse {
  insight: string;
  suggestion: string;
  topMood: string | null;
  moodBreakdown: Array<{ mood: string; count: number }>;
}

// POST /api/ai-coach - Generate AI coaching insights
export async function POST(request: NextRequest) {
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

    // Check rate limit
    if (isRateLimited(user.id)) {
      const resetTimeMs = getRateLimitResetTime(user.id);
      const resetTimeMinutes = Math.ceil(resetTimeMs / (60 * 1000));

      return NextResponse.json(
        { 
          error: { 
            code: 'RATE_LIMIT_EXCEEDED', 
            message: `Rate limit exceeded. You can request new insights in ${resetTimeMinutes} minutes.`,
            retryAfter: resetTimeMs
          } 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil(resetTimeMs / 1000).toString(), // seconds
            'X-RateLimit-Limit': '1',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + resetTimeMs).toISOString()
          }
        }
      );
    }

    // Parse request body
    const body: AICoachRequest = await request.json().catch(() => ({}));
    const days = body.days && body.days > 0 && body.days <= 30 ? body.days : 7;

    // Calculate date range (last N days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch override logs from the past N days
    const { data: overrideLogs, error: logsError } = await supabase
      .from('override_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('overridden_at', startDate.toISOString())
      .lte('overridden_at', endDate.toISOString())
      .order('overridden_at', { ascending: false });

    if (logsError) {
      console.error('Error fetching override logs:', logsError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch override logs', 
            details: logsError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Generate AI insights using the aiCoach module
    try {
      const insights = await generateInsights(
        user.id,
        overrideLogs as OverrideLog[],
        days
      );

      const response: AICoachResponse = {
        insight: insights.insight,
        suggestion: insights.suggestion,
        topMood: insights.topMood,
        moodBreakdown: insights.moodBreakdown
      };

      return NextResponse.json(response, { 
        status: 200,
        headers: {
          'X-RateLimit-Limit': '1',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + RATE_LIMIT_WINDOW_MS).toISOString()
        }
      });
    } catch (aiError) {
      console.error('Error generating AI insights:', aiError);
      
      // Return a user-friendly error message
      return NextResponse.json(
        { 
          error: { 
            code: 'AI_SERVICE_ERROR', 
            message: 'Failed to generate insights. Please try again later.',
            details: aiError instanceof Error ? aiError.message : 'Unknown error'
          } 
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in POST /api/ai-coach:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
