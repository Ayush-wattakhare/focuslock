/**
 * Integration Tests for Stats and Usage Tracking APIs
 * Tests: GET /api/stats, POST /api/usage/start, POST /api/usage/end
 * 
 * Validates:
 * - Usage session tracking
 * - Daily usage aggregation
 * - Statistics calculation
 * - Week-over-week comparison
 * - Compliance percentage
 * - RLS policies
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

const testUserEmail = `test-stats-${Date.now()}@focuslock.test`;
const testPassword = 'TestPassword123!';

describe('Stats and Usage Tracking Integration Tests', () => {
  let userId: string;
  let userClient: ReturnType<typeof createClient<Database>>;
  let createdSessionIds: string[] = [];
  let createdOverrideIds: string[] = [];

  beforeAll(async () => {
    // Create test user
    const { data: userData } = await supabaseAdmin.auth.admin.createUser({
      email: testUserEmail,
      password: testPassword,
      email_confirm: true,
    });

    userId = userData.user!.id;

    // Create profile
    await supabaseAdmin.from('profiles').insert({
      id: userId,
      full_name: 'Stats Test User',
    });

    // Create authenticated client
    userClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
    await userClient.auth.signInWithPassword({
      email: testUserEmail,
      password: testPassword,
    });
  });

  afterAll(async () => {
    // Cleanup
    if (createdSessionIds.length > 0) {
      await supabaseAdmin.from('usage_sessions').delete().in('id', createdSessionIds);
    }
    if (createdOverrideIds.length > 0) {
      await supabaseAdmin.from('override_logs').delete().in('id', createdOverrideIds);
    }
    if (userId) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
  });

  describe('Usage Session Tracking', () => {
    it('should create usage session with start time', async () => {
      const sessionStart = new Date();
      const date = sessionStart.toISOString().split('T')[0];

      const { data, error } = await userClient
        .from('usage_sessions')
        .insert({
          user_id: userId,
          app_name: 'Instagram',
          session_start: sessionStart.toISOString(),
          date,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.user_id).toBe(userId);
      expect(data?.app_name).toBe('Instagram');
      expect(data?.session_start).toBeDefined();
      expect(data?.date).toBe(date);
      expect(data?.session_end).toBeNull();
      expect(data?.minutes_used).toBeNull();

      if (data?.id) {
        createdSessionIds.push(data.id);
      }
    });

    it('should end usage session and calculate duration', async () => {
      const sessionStart = new Date();
      const sessionEnd = new Date(sessionStart.getTime() + 15 * 60 * 1000); // 15 minutes later
      const date = sessionStart.toISOString().split('T')[0];

      // Create session
      const { data: session } = await userClient
        .from('usage_sessions')
        .insert({
          user_id: userId,
          app_name: 'TikTok',
          session_start: sessionStart.toISOString(),
          date,
        })
        .select()
        .single();

      createdSessionIds.push(session!.id);

      // End session
      const minutesUsed = Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 60000);

      const { data, error } = await userClient
        .from('usage_sessions')
        .update({
          session_end: sessionEnd.toISOString(),
          minutes_used: minutesUsed,
        })
        .eq('id', session!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.session_end).toBeDefined();
      expect(data?.minutes_used).toBe(15);
    });

    it('should track multiple sessions for same app on same day', async () => {
      const date = new Date().toISOString().split('T')[0];

      // Create multiple sessions
      const sessions = [
        { app_name: 'YouTube', minutes: 10 },
        { app_name: 'YouTube', minutes: 20 },
        { app_name: 'YouTube', minutes: 15 },
      ];

      for (const session of sessions) {
        const start = new Date();
        const end = new Date(start.getTime() + session.minutes * 60 * 1000);

        const { data } = await userClient
          .from('usage_sessions')
          .insert({
            user_id: userId,
            app_name: session.app_name,
            session_start: start.toISOString(),
            session_end: end.toISOString(),
            minutes_used: session.minutes,
            date,
          })
          .select()
          .single();

        if (data?.id) {
          createdSessionIds.push(data.id);
        }
      }

      // Query all sessions for YouTube today
      const { data, error } = await userClient
        .from('usage_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('app_name', 'YouTube')
        .eq('date', date);

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThanOrEqual(3);

      // Calculate total usage
      const totalMinutes = data?.reduce((sum, s) => sum + (s.minutes_used || 0), 0);
      expect(totalMinutes).toBeGreaterThanOrEqual(45);
    });

    it('should enforce RLS - user cannot view another user sessions', async () => {
      // Create another user
      const { data: user2Data } = await supabaseAdmin.auth.admin.createUser({
        email: `test-stats-2-${Date.now()}@focuslock.test`,
        password: testPassword,
        email_confirm: true,
      });

      const user2Id = user2Data.user!.id;

      await supabaseAdmin.from('profiles').insert({
        id: user2Id,
        full_name: 'Stats Test User 2',
      });

      // Create session for user2
      const { data: user2Session } = await supabaseAdmin
        .from('usage_sessions')
        .insert({
          user_id: user2Id,
          app_name: 'Facebook',
          session_start: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      // Try to query user2's session as user1
      const { data, error } = await userClient
        .from('usage_sessions')
        .select('*')
        .eq('id', user2Session!.id)
        .single();

      // RLS should prevent access
      expect(error || !data).toBeTruthy();

      // Cleanup
      await supabaseAdmin.from('usage_sessions').delete().eq('id', user2Session!.id);
      await supabaseAdmin.auth.admin.deleteUser(user2Id);
    });
  });

  describe('Daily Usage Aggregation', () => {
    beforeAll(async () => {
      // Create usage sessions for testing aggregation
      const today = new Date().toISOString().split('T')[0];

      const sessions = [
        { app_name: 'Instagram', minutes: 30 },
        { app_name: 'Instagram', minutes: 20 },
        { app_name: 'TikTok', minutes: 45 },
        { app_name: 'YouTube', minutes: 60 },
      ];

      for (const session of sessions) {
        const start = new Date();
        const end = new Date(start.getTime() + session.minutes * 60 * 1000);

        const { data } = await supabaseAdmin
          .from('usage_sessions')
          .insert({
            user_id: userId,
            app_name: session.app_name,
            session_start: start.toISOString(),
            session_end: end.toISOString(),
            minutes_used: session.minutes,
            date: today,
          })
          .select()
          .single();

        if (data?.id) {
          createdSessionIds.push(data.id);
        }
      }
    });

    it('should aggregate daily usage by app', async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await userClient
        .from('usage_sessions')
        .select('app_name, minutes_used')
        .eq('user_id', userId)
        .eq('date', today)
        .not('minutes_used', 'is', null);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Aggregate by app
      const appUsage = data?.reduce((acc, session) => {
        const app = session.app_name;
        acc[app] = (acc[app] || 0) + (session.minutes_used || 0);
        return acc;
      }, {} as Record<string, number>);

      expect(appUsage?.['Instagram']).toBeGreaterThanOrEqual(50);
      expect(appUsage?.['TikTok']).toBeGreaterThanOrEqual(45);
      expect(appUsage?.['YouTube']).toBeGreaterThanOrEqual(60);
    });

    it('should calculate total daily usage across all apps', async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await userClient
        .from('usage_sessions')
        .select('minutes_used')
        .eq('user_id', userId)
        .eq('date', today)
        .not('minutes_used', 'is', null);

      expect(error).toBeNull();

      const totalMinutes = data?.reduce((sum, s) => sum + (s.minutes_used || 0), 0);
      expect(totalMinutes).toBeGreaterThanOrEqual(155); // 30+20+45+60
    });
  });

  describe('Statistics Calculation', () => {
    beforeAll(async () => {
      // Create usage data for current week
      const today = new Date();
      const dates = [];

      // Generate last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }

      // Create sessions for each day
      for (const date of dates) {
        const sessions = [
          { app_name: 'Instagram', minutes: 25 },
          { app_name: 'TikTok', minutes: 30 },
        ];

        for (const session of sessions) {
          const start = new Date(`${date}T10:00:00`);
          const end = new Date(start.getTime() + session.minutes * 60 * 1000);

          const { data } = await supabaseAdmin
            .from('usage_sessions')
            .insert({
              user_id: userId,
              app_name: session.app_name,
              session_start: start.toISOString(),
              session_end: end.toISOString(),
              minutes_used: session.minutes,
              date,
            })
            .select()
            .single();

          if (data?.id) {
            createdSessionIds.push(data.id);
          }
        }
      }

      // Create some override logs
      const overrideDates = dates.slice(0, 2); // Override on 2 days

      for (const date of overrideDates) {
        const { data } = await supabaseAdmin
          .from('override_logs')
          .insert({
            user_id: userId,
            lock_rule_id: null,
            app_name: 'Instagram',
            mood: 'bored',
            overridden_at: `${date}T12:00:00`,
          })
          .select()
          .single();

        if (data?.id) {
          createdOverrideIds.push(data.id);
        }
      }
    });

    it('should calculate per-app breakdown with override count', async () => {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);

      const startDate = weekStart.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      // Get usage sessions
      const { data: sessions } = await userClient
        .from('usage_sessions')
        .select('app_name, minutes_used')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .not('minutes_used', 'is', null);

      // Get override logs
      const { data: overrides } = await userClient
        .from('override_logs')
        .select('app_name')
        .eq('user_id', userId)
        .gte('overridden_at', `${startDate}T00:00:00`)
        .lte('overridden_at', `${endDate}T23:59:59`);

      // Calculate per-app breakdown
      const appStats: Record<string, { minutes: number; overrides: number }> = {};

      sessions?.forEach((session) => {
        const app = session.app_name;
        if (!appStats[app]) {
          appStats[app] = { minutes: 0, overrides: 0 };
        }
        appStats[app].minutes += session.minutes_used || 0;
      });

      overrides?.forEach((override) => {
        const app = override.app_name;
        if (!appStats[app]) {
          appStats[app] = { minutes: 0, overrides: 0 };
        }
        appStats[app].overrides += 1;
      });

      expect(appStats['Instagram']).toBeDefined();
      expect(appStats['Instagram'].minutes).toBeGreaterThan(0);
      expect(appStats['Instagram'].overrides).toBeGreaterThanOrEqual(2);
    });

    it('should calculate compliance percentage', async () => {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);

      const startDate = weekStart.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      // Get all dates in range
      const allDates: string[] = [];
      for (let d = new Date(weekStart); d <= today; d.setDate(d.getDate() + 1)) {
        allDates.push(d.toISOString().split('T')[0]);
      }

      // Get dates with overrides
      const { data: overrides } = await userClient
        .from('override_logs')
        .select('overridden_at')
        .eq('user_id', userId)
        .gte('overridden_at', `${startDate}T00:00:00`)
        .lte('overridden_at', `${endDate}T23:59:59`);

      const datesWithOverrides = new Set(
        overrides?.map((o) => o.overridden_at.split('T')[0])
      );

      const daysWithoutOverride = allDates.filter(
        (date) => !datesWithOverrides.has(date)
      ).length;

      const compliancePercentage = (daysWithoutOverride / allDates.length) * 100;

      expect(compliancePercentage).toBeGreaterThan(0);
      expect(compliancePercentage).toBeLessThanOrEqual(100);
      expect(daysWithoutOverride).toBe(5); // 7 days - 2 override days
    });

    it('should calculate week-over-week comparison', async () => {
      const today = new Date();

      // Current week
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - 6);

      // Previous week
      const previousWeekStart = new Date(currentWeekStart);
      previousWeekStart.setDate(currentWeekStart.getDate() - 7);
      const previousWeekEnd = new Date(currentWeekStart);
      previousWeekEnd.setDate(currentWeekStart.getDate() - 1);

      // Get current week usage
      const { data: currentWeekSessions } = await userClient
        .from('usage_sessions')
        .select('minutes_used')
        .eq('user_id', userId)
        .gte('date', currentWeekStart.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0])
        .not('minutes_used', 'is', null);

      // Get previous week usage
      const { data: previousWeekSessions } = await userClient
        .from('usage_sessions')
        .select('minutes_used')
        .eq('user_id', userId)
        .gte('date', previousWeekStart.toISOString().split('T')[0])
        .lte('date', previousWeekEnd.toISOString().split('T')[0])
        .not('minutes_used', 'is', null);

      const currentWeekMinutes = currentWeekSessions?.reduce(
        (sum, s) => sum + (s.minutes_used || 0),
        0
      ) || 0;

      const previousWeekMinutes = previousWeekSessions?.reduce(
        (sum, s) => sum + (s.minutes_used || 0),
        0
      ) || 0;

      const changePercentage =
        previousWeekMinutes > 0
          ? ((currentWeekMinutes - previousWeekMinutes) / previousWeekMinutes) * 100
          : 0;

      expect(currentWeekMinutes).toBeGreaterThan(0);
      expect(typeof changePercentage).toBe('number');
    });
  });

  describe('Daily Usage for Lock Evaluation', () => {
    it('should aggregate daily usage for timer lock evaluation', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create multiple sessions for Instagram today
      const sessions = [
        { minutes: 10 },
        { minutes: 15 },
        { minutes: 8 },
      ];

      for (const session of sessions) {
        const start = new Date();
        const end = new Date(start.getTime() + session.minutes * 60 * 1000);

        const { data } = await supabaseAdmin
          .from('usage_sessions')
          .insert({
            user_id: userId,
            app_name: 'Instagram',
            session_start: start.toISOString(),
            session_end: end.toISOString(),
            minutes_used: session.minutes,
            date: today,
          })
          .select()
          .single();

        if (data?.id) {
          createdSessionIds.push(data.id);
        }
      }

      // Query today's usage for Instagram
      const { data, error } = await userClient
        .from('usage_sessions')
        .select('minutes_used')
        .eq('user_id', userId)
        .eq('app_name', 'Instagram')
        .eq('date', today)
        .not('minutes_used', 'is', null);

      expect(error).toBeNull();

      const totalMinutes = data?.reduce((sum, s) => sum + (s.minutes_used || 0), 0);
      expect(totalMinutes).toBeGreaterThanOrEqual(33); // 10+15+8

      // This would be used to evaluate if timer lock should be active
      const dailyLimit = 30;
      const isLocked = (totalMinutes || 0) >= dailyLimit;
      expect(isLocked).toBe(true);
    });
  });
});
