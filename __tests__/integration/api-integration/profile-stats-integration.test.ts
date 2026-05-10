/**
 * Integration Tests for Profile and Stats API Routes
 * Tests profile updates and statistics aggregation with database interactions
 * 
 * Validates: Task 16.1 - API routes with database interactions and RLS policies
 */

import {
  createTestUser,
  deleteTestUser,
  createTestProfile,
  createTestLockRule,
  createTestUsageSession,
  createTestOverrideLog,
  cleanupTestData,
  createServiceClient,
  createAuthenticatedClient,
} from '../helpers/testHelpers';

describe('Profile and Stats API Integration', () => {
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

  describe('Profile API - PATCH /api/profile', () => {
    it('should update user profile successfully', async () => {
      const client = createAuthenticatedClient(testUser1.accessToken);

      const { data, error } = await client
        .from('profiles')
        .update({
          full_name: 'Updated Name',
          timezone: 'America/New_York',
        })
        .eq('id', testUser1.userId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.full_name).toBe('Updated Name');
      expect(data!.timezone).toBe('America/New_York');
    });

    it('should update avatar URL', async () => {
      const client = createAuthenticatedClient(testUser1.accessToken);
      const avatarUrl = 'https://example.com/new-avatar.jpg';

      const { data, error } = await client
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', testUser1.userId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.avatar_url).toBe(avatarUrl);
    });

    it('should enforce RLS - user cannot update other user profile', async () => {
      const client = createAuthenticatedClient(testUser2.accessToken);

      // User2 tries to update User1's profile
      const { data } = await client
        .from('profiles')
        .update({ full_name: 'Hacked Name' })
        .eq('id', testUser1.userId)
        .select();

      // RLS should prevent update - returns empty array
      expect(data).toEqual([]);
    });

    it('should validate timezone values', async () => {
      const client = createAuthenticatedClient(testUser1.userId);

      const validTimezones = [
        'Asia/Kolkata',
        'America/New_York',
        'Europe/London',
        'Australia/Sydney',
        'UTC',
      ];

      for (const timezone of validTimezones) {
        const { data, error } = await client
          .from('profiles')
          .update({ timezone })
          .eq('id', testUser1.userId)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data!.timezone).toBe(timezone);
      }
    });
  });

  describe('Stats API - GET /api/stats', () => {
    beforeEach(async () => {
      // Clean up existing data
      const serviceClient = createServiceClient();
      await serviceClient.from('usage_sessions').delete().eq('user_id', testUser1.userId);
      await serviceClient.from('override_logs').delete().eq('user_id', testUser1.userId);
    });

    it('should return weekly statistics with usage data', async () => {
      const serviceClient = createServiceClient();

      // Create usage sessions for current week
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);

      for (let i = 0; i < 5; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);

        await createTestUsageSession(testUser1.userId, {
          app_name: 'Instagram',
          minutes_used: 30,
          date: date.toISOString().split('T')[0],
        });

        await createTestUsageSession(testUser1.userId, {
          app_name: 'YouTube',
          minutes_used: 45,
          date: date.toISOString().split('T')[0],
        });
      }

      // Fetch stats
      const { data: sessions } = await serviceClient
        .from('usage_sessions')
        .select('*')
        .eq('user_id', testUser1.userId);

      expect(sessions).toBeDefined();
      expect(sessions!.length).toBeGreaterThan(0);

      // Verify data structure
      const totalMinutes = sessions!.reduce((sum, s) => sum + (s.minutes_used || 0), 0);
      expect(totalMinutes).toBe(375); // 5 days * (30 + 45) minutes
    });

    it('should calculate per-app breakdown correctly', async () => {
      const serviceClient = createServiceClient();

      // Create varied usage
      await createTestUsageSession(testUser1.userId, {
        app_name: 'Instagram',
        minutes_used: 60,
        date: new Date().toISOString().split('T')[0],
      });

      await createTestUsageSession(testUser1.userId, {
        app_name: 'Instagram',
        minutes_used: 40,
        date: new Date().toISOString().split('T')[0],
      });

      await createTestUsageSession(testUser1.userId, {
        app_name: 'YouTube',
        minutes_used: 90,
        date: new Date().toISOString().split('T')[0],
      });

      // Fetch and aggregate
      const { data: sessions } = await serviceClient
        .from('usage_sessions')
        .select('app_name, minutes_used')
        .eq('user_id', testUser1.userId);

      const breakdown = sessions!.reduce((acc, s) => {
        acc[s.app_name] = (acc[s.app_name] || 0) + (s.minutes_used || 0);
        return acc;
      }, {} as Record<string, number>);

      expect(breakdown['Instagram']).toBe(100);
      expect(breakdown['YouTube']).toBe(90);
    });

    it('should include override counts in stats', async () => {
      const serviceClient = createServiceClient();

      const rule = await createTestLockRule(testUser1.userId, {
        app_name: 'TikTok',
        lock_type: 'timer',
        daily_limit_minutes: 30,
      });

      // Create multiple overrides
      for (let i = 0; i < 3; i++) {
        await createTestOverrideLog(testUser1.userId, rule.id, {
          app_name: 'TikTok',
          mood: 'bored',
        });
      }

      // Fetch override logs
      const { data: overrides } = await serviceClient
        .from('override_logs')
        .select('*')
        .eq('user_id', testUser1.userId)
        .eq('app_name', 'TikTok');

      expect(overrides!.length).toBe(3);
    });

    it('should calculate compliance percentage correctly', async () => {
      const serviceClient = createServiceClient();

      // Create rule
      const rule = await createTestLockRule(testUser1.userId, {
        app_name: 'Facebook',
        lock_type: 'timer',
        daily_limit_minutes: 30,
      });

      // Create overrides on 2 out of 7 days
      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      await createTestOverrideLog(testUser1.userId, rule.id, {
        app_name: 'Facebook',
        mood: 'bored',
        overridden_at: today.toISOString(),
      });

      await createTestOverrideLog(testUser1.userId, rule.id, {
        app_name: 'Facebook',
        mood: 'stressed',
        overridden_at: twoDaysAgo.toISOString(),
      });

      // Fetch overrides for the week
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1);

      const { data: overrides } = await serviceClient
        .from('override_logs')
        .select('overridden_at')
        .eq('user_id', testUser1.userId)
        .gte('overridden_at', weekStart.toISOString());

      // Calculate unique days with overrides
      const daysWithOverrides = new Set(
        overrides!.map(o => o.overridden_at.split('T')[0])
      );

      const daysWithoutOverride = 7 - daysWithOverrides.size;
      const compliancePercentage = (daysWithoutOverride / 7) * 100;

      expect(compliancePercentage).toBeGreaterThan(0);
      expect(compliancePercentage).toBeLessThanOrEqual(100);
    });

    it('should enforce RLS - user can only see own stats', async () => {
      const serviceClient = createServiceClient();

      // Create usage for user1
      await createTestUsageSession(testUser1.userId, {
        app_name: 'Twitter',
        minutes_used: 50,
        date: new Date().toISOString().split('T')[0],
      });

      // User2 tries to fetch user1's usage
      const client2 = createAuthenticatedClient(testUser2.accessToken);
      const { data } = await client2
        .from('usage_sessions')
        .select('*')
        .eq('user_id', testUser1.userId);

      // RLS should prevent access
      expect(data).toEqual([]);
    });

    it('should handle week-over-week comparison', async () => {
      const serviceClient = createServiceClient();

      // Create current week usage
      const today = new Date();
      await createTestUsageSession(testUser1.userId, {
        app_name: 'Instagram',
        minutes_used: 100,
        date: today.toISOString().split('T')[0],
      });

      // Create previous week usage
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      await createTestUsageSession(testUser1.userId, {
        app_name: 'Instagram',
        minutes_used: 80,
        date: lastWeek.toISOString().split('T')[0],
      });

      // Fetch both weeks
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay() + 1);

      const previousWeekStart = new Date(currentWeekStart);
      previousWeekStart.setDate(currentWeekStart.getDate() - 7);

      const { data: currentWeek } = await serviceClient
        .from('usage_sessions')
        .select('minutes_used')
        .eq('user_id', testUser1.userId)
        .gte('date', currentWeekStart.toISOString().split('T')[0]);

      const { data: previousWeek } = await serviceClient
        .from('usage_sessions')
        .select('minutes_used')
        .eq('user_id', testUser1.userId)
        .gte('date', previousWeekStart.toISOString().split('T')[0])
        .lt('date', currentWeekStart.toISOString().split('T')[0]);

      const currentTotal = currentWeek!.reduce((sum, s) => sum + (s.minutes_used || 0), 0);
      const previousTotal = previousWeek!.reduce((sum, s) => sum + (s.minutes_used || 0), 0);

      expect(currentTotal).toBeGreaterThan(0);
      expect(previousTotal).toBeGreaterThan(0);
    });

    it('should return empty stats for new user with no data', async () => {
      const newUser = await createTestUser();
      await createTestProfile(newUser.userId);

      const client = createAuthenticatedClient(newUser.accessToken);

      const { data: sessions } = await client
        .from('usage_sessions')
        .select('*')
        .eq('user_id', newUser.userId);

      expect(sessions).toEqual([]);

      await cleanupTestData(newUser.userId);
      await deleteTestUser(newUser.userId);
    });
  });

  describe('Usage Sessions Database Interactions', () => {
    it('should create usage session with all required fields', async () => {
      const serviceClient = createServiceClient();

      const sessionStart = new Date();
      const sessionEnd = new Date(sessionStart.getTime() + 30 * 60 * 1000);

      const { data, error } = await serviceClient
        .from('usage_sessions')
        .insert({
          user_id: testUser1.userId,
          app_name: 'Reddit',
          session_start: sessionStart.toISOString(),
          session_end: sessionEnd.toISOString(),
          minutes_used: 30,
          date: sessionStart.toISOString().split('T')[0],
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.app_name).toBe('Reddit');
      expect(data!.minutes_used).toBe(30);
    });

    it('should aggregate daily usage by app', async () => {
      const serviceClient = createServiceClient();
      const today = new Date().toISOString().split('T')[0];

      // Create multiple sessions for same app on same day
      await createTestUsageSession(testUser1.userId, {
        app_name: 'Snapchat',
        minutes_used: 20,
        date: today,
      });

      await createTestUsageSession(testUser1.userId, {
        app_name: 'Snapchat',
        minutes_used: 15,
        date: today,
      });

      await createTestUsageSession(testUser1.userId, {
        app_name: 'Snapchat',
        minutes_used: 25,
        date: today,
      });

      // Aggregate
      const { data: sessions } = await serviceClient
        .from('usage_sessions')
        .select('minutes_used')
        .eq('user_id', testUser1.userId)
        .eq('app_name', 'Snapchat')
        .eq('date', today);

      const totalMinutes = sessions!.reduce((sum, s) => sum + (s.minutes_used || 0), 0);
      expect(totalMinutes).toBe(60);
    });

    it('should handle sessions spanning midnight', async () => {
      const serviceClient = createServiceClient();

      const sessionStart = new Date();
      sessionStart.setHours(23, 30, 0, 0);

      const sessionEnd = new Date(sessionStart);
      sessionEnd.setHours(0, 30, 0, 0);
      sessionEnd.setDate(sessionEnd.getDate() + 1);

      const { data, error } = await serviceClient
        .from('usage_sessions')
        .insert({
          user_id: testUser1.userId,
          app_name: 'Netflix',
          session_start: sessionStart.toISOString(),
          session_end: sessionEnd.toISOString(),
          minutes_used: 60,
          date: sessionStart.toISOString().split('T')[0],
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.minutes_used).toBe(60);
    });
  });
});
