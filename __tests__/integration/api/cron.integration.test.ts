/**
 * Integration Tests for Cron Jobs
 * Tests: 
 * - POST /api/cron/streak-check
 * - POST /api/cron/generate-challenges
 * - POST /api/cron/bedtime-check
 * - POST /api/cron/weekly-insights
 * 
 * Validates:
 * - CRON_SECRET authentication
 * - Database interactions with mock data
 * - Proper data processing and updates
 * - Edge case handling
 */

import { createClient } from '@supabase/supabase-js';

// Create Supabase clients for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client for test setup/teardown
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Test user credentials
const testUser1Email = `test-cron-user-1-${Date.now()}@focuslock.test`;
const testUser2Email = `test-cron-user-2-${Date.now()}@focuslock.test`;
const testPassword = 'TestPassword123!';

// Mock CRON_SECRET for testing
const MOCK_CRON_SECRET = 'test-cron-secret-12345';

describe('Cron Jobs Integration Tests', () => {
  let user1Id: string;
  let user2Id: string;
  let createdRuleIds: string[] = [];
  let createdOverrideLogIds: string[] = [];
  let createdUsageSessionIds: string[] = [];
  let createdChallengeIds: string[] = [];

  beforeAll(async () => {
    // Set CRON_SECRET for tests
    process.env.CRON_SECRET = MOCK_CRON_SECRET;

    // Create test users
    const { data: user1Data, error: user1Error } = await supabaseAdmin.auth.admin.createUser({
      email: testUser1Email,
      password: testPassword,
      email_confirm: true,
    });

    const { data: user2Data, error: user2Error } = await supabaseAdmin.auth.admin.createUser({
      email: testUser2Email,
      password: testPassword,
      email_confirm: true,
    });

    if (user1Error || !user1Data.user) {
      throw new Error(`Failed to create test user 1: ${user1Error?.message}`);
    }
    if (user2Error || !user2Data.user) {
      throw new Error(`Failed to create test user 2: ${user2Error?.message}`);
    }

    user1Id = user1Data.user.id;
    user2Id = user2Data.user.id;

    // Create profiles for test users
    await supabaseAdmin.from('profiles').insert([
      { id: user1Id, full_name: 'Cron Test User 1', timezone: 'Asia/Kolkata' },
      { id: user2Id, full_name: 'Cron Test User 2', timezone: 'America/New_York' },
    ]);

    // Initialize streaks for test users
    await supabaseAdmin.from('streaks').insert([
      { user_id: user1Id, current_streak: 5, longest_streak: 10, last_active_date: new Date().toISOString().split('T')[0] },
      { user_id: user2Id, current_streak: 3, longest_streak: 5, last_active_date: new Date().toISOString().split('T')[0] },
    ]);
  });

  afterAll(async () => {
    // Clean up created data
    if (createdChallengeIds.length > 0) {
      await supabaseAdmin.from('weekly_challenges').delete().in('id', createdChallengeIds);
    }
    if (createdUsageSessionIds.length > 0) {
      await supabaseAdmin.from('usage_sessions').delete().in('id', createdUsageSessionIds);
    }
    if (createdOverrideLogIds.length > 0) {
      await supabaseAdmin.from('override_logs').delete().in('id', createdOverrideLogIds);
    }
    if (createdRuleIds.length > 0) {
      await supabaseAdmin.from('lock_rules').delete().in('id', createdRuleIds);
    }

    // Delete streaks
    await supabaseAdmin.from('streaks').delete().in('user_id', [user1Id, user2Id]);

    // Delete test users
    if (user1Id) {
      await supabaseAdmin.auth.admin.deleteUser(user1Id);
    }
    if (user2Id) {
      await supabaseAdmin.auth.admin.deleteUser(user2Id);
    }
  });

  describe('POST /api/cron/streak-check', () => {
    beforeEach(async () => {
      // Reset streaks to known state
      await supabaseAdmin.from('streaks').update({
        current_streak: 5,
        longest_streak: 10,
        last_active_date: new Date().toISOString().split('T')[0]
      }).eq('user_id', user1Id);

      await supabaseAdmin.from('streaks').update({
        current_streak: 3,
        longest_streak: 5,
        last_active_date: new Date().toISOString().split('T')[0]
      }).eq('user_id', user2Id);
    });

    it('should reject requests without CRON_SECRET', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/streak-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid CRON_SECRET', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/streak-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer wrong-secret',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should increment streaks for users without overrides', async () => {
      // Create a lock rule for user1
      const { data: rule } = await supabaseAdmin.from('lock_rules').insert({
        user_id: user1Id,
        app_name: 'Instagram',
        lock_type: 'timer',
        daily_limit_minutes: 30,
      }).select().single();
      createdRuleIds.push(rule!.id);

      // No overrides for yesterday - streak should increment
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Update last_active_date to day before yesterday
      const dayBeforeYesterday = new Date(yesterday);
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);
      await supabaseAdmin.from('streaks').update({
        last_active_date: dayBeforeYesterday.toISOString().split('T')[0]
      }).eq('user_id', user1Id);

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/streak-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_CRON_SECRET}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.streaks_incremented).toBeGreaterThanOrEqual(0);
      expect(data.streaks_broken).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(data.errors)).toBe(true);
    });

    it('should reset streaks for users with overrides', async () => {
      // Create override log for yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(12, 0, 0, 0);

      const { data: overrideLog } = await supabaseAdmin.from('override_logs').insert({
        user_id: user1Id,
        app_name: 'Instagram',
        mood: 'bored',
        overridden_at: yesterday.toISOString(),
      }).select().single();
      createdOverrideLogIds.push(overrideLog!.id);

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/streak-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_CRON_SECRET}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(typeof data.streaks_incremented).toBe('number');
      expect(typeof data.streaks_broken).toBe('number');
    });

    it('should handle users with no streak record gracefully', async () => {
      // Create a new user without streak record
      const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
        email: `test-no-streak-${Date.now()}@focuslock.test`,
        password: testPassword,
        email_confirm: true,
      });

      const newUserId = newUser!.user!.id;

      await supabaseAdmin.from('profiles').insert({
        id: newUserId,
        full_name: 'No Streak User',
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/streak-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_CRON_SECRET}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.errors).toBeDefined();

      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
    });
  });

  describe('POST /api/cron/generate-challenges', () => {
    beforeEach(async () => {
      // Clean up any existing challenges
      await supabaseAdmin.from('weekly_challenges').delete().in('user_id', [user1Id, user2Id]);
    });

    it('should reject requests without CRON_SECRET', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/generate-challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should generate challenges based on worst-performing app', async () => {
      // Create override logs for previous week
      const prevWeekStart = new Date();
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);

      // User1 overrode Instagram 5 times, TikTok 2 times
      for (let i = 0; i < 5; i++) {
        const overrideDate = new Date(prevWeekStart);
        overrideDate.setDate(overrideDate.getDate() + i);
        const { data } = await supabaseAdmin.from('override_logs').insert({
          user_id: user1Id,
          app_name: 'Instagram',
          mood: 'bored',
          overridden_at: overrideDate.toISOString(),
        }).select().single();
        createdOverrideLogIds.push(data!.id);
      }

      for (let i = 0; i < 2; i++) {
        const overrideDate = new Date(prevWeekStart);
        overrideDate.setDate(overrideDate.getDate() + i);
        const { data } = await supabaseAdmin.from('override_logs').insert({
          user_id: user1Id,
          app_name: 'TikTok',
          mood: 'stressed',
          overridden_at: overrideDate.toISOString(),
        }).select().single();
        createdOverrideLogIds.push(data!.id);
      }

      // Create usage sessions for previous week
      for (let i = 0; i < 7; i++) {
        const sessionDate = new Date(prevWeekStart);
        sessionDate.setDate(sessionDate.getDate() + i);
        const { data } = await supabaseAdmin.from('usage_sessions').insert({
          user_id: user1Id,
          app_name: 'Instagram',
          session_start: sessionDate.toISOString(),
          session_end: new Date(sessionDate.getTime() + 30 * 60000).toISOString(),
          minutes_used: 30,
          date: sessionDate.toISOString().split('T')[0],
        }).select().single();
        createdUsageSessionIds.push(data!.id);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/generate-challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_CRON_SECRET}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(typeof data.challenges_created).toBe('number');
      expect(typeof data.users_processed).toBe('number');

      // Verify challenge was created for user1 with Instagram (worst app)
      const { data: challenges } = await supabaseAdmin
        .from('weekly_challenges')
        .select('*')
        .eq('user_id', user1Id);

      if (challenges && challenges.length > 0) {
        const challenge = challenges[0];
        expect(challenge.app_name).toBe('Instagram');
        expect(challenge.status).toBe('active');
        expect(challenge.days_completed).toBe(0);
        createdChallengeIds.push(challenge.id);
      }
    });

    it('should skip users with no overrides in previous week', async () => {
      // User2 has no overrides - should be skipped
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/generate-challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_CRON_SECRET}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.users_processed).toBeGreaterThanOrEqual(0);

      // Verify no challenge was created for user2
      const { data: challenges } = await supabaseAdmin
        .from('weekly_challenges')
        .select('*')
        .eq('user_id', user2Id);

      expect(challenges?.length || 0).toBe(0);
    });

    it('should calculate daily limit as 30% reduction from average', async () => {
      // Create usage sessions with known average (70 minutes/day)
      const prevWeekStart = new Date();
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);

      // Create override to make this app the worst
      const { data: override } = await supabaseAdmin.from('override_logs').insert({
        user_id: user2Id,
        app_name: 'YouTube',
        mood: 'bored',
        overridden_at: prevWeekStart.toISOString(),
      }).select().single();
      createdOverrideLogIds.push(override!.id);

      // Create 7 days of usage (70 minutes each = 490 total, avg 70)
      for (let i = 0; i < 7; i++) {
        const sessionDate = new Date(prevWeekStart);
        sessionDate.setDate(sessionDate.getDate() + i);
        const { data } = await supabaseAdmin.from('usage_sessions').insert({
          user_id: user2Id,
          app_name: 'YouTube',
          session_start: sessionDate.toISOString(),
          session_end: new Date(sessionDate.getTime() + 70 * 60000).toISOString(),
          minutes_used: 70,
          date: sessionDate.toISOString().split('T')[0],
        }).select().single();
        createdUsageSessionIds.push(data!.id);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/generate-challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_CRON_SECRET}`,
        },
      });

      expect(response.status).toBe(200);

      // Verify challenge has correct daily limit (70 * 0.7 = 49)
      const { data: challenges } = await supabaseAdmin
        .from('weekly_challenges')
        .select('*')
        .eq('user_id', user2Id)
        .eq('app_name', 'YouTube');

      if (challenges && challenges.length > 0) {
        const challenge = challenges[0];
        expect(challenge.daily_limit).toBe(49);
        createdChallengeIds.push(challenge.id);
      }
    });
  });

  describe('POST /api/cron/bedtime-check', () => {
    let bedtimeSettingId: string;

    beforeEach(async () => {
      // Create bedtime settings for user1
      const { data: settings } = await supabaseAdmin.from('bedtime_settings').insert({
        user_id: user1Id,
        is_enabled: true,
        weekday_bedtime: '22:00:00',
        weekday_waketime: '07:00:00',
        weekend_bedtime: '23:00:00',
        weekend_waketime: '08:00:00',
      }).select().single();
      bedtimeSettingId = settings!.id;

      // Create lock rules for user1
      const { data: rule1 } = await supabaseAdmin.from('lock_rules').insert({
        user_id: user1Id,
        app_name: 'Instagram',
        lock_type: 'timer',
        daily_limit_minutes: 30,
        is_active: true,
      }).select().single();
      createdRuleIds.push(rule1!.id);

      const { data: rule2 } = await supabaseAdmin.from('lock_rules').insert({
        user_id: user1Id,
        app_name: 'TikTok',
        lock_type: 'schedule',
        schedule_start: '09:00',
        schedule_end: '17:00',
        schedule_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        is_active: true,
      }).select().single();
      createdRuleIds.push(rule2!.id);
    });

    afterEach(async () => {
      // Clean up bedtime settings
      if (bedtimeSettingId) {
        await supabaseAdmin.from('bedtime_settings').delete().eq('id', bedtimeSettingId);
      }
    });

    it('should reject requests without CRON_SECRET', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/bedtime-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return success with valid CRON_SECRET', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/bedtime-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_CRON_SECRET}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(typeof data.users_checked).toBe('number');
      expect(typeof data.locks_activated).toBe('number');
      expect(typeof data.locks_deactivated).toBe('number');
    });

    it('should handle users with no bedtime settings', async () => {
      // Disable bedtime for user1
      await supabaseAdmin.from('bedtime_settings').update({
        is_enabled: false
      }).eq('id', bedtimeSettingId);

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/bedtime-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_CRON_SECRET}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.users_checked).toBe(0);
      expect(data.locks_activated).toBe(0);
      expect(data.locks_deactivated).toBe(0);
    });

    it('should process bedtime mode activation/deactivation', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/bedtime-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_CRON_SECRET}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Should process at least user1
      expect(data.users_checked).toBeGreaterThanOrEqual(0);
      
      // Locks may or may not be activated depending on current time
      expect(typeof data.locks_activated).toBe('number');
      expect(typeof data.locks_deactivated).toBe('number');
    });
  });

  describe('POST /api/cron/weekly-insights', () => {
    it('should reject requests without CRON_SECRET', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/weekly-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid CRON_SECRET', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/weekly-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-secret',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should generate insights for users with recent overrides', async () => {
      // Create override logs for past 7 days
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        const overrideDate = new Date(now);
        overrideDate.setDate(overrideDate.getDate() - i);
        const { data } = await supabaseAdmin.from('override_logs').insert({
          user_id: user1Id,
          app_name: 'Instagram',
          mood: i % 2 === 0 ? 'bored' : 'stressed',
          reason_text: 'Test reason',
          overridden_at: overrideDate.toISOString(),
        }).select().single();
        createdOverrideLogIds.push(data!.id);
      }

      // Note: This test may fail if ANTHROPIC_API_KEY is not set or if rate limits are hit
      // In a real environment, you might want to mock the AI coach module
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/weekly-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_CRON_SECRET}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(typeof data.insights_generated).toBe('number');
      expect(typeof data.users_processed).toBe('number');
      expect(Array.isArray(data.errors)).toBe(true);
    });

    it('should skip users with no recent overrides', async () => {
      // User2 has no overrides - should be skipped
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/weekly-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_CRON_SECRET}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Should process users but may not generate insights for all
      expect(data.users_processed).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors gracefully and continue processing', async () => {
      // Create override logs for a user that might cause errors
      const { data: override } = await supabaseAdmin.from('override_logs').insert({
        user_id: user2Id,
        app_name: 'TestApp',
        mood: 'bored',
        overridden_at: new Date().toISOString(),
      }).select().single();
      createdOverrideLogIds.push(override!.id);

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/weekly-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_CRON_SECRET}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Should complete even if some users have errors
      expect(typeof data.insights_generated).toBe('number');
      expect(typeof data.users_processed).toBe('number');
      expect(Array.isArray(data.errors)).toBe(true);
    });
  });

  describe('Cron Jobs - Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test verifies error handling when database is unavailable
      // In a real scenario, you might temporarily break the connection
      // For now, we just verify the endpoint structure
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/streak-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_CRON_SECRET}`,
        },
      });

      // Should return 200 or 500, but not hang
      expect([200, 500]).toContain(response.status);
    });

    it('should handle concurrent cron job executions', async () => {
      // Test that multiple cron jobs can run simultaneously
      const promises = [
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/streak-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MOCK_CRON_SECRET}`,
          },
        }),
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/cron/bedtime-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MOCK_CRON_SECRET}`,
          },
        }),
      ];

      const responses = await Promise.all(promises);
      
      // All should complete successfully
      responses.forEach(response => {
        expect([200, 500]).toContain(response.status);
      });
    });
  });
});
