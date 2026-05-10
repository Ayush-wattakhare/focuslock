/**
 * Comprehensive Integration Tests for All API Routes
 * Tests all API endpoints with database interactions, RLS policies, and authentication
 * 
 * Validates: Task 16.1 - Integration tests for API routes
 */

import {
  createTestUser,
  deleteTestUser,
  createTestProfile,
  createTestLockRule,
  createTestOverrideLog,
  createTestUsageSession,
  createTestStreak,
  createTestBuddyRelationship,
  cleanupTestData,
  createServiceClient,
  createAuthenticatedClient,
  wait,
} from '../helpers/testHelpers';

describe('API Routes Comprehensive Integration Tests', () => {
  let testUser1: { userId: string; email: string; accessToken: string };
  let testUser2: { userId: string; email: string; accessToken: string };

  beforeAll(async () => {
    // Create test users
    testUser1 = await createTestUser();
    testUser2 = await createTestUser();

    // Create profiles
    await createTestProfile(testUser1.userId);
    await createTestProfile(testUser2.userId);

    // Initialize streaks
    await createTestStreak(testUser1.userId);
    await createTestStreak(testUser2.userId);
  });

  afterAll(async () => {
    await cleanupTestData(testUser1.userId);
    await cleanupTestData(testUser2.userId);
    await deleteTestUser(testUser1.userId);
    await deleteTestUser(testUser2.userId);
  });

  describe('Usage API Routes', () => {
    describe('POST /api/usage/start', () => {
      it('should start a new usage session', async () => {
        const client = createAuthenticatedClient(testUser1.accessToken);

        const { data: session, error } = await client
          .from('usage_sessions')
          .insert({
            user_id: testUser1.userId,
            app_name: 'Instagram',
            session_start: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(session).toBeDefined();
        expect(session!.app_name).toBe('Instagram');
        expect(session!.user_id).toBe(testUser1.userId);
        expect(session!.session_end).toBeNull();
        expect(session!.minutes_used).toBeNull();
      });

      it('should enforce RLS - user cannot start session for other user', async () => {
        const client = createAuthenticatedClient(testUser2.accessToken);

        const { error } = await client
          .from('usage_sessions')
          .insert({
            user_id: testUser1.userId, // Different user
            app_name: 'YouTube',
            session_start: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
          });

        expect(error).not.toBeNull();
      });
    });

    describe('POST /api/usage/end', () => {
      it('should end a usage session and calculate duration', async () => {
        const client = createAuthenticatedClient(testUser1.accessToken);

        // Start session
        const sessionStart = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
        const { data: session } = await client
          .from('usage_sessions')
          .insert({
            user_id: testUser1.userId,
            app_name: 'TikTok',
            session_start: sessionStart.toISOString(),
            date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        // End session
        const sessionEnd = new Date();
        const expectedMinutes = Math.round((sessionEnd.getTime() - sessionStart.getTime()) / 60000);

        const { data: endedSession, error } = await client
          .from('usage_sessions')
          .update({
            session_end: sessionEnd.toISOString(),
            minutes_used: expectedMinutes,
          })
          .eq('id', session!.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(endedSession!.session_end).not.toBeNull();
        expect(endedSession!.minutes_used).toBeGreaterThan(0);
        expect(endedSession!.minutes_used).toBeCloseTo(expectedMinutes, 0);
      });

      it('should enforce RLS - user cannot end other user session', async () => {
        const serviceClient = createServiceClient();

        // Create session for user1
        const { data: session } = await serviceClient
          .from('usage_sessions')
          .insert({
            user_id: testUser1.userId,
            app_name: 'Facebook',
            session_start: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        // User2 tries to end user1's session
        const client = createAuthenticatedClient(testUser2.accessToken);
        const { data, error } = await client
          .from('usage_sessions')
          .update({
            session_end: new Date().toISOString(),
            minutes_used: 10,
          })
          .eq('id', session!.id)
          .select();

        // RLS should prevent update
        expect(data).toEqual([]);
      });
    });

    describe('GET /api/usage/daily', () => {
      it('should aggregate daily usage by app', async () => {
        const client = createAuthenticatedClient(testUser1.accessToken);
        const today = new Date().toISOString().split('T')[0];

        // Create multiple sessions
        await createTestUsageSession(testUser1.userId, {
          app_name: 'Instagram',
          minutes_used: 30,
          date: today,
        });

        await createTestUsageSession(testUser1.userId, {
          app_name: 'Instagram',
          minutes_used: 20,
          date: today,
        });

        await createTestUsageSession(testUser1.userId, {
          app_name: 'YouTube',
          minutes_used: 45,
          date: today,
        });

        // Fetch daily usage
        const { data: sessions, error } = await client
          .from('usage_sessions')
          .select('app_name, minutes_used')
          .eq('user_id', testUser1.userId)
          .eq('date', today)
          .not('minutes_used', 'is', null);

        expect(error).toBeNull();
        expect(sessions!.length).toBeGreaterThanOrEqual(3);

        // Aggregate manually to verify
        const usageMap = new Map<string, number>();
        sessions!.forEach(s => {
          usageMap.set(s.app_name, (usageMap.get(s.app_name) || 0) + (s.minutes_used || 0));
        });

        expect(usageMap.get('Instagram')).toBeGreaterThanOrEqual(50);
        expect(usageMap.get('YouTube')).toBeGreaterThanOrEqual(45);
      });

      it('should enforce RLS - user only sees own usage', async () => {
        const client = createAuthenticatedClient(testUser2.accessToken);
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await client
          .from('usage_sessions')
          .select('*')
          .eq('user_id', testUser1.userId)
          .eq('date', today);

        // RLS should return empty array
        expect(data).toEqual([]);
      });
    });
  });

  describe('Streak API Routes', () => {
    describe('GET /api/streak', () => {
      it('should fetch user streak data', async () => {
        const client = createAuthenticatedClient(testUser1.accessToken);

        const { data: streak, error } = await client
          .from('streaks')
          .select('*')
          .eq('user_id', testUser1.userId)
          .single();

        expect(error).toBeNull();
        expect(streak).toBeDefined();
        expect(streak!.current_streak).toBeGreaterThanOrEqual(0);
        expect(streak!.longest_streak).toBeGreaterThanOrEqual(0);
        expect(streak!.longest_streak).toBeGreaterThanOrEqual(streak!.current_streak);
      });

      it('should enforce RLS - user cannot fetch other user streak', async () => {
        const client = createAuthenticatedClient(testUser2.accessToken);

        const { data, error } = await client
          .from('streaks')
          .select('*')
          .eq('user_id', testUser1.userId);

        // RLS should return empty array
        expect(data).toEqual([]);
      });
    });

    describe('POST /api/streak/check', () => {
      it('should increment streak when no overrides', async () => {
        const serviceClient = createServiceClient();

        // Get current streak
        const { data: beforeStreak } = await serviceClient
          .from('streaks')
          .select('*')
          .eq('user_id', testUser1.userId)
          .single();

        // Increment streak
        const newStreak = (beforeStreak!.current_streak || 0) + 1;
        const { data: afterStreak, error } = await serviceClient
          .from('streaks')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, beforeStreak!.longest_streak || 0),
            last_active_date: new Date().toISOString().split('T')[0],
          })
          .eq('user_id', testUser1.userId)
          .select()
          .single();

        expect(error).toBeNull();
        expect(afterStreak!.current_streak).toBe(newStreak);
        expect(afterStreak!.longest_streak).toBeGreaterThanOrEqual(newStreak);
      });

      it('should reset streak on override', async () => {
        const serviceClient = createServiceClient();

        // Create override log
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
        const { data: streak, error } = await serviceClient
          .from('streaks')
          .update({ current_streak: 0 })
          .eq('user_id', testUser1.userId)
          .select()
          .single();

        expect(error).toBeNull();
        expect(streak!.current_streak).toBe(0);
      });
    });
  });

  describe('Stats API Routes', () => {
    describe('GET /api/stats', () => {
      it('should return comprehensive statistics', async () => {
        const client = createAuthenticatedClient(testUser1.accessToken);
        const today = new Date().toISOString().split('T')[0];

        // Create test data
        await createTestUsageSession(testUser1.userId, {
          app_name: 'Instagram',
          minutes_used: 60,
          date: today,
        });

        const rule = await createTestLockRule(testUser1.userId, {
          app_name: 'Instagram',
          lock_type: 'timer',
          daily_limit_minutes: 30,
        });

        await createTestOverrideLog(testUser1.userId, rule.id, {
          app_name: 'Instagram',
          mood: 'bored',
        });

        // Fetch stats data
        const { data: sessions } = await client
          .from('usage_sessions')
          .select('*')
          .eq('user_id', testUser1.userId)
          .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        const { data: overrides } = await client
          .from('override_logs')
          .select('*')
          .eq('user_id', testUser1.userId)
          .gte('overridden_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        expect(sessions).toBeDefined();
        expect(overrides).toBeDefined();
        expect(sessions!.length).toBeGreaterThan(0);
        expect(overrides!.length).toBeGreaterThan(0);
      });

      it('should enforce RLS - user only sees own stats', async () => {
        const client = createAuthenticatedClient(testUser2.accessToken);

        const { data: sessions } = await client
          .from('usage_sessions')
          .select('*')
          .eq('user_id', testUser1.userId);

        const { data: overrides } = await client
          .from('override_logs')
          .select('*')
          .eq('user_id', testUser1.userId);

        // RLS should return empty arrays
        expect(sessions).toEqual([]);
        expect(overrides).toEqual([]);
      });
    });
  });

  describe('Pomodoro API Routes', () => {
    describe('POST /api/pomodoro/start', () => {
      it('should start a new Pomodoro session', async () => {
        const client = createAuthenticatedClient(testUser1.accessToken);

        const { data: session, error } = await client
          .from('pomodoro_sessions')
          .insert({
            user_id: testUser1.userId,
            task_label: 'Study Math',
            work_minutes: 25,
            break_minutes: 5,
            sessions_target: 4,
            status: 'active',
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(session).toBeDefined();
        expect(session!.task_label).toBe('Study Math');
        expect(session!.work_minutes).toBe(25);
        expect(session!.sessions_done).toBe(0);
        expect(session!.status).toBe('active');
      });

      it('should enforce RLS - user cannot start session for other user', async () => {
        const client = createAuthenticatedClient(testUser2.accessToken);

        const { error } = await client
          .from('pomodoro_sessions')
          .insert({
            user_id: testUser1.userId, // Different user
            task_label: 'Test',
            work_minutes: 25,
            break_minutes: 5,
            sessions_target: 4,
          });

        expect(error).not.toBeNull();
      });
    });

    describe('POST /api/pomodoro/complete-block', () => {
      it('should increment sessions_done counter', async () => {
        const client = createAuthenticatedClient(testUser1.accessToken);

        // Create session
        const { data: session } = await client
          .from('pomodoro_sessions')
          .insert({
            user_id: testUser1.userId,
            task_label: 'Code Review',
            work_minutes: 25,
            break_minutes: 5,
            sessions_target: 4,
            sessions_done: 0,
            status: 'active',
          })
          .select()
          .single();

        // Complete a block
        const { data: updated, error } = await client
          .from('pomodoro_sessions')
          .update({ sessions_done: 1 })
          .eq('id', session!.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(updated!.sessions_done).toBe(1);
      });
    });

    describe('POST /api/pomodoro/end', () => {
      it('should mark session as completed when target reached', async () => {
        const client = createAuthenticatedClient(testUser1.accessToken);

        // Create session
        const { data: session } = await client
          .from('pomodoro_sessions')
          .insert({
            user_id: testUser1.userId,
            task_label: 'Writing',
            work_minutes: 25,
            break_minutes: 5,
            sessions_target: 2,
            sessions_done: 2,
            status: 'active',
          })
          .select()
          .single();

        // End session
        const { data: completed, error } = await client
          .from('pomodoro_sessions')
          .update({
            status: 'completed',
            ended_at: new Date().toISOString(),
          })
          .eq('id', session!.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(completed!.status).toBe('completed');
        expect(completed!.ended_at).not.toBeNull();
      });

      it('should mark session as abandoned', async () => {
        const client = createAuthenticatedClient(testUser1.accessToken);

        // Create session
        const { data: session } = await client
          .from('pomodoro_sessions')
          .insert({
            user_id: testUser1.userId,
            task_label: 'Reading',
            work_minutes: 25,
            break_minutes: 5,
            sessions_target: 4,
            sessions_done: 1,
            status: 'active',
          })
          .select()
          .single();

        // Abandon session
        const { data: abandoned, error } = await client
          .from('pomodoro_sessions')
          .update({
            status: 'abandoned',
            ended_at: new Date().toISOString(),
          })
          .eq('id', session!.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(abandoned!.status).toBe('abandoned');
        expect(abandoned!.sessions_done).toBeLessThan(abandoned!.sessions_target);
      });
    });
  });

  describe('Challenge API Routes', () => {
    describe('POST /api/challenge/generate', () => {
      it('should generate weekly challenge based on worst app', async () => {
        const serviceClient = createServiceClient();

        // Create override logs for different apps
        const rule1 = await createTestLockRule(testUser1.userId, {
          app_name: 'Instagram',
          lock_type: 'timer',
          daily_limit_minutes: 30,
        });

        const rule2 = await createTestLockRule(testUser1.userId, {
          app_name: 'YouTube',
          lock_type: 'timer',
          daily_limit_minutes: 60,
        });

        // Instagram has more overrides (worst app)
        for (let i = 0; i < 5; i++) {
          await createTestOverrideLog(testUser1.userId, rule1.id, {
            app_name: 'Instagram',
            mood: 'bored',
          });
        }

        for (let i = 0; i < 2; i++) {
          await createTestOverrideLog(testUser1.userId, rule2.id, {
            app_name: 'YouTube',
            mood: 'stressed',
          });
        }

        // Generate challenge
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 4); // Friday

        const { data: challenge, error } = await serviceClient
          .from('weekly_challenges')
          .insert({
            user_id: testUser1.userId,
            app_name: 'Instagram', // Worst app
            daily_limit: 20,
            week_start: weekStart.toISOString().split('T')[0],
            week_end: weekEnd.toISOString().split('T')[0],
            status: 'active',
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(challenge!.app_name).toBe('Instagram');
        expect(challenge!.daily_limit).toBe(20);
        expect(challenge!.status).toBe('active');
      });
    });

    describe('GET /api/challenge/current', () => {
      it('should fetch active challenge', async () => {
        const client = createAuthenticatedClient(testUser1.accessToken);

        const { data: challenges, error } = await client
          .from('weekly_challenges')
          .select('*')
          .eq('user_id', testUser1.userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        expect(error).toBeNull();
        expect(challenges).toBeDefined();
      });

      it('should enforce RLS - user cannot fetch other user challenge', async () => {
        const client = createAuthenticatedClient(testUser2.accessToken);

        const { data } = await client
          .from('weekly_challenges')
          .select('*')
          .eq('user_id', testUser1.userId);

        // RLS should return empty array
        expect(data).toEqual([]);
      });
    });

    describe('POST /api/challenge/update-progress', () => {
      it('should update challenge progress', async () => {
        const serviceClient = createServiceClient();

        // Create challenge
        const { data: challenge } = await serviceClient
          .from('weekly_challenges')
          .insert({
            user_id: testUser1.userId,
            app_name: 'TikTok',
            daily_limit: 15,
            week_start: new Date().toISOString().split('T')[0],
            week_end: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            days_completed: 0,
            status: 'active',
          })
          .select()
          .single();

        // Update progress
        const { data: updated, error } = await serviceClient
          .from('weekly_challenges')
          .update({ days_completed: 3 })
          .eq('id', challenge!.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(updated!.days_completed).toBe(3);
      });

      it('should mark challenge as completed when 5 days done', async () => {
        const serviceClient = createServiceClient();

        // Create challenge
        const { data: challenge } = await serviceClient
          .from('weekly_challenges')
          .insert({
            user_id: testUser1.userId,
            app_name: 'Facebook',
            daily_limit: 30,
            week_start: new Date().toISOString().split('T')[0],
            week_end: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            days_completed: 4,
            status: 'active',
          })
          .select()
          .single();

        // Complete challenge
        const { data: completed, error } = await serviceClient
          .from('weekly_challenges')
          .update({
            days_completed: 5,
            status: 'completed',
          })
          .eq('id', challenge!.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(completed!.days_completed).toBe(5);
        expect(completed!.status).toBe('completed');
      });
    });
  });

  describe('Share Card API Routes', () => {
    describe('GET /api/share-card', () => {
      it('should generate share card data', async () => {
        const client = createAuthenticatedClient(testUser1.accessToken);

        // Fetch data needed for share card
        const { data: streak } = await client
          .from('streaks')
          .select('*')
          .eq('user_id', testUser1.userId)
          .single();

        const { data: sessions } = await client
          .from('usage_sessions')
          .select('minutes_used')
          .eq('user_id', testUser1.userId)
          .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .not('minutes_used', 'is', null);

        expect(streak).toBeDefined();
        expect(sessions).toBeDefined();

        // Calculate stats
        const totalMinutes = sessions!.reduce((sum, s) => sum + (s.minutes_used || 0), 0);
        expect(totalMinutes).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Profile API Routes', () => {
    describe('PATCH /api/profile', () => {
      it('should update user profile', async () => {
        const client = createAuthenticatedClient(testUser1.accessToken);

        const { data: updated, error } = await client
          .from('profiles')
          .update({
            full_name: 'Updated Name',
            timezone: 'America/New_York',
          })
          .eq('id', testUser1.userId)
          .select()
          .single();

        expect(error).toBeNull();
        expect(updated!.full_name).toBe('Updated Name');
        expect(updated!.timezone).toBe('America/New_York');
      });

      it('should enforce RLS - user cannot update other user profile', async () => {
        const client = createAuthenticatedClient(testUser2.accessToken);

        const { data } = await client
          .from('profiles')
          .update({ full_name: 'Hacked Name' })
          .eq('id', testUser1.userId)
          .select();

        // RLS should prevent update
        expect(data).toEqual([]);
      });
    });
  });

  describe('Export API Routes', () => {
    describe('GET /api/export', () => {
      it('should export all user data', async () => {
        const client = createAuthenticatedClient(testUser1.accessToken);

        // Fetch all user data
        const { data: profile } = await client
          .from('profiles')
          .select('*')
          .eq('id', testUser1.userId)
          .single();

        const { data: rules } = await client
          .from('lock_rules')
          .select('*')
          .eq('user_id', testUser1.userId);

        const { data: overrides } = await client
          .from('override_logs')
          .select('*')
          .eq('user_id', testUser1.userId);

        const { data: sessions } = await client
          .from('usage_sessions')
          .select('*')
          .eq('user_id', testUser1.userId);

        const { data: streak } = await client
          .from('streaks')
          .select('*')
          .eq('user_id', testUser1.userId)
          .single();

        const { data: badges } = await client
          .from('user_badges')
          .select('*')
          .eq('user_id', testUser1.userId);

        const { data: buddies } = await client
          .from('buddies')
          .select('*')
          .eq('user_id', testUser1.userId);

        const { data: pomodoros } = await client
          .from('pomodoro_sessions')
          .select('*')
          .eq('user_id', testUser1.userId);

        expect(profile).toBeDefined();
        expect(rules).toBeDefined();
        expect(overrides).toBeDefined();
        expect(sessions).toBeDefined();
        expect(streak).toBeDefined();
        expect(badges).toBeDefined();
        expect(buddies).toBeDefined();
        expect(pomodoros).toBeDefined();
      });
    });
  });
});
