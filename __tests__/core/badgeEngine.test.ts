/**
 * Unit tests for badgeEngine module
 */

import { evaluateBadgeCondition, awardBadge, checkAndAwardBadges } from '@/lib/core/badgeEngine';
import type { BadgeDefinition } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

describe('badgeEngine', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client with proper chaining
    const createMockChain = () => ({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    });

    mockSupabase = createMockChain();

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('evaluateBadgeCondition', () => {
    describe('quick_start badge', () => {
      const quickStartBadge: BadgeDefinition = {
        id: 'quick_start',
        name: 'Quick Starter',
        description: 'Complete setup within 10 minutes',
        icon: '⚡',
        condition: 'Setup completed in <10 min',
      };

      it('should return true if onboarding completed within 10 minutes', async () => {
        const now = new Date();
        const createdAt = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

        mockSupabase.single.mockResolvedValue({
          data: { id: 'user1', created_at: createdAt.toISOString() },
          error: null,
        });

        const result = await evaluateBadgeCondition(
          'user1',
          quickStartBadge,
          'onboarding_complete',
          {}
        );

        expect(result).toBe(true);
      });

      it('should return false if onboarding completed after 10 minutes', async () => {
        const now = new Date();
        const createdAt = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes ago

        mockSupabase.single.mockResolvedValue({
          data: { id: 'user1', created_at: createdAt.toISOString() },
          error: null,
        });

        const result = await evaluateBadgeCondition(
          'user1',
          quickStartBadge,
          'onboarding_complete',
          {}
        );

        expect(result).toBe(false);
      });

      it('should return false if event type is not onboarding_complete', async () => {
        const result = await evaluateBadgeCondition(
          'user1',
          quickStartBadge,
          'streak_updated',
          {}
        );

        expect(result).toBe(false);
      });
    });

    describe('first_week and seven_day_warrior badges', () => {
      const firstWeekBadge: BadgeDefinition = {
        id: 'first_week',
        name: 'First Week Clean',
        description: 'Maintain 7-day streak',
        icon: '🌱',
        condition: '7-day streak',
      };

      it('should return true if current streak is 7 or more', async () => {
        const result = await evaluateBadgeCondition(
          'user1',
          firstWeekBadge,
          'streak_updated',
          { currentStreak: 7 }
        );

        expect(result).toBe(true);
      });

      it('should return false if current streak is less than 7', async () => {
        const result = await evaluateBadgeCondition(
          'user1',
          firstWeekBadge,
          'streak_updated',
          { currentStreak: 6 }
        );

        expect(result).toBe(false);
      });

      it('should return false if event type is not streak_updated', async () => {
        const result = await evaluateBadgeCondition(
          'user1',
          firstWeekBadge,
          'onboarding_complete',
          { currentStreak: 7 }
        );

        expect(result).toBe(false);
      });
    });

    describe('iron_will badge', () => {
      const ironWillBadge: BadgeDefinition = {
        id: 'iron_will',
        name: 'Iron Will',
        description: 'Complete a weekly challenge',
        icon: '🛡️',
        condition: 'Complete weekly challenge',
      };

      it('should return true if event type is challenge_completed', async () => {
        const result = await evaluateBadgeCondition(
          'user1',
          ironWillBadge,
          'challenge_completed',
          {}
        );

        expect(result).toBe(true);
      });

      it('should return false if event type is not challenge_completed', async () => {
        const result = await evaluateBadgeCondition(
          'user1',
          ironWillBadge,
          'streak_updated',
          {}
        );

        expect(result).toBe(false);
      });
    });

    describe('social_detox badge', () => {
      const socialDetoxBadge: BadgeDefinition = {
        id: 'social_detox',
        name: 'Social Detox',
        description: 'Maintain 30-day streak',
        icon: '🧘',
        condition: '30-day streak',
      };

      it('should return true if current streak is 30 or more', async () => {
        const result = await evaluateBadgeCondition(
          'user1',
          socialDetoxBadge,
          'streak_updated',
          { currentStreak: 30 }
        );

        expect(result).toBe(true);
      });

      it('should return false if current streak is less than 30', async () => {
        const result = await evaluateBadgeCondition(
          'user1',
          socialDetoxBadge,
          'streak_updated',
          { currentStreak: 29 }
        );

        expect(result).toBe(false);
      });
    });

    describe('night_owl_slayer badge', () => {
      const nightOwlBadge: BadgeDefinition = {
        id: 'night_owl_slayer',
        name: 'Night Owl Slayer',
        description: '7 days of bedtime compliance',
        icon: '🌙',
        condition: '7 days bedtime mode',
      };

      it('should return true if 7 consecutive days of bedtime compliance', async () => {
        mockSupabase.order.mockResolvedValue({
          data: [], // No overrides in the period
          error: null,
        });

        const result = await evaluateBadgeCondition(
          'user1',
          nightOwlBadge,
          'bedtime_check',
          {}
        );

        expect(result).toBe(true);
      });

      it('should return false if less than 7 consecutive days', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        mockSupabase.order.mockResolvedValue({
          data: [{ overridden_at: yesterday.toISOString() }], // Override yesterday
          error: null,
        });

        const result = await evaluateBadgeCondition(
          'user1',
          nightOwlBadge,
          'bedtime_check',
          {}
        );

        expect(result).toBe(false);
      });

      it('should return false if event type is not bedtime_check', async () => {
        const result = await evaluateBadgeCondition(
          'user1',
          nightOwlBadge,
          'streak_updated',
          {}
        );

        expect(result).toBe(false);
      });
    });

    describe('pomodoro_master badge', () => {
      const pomodoroMasterBadge: BadgeDefinition = {
        id: 'pomodoro_master',
        name: 'Pomodoro Master',
        description: 'Complete 20 Pomodoro sessions',
        icon: '🍅',
        condition: '20 completed sessions',
      };

      it('should return true if 20 or more Pomodoro sessions completed', async () => {
        // Create a fresh mock for this test
        const mockChain = {
          from: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
        
        // The second eq() call should resolve with data
        mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({
          data: new Array(20).fill({ id: 'session' }),
          error: null,
        });

        (createClient as jest.Mock).mockReturnValue(mockChain);

        const result = await evaluateBadgeCondition(
          'user1',
          pomodoroMasterBadge,
          'pomodoro_completed',
          {}
        );

        expect(result).toBe(true);
      });

      it('should return false if less than 20 Pomodoro sessions completed', async () => {
        // Create a fresh mock for this test
        const mockChain = {
          from: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
        
        // The second eq() call should resolve with data
        mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({
          data: new Array(19).fill({ id: 'session' }),
          error: null,
        });

        (createClient as jest.Mock).mockReturnValue(mockChain);

        const result = await evaluateBadgeCondition(
          'user1',
          pomodoroMasterBadge,
          'pomodoro_completed',
          {}
        );

        expect(result).toBe(false);
      });

      it('should return false if event type is not pomodoro_completed', async () => {
        const result = await evaluateBadgeCondition(
          'user1',
          pomodoroMasterBadge,
          'streak_updated',
          {}
        );

        expect(result).toBe(false);
      });
    });

    describe('unknown badge', () => {
      it('should return false for unknown badge IDs', async () => {
        const unknownBadge: BadgeDefinition = {
          id: 'unknown_badge',
          name: 'Unknown',
          description: 'Unknown badge',
          icon: '❓',
          condition: 'Unknown',
        };

        const result = await evaluateBadgeCondition(
          'user1',
          unknownBadge,
          'streak_updated',
          {}
        );

        expect(result).toBe(false);
      });
    });
  });

  describe('awardBadge', () => {
    it('should insert a new user badge with duplicate prevention', async () => {
      mockSupabase.upsert.mockResolvedValue({
        data: null,
        error: null,
      });

      await awardBadge('user1', 'quick_start');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_badges');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user1',
          badge_id: 'quick_start',
        }),
        expect.objectContaining({
          onConflict: 'user_id,badge_id',
          ignoreDuplicates: true,
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockSupabase.upsert.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await awardBadge('user1', 'quick_start');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to award badge:',
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('checkAndAwardBadges', () => {
    it('should check all badges and award qualifying ones', async () => {
      const badges: BadgeDefinition[] = [
        {
          id: 'first_week',
          name: 'First Week Clean',
          description: 'Maintain 7-day streak',
          icon: '🌱',
          condition: '7-day streak',
        },
        {
          id: 'social_detox',
          name: 'Social Detox',
          description: 'Maintain 30-day streak',
          icon: '🧘',
          condition: '30-day streak',
        },
      ];

      // Mock badge definitions fetch
      mockSupabase.select.mockResolvedValueOnce({
        data: badges,
        error: null,
      });

      // Mock user badges fetch (no badges earned yet)
      mockSupabase.eq.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock upsert for awarding badge
      mockSupabase.upsert.mockResolvedValue({
        data: null,
        error: null,
      });

      await checkAndAwardBadges('user1', 'streak_updated', { currentStreak: 7 });

      // Should award first_week badge but not social_detox (streak < 30)
      expect(mockSupabase.upsert).toHaveBeenCalledTimes(1);
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          badge_id: 'first_week',
        }),
        expect.any(Object)
      );
    });

    it('should skip already earned badges', async () => {
      const badges: BadgeDefinition[] = [
        {
          id: 'first_week',
          name: 'First Week Clean',
          description: 'Maintain 7-day streak',
          icon: '🌱',
          condition: '7-day streak',
        },
      ];

      // Mock badge definitions fetch
      mockSupabase.select.mockResolvedValueOnce({
        data: badges,
        error: null,
      });

      // Mock user badges fetch (first_week already earned)
      mockSupabase.eq.mockResolvedValueOnce({
        data: [{ badge_id: 'first_week' }],
        error: null,
      });

      await checkAndAwardBadges('user1', 'streak_updated', { currentStreak: 7 });

      // Should not award any badges
      expect(mockSupabase.upsert).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching badges', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await checkAndAwardBadges('user1', 'streak_updated', { currentStreak: 7 });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch badge definitions:',
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
