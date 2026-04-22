/**
 * Unit Tests for AI Coach Module
 * 
 * Tests cover:
 * - generateInsights with various scenarios
 * - buildCoachingPrompt formatting
 * - callClaudeAPI error handling and retries
 * - Caching behavior (24-hour TTL)
 * - Mood breakdown calculation
 * - Fallback behavior on API failures
 */

import { 
  generateInsights, 
  buildCoachingPrompt, 
  callClaudeAPI,
  clearInsightCache,
  clearAllInsightCache,
  AIInsight
} from '@/lib/core/aiCoach';
import { OverrideLog } from '@/types';

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

describe('aiCoach Module', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearAllInsightCache();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  describe('generateInsights', () => {
    it('should return encouraging message when no overrides exist', async () => {
      const userId = 'user-123';
      const overrideLogs: OverrideLog[] = [];

      const result = await generateInsights(userId, overrideLogs, 7);

      expect(result.insight).toBe("Great job! You haven't overridden any locks this week.");
      expect(result.suggestion).toBe("Keep up the momentum by setting a new challenge for next week.");
      expect(result.topMood).toBeNull();
      expect(result.moodBreakdown).toEqual([]);
    });

    it('should call Claude API and return insights for override logs', async () => {
      const userId = 'user-123';
      const overrideLogs: OverrideLog[] = [
        {
          id: '1',
          user_id: userId,
          lock_rule_id: 'rule-1',
          app_name: 'Instagram',
          mood: 'bored',
          reason_text: 'Just wanted to check notifications',
          overridden_at: '2024-01-15T20:30:00Z'
        },
        {
          id: '2',
          user_id: userId,
          lock_rule_id: 'rule-1',
          app_name: 'Instagram',
          mood: 'stressed',
          reason_text: 'Need a break',
          overridden_at: '2024-01-16T21:00:00Z'
        }
      ];

      // Mock successful Claude API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          content: [{
            text: JSON.stringify({
              insight: "You tend to override locks in the evening when feeling bored or stressed.",
              suggestion: "Try scheduling a 10-minute walk at 8 PM instead of reaching for your phone."
            })
          }]
        })
      });

      const result = await generateInsights(userId, overrideLogs, 7);

      expect(result.insight).toContain('evening');
      expect(result.suggestion).toContain('walk');
      expect(result.topMood).toBe('bored'); // First in alphabetical order with same count
      expect(result.moodBreakdown).toHaveLength(2);
    });

    it('should cache insights for 24 hours', async () => {
      const userId = 'user-123';
      const overrideLogs: OverrideLog[] = [];

      // First call
      const result1 = await generateInsights(userId, overrideLogs, 7);
      
      // Second call (should use cache)
      const result2 = await generateInsights(userId, overrideLogs, 7);

      expect(result1).toEqual(result2);
      expect(global.fetch).not.toHaveBeenCalled(); // No API call for cached result
    });

    it('should return fallback message on API failure', async () => {
      const userId = 'user-123';
      const overrideLogs: OverrideLog[] = [
        {
          id: '1',
          user_id: userId,
          lock_rule_id: 'rule-1',
          app_name: 'Instagram',
          mood: 'bored',
          reason_text: null,
          overridden_at: '2024-01-15T20:30:00Z'
        }
      ];

      // Mock API failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await generateInsights(userId, overrideLogs, 7);

      expect(result.insight).toContain('working on managing');
      expect(result.suggestion).toContain('trigger');
      expect(result.topMood).toBe('bored');
    });

    it('should calculate mood breakdown correctly', async () => {
      const userId = 'user-123';
      const overrideLogs: OverrideLog[] = [
        {
          id: '1',
          user_id: userId,
          lock_rule_id: 'rule-1',
          app_name: 'Instagram',
          mood: 'bored',
          reason_text: null,
          overridden_at: '2024-01-15T20:30:00Z'
        },
        {
          id: '2',
          user_id: userId,
          lock_rule_id: 'rule-1',
          app_name: 'Instagram',
          mood: 'bored',
          reason_text: null,
          overridden_at: '2024-01-16T21:00:00Z'
        },
        {
          id: '3',
          user_id: userId,
          lock_rule_id: 'rule-1',
          app_name: 'YouTube',
          mood: 'stressed',
          reason_text: null,
          overridden_at: '2024-01-17T19:00:00Z'
        }
      ];

      const result = await generateInsights(userId, overrideLogs, 7);

      expect(result.moodBreakdown).toEqual([
        { mood: 'bored', count: 2 },
        { mood: 'stressed', count: 1 }
      ]);
      expect(result.topMood).toBe('bored');
    });
  });

  describe('buildCoachingPrompt', () => {
    it('should format override data and mood breakdown correctly', () => {
      const overrideData = [
        {
          app: 'Instagram',
          mood: 'bored',
          reason: 'Just checking',
          time: '2024-01-15T20:30:00Z',
          dayOfWeek: 'Monday',
          hourOfDay: 20
        }
      ];

      const moodBreakdown = [
        { mood: 'bored', count: 1 }
      ];

      const prompt = buildCoachingPrompt(overrideData, moodBreakdown);

      expect(prompt).toContain('compassionate digital wellbeing coach');
      expect(prompt).toContain('Override data:');
      expect(prompt).toContain('Mood breakdown:');
      expect(prompt).toContain('Instagram');
      expect(prompt).toContain('bored');
      expect(prompt).toContain('Time-of-day patterns');
      expect(prompt).toContain('Mood triggers');
      expect(prompt).toContain('App-specific patterns');
      expect(prompt).toContain('JSON format');
    });

    it('should include guidance for Claude response format', () => {
      const prompt = buildCoachingPrompt([], []);

      expect(prompt).toContain('"insight"');
      expect(prompt).toContain('"suggestion"');
      expect(prompt).toContain('2 sentences max');
      expect(prompt).toContain('warm and non-judgmental');
      expect(prompt).toContain('specific, actionable');
    });
  });

  describe('callClaudeAPI', () => {
    it('should successfully call Claude API and parse JSON response', async () => {
      const prompt = 'Test prompt';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
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

      const result = await callClaudeAPI(prompt);

      expect(result.insight).toBe("Test insight");
      expect(result.suggestion).toBe("Test suggestion");
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key'
          })
        })
      );
    });

    it('should handle rate limiting with retry', async () => {
      const prompt = 'Test prompt';
      
      // First call: rate limited
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: (name: string) => name === 'retry-after' ? '1' : null
        }
      });

      // Second call: success
      (global.fetch as jest.Mock).mockResolvedValueOnce({
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

      const result = await callClaudeAPI(prompt);

      expect(result.insight).toBe("Test insight");
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on network errors with exponential backoff', async () => {
      const prompt = 'Test prompt';
      
      // First two calls fail
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
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

      const result = await callClaudeAPI(prompt);

      expect(result.insight).toBe("Test insight");
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const prompt = 'Test prompt';
      
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(callClaudeAPI(prompt)).rejects.toThrow('Failed to call Claude API after 3 attempts');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle invalid response format', async () => {
      const prompt = 'Test prompt';
      
      // Mock all 3 retry attempts with invalid response
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            content: [] // Invalid: empty content array
          }),
          headers: {
            get: () => null
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            content: []
          }),
          headers: {
            get: () => null
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            content: []
          }),
          headers: {
            get: () => null
          }
        });

      await expect(callClaudeAPI(prompt)).rejects.toThrow('Invalid response format');
    });

    it('should extract insight from text when JSON parsing fails', async () => {
      const prompt = 'Test prompt';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          content: [{
            text: 'insight: "You tend to override in the evening" suggestion: "Try a walk instead"'
          }]
        })
      });

      const result = await callClaudeAPI(prompt);

      expect(result.insight).toContain('override in the evening');
      expect(result.suggestion).toContain('walk instead');
    });

    it('should handle HTTP error responses', async () => {
      const prompt = 'Test prompt';
      
      // Mock all 3 retry attempts with 500 error
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal server error',
          headers: {
            get: () => null
          }
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal server error',
          headers: {
            get: () => null
          }
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal server error',
          headers: {
            get: () => null
          }
        });

      await expect(callClaudeAPI(prompt)).rejects.toThrow('Claude API error (500)');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache for specific user', async () => {
      const userId1 = 'user-123';
      const userId2 = 'user-456';
      const overrideLogs: OverrideLog[] = [];

      // Generate insights for both users
      await generateInsights(userId1, overrideLogs, 7);
      await generateInsights(userId2, overrideLogs, 7);

      // Clear cache for user1
      clearInsightCache(userId1);

      // User2's cache should still work (no API call)
      await generateInsights(userId2, overrideLogs, 7);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should clear all cache', async () => {
      const userId = 'user-123';
      const overrideLogs: OverrideLog[] = [];

      // Generate insights
      await generateInsights(userId, overrideLogs, 7);

      // Clear all cache
      clearAllInsightCache();

      // Mock API for next call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          content: [{
            text: JSON.stringify({
              insight: "Test",
              suggestion: "Test"
            })
          }]
        })
      });

      // Should make API call since cache is cleared
      const overrideLogsWithData: OverrideLog[] = [{
        id: '1',
        user_id: userId,
        lock_rule_id: 'rule-1',
        app_name: 'Instagram',
        mood: 'bored',
        reason_text: null,
        overridden_at: '2024-01-15T20:30:00Z'
      }];

      await generateInsights(userId, overrideLogsWithData, 7);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle override logs with null mood', async () => {
      const userId = 'user-123';
      const overrideLogs: OverrideLog[] = [
        {
          id: '1',
          user_id: userId,
          lock_rule_id: 'rule-1',
          app_name: 'Instagram',
          mood: null,
          reason_text: null,
          overridden_at: '2024-01-15T20:30:00Z'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
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

      const result = await generateInsights(userId, overrideLogs, 7);

      expect(result.topMood).toBeNull();
      expect(result.moodBreakdown).toEqual([]);
    });

    it('should handle mixed null and valid moods', async () => {
      const userId = 'user-123';
      const overrideLogs: OverrideLog[] = [
        {
          id: '1',
          user_id: userId,
          lock_rule_id: 'rule-1',
          app_name: 'Instagram',
          mood: null,
          reason_text: null,
          overridden_at: '2024-01-15T20:30:00Z'
        },
        {
          id: '2',
          user_id: userId,
          lock_rule_id: 'rule-1',
          app_name: 'Instagram',
          mood: 'bored',
          reason_text: null,
          overridden_at: '2024-01-16T21:00:00Z'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
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

      const result = await generateInsights(userId, overrideLogs, 7);

      expect(result.topMood).toBe('bored');
      expect(result.moodBreakdown).toEqual([{ mood: 'bored', count: 1 }]);
    });
  });
});
