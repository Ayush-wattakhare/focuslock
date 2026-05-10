// Stats API Unit Tests
// Tests for GET /api/stats endpoint

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Stats API', () => {
  let mockSupabase: any;
  let mockAuth: any;
  let mockFrom: any;

  beforeEach(() => {
    // Reset mocks
    mockAuth = {
      getUser: jest.fn(),
    };

    mockFrom = jest.fn();

    mockSupabase = {
      auth: mockAuth,
      from: mockFrom,
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/stats', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Mock unauthenticated user
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const { GET } = await import('@/app/api/stats/route');
      const request = new Request('http://localhost:3000/api/stats?period=week');
      const response = await GET(request as any);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe('AUTH_REQUIRED');
    });

    it('should return weekly stats for authenticated user', async () => {
      // Mock authenticated user
      const mockUserId = 'test-user-123';
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock usage sessions for current week
      const mockCurrentWeekSessions = [
        { app_name: 'Instagram', minutes_used: 30, date: '2024-01-15' },
        { app_name: 'Instagram', minutes_used: 20, date: '2024-01-16' },
        { app_name: 'YouTube', minutes_used: 45, date: '2024-01-15' },
      ];

      // Mock previous week sessions
      const mockPreviousWeekSessions = [
        { minutes_used: 60 },
        { minutes_used: 40 },
      ];

      // Mock override logs
      const mockOverrideLogs = [
        { app_name: 'Instagram', overridden_at: '2024-01-15T10:00:00' },
      ];

      // Setup mock chain for usage_sessions (current week)
      const mockCurrentWeekQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ data: mockCurrentWeekSessions, error: null }),
      };

      // Setup mock chain for usage_sessions (previous week)
      const mockPreviousWeekQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ data: mockPreviousWeekSessions, error: null }),
      };

      // Setup mock chain for override_logs
      const mockOverrideQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockResolvedValue({ data: mockOverrideLogs, error: null }),
      };

      // Mock from() to return different query chains based on table name
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'usage_sessions') {
          callCount++;
          return callCount === 1 ? mockCurrentWeekQuery : mockPreviousWeekQuery;
        } else if (table === 'override_logs') {
          return mockOverrideQuery;
        }
        return mockCurrentWeekQuery;
      });

      const { GET } = await import('@/app/api/stats/route');
      const request = new Request('http://localhost:3000/api/stats?period=week');
      const response = await GET(request as any);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify response structure
      expect(data).toHaveProperty('dailyUsage');
      expect(data).toHaveProperty('perAppBreakdown');
      expect(data).toHaveProperty('weekOverWeek');
      expect(data).toHaveProperty('compliance');
      expect(data).toHaveProperty('timeSaved');

      // Verify dailyUsage is an array
      expect(Array.isArray(data.dailyUsage)).toBe(true);

      // Verify perAppBreakdown contains aggregated data
      expect(Array.isArray(data.perAppBreakdown)).toBe(true);
      expect(data.perAppBreakdown.length).toBeGreaterThan(0);

      // Verify weekOverWeek comparison
      expect(data.weekOverWeek).toHaveProperty('current_week_minutes');
      expect(data.weekOverWeek).toHaveProperty('previous_week_minutes');
      expect(data.weekOverWeek).toHaveProperty('change_percentage');

      // Verify compliance metrics
      expect(data.compliance).toHaveProperty('days_without_override');
      expect(data.compliance).toHaveProperty('total_days');
      expect(data.compliance).toHaveProperty('percentage');
      expect(data.compliance.total_days).toBeGreaterThanOrEqual(7); // One week (7-8 days depending on date range)

      // Verify timeSaved is a number
      expect(typeof data.timeSaved).toBe('number');
    });

    it('should return validation error for invalid period', async () => {
      // Mock authenticated user
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      });

      const { GET } = await import('@/app/api/stats/route');
      const request = new Request('http://localhost:3000/api/stats?period=month');
      const response = await GET(request as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle database errors gracefully', async () => {
      // Mock authenticated user
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      });

      // Mock database error
      const mockErrorQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      };

      mockFrom.mockReturnValue(mockErrorQuery);

      const { GET } = await import('@/app/api/stats/route');
      const request = new Request('http://localhost:3000/api/stats?period=week');
      const response = await GET(request as any);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error.code).toBe('DATABASE_ERROR');
    });

    it('should calculate per-app breakdown correctly', async () => {
      // Mock authenticated user
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      });

      // Mock sessions with multiple apps
      const mockSessions = [
        { app_name: 'Instagram', minutes_used: 30, date: '2024-01-15' },
        { app_name: 'Instagram', minutes_used: 20, date: '2024-01-16' },
        { app_name: 'YouTube', minutes_used: 45, date: '2024-01-15' },
        { app_name: 'TikTok', minutes_used: 15, date: '2024-01-17' },
      ];

      const mockOverrides = [
        { app_name: 'Instagram', overridden_at: '2024-01-15T10:00:00' },
        { app_name: 'Instagram', overridden_at: '2024-01-16T14:00:00' },
        { app_name: 'YouTube', overridden_at: '2024-01-15T20:00:00' },
      ];

      const mockCurrentWeekQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ data: mockSessions, error: null }),
      };

      const mockPreviousWeekQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      const mockOverrideQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockResolvedValue({ data: mockOverrides, error: null }),
      };

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'usage_sessions') {
          callCount++;
          return callCount === 1 ? mockCurrentWeekQuery : mockPreviousWeekQuery;
        } else if (table === 'override_logs') {
          return mockOverrideQuery;
        }
        return mockCurrentWeekQuery;
      });

      const { GET } = await import('@/app/api/stats/route');
      const request = new Request('http://localhost:3000/api/stats?period=week');
      const response = await GET(request as any);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify per-app breakdown
      const instagramBreakdown = data.perAppBreakdown.find(
        (app: any) => app.app_name === 'Instagram'
      );
      expect(instagramBreakdown).toBeDefined();
      expect(instagramBreakdown.total_minutes).toBe(50); // 30 + 20
      expect(instagramBreakdown.override_count).toBe(2);

      const youtubeBreakdown = data.perAppBreakdown.find(
        (app: any) => app.app_name === 'YouTube'
      );
      expect(youtubeBreakdown).toBeDefined();
      expect(youtubeBreakdown.total_minutes).toBe(45);
      expect(youtubeBreakdown.override_count).toBe(1);

      const tiktokBreakdown = data.perAppBreakdown.find(
        (app: any) => app.app_name === 'TikTok'
      );
      expect(tiktokBreakdown).toBeDefined();
      expect(tiktokBreakdown.total_minutes).toBe(15);
      expect(tiktokBreakdown.override_count).toBe(0);
    });
  });
});
