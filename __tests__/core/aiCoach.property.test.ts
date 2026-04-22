/**
 * Property-Based Tests for AI Coach Module
 * 
 * Tests universal properties that should hold for all inputs:
 * - Insight caching consistency
 * - Mood breakdown calculation correctness
 * - API retry behavior
 * - Prompt formatting validity
 */

import { test, fc } from '@fast-check/jest';
import { 
  generateInsights, 
  buildCoachingPrompt,
  clearAllInsightCache,
  AIInsight
} from '@/lib/core/aiCoach';
import { OverrideLog, Mood } from '@/types';

// Mock the config module
jest.mock('@/config/ai', () => ({
  AI_CONFIG: {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 500,
    temperature: 0.7,
    apiVersion: '2023-06-01',
    maxRequestsPerHour: 1,
    cacheExpiryHours: 24,
    systemPrompt: 'You are a compassionate digital wellbeing coach.',
    responseFormat: {
      insight: 'One key observation',
      suggestion: 'One specific suggestion'
    }
  },
  validateAIConfig: jest.fn(),
  getClaudeAPIEndpoint: jest.fn(() => 'https://api.anthropic.com/v1/messages'),
  getClaudeAPIHeaders: jest.fn(() => ({
    'Content-Type': 'application/json',
    'x-api-key': 'test-api-key',
    'anthropic-version': '2023-06-01'
  }))
}));

