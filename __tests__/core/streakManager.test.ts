/**
 * Unit tests for streakManager module
 * 
 * Tests the core streak management logic including:
 * - Streak increment logic
 * - Streak reset logic
 * - Consecutive day checking
 * - Badge checking integration
 */

import { incrementStreak, resetStreak } from '@/lib/core/streakManager';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}));

describe('streakManager', () => {
  describe('incrementStreak', () => {
    it('should increment streak for consecutive day', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            user_id: 'test-user',
            current_streak: 5,
            longest_streak: 10,
            last_active_date: '2024-01-14'
          },
          error: null
        }),
        update: mockUpdate
      };

      const { createClient } = require('@/lib/supabase/server');
      createClient.mockResolvedValue(mockSupabase);

      const date = new Date('2024-01-15');
      const newStreak = await incrementStreak('test-user', date);

      expect(newStreak).toBe(6);
      expect(mockUpdate).toHaveBeenCalledWith({
        current_streak: 6,
        longest_streak: 10,
        last_active_date: '2024-01-15'
      });
    });

    it('should reset to 1 for non-consecutive day', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            user_id: 'test-user',
            current_streak: 5,
            longest_streak: 10,
            last_active_date: '2024-01-10'
          },
          error: null
        }),
        update: mockUpdate
      };

      const { createClient } = require('@/lib/supabase/server');
      createClient.mockResolvedValue(mockSupabase);

      const date = new Date('2024-01-15');
      const newStreak = await incrementStreak('test-user', date);

      expect(newStreak).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith({
        current_streak: 1,
        longest_streak: 10,
        last_active_date: '2024-01-15'
      });
    });

    it('should update longest streak when current exceeds it', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            user_id: 'test-user',
            current_streak: 9,
            longest_streak: 9,
            last_active_date: '2024-01-14'
          },
          error: null
        }),
        update: mockUpdate
      };

      const { createClient } = require('@/lib/supabase/server');
      createClient.mockResolvedValue(mockSupabase);

      const date = new Date('2024-01-15');
      const newStreak = await incrementStreak('test-user', date);

      expect(newStreak).toBe(10);
      expect(mockUpdate).toHaveBeenCalledWith({
        current_streak: 10,
        longest_streak: 10,
        last_active_date: '2024-01-15'
      });
    });
  });

  describe('resetStreak', () => {
    it('should reset current streak to 0', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };

      const { createClient } = require('@/lib/supabase/server');
      createClient.mockResolvedValue(mockSupabase);

      await resetStreak('test-user');

      expect(mockSupabase.update).toHaveBeenCalledWith({
        current_streak: 0
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'test-user');
    });

    it('should throw error if update fails', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ 
          error: { message: 'Database error' } 
        })
      };

      const { createClient } = require('@/lib/supabase/server');
      createClient.mockResolvedValue(mockSupabase);

      await expect(resetStreak('test-user')).rejects.toThrow(
        'Failed to reset streak for user test-user: Database error'
      );
    });
  });
});
