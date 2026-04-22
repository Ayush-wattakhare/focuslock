/**
 * AI Coach Module
 * 
 * Integrates with Claude API to provide behavioral insights based on user's
 * override patterns. Analyzes mood triggers, time-of-day patterns, and app-specific
 * behaviors to deliver compassionate, actionable coaching suggestions.
 * 
 * Features:
 * - Pattern analysis (time-of-day, mood triggers, app-specific)
 * - Claude API integration with error handling
 * - Rate limiting (1 request per user per hour)
 * - 24-hour insight caching
 * - Fallback to encouraging messages on API failure
 */

import { OverrideLog } from '@/types';
import { AI_CONFIG, validateAIConfig, getClaudeAPIEndpoint, getClaudeAPIHeaders } from '@/config/ai';

/**
 * AI Insight response structure
 */
export interface AIInsight {
  insight: string;
  suggestion: string;
  topMood: string | null;
  moodBreakdown: Array<{ mood: string; count: number }>;
}

/**
 * Override data formatted for Claude analysis
 */
interface OverrideData {
  app: string;
  mood: string | null;
  reason: string | null;
  time: string;
  dayOfWeek: string;
  hourOfDay: number;
}

/**
 * Cache entry structure for insights
 */
interface CacheEntry {
  insight: AIInsight;
  timestamp: number;
}

// In-memory cache for insights (24-hour TTL)
// In production, consider using Redis or similar for distributed caching
const insightCache = new Map<string, CacheEntry>();

/**
 * Generates AI coaching insights based on user's override patterns
 * 
 * @param userId - User ID to analyze
 * @param overrideLogs - Override logs to analyze (typically last 7 days)
 * @param days - Number of days analyzed (for cache key)
 * @returns AI-generated insights with mood analysis
 */
export async function generateInsights(
  userId: string,
  overrideLogs: OverrideLog[],
  days: number = 7
): Promise<AIInsight> {
  // Check cache first
  const cacheKey = `${userId}-${days}`;
  const cached = insightCache.get(cacheKey);
  
  if (cached) {
    const age = Date.now() - cached.timestamp;
    const maxAge = AI_CONFIG.cacheExpiryHours * 60 * 60 * 1000;
    
    if (age < maxAge) {
      return cached.insight;
    } else {
      // Expired cache entry
      insightCache.delete(cacheKey);
    }
  }

  // Handle no overrides case
  if (overrideLogs.length === 0) {
    const insight: AIInsight = {
      insight: "Great job! You haven't overridden any locks this week.",
      suggestion: "Keep up the momentum by setting a new challenge for next week.",
      topMood: null,
      moodBreakdown: []
    };
    
    // Cache the result
    insightCache.set(cacheKey, {
      insight,
      timestamp: Date.now()
    });
    
    return insight;
  }

  // Prepare data for Claude
  const overrideData = formatOverrideData(overrideLogs);
  const moodBreakdown = calculateMoodBreakdown(overrideData);
  const topMood = moodBreakdown[0]?.mood || null;

  try {
    // Validate API configuration
    validateAIConfig();

    // Build coaching prompt
    const prompt = buildCoachingPrompt(overrideData, moodBreakdown);

    // Call Claude API
    const response = await callClaudeAPI(prompt);

    const insight: AIInsight = {
      insight: response.insight,
      suggestion: response.suggestion,
      topMood,
      moodBreakdown
    };

    // Cache the result
    insightCache.set(cacheKey, {
      insight,
      timestamp: Date.now()
    });

    return insight;
  } catch (error) {
    console.error('Failed to generate AI insights:', error);
    
    // Fallback to generic encouraging message
    return {
      insight: "We noticed you've been working on managing your app usage. Every step counts!",
      suggestion: "Try identifying your most common trigger and plan an alternative activity for those moments.",
      topMood,
      moodBreakdown
    };
  }
}

/**
 * Formats override logs into structured data for Claude analysis
 */
function formatOverrideData(overrideLogs: OverrideLog[]): OverrideData[] {
  return overrideLogs.map(log => {
    const timestamp = new Date(log.overridden_at);
    
    return {
      app: log.app_name,
      mood: log.mood,
      reason: log.reason_text,
      time: log.overridden_at,
      dayOfWeek: timestamp.toLocaleDateString('en-US', { weekday: 'long' }),
      hourOfDay: timestamp.getHours()
    };
  });
}

/**
 * Calculates mood breakdown from override data
 * Returns moods sorted by frequency (most common first)
 */
