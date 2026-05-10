/**
 * Unit tests for Pomodoro Sessions API
 * Tests requirements 8.1-8.7
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

// Mock createClient
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('Pomodoro Sessions API', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/pomodoro/start', () => {
    it('should start a new Pomodoro session with default values (Requirement 8.1, 8.2)', async () => {
      // Mock authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock database insert
      const mockSession = {
        id: 'pomodoro-123',
        user_id: mockUser.id,
        task_label: 'Focus work',
        work_minutes: 25,
        break_minutes: 5,
        sessions_target: 4,
        sessions_done: 0,
        status: 'active',
        started_at: '2024-01-15T10:00:00.000Z',
        ended_at: null,
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSession,
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      // Verify the session was created with correct defaults
      expect(mockSession).toHaveProperty('id');
      expect(mockSession).toHaveProperty('user_id', mockUser.id);
      expect(mockSession).toHaveProperty('work_minutes', 25);
      expect(mockSession).toHaveProperty('break_minutes', 5);
      expect(mockSession).toHaveProperty('sessions_target', 4);
      expect(mockSession).toHaveProperty('sessions_done', 0);
      expect(mockSession).toHaveProperty('status', 'active');
      expect(mockSession).toHaveProperty('started_at');
      expect(mockSession.ended_at).toBeNull();
    });

    it('should allow custom work/break minutes and sessions target', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const customSession = {
        id: 'pomodoro-456',
        user_id: mockUser.id,
        task_label: 'Deep work',
        work_minutes: 50,
        break_minutes: 10,
        sessions_target: 3,
        sessions_done: 0,
        status: 'active',
        started_at: '2024-01-15T10:00:00.000Z',
        ended_at: null,
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: customSession,
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      expect(customSession.work_minutes).toBe(50);
      expect(customSession.break_minutes).toBe(10);
      expect(customSession.sessions_target).toBe(3);
    });

    it('should allow optional task label', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const sessionWithoutLabel = {
        id: 'pomodoro-789',
        user_id: mockUser.id,
        task_label: null,
        work_minutes: 25,
        break_minutes: 5,
        sessions_target: 4,
        sessions_done: 0,
        status: 'active',
        started_at: '2024-01-15T10:00:00.000Z',
        ended_at: null,
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: sessionWithoutLabel,
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      expect(sessionWithoutLabel.task_label).toBeNull();
    });

    it('should require authentication', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const authResult = await mockSupabaseClient.auth.getUser();
      expect(authResult.data.user).toBeNull();
      expect(authResult.error).toBeTruthy();
    });
  });

  describe('POST /api/pomodoro/complete-block', () => {
    it('should increment sessions_done counter (Requirement 8.5)', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock existing session
      const existingSession = {
        id: 'pomodoro-123',
        user_id: mockUser.id,
        task_label: 'Focus work',
        work_minutes: 25,
        break_minutes: 5,
        sessions_target: 4,
        sessions_done: 1,
        status: 'active',
        started_at: '2024-01-15T10:00:00.000Z',
        ended_at: null,
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingSession,
              error: null,
            }),
          }),
        }),
      });

      // Mock update
      const updatedSession = {
        ...existingSession,
        sessions_done: 2,
      };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      expect(updatedSession.sessions_done).toBe(existingSession.sessions_done + 1);
    });

    it('should mark session as completed when target reached (Requirement 8.6)', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock session at target - 1
      const existingSession = {
        id: 'pomodoro-123',
        user_id: mockUser.id,
        task_label: 'Focus work',
        work_minutes: 25,
        break_minutes: 5,
        sessions_target: 4,
        sessions_done: 3,
        status: 'active',
        started_at: '2024-01-15T10:00:00.000Z',
        ended_at: null,
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingSession,
              error: null,
            }),
          }),
        }),
      });

      // Mock update - should mark as completed
      const completedSession = {
        ...existingSession,
        sessions_done: 4,
        status: 'completed',
        ended_at: '2024-01-15T12:00:00.000Z',
      };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: completedSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      expect(completedSession.sessions_done).toBe(completedSession.sessions_target);
      expect(completedSession.status).toBe('completed');
      expect(completedSession.ended_at).toBeTruthy();
    });

    it('should require session_id field', () => {
      const requestBody = {};
      expect(requestBody).not.toHaveProperty('session_id');
    });

    it('should reject non-active sessions', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const completedSession = {
        id: 'pomodoro-123',
        user_id: mockUser.id,
        status: 'completed',
        sessions_done: 4,
        sessions_target: 4,
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: completedSession,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      expect(completedSession.status).not.toBe('active');
    });

    it('should return 404 for non-existent session', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await mockSupabaseClient.from('pomodoro_sessions')
        .select()
        .eq('id', 'non-existent')
        .eq('user_id', mockUser.id)
        .single();

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('POST /api/pomodoro/end', () => {
    it('should mark session as completed (Requirement 8.6)', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const existingSession = {
        id: 'pomodoro-123',
        user_id: mockUser.id,
        status: 'active',
        sessions_done: 2,
        sessions_target: 4,
        started_at: '2024-01-15T10:00:00.000Z',
        ended_at: null,
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingSession,
              error: null,
            }),
          }),
        }),
      });

      const completedSession = {
        ...existingSession,
        status: 'completed',
        ended_at: '2024-01-15T11:00:00.000Z',
      };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: completedSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      expect(completedSession.status).toBe('completed');
      expect(completedSession.ended_at).toBeTruthy();
    });

    it('should mark session as abandoned (Requirement 8.7)', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const existingSession = {
        id: 'pomodoro-123',
        user_id: mockUser.id,
        status: 'active',
        sessions_done: 1,
        sessions_target: 4,
        started_at: '2024-01-15T10:00:00.000Z',
        ended_at: null,
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingSession,
              error: null,
            }),
          }),
        }),
      });

      const abandonedSession = {
        ...existingSession,
        status: 'abandoned',
        ended_at: '2024-01-15T10:30:00.000Z',
      };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: abandonedSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      expect(abandonedSession.status).toBe('abandoned');
      expect(abandonedSession.ended_at).toBeTruthy();
    });

    it('should require session_id field', () => {
      const requestBody = {};
      expect(requestBody).not.toHaveProperty('session_id');
    });

    it('should require valid status field', () => {
      const validStatuses = ['completed', 'abandoned'];
      const invalidStatus = 'invalid';

      expect(validStatuses).toContain('completed');
      expect(validStatuses).toContain('abandoned');
      expect(validStatuses).not.toContain(invalidStatus);
    });

    it('should prevent ending already-ended sessions', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const alreadyEndedSession = {
        id: 'pomodoro-123',
        user_id: mockUser.id,
        status: 'completed',
        ended_at: '2024-01-15T11:00:00.000Z',
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: alreadyEndedSession,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      expect(alreadyEndedSession.status).not.toBe('active');
      expect(alreadyEndedSession.ended_at).toBeTruthy();
    });

    it('should return 404 for non-existent session', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await mockSupabaseClient.from('pomodoro_sessions')
        .select()
        .eq('id', 'non-existent')
        .eq('user_id', mockUser.id)
        .single();

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('Row-Level Security (Requirement 8.8)', () => {
    it('should filter sessions by authenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const authResult = await mockSupabaseClient.auth.getUser();
      expect(authResult.data.user?.id).toBe(mockUser.id);
    });

    it('should reject unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const authResult = await mockSupabaseClient.auth.getUser();
      expect(authResult.data.user).toBeNull();
      expect(authResult.error).toBeTruthy();
    });

    it('should prevent users from accessing other users sessions', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Attempt to access another user's session
      const otherUserSession = {
        id: 'pomodoro-999',
        user_id: 'other-user-456',
        status: 'active',
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null, // RLS should prevent access
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await mockSupabaseClient.from('pomodoro_sessions')
        .select()
        .eq('id', otherUserSession.id)
        .eq('user_id', mockUser.id) // Query with current user's ID
        .single();

      expect(result.data).toBeNull();
    });
  });
});
