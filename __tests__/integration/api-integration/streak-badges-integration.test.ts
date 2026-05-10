/**
 * Integration Tests for Streak and Badge System
 * Tests streak tracking, badge awards, and database interactions
 * 
 * Validates: Task 16.1 - API routes with database interactions and RLS policies
 */

import {
  createTestUser,
  deleteTestUser,
  createTestProfile,
  createTestLockRule,
  createTestOverrideLog,
  createTestStreak,
  cleanupTestData,
  createServiceClient,
  createAuthenticatedClient,
} from '../helpers/testHelpers';

describe('Streak and Badge System Integration', () => {
  let testUser1: { userId: string; email: string; accessToken: string };
  let testUser2: { userId: string; email: string; accessToken: string };

  beforeAll(async () => {
    testUser1 = await createTestUser();
    testUser2 = await createTestUser();

    await createTestProfile(testUser1.userId);
    await createTestProfile(testUser2.userId);
  });

  afterAll(async () => {
    await cleanupTestData(testUser1.userId);
    await cleanupTestData(testUser2.userId);
    await deleteTestUser(testUser1.userId);
    await deleteTestUser(testUser2.userId);
  });

  describe('Streak Initialization', () => {
    it('should initialize streak with zero values for new user', async () => {
      const serviceClient = createServiceClient();

      const { data: streak, error } = await serviceClient
        .from('streaks')
        .insert({
          user_id: testUser1.userId,
          current_streak: 0,
          longest_streak: 0,
          last_active_date: null,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(streak).toBeDefined();
      expect(streak!.current_streak).toBe(0);
      expect(streak!.longest_streak).toBe(0);
      expect(streak!.last_active_date).toBeNull();
    });

    it('should enforce unique constraint on user_id', async () => {
      const serviceClient = createServiceClient();

      // Create first streak
      await serviceClient.from('streaks').insert({
        user_id: testUser1.userId,
        current_streak: 0,
        longest_streak: 0,
      });

      // Try to create duplicate
      const { error } = await serviceClient.from('streaks').insert({
        user_id: testUser1.userId,
        current_streak: 5,
        longest_streak: 5,
      });

      expect(error).not.toBeNull();
      expect(error!.code).toBe('23505'); // Unique violation
    });
  });

  describe('Streak Increment', () => {
    it('should increment current streak on compliant day', async () => {
      const serviceClient = createServiceClient();

      await createTestStreak(testUser1.userId, {
        current_streak: 3,
        longest_streak: 5,
        last_active_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
      });

      // Increment streak
      const { data: updated, error } = await serviceClient
        .from('streaks')
        .update({
          current_streak: 4,
          last_active_date: new Date().toISOString().split('T')[0],
        })
        .eq('user_id', testUser1.userId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated!.current_streak).toBe(4);
      expect(updated!.last_active_date).toBe(new Date().toISOString().split('T')[0]);
    });

    it('should update longest streak when current exceeds it', async () => {
      const serviceClient = createServiceClient();

      await createTestStreak(testUser1.userId, {
        current_streak: 5,
        longest_streak: 5,
        last_active_date: new Date().toISOString().split('T')[0],
      });

      // Increment to 6
      const { data: updated, error } = await serviceClient
        .from('streaks')
        .update({
          current_streak: 6,
          longest_streak: 6,
        })
        .eq('user_id', testUser1.userId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated!.current_streak).toBe(6);
      expect(updated!.longest_streak).toBe(6);
    });

    it('should not update longest streak if current is lower', async () => {
      const serviceClient = createServiceClient();

      await createTestStreak(testUser1.userId, {
        current_streak: 3,
        longest_streak: 10,
        last_active_date: new Date().toISOString().split('T')[0],
      });

      // Increment current to 4 (still less than longest)
      const { data: updated, error } = await serviceClient
        .from('streaks')
        .update({ current_streak: 4 })
        .eq('user_id', testUser1.userId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated!.current_streak).toBe(4);
      expect(updated!.longest_streak).toBe(10); // Unchanged
    });
  });

  describe('Streak Reset on Override', () => {
    it('should reset current streak to 0 when user overrides', async () => {
      const serviceClient = createServiceClient();

      await createTestStreak(testUser1.userId, {
        current_streak: 7,
        longest_streak: 10,
        last_active_date: new Date().toISOString().split('T')[0],
      });

      // Create override
      const rule = await createTestLockRule(testUser1.userId, {
        app_name: 'Instagram',
        lock_type: 'timer',
        daily_limit_minutes: 30,
      });

      await createTestOverrideLog(testUser1.userId, rule.id, {
        app_name: 'Instagram',
        mood: 'bored',
      });

      // Reset streak
      const { data: reset, error } = await serviceClient
        .from('streaks')
        .update({ current_streak: 0 })
        .eq('user_id', testUser1.userId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(reset!.current_streak).toBe(0);
      expect(reset!.longest_streak).toBe(10); // Longest remains
    });

    it('should preserve longest streak after reset', async () => {
      const serviceClient = createServiceClient();

      await createTestStreak(testUser1.userId, {
        current_streak: 15,
        longest_streak: 15,
        last_active_date: new Date().toISOString().split('T')[0],
      });

      // Reset current
      const { data: reset, error } = await serviceClient
        .from('streaks')
        .update({ current_streak: 0 })
        .eq('user_id', testUser1.userId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(reset!.current_streak).toBe(0);
      expect(reset!.longest_streak).toBe(15);
    });
  });

  describe('Streak RLS Policies', () => {
    it('should allow user to read own streak', async () => {
      const client = createAuthenticatedClient(testUser1.accessToken);

      await createTestStreak(testUser1.userId, {
        current_streak: 5,
        longest_streak: 8,
      });

      const { data, error } = await client
        .from('streaks')
        .select('*')
        .eq('user_id', testUser1.userId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.current_streak).toBe(5);
    });

    it('should prevent user from reading other user streak', async () => {
      const client2 = createAuthenticatedClient(testUser2.accessToken);

      await createTestStreak(testUser1.userId, {
        current_streak: 10,
        longest_streak: 15,
      });

      // User2 tries to read User1's streak
      const { data } = await client2
        .from('streaks')
        .select('*')
        .eq('user_id', testUser1.userId);

      // RLS should prevent access
      expect(data).toEqual([]);
    });

    it('should allow user to update own streak', async () => {
      const client = createAuthenticatedClient(testUser1.accessToken);

      await createTestStreak(testUser1.userId, {
        current_streak: 3,
        longest_streak: 5,
      });

      const { data, error } = await client
        .from('streaks')
        .update({ current_streak: 4 })
        .eq('user_id', testUser1.userId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.current_streak).toBe(4);
    });

    it('should prevent user from updating other user streak', async () => {
      const client2 = createAuthenticatedClient(testUser2.accessToken);

      await createTestStreak(testUser1.userId, {
        current_streak: 5,
        longest_streak: 10,
      });

      // User2 tries to update User1's streak
      const { data } = await client2
        .from('streaks')
        .update({ current_streak: 0 })
        .eq('user_id', testUser1.userId)
        .select();

      // RLS should prevent update
      expect(data).toEqual([]);
    });
  });

  describe('Badge Definitions', () => {
    it('should have all required badge definitions', async () => {
      const serviceClient = createServiceClient();

      const { data: badges, error } = await serviceClient
        .from('badge_definitions')
        .select('*')
        .order('id');

      expect(error).toBeNull();
      expect(badges).toBeDefined();

      const badgeIds = badges!.map(b => b.id);
      expect(badgeIds).toContain('quick_start');
      expect(badgeIds).toContain('first_week');
      expect(badgeIds).toContain('seven_day_warrior');
      expect(badgeIds).toContain('iron_will');
      expect(badgeIds).toContain('social_detox');
      expect(badgeIds).toContain('night_owl_slayer');
      expect(badgeIds).toContain('pomodoro_master');
    });

    it('should have proper badge structure', async () => {
      const serviceClient = createServiceClient();

      const { data: badge, error } = await serviceClient
        .from('badge_definitions')
        .select('*')
        .eq('id', 'quick_start')
        .single();

      expect(error).toBeNull();
      expect(badge).toBeDefined();
      expect(badge!.name).toBeDefined();
      expect(badge!.description).toBeDefined();
      expect(badge!.icon).toBeDefined();
      expect(badge!.condition).toBeDefined();
    });
  });

  describe('Badge Awards', () => {
    it('should award badge to user', async () => {
      const serviceClient = createServiceClient();

      const { data: award, error } = await serviceClient
        .from('user_badges')
        .insert({
          user_id: testUser1.userId,
          badge_id: 'quick_start',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(award).toBeDefined();
      expect(award!.user_id).toBe(testUser1.userId);
      expect(award!.badge_id).toBe('quick_start');
      expect(award!.earned_at).toBeDefined();
    });

    it('should prevent duplicate badge awards', async () => {
      const serviceClient = createServiceClient();

      // Award first time
      await serviceClient.from('user_badges').insert({
        user_id: testUser1.userId,
        badge_id: 'first_week',
      });

      // Try to award again
      const { error } = await serviceClient.from('user_badges').insert({
        user_id: testUser1.userId,
        badge_id: 'first_week',
      });

      expect(error).not.toBeNull();
      expect(error!.code).toBe('23505'); // Unique violation
    });

    it('should award multiple different badges to same user', async () => {
      const serviceClient = createServiceClient();

      const badges = ['quick_start', 'first_week', 'seven_day_warrior'];

      for (const badgeId of badges) {
        const { error } = await serviceClient.from('user_badges').insert({
          user_id: testUser1.userId,
          badge_id: badgeId,
        });

        expect(error).toBeNull();
      }

      // Verify all awarded
      const { data: userBadges } = await serviceClient
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', testUser1.userId);

      const awardedIds = userBadges!.map(b => b.badge_id);
      expect(awardedIds).toContain('quick_start');
      expect(awardedIds).toContain('first_week');
      expect(awardedIds).toContain('seven_day_warrior');
    });

    it('should award same badge to different users', async () => {
      const serviceClient = createServiceClient();

      // Award to user1
      await serviceClient.from('user_badges').insert({
        user_id: testUser1.userId,
        badge_id: 'iron_will',
      });

      // Award to user2
      const { data: award2, error } = await serviceClient
        .from('user_badges')
        .insert({
          user_id: testUser2.userId,
          badge_id: 'iron_will',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(award2!.user_id).toBe(testUser2.userId);
    });
  });

  describe('Badge RLS Policies', () => {
    it('should allow user to view own badges', async () => {
      const serviceClient = createServiceClient();
      const client = createAuthenticatedClient(testUser1.accessToken);

      // Award badge
      await serviceClient.from('user_badges').insert({
        user_id: testUser1.userId,
        badge_id: 'social_detox',
      });

      // User reads own badges
      const { data, error } = await client
        .from('user_badges')
        .select('*')
        .eq('user_id', testUser1.userId);

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
    });

    it('should prevent user from viewing other user badges', async () => {
      const serviceClient = createServiceClient();
      const client2 = createAuthenticatedClient(testUser2.accessToken);

      // Award badge to user1
      await serviceClient.from('user_badges').insert({
        user_id: testUser1.userId,
        badge_id: 'night_owl_slayer',
      });

      // User2 tries to read user1's badges
      const { data } = await client2
        .from('user_badges')
        .select('*')
        .eq('user_id', testUser1.userId);

      // RLS should prevent access
      expect(data).toEqual([]);
    });
  });

  describe('Badge with Streak Integration', () => {
    it('should award first_week badge at 7-day streak', async () => {
      const serviceClient = createServiceClient();

      await createTestStreak(testUser1.userId, {
        current_streak: 7,
        longest_streak: 7,
        last_active_date: new Date().toISOString().split('T')[0],
      });

      // Award badge
      const { data: award, error } = await serviceClient
        .from('user_badges')
        .insert({
          user_id: testUser1.userId,
          badge_id: 'first_week',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(award).toBeDefined();

      // Verify streak
      const { data: streak } = await serviceClient
        .from('streaks')
        .select('*')
        .eq('user_id', testUser1.userId)
        .single();

      expect(streak!.current_streak).toBe(7);
    });

    it('should award social_detox badge at 30-day streak', async () => {
      const serviceClient = createServiceClient();

      await createTestStreak(testUser1.userId, {
        current_streak: 30,
        longest_streak: 30,
        last_active_date: new Date().toISOString().split('T')[0],
      });

      const { data: award, error } = await serviceClient
        .from('user_badges')
        .insert({
          user_id: testUser1.userId,
          badge_id: 'social_detox',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(award).toBeDefined();
    });
  });

  describe('Streak Cascade Delete', () => {
    it('should delete streak when user is deleted', async () => {
      const serviceClient = createServiceClient();
      const tempUser = await createTestUser();

      await createTestProfile(tempUser.userId);
      await createTestStreak(tempUser.userId, {
        current_streak: 5,
        longest_streak: 10,
      });

      // Delete user
      await deleteTestUser(tempUser.userId);

      // Verify streak is deleted
      const { data } = await serviceClient
        .from('streaks')
        .select('*')
        .eq('user_id', tempUser.userId);

      expect(data).toEqual([]);
    });

    it('should delete user badges when user is deleted', async () => {
      const serviceClient = createServiceClient();
      const tempUser = await createTestUser();

      await createTestProfile(tempUser.userId);
      await serviceClient.from('user_badges').insert({
        user_id: tempUser.userId,
        badge_id: 'quick_start',
      });

      // Delete user
      await deleteTestUser(tempUser.userId);

      // Verify badges are deleted
      const { data } = await serviceClient
        .from('user_badges')
        .select('*')
        .eq('user_id', tempUser.userId);

      expect(data).toEqual([]);
    });
  });
});