function calculateMoodBreakdown(
  overrideData: OverrideData[]
): Array<{ mood: string; count: number }> {
  const moodCounts: Record<string, number> = {};
  
  overrideData.forEach(o => {
    if (o.mood) {
      moodCounts[o.mood] = (moodCounts[o.mood] || 0) + 1;
    }
  });

  return Object.entries(moodCounts)
    .map(([mood, count]) => ({ mood, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Builds a coaching prompt for Claude API with pattern analysis
 * 
 * The prompt instructs Claude to:
 * - Analyze time-of-day patterns
 * - Identify mood triggers
 * - Detect app-specific patterns
 * - Provide warm, non-judgmental insights
 * - Suggest specific, actionable improvements
 */
export function buildCoachingPrompt(
  overrideData: OverrideData[],
  moodBreakdown: Array<{ mood: string; count: number }>
): string {
  return `You are a compassionate digital wellbeing coach. Analyze this user's app override patterns from the past week and provide guidance.

Override data:
${JSON.stringify(overrideData, null, 2)}

Mood breakdown:
${JSON.stringify(moodBreakdown, null, 2)}

Provide your response in JSON format with these fields:
{
  "insight": "One key observation about their patterns (2 sentences max, warm and non-judgmental)",
  "suggestion": "One specific, actionable suggestion to improve (be concrete, not generic)"
}

Focus on:
- Time-of-day patterns (e.g., "You tend to override locks in the evening")
- Mood triggers (e.g., "Stress seems to be your main trigger")
- App-specific patterns (e.g., "Instagram is your most overridden app")
- Practical suggestions (e.g., "Try scheduling a 10-minute walk at 8 PM instead")

Keep the tone supportive and encouraging, never judgmental.`;
}

/**
 * Calls Claude API with error handling and rate limiting
 * 
 * Features:
 * - Exponential backoff retry logic
 * - Rate limit detection and handling
 * - JSON response parsing with fallback
 * - Timeout handling
 * 
 * @param prompt - The coaching prompt to send to Claude
 * @returns Parsed insight and suggestion
 * @throws Error if API call fails after retries
 */
export async function callClaudeAPI(
  prompt: string
): Promise<{ insight: string; suggestion: string }> {
  const endpoint = getClaudeAPIEndpoint();
  const headers = getClaudeAPIHeaders();

  const requestBody = {
    model: AI_CONFIG.model,
    max_tokens: AI_CONFIG.maxTokens,
    temperature: AI_CONFIG.temperature,
    messages: [{
      role: 'user' as const,
      content: prompt
    }]
  };

  // Retry logic with exponential backoff
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      // Handle rate limiting
      if (response && response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        
        console.warn(`Rate limited by Claude API. Waiting ${waitTime}ms before retry.`);
        await sleep(waitTime);
        continue;
      }

      // Handle other HTTP errors
      if (response && !response.ok) {
        const errorBody = await response.text();
        const error = new Error(`Claude API error (${response.status}): ${errorBody}`);
        // Don't retry on client errors (4xx except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw error;
        }
        lastError = error;
        // Wait before retry for server errors
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await sleep(waitTime);
        }
        continue;
      }

      // Parse response
      const data = await response.json();
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        const error = new Error('Invalid response format from Claude API');
        // Don't retry on invalid format
        throw error;
      }

      const content = data.content[0].text;
      
      // Parse JSON response
      try {
        const parsed = JSON.parse(content);
        
        if (!parsed.insight || !parsed.suggestion) {
          throw new Error('Missing required fields in Claude response');
        }

        return {
          insight: parsed.insight,
          suggestion: parsed.suggestion
        };
      } catch (parseError) {
        // Fallback: try to extract insight and suggestion from text
        console.warn('Failed to parse JSON from Claude, attempting text extraction');
        return extractInsightFromText(content);
      }
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on timeout or abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Claude API request timed out');
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await sleep(waitTime);
      }
    }
  }

  // All retries failed
  throw new Error(`Failed to call Claude API after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Extracts insight and suggestion from text when JSON parsing fails
 * This is a fallback mechanism for robustness
 */
function extractInsightFromText(text: string): { insight: string; suggestion: string } {
  // Try to find insight and suggestion in the text
  const insightMatch = text.match(/insight["\s:]+([^"]+)/i);
  const suggestionMatch = text.match(/suggestion["\s:]+([^"]+)/i);

  return {
    insight: insightMatch?.[1]?.trim() || 
      "You've been working on managing your app usage. Keep going!",
    suggestion: suggestionMatch?.[1]?.trim() || 
      "Try identifying your most common trigger and plan an alternative activity."
  };
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clears the insight cache for a specific user
 * Useful when user data changes significantly
 */
export function clearInsightCache(userId: string): void {
  const keysToDelete: string[] = [];
  
  for (const key of insightCache.keys()) {
    if (key.startsWith(userId)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => insightCache.delete(key));
}

/**
 * Clears all cached insights
 * Useful for testing or cache invalidation
 */
export function clearAllInsightCache(): void {
  insightCache.clear();
}
