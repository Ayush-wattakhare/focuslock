/**
 * Unit Tests for Override API
 * Tests the POST /api/override endpoint
 */

import { POST } from '@/app/api/override/route';
import { createClient } from '@/lib/supabase/server';
import { resetStreak } from '@/lib/core/streakManager';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/core/streakManager');

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockResetStreak = resetStreak as jest.MockedFunction<typeof resetStreak>;

describe('POST /api/override', () => {
  let mockSupabase: any;
  const mockUserId = 'user-123';
  const mockLockRuleId = 'rule-456';
  const mockAppName = 'Instagram';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default Supabase mock
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    mockCreateClient.mockResolvedValue(mockSupabase as any);
  });

  const createMockRequest = (body: any): NextRequest => {
    return {
      json: async () => body,
    } as NextRequest;
  };

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'bored',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });
    });

    it('should return 400 if lock_rule_id is missing', async () => {
      const request = createMockRequest({
        app_name: mockAppName,
        mood: 'bored',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('lock_rule_id');
    });

    it('should return 400 if app_name is missing', async () => {
      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        mood: 'bored',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('app_name');
    });

    it('should return 400 if mood is missing', async () => {
      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('mood');
    });

    it('should return 400 if mood is invalid', async () => {
      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'invalid_mood',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid mood');
    });

    it('should accept all valid mood values', async () => {
      const validMoods = ['bored', 'stressed', 'tired', 'news', 'other'];

      for (const mood of validMoods) {
        jest.clearAllMocks();
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        });

        // Mock lock rule check
        const mockFrom = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockLockRuleId, user_id: mockUserId, lock_type: 'timer' },
                  error: null,
                }),
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'log-123',
                  user_id: mockUserId,
                  lock_rule_id: mockLockRuleId,
                  app_name: mockAppName,
                  mood,
                  reason_text: null,
                  overridden_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        });

        mockSupabase.from = mockFrom;

        const request = createMockRequest({
          lock_rule_id: mockLockRuleId,
          app_name: mockAppName,
          mood,
        });

        const response = await POST(request);
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('Lock Rule Verification', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });
    });

    it('should return 404 if lock rule does not exist', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: new Error('Not found'),
              }),
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'bored',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 if lock rule belongs to different user', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: new Error('Not found'),
              }),
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'bored',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 if lock rule is nuclear mode', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: mockLockRuleId, user_id: mockUserId, lock_type: 'nuclear' },
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'bored',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toContain('nuclear mode');
    });
  });

  describe('Override Logging', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });
    });

    it('should successfully log override with all fields', async () => {
      const mockLog = {
        id: 'log-123',
        user_id: mockUserId,
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'stressed',
        reason_text: 'Need to check important message',
        overridden_at: new Date().toISOString(),
      };

      const mockFrom = jest.fn((table: string) => {
        if (table === 'lock_rules') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: mockLockRuleId, user_id: mockUserId, lock_type: 'timer' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'override_logs') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockLog,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'buddies') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  mockResolvedValue: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      mockSupabase.from = mockFrom;
      mockResetStreak.mockResolvedValue();

      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'stressed',
        reason_text: 'Need to check important message',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.log).toEqual(mockLog);
    });

    it('should log override without reason_text', async () => {
      const mockLog = {
        id: 'log-123',
        user_id: mockUserId,
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'bored',
        reason_text: null,
        overridden_at: new Date().toISOString(),
      };

      const mockFrom = jest.fn((table: string) => {
        if (table === 'lock_rules') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: mockLockRuleId, user_id: mockUserId, lock_type: 'schedule' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'override_logs') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockLog,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'buddies') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  mockResolvedValue: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      mockSupabase.from = mockFrom;
      mockResetStreak.mockResolvedValue();

      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'bored',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.log.reason_text).toBeNull();
    });
  });

  describe('Streak Reset', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockFrom = jest.fn((table: string) => {
        if (table === 'lock_rules') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: mockLockRuleId, user_id: mockUserId, lock_type: 'timer' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'override_logs') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'log-123',
                    user_id: mockUserId,
                    lock_rule_id: mockLockRuleId,
                    app_name: mockAppName,
                    mood: 'bored',
                    reason_text: null,
                    overridden_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'buddies') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  mockResolvedValue: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      mockSupabase.from = mockFrom;
    });

    it('should call resetStreak with user ID', async () => {
      mockResetStreak.mockResolvedValue();

      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'bored',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(mockResetStreak).toHaveBeenCalledWith(mockUserId);
      expect(data.streakBroken).toBe(true);
    });

    it('should continue if resetStreak fails', async () => {
      mockResetStreak.mockRejectedValue(new Error('Streak reset failed'));

      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'bored',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.streakBroken).toBe(false);
      expect(data.log).toBeDefined();
    });
  });

  describe('Buddy Notifications', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      mockResetStreak.mockResolvedValue();
    });

    it('should not notify if user has no buddies', async () => {
      const mockFrom = jest.fn((table: string) => {
        if (table === 'lock_rules') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: mockLockRuleId, user_id: mockUserId, lock_type: 'timer' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'override_logs') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'log-123',
                    user_id: mockUserId,
                    lock_rule_id: mockLockRuleId,
                    app_name: mockAppName,
                    mood: 'bored',
                    reason_text: null,
                    overridden_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'buddies') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      mockSupabase.from = mockFrom;

      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'bored',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.buddyNotified).toBe(false);
    });

    it('should notify buddy watching this specific rule', async () => {
      const buddyUserId = 'buddy-789';
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      const mockFrom = jest.fn((table: string) => {
        if (table === 'lock_rules') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: mockLockRuleId, user_id: mockUserId, lock_type: 'timer' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'override_logs') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'log-123',
                    user_id: mockUserId,
                    lock_rule_id: mockLockRuleId,
                    app_name: mockAppName,
                    mood: 'bored',
                    reason_text: null,
                    overridden_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'buddies') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    {
                      buddy_user_id: buddyUserId,
                      rules_watching: [mockLockRuleId],
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'buddy_notifications') {
          return {
            insert: mockInsert,
          };
        }
        return {};
      });

      mockSupabase.from = mockFrom;

      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'bored',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.buddyNotified).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith([
        {
          from_user_id: mockUserId,
          to_user_id: buddyUserId,
          event_type: 'override',
          app_name: mockAppName,
          message: `Your buddy overrode their ${mockAppName} lock`,
          is_read: false,
        },
      ]);
    });

    it('should notify buddy watching all rules (null rules_watching)', async () => {
      const buddyUserId = 'buddy-789';
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      const mockFrom = jest.fn((table: string) => {
        if (table === 'lock_rules') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: mockLockRuleId, user_id: mockUserId, lock_type: 'timer' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'override_logs') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'log-123',
                    user_id: mockUserId,
                    lock_rule_id: mockLockRuleId,
                    app_name: mockAppName,
                    mood: 'bored',
                    reason_text: null,
                    overridden_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'buddies') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    {
                      buddy_user_id: buddyUserId,
                      rules_watching: null,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'buddy_notifications') {
          return {
            insert: mockInsert,
          };
        }
        return {};
      });

      mockSupabase.from = mockFrom;

      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'bored',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.buddyNotified).toBe(true);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should not notify buddy not watching this rule', async () => {
      const buddyUserId = 'buddy-789';
      const otherRuleId = 'other-rule-999';

      const mockFrom = jest.fn((table: string) => {
        if (table === 'lock_rules') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: mockLockRuleId, user_id: mockUserId, lock_type: 'timer' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'override_logs') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'log-123',
                    user_id: mockUserId,
                    lock_rule_id: mockLockRuleId,
                    app_name: mockAppName,
                    mood: 'bored',
                    reason_text: null,
                    overridden_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'buddies') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    {
                      buddy_user_id: buddyUserId,
                      rules_watching: [otherRuleId], // Watching different rule
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      mockSupabase.from = mockFrom;

      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'bored',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.buddyNotified).toBe(false);
    });

    it('should continue if buddy notification fails', async () => {
      const buddyUserId = 'buddy-789';

      const mockFrom = jest.fn((table: string) => {
        if (table === 'lock_rules') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: mockLockRuleId, user_id: mockUserId, lock_type: 'timer' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'override_logs') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'log-123',
                    user_id: mockUserId,
                    lock_rule_id: mockLockRuleId,
                    app_name: mockAppName,
                    mood: 'bored',
                    reason_text: null,
                    overridden_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'buddies') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    {
                      buddy_user_id: buddyUserId,
                      rules_watching: [mockLockRuleId],
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'buddy_notifications') {
          return {
            insert: jest.fn().mockResolvedValue({
              error: new Error('Notification failed'),
            }),
          };
        }
        return {};
      });

      mockSupabase.from = mockFrom;

      const request = createMockRequest({
        lock_rule_id: mockLockRuleId,
        app_name: mockAppName,
        mood: 'bored',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.buddyNotified).toBe(false);
      expect(data.log).toBeDefined();
    });
  });
});
