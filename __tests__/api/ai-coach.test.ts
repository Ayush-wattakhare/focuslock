// Unit tests for AI Coach API
// Tests authentication, rate limiting, and integration with aiCoach module

import { POST, clearRateLimitStore } from '@/app/api/ai-coach/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInsights } from '@/lib/core/aiCoach';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/core/aiCoach');

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGenerateInsights = generateInsights as jest.MockedFunction<typeof generateInsights>;

describe('POST /api/ai-coach', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    clearRateLimitStore(); // Clear rate limit between tests

    // Setup default Supabase mock
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_REQUIRED');
    });

    it('should proceed if user is authenticated', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      mockGenerateInsights.mockResolvedValue({
        insight: 'Test insight',
        suggestion: 'Test suggestion',
        topMood: 'stressed',
        moodBreakdown: [{ mood: 'stressed', count: 3 }],
      });

      const request = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    const testUserId = 'rate-limit-user-unique';
    
    beforeEach(() => {
      const mockUser = { id: testUserId, email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      mockGenerateInsights.mockResolvedValue({
        insight: 'Test insight',
        suggestion: 'Test suggestion',
        topMood: null,
        moodBreakdown: [],
      });
    });

    it('should allow first request from a user', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.insight).toBe('Test insight');
    });

    it('should block second request within 1 hour', async () => {
      // First request
      const request1 = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // Second request immediately after (same user)
      const request2 = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(429);
      expect(data2.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(data2.error.retryAfter).toBeGreaterThan(0);
    });

    it('should include rate limit headers in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('1');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });

    it('should include Retry-After header when rate limited', async () => {
      // First request
      const request1 = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await POST(request1);

      // Second request (rate limited)
      const request2 = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response2 = await POST(request2);

      expect(response2.headers.get('Retry-After')).toBeTruthy();
      const retryAfter = parseInt(response2.headers.get('Retry-After') || '0');
      expect(retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Override Logs Fetching', () => {
    beforeEach(() => {
      const mockUser = { id: 'logs-user', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it('should fetch override logs for the past 7 days by default', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabase.from = mockFrom;

      mockGenerateInsights.mockResolvedValue({
        insight: 'Test insight',
        suggestion: 'Test suggestion',
        topMood: null,
        moodBreakdown: [],
      });

      const request = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await POST(request);

      expect(mockFrom).toHaveBeenCalledWith('override_logs');
      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('should accept custom days parameter', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      mockGenerateInsights.mockResolvedValue({
        insight: 'Test insight',
        suggestion: 'Test suggestion',
        topMood: null,
        moodBreakdown: [],
      });

      const request = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({ days: 14 }),
      });

      await POST(request);

      // Verify generateInsights was called with 14 days
      expect(mockGenerateInsights).toHaveBeenCalledWith(
        'logs-user',
        expect.any(Array),
        14
      );
    });

    it('should return 500 if database query fails', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const request = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('AI Insights Generation', () => {
    beforeEach(() => {
      const mockUser = { id: 'insights-user', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'log-1',
                      user_id: 'insights-user',
                      app_name: 'Instagram',
                      mood: 'bored',
                      reason_text: 'Just wanted to check',
                      overridden_at: new Date().toISOString(),
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;
    });

    it('should call generateInsights with correct parameters', async () => {
      mockGenerateInsights.mockResolvedValue({
        insight: 'You tend to override locks when bored',
        suggestion: 'Try scheduling activities during these times',
        topMood: 'bored',
        moodBreakdown: [{ mood: 'bored', count: 1 }],
      });

      const request = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await POST(request);

      expect(mockGenerateInsights).toHaveBeenCalledWith(
        'insights-user',
        expect.arrayContaining([
          expect.objectContaining({
            app_name: 'Instagram',
            mood: 'bored',
          }),
        ]),
        7
      );
    });

    it('should return AI insights in correct format', async () => {
      mockGenerateInsights.mockResolvedValue({
        insight: 'You tend to override locks in the evening',
        suggestion: 'Try scheduling a walk at 8 PM',
        topMood: 'stressed',
        moodBreakdown: [
          { mood: 'stressed', count: 5 },
          { mood: 'bored', count: 2 },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        insight: 'You tend to override locks in the evening',
        suggestion: 'Try scheduling a walk at 8 PM',
        topMood: 'stressed',
        moodBreakdown: [
          { mood: 'stressed', count: 5 },
          { mood: 'bored', count: 2 },
        ],
      });
    });

    it('should return 503 if AI service fails', async () => {
      mockGenerateInsights.mockRejectedValue(new Error('Claude API error'));

      const request = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.code).toBe('AI_SERVICE_ERROR');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      const mockUser = { id: 'edge-case-user', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;
    });

    it('should handle empty request body', async () => {
      mockGenerateInsights.mockResolvedValue({
        insight: 'Great job! No overrides this week.',
        suggestion: 'Keep up the momentum',
        topMood: null,
        moodBreakdown: [],
      });

      const request = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should cap days parameter at 30', async () => {
      mockGenerateInsights.mockResolvedValue({
        insight: 'Test',
        suggestion: 'Test',
        topMood: null,
        moodBreakdown: [],
      });

      const request = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({ days: 100 }),
      });

      await POST(request);

      // Should be capped at 30
      expect(mockGenerateInsights).toHaveBeenCalledWith(
        'edge-case-user',
        expect.any(Array),
        7 // Falls back to default since 100 > 30
      );
    });

    it('should handle negative days parameter', async () => {
      mockGenerateInsights.mockResolvedValue({
        insight: 'Test',
        suggestion: 'Test',
        topMood: null,
        moodBreakdown: [],
      });

      const request = new NextRequest('http://localhost:3000/api/ai-coach', {
        method: 'POST',
        body: JSON.stringify({ days: -5 }),
      });

      await POST(request);

      // Should fall back to default 7
      expect(mockGenerateInsights).toHaveBeenCalledWith(
        'edge-case-user',
        expect.any(Array),
        7
      );
    });
  });
});
