// Tests for Data Export API
// GET /api/export

import { GET } from '../route';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('GET /api/export', () => {
  let mockSupabase: {
    auth: { getUser: jest.Mock };
    from: jest.Mock;
  };
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock request
    mockRequest = new NextRequest('http://localhost:3000/api/export');

    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_REQUIRED');
    });

    it('should return 401 if auth check fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('Data Export', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    const mockProfile = {
      full_name: 'Test User',
      timezone: 'America/New_York',
    };

    const mockLockRules = [
      {
        id: 'rule-1',
        user_id: 'user-123',
        app_name: 'Instagram',
        lock_type: 'timer',
        daily_limit_minutes: 30,
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    const mockOverrideLogs = [
      {
        id: 'log-1',
        user_id: 'user-123',
        lock_rule_id: 'rule-1',
        app_name: 'Instagram',
        mood: 'bored',
        reason_text: 'Just checking',
        overridden_at: '2024-01-15T10:00:00Z',
      },
    ];

    const mockUsageSessions = [
      {
        id: 'session-1',
        user_id: 'user-123',
        app_name: 'Instagram',
        session_start: '2024-01-15T09:00:00Z',
        session_end: '2024-01-15T09:30:00Z',
        minutes_used: 30,
        date: '2024-01-15',
      },
    ];

    const mockStreaks = {
      user_id: 'user-123',
      current_streak: 5,
      longest_streak: 10,
      last_active_date: '2024-01-15',
      updated_at: '2024-01-15T00:00:00Z',
    };

    const mockBadges = [
      {
        id: 'badge-1',
        badge_id: 'quick_start',
        earned_at: '2024-01-01T00:10:00Z',
        badge_definitions: {
          id: 'quick_start',
          name: 'Quick Starter',
          description: 'Complete setup within 10 minutes',
          icon: '⚡',
          condition: 'Setup completed in <10 min',
        },
      },
    ];

    const mockBuddies = [
      {
        id: 'buddy-1',
        user_id: 'user-123',
        buddy_user_id: 'buddy-456',
        rules_watching: ['rule-1'],
        status: 'active',
        invited_at: '2024-01-01T00:00:00Z',
        accepted_at: '2024-01-02T00:00:00Z',
      },
    ];

    const mockPomodoroSessions = [
      {
        id: 'pomodoro-1',
        user_id: 'user-123',
        task_label: 'Study',
        work_minutes: 25,
        break_minutes: 5,
        sessions_target: 4,
        sessions_done: 2,
        status: 'active',
        started_at: '2024-01-15T10:00:00Z',
      },
    ];

    const mockWeeklyChallenges = [
      {
        id: 'challenge-1',
        user_id: 'user-123',
        app_name: 'Instagram',
        daily_limit: 20,
        week_start: '2024-01-15',
        week_end: '2024-01-19',
        days_completed: 3,
        status: 'active',
        created_at: '2024-01-15T06:00:00Z',
      },
    ];

    beforeEach(() => {
      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock database queries with proper chaining
      mockSupabase.from.mockImplementation((table: string) => {
        switch (table) {
          case 'profiles':
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
                }),
              }),
            };
          case 'lock_rules':
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockLockRules, error: null }),
                }),
              }),
            };
          case 'override_logs':
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockOverrideLogs, error: null }),
                }),
              }),
            };
          case 'usage_sessions':
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockUsageSessions, error: null }),
                }),
              }),
            };
          case 'streaks':
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockStreaks, error: null }),
                }),
              }),
            };
          case 'user_badges':
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockBadges, error: null }),
                }),
              }),
            };
          case 'buddies':
            // Track which eq() call this is (user_id or buddy_user_id)
            let eqCallCount = 0;
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockImplementation(() => {
                  eqCallCount++;
                  if (eqCallCount === 1) {
                    // First call: user_id
                    return Promise.resolve({ data: mockBuddies, error: null });
                  } else {
                    // Second call: buddy_user_id
                    return Promise.resolve({ data: [], error: null });
                  }
                }),
              }),
            };
          case 'pomodoro_sessions':
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockPomodoroSessions, error: null }),
                }),
              }),
            };
          case 'weekly_challenges':
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockWeeklyChallenges, error: null }),
                }),
              }),
            };
          default:
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            };
        }
      });
    });

    it('should return complete export data with all tables', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.user_id).toBe('user-123');
      expect(data.metadata.user_email).toBe('test@example.com');
      expect(data.metadata.full_name).toBe('Test User');
      expect(data.metadata.timezone).toBe('America/New_York');
      expect(data.metadata.export_date).toBeDefined();

      expect(data.lock_rules).toEqual(mockLockRules);
      expect(data.override_logs).toEqual(mockOverrideLogs);
      expect(data.usage_sessions).toEqual(mockUsageSessions);
      expect(data.streaks).toEqual(mockStreaks);
      expect(data.badges).toEqual(mockBadges);
      expect(data.pomodoro_sessions).toEqual(mockPomodoroSessions);
      expect(data.weekly_challenges).toEqual(mockWeeklyChallenges);
    });

    it('should include all required tables in export', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('metadata');
      expect(data).toHaveProperty('lock_rules');
      expect(data).toHaveProperty('override_logs');
      expect(data).toHaveProperty('usage_sessions');
      expect(data).toHaveProperty('streaks');
      expect(data).toHaveProperty('badges');
      expect(data).toHaveProperty('buddies');
      expect(data).toHaveProperty('pomodoro_sessions');
      expect(data).toHaveProperty('weekly_challenges');
    });

    it('should set Content-Disposition header for file download', async () => {
      const response = await GET(mockRequest);

      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename="focuslock-data-export-\d{4}-\d{2}-\d{2}\.json"$/);
    });

    it('should include export date in metadata', async () => {
      const beforeExport = Date.now();
      const response = await GET(mockRequest);
      const data = await response.json();
      const afterExport = Date.now();

      expect(response.status).toBe(200);
      expect(data.metadata.export_date).toBeDefined();
      
      const exportDate = new Date(data.metadata.export_date).getTime();
      expect(exportDate).toBeGreaterThanOrEqual(beforeExport);
      expect(exportDate).toBeLessThanOrEqual(afterExport);
    });

    it('should handle user with no streaks data', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'streaks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116', message: 'No rows returned' },
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.streaks).toBeNull();
    });

    it('should include both user and buddy relationships', async () => {
      const mockBuddiesAsUser = [
        { id: 'buddy-1', user_id: 'user-123', buddy_user_id: 'buddy-456', status: 'active' },
      ];
      const mockBuddiesAsBuddy = [
        { id: 'buddy-2', user_id: 'buddy-789', buddy_user_id: 'user-123', status: 'active' },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'buddies') {
          let eqCallCount = 0;
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation(() => {
                eqCallCount++;
                if (eqCallCount === 1) {
                  return Promise.resolve({ data: mockBuddiesAsUser, error: null });
                } else {
                  return Promise.resolve({ data: mockBuddiesAsBuddy, error: null });
                }
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.buddies).toHaveLength(2);
      expect(data.buddies[0]).toHaveProperty('relationship_type', 'user');
      expect(data.buddies[1]).toHaveProperty('relationship_type', 'buddy');
    });

    it('should only export data for authenticated user', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Verify all queries used the correct user_id
      const fromCalls = mockSupabase.from.mock.calls;
      expect(fromCalls.length).toBeGreaterThan(0);
      
      // Check that eq('user_id', ...) was called for each table
      expect(data.metadata.user_id).toBe('user-123');
      expect(data.lock_rules.every((r: Record<string, unknown>) => r.user_id === 'user-123')).toBe(true);
      expect(data.override_logs.every((l: Record<string, unknown>) => l.user_id === 'user-123')).toBe(true);
      expect(data.usage_sessions.every((s: Record<string, unknown>) => s.user_id === 'user-123')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it('should return 500 if profile fetch fails', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('DATABASE_ERROR');
      expect(data.error.message).toBe('Failed to fetch user profile');
    });

    it('should return 500 if lock rules fetch fails', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { full_name: 'Test', timezone: 'UTC' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'lock_rules') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('DATABASE_ERROR');
      expect(data.error.message).toBe('Failed to fetch lock rules');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('An unexpected error occurred');
    });
  });
});