describe('aiCoach Property-Based Tests', () => {
  beforeEach(() => {
    clearAllInsightCache();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  /**
   * **Validates: Requirements 10.1-10.8**
   * 
   * Property: Empty override logs always return encouraging message
   * 
   * For any user ID and any number of days, when override logs are empty,
   * the system should return a consistent encouraging message with no mood data.
   */
  test.prop([
    fc.string({ minLength: 1, maxLength: 50 }), // userId
    fc.integer({ min: 1, max: 30 }) // days
  ])('empty override logs always return encouraging message', async (userId, days) => {
    const result = await generateInsights(userId, [], days);

    expect(result.insight).toBe("Great job! You haven't overridden any locks this week.");
    expect(result.suggestion).toBe("Keep up the momentum by setting a new challenge for next week.");
    expect(result.topMood).toBeNull();
    expect(result.moodBreakdown).toEqual([]);
  });

  /**
   * **Validates: Requirements 10.1-10.8**
   * 
   * Property: Mood breakdown counts are accurate
   * 
   * For any list of override logs, the sum of mood breakdown counts
   * should equal the number of logs with non-null moods.
   */
  test.prop([
    fc.array(
      fc.record({
        id: fc.uuid(),
        user_id: fc.uuid(),
        lock_rule_id: fc.uuid(),
        app_name: fc.constantFrom('Instagram', 'YouTube', 'TikTok', 'Twitter'),
        mood: fc.option(fc.constantFrom<Mood>('bored', 'stressed', 'tired', 'news', 'other'), { nil: null }),
        reason_text: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
        overridden_at: fc.integer({ min: 1704067200000, max: 1735516799000 }).map(ts => new Date(ts).toISOString())
      }),
      { minLength: 1, maxLength: 50 }
    )
  ])('mood breakdown counts are accurate', async (overrideLogs) => {
    // Clear cache before each property test
    clearAllInsightCache();
    
    // Mock API response before each test
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{
          text: JSON.stringify({
            insight: "Test insight",
            suggestion: "Test suggestion"
          })
        }]
      })
    });

    const result = await generateInsights('test-user', overrideLogs as OverrideLog[], 7);

    // Count non-null moods
    const nonNullMoodCount = overrideLogs.filter(log => log.mood !== null).length;
    
    // Sum of mood breakdown counts
    const breakdownSum = result.moodBreakdown.reduce((sum, item) => sum + item.count, 0);

    expect(breakdownSum).toBe(nonNullMoodCount);
  });

  /**
   * **Validates: Requirements 10.1-10.8**
   * 
   * Property: Top mood is the most frequent mood
   * 
   * For any list of override logs with moods, the top mood should be
   * the mood that appears most frequently in the logs.
   */
  test.prop([
    fc.array(
      fc.record({
        id: fc.uuid(),
        user_id: fc.uuid(),
        lock_rule_id: fc.uuid(),
        app_name: fc.constantFrom('Instagram', 'YouTube', 'TikTok'),
        mood: fc.constantFrom<Mood>('bored', 'stressed', 'tired', 'news', 'other'),
        reason_text: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
        overridden_at: fc.integer({ min: 1704067200000, max: 1735516799000 }).map(ts => new Date(ts).toISOString())
      }),
      { minLength: 1, maxLength: 50 }
    )
  ])('top mood is the most frequent mood', async (overrideLogs) => {
    // Clear cache before each property test
    clearAllInsightCache();
    
    // Mock API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{
          text: JSON.stringify({
            insight: "Test insight",
            suggestion: "Test suggestion"
          })
        }]
      })
    });

    const result = await generateInsights('test-user', overrideLogs as OverrideLog[], 7);

    // Calculate expected top mood
    const moodCounts: Record<string, number> = {};
    overrideLogs.forEach(log => {
      if (log.mood) {
        moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
      }
    });

    const maxCount = Math.max(...Object.values(moodCounts));
    const moodsWithMaxCount = Object.entries(moodCounts)
      .filter(([_, count]) => count === maxCount)
      .map(([mood]) => mood)
      .sort();
    
    // Top mood should be one of the moods with max count (first alphabetically if tie)
    expect(moodsWithMaxCount).toContain(result.topMood);
  });

  /**
   * **Validates: Requirements 10.1-10.8**
   * 
   * Property: Mood breakdown is sorted by frequency (descending)
   * 
   * For any list of override logs, the mood breakdown should be sorted
   * with the most frequent moods first.
   */
  test.prop([
    fc.array(
      fc.record({
        id: fc.uuid(),
        user_id: fc.uuid(),
        lock_rule_id: fc.uuid(),
        app_name: fc.constantFrom('Instagram', 'YouTube', 'TikTok'),
        mood: fc.constantFrom<Mood>('bored', 'stressed', 'tired', 'news', 'other'),
        reason_text: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
        overridden_at: fc.integer({ min: 1704067200000, max: 1735430399000 }).map(ts => new Date(ts).toISOString())
      }),
      { minLength: 1, maxLength: 50 }
    )
  ])('mood breakdown is sorted by frequency descending', async (overrideLogs) => {
    // Clear cache before each property test
    clearAllInsightCache();
    
    // Mock API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{
          text: JSON.stringify({
            insight: "Test insight",
            suggestion: "Test suggestion"
          })
        }]
      })
    });

    const result = await generateInsights('test-user', overrideLogs as OverrideLog[], 7);

    // Check that breakdown is sorted descending by count
    for (let i = 0; i < result.moodBreakdown.length - 1; i++) {
      expect(result.moodBreakdown[i].count).toBeGreaterThanOrEqual(
        result.moodBreakdown[i + 1].count
      );
    }
  });

  /**
   * **Validates: Requirements 10.1-10.8**
   * 
   * Property: Coaching prompt contains all required sections
   * 
   * For any override data and mood breakdown, the generated prompt should
   * contain all required sections for Claude to analyze.
   */
  test.prop([
    fc.array(
      fc.record({
        app: fc.constantFrom('Instagram', 'YouTube', 'TikTok', 'Twitter'),
        mood: fc.option(fc.constantFrom('bored', 'stressed', 'tired', 'news', 'other'), { nil: null }),
        reason: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
        time: fc.integer({ min: 1704067200000, max: 1735689599000 }).map(ts => new Date(ts).toISOString()),
        dayOfWeek: fc.constantFrom('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
        hourOfDay: fc.integer({ min: 0, max: 23 })
      }),
      { minLength: 0, maxLength: 20 }
    ),
    fc.array(
      fc.record({
        mood: fc.constantFrom('bored', 'stressed', 'tired', 'news', 'other'),
        count: fc.integer({ min: 1, max: 50 })
      }),
      { minLength: 0, maxLength: 5 }
    )
  ])('coaching prompt contains all required sections', (overrideData, moodBreakdown) => {
    const prompt = buildCoachingPrompt(overrideData, moodBreakdown);

    // Check for required sections
    expect(prompt).toContain('compassionate digital wellbeing coach');
    expect(prompt).toContain('Override data:');
    expect(prompt).toContain('Mood breakdown:');
    expect(prompt).toContain('JSON format');
    expect(prompt).toContain('"insight"');
    expect(prompt).toContain('"suggestion"');
    expect(prompt).toContain('Time-of-day patterns');
    expect(prompt).toContain('Mood triggers');
    expect(prompt).toContain('App-specific patterns');
    expect(prompt).toContain('supportive and encouraging');
  });

  /**
   * **Validates: Requirements 10.1-10.8**
   * 
   * Property: Cache returns identical results for same inputs
   * 
   * For any user ID and override logs, calling generateInsights twice
   * should return identical results (cache hit on second call).
   */
  test.prop([
    fc.uuid(),
    fc.array(
      fc.record({
        id: fc.uuid(),
        user_id: fc.uuid(),
        lock_rule_id: fc.uuid(),
        app_name: fc.constantFrom('Instagram', 'YouTube', 'TikTok'),
        mood: fc.option(fc.constantFrom<Mood>('bored', 'stressed', 'tired', 'news', 'other'), { nil: null }),
        reason_text: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
        overridden_at: fc.integer({ min: 1704067200000, max: 1735430399000 }).map(ts => new Date(ts).toISOString())
      }),
      { minLength: 0, maxLength: 10 }
    )
  ])('cache returns identical results for same inputs', async (userId, overrideLogs) => {
    // Clear cache before each property test
    clearAllInsightCache();
    
    // Mock API response for first call
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{
          text: JSON.stringify({
            insight: "Test insight",
            suggestion: "Test suggestion"
          })
        }]
      })
    });

    const result1 = await generateInsights(userId, overrideLogs as OverrideLog[], 7);
    
    // Clear mock call history
    (global.fetch as jest.Mock).mockClear();
    
    const result2 = await generateInsights(userId, overrideLogs as OverrideLog[], 7);

    expect(result1).toEqual(result2);
    
    // API should not be called on second invocation (cache hit)
    expect(global.fetch).not.toHaveBeenCalled();
  });

  /**
   * **Validates: Requirements 10.1-10.8**
   * 
   * Property: Fallback always returns valid insight structure
   * 
   * When API fails, the fallback should always return a valid AIInsight
   * structure with non-empty insight and suggestion strings.
   */
  test.prop([
    fc.uuid(),
    fc.array(
      fc.record({
        id: fc.uuid(),
        user_id: fc.uuid(),
        lock_rule_id: fc.uuid(),
        app_name: fc.constantFrom('Instagram', 'YouTube', 'TikTok'),
        mood: fc.constantFrom<Mood>('bored', 'stressed', 'tired', 'news', 'other'),
        reason_text: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
        overridden_at: fc.integer({ min: 1704067200000, max: 1735516799000 }).map(ts => new Date(ts).toISOString())
      }),
      { minLength: 1, maxLength: 10 }
    )
  ])('fallback always returns valid insight structure', async (userId, overrideLogs) => {
    // Mock API failure
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await generateInsights(userId, overrideLogs as OverrideLog[], 7);

    // Should return valid structure
    expect(result).toHaveProperty('insight');
    expect(result).toHaveProperty('suggestion');
    expect(result).toHaveProperty('topMood');
    expect(result).toHaveProperty('moodBreakdown');

    // Strings should not be empty
    expect(result.insight.length).toBeGreaterThan(0);
    expect(result.suggestion.length).toBeGreaterThan(0);

    // Mood data should still be calculated
    expect(result.topMood).not.toBeNull();
    expect(result.moodBreakdown.length).toBeGreaterThan(0);
  });

  /**
   * **Validates: Requirements 10.1-10.8**
   * 
   * Property: All moods in breakdown appear in original logs
   * 
   * For any list of override logs, every mood in the breakdown should
   * appear in the original logs (no phantom moods).
   */
  test.prop([
    fc.array(
      fc.record({
        id: fc.uuid(),
        user_id: fc.uuid(),
        lock_rule_id: fc.uuid(),
        app_name: fc.constantFrom('Instagram', 'YouTube', 'TikTok'),
        mood: fc.option(fc.constantFrom<Mood>('bored', 'stressed', 'tired', 'news', 'other'), { nil: null }),
        reason_text: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
        overridden_at: fc.integer({ min: 1704067200000, max: 1735516799000 }).map(ts => new Date(ts).toISOString())
      }),
      { minLength: 1, maxLength: 50 }
    )
  ])('all moods in breakdown appear in original logs', async (overrideLogs) => {
    // Clear cache before each property test
    clearAllInsightCache();
    
    // Mock API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{
          text: JSON.stringify({
            insight: "Test insight",
            suggestion: "Test suggestion"
          })
        }]
      })
    });

    const result = await generateInsights('test-user', overrideLogs as OverrideLog[], 7);

    // Collect all moods from logs
    const logMoods = new Set(
      overrideLogs
        .map(log => log.mood)
        .filter((mood): mood is string => mood !== null)
    );

    // Every mood in breakdown should be in logs
    // If no moods in logs, breakdown should be empty
    if (logMoods.size === 0) {
      expect(result.moodBreakdown).toEqual([]);
    } else {
      result.moodBreakdown.forEach(item => {
        expect(logMoods.has(item.mood)).toBe(true);
      });
    }
  });
});



