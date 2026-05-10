/**
 * Integration Tests for Realtime Buddy Notifications
 * Tests Supabase Realtime subscriptions for buddy notification delivery
 * 
 * Validates: Task 16.1 - Realtime subscriptions for buddy notifications
 */

import {
  createTestUser,
  deleteTestUser,
  createTestProfile,
  createTestLockRule,
  createTestBuddyRelationship,
  cleanupTestData,
  createServiceClient,
  wait,
} from '../helpers/testHelpers';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

describe('Buddy Notifications Realtime Integration', () => {
  let testUser: { userId: string; email: string; accessToken: string };
  let buddyUser: { userId: string; email: string; accessToken: string };
  let supabase: ReturnType<typeof createClient<Database>>;

  beforeAll(async () => {
    testUser = await createTestUser();
    buddyUser = await createTestUser();

    await createTestProfile(testUser.userId);
    await createTestProfile(buddyUser.userId);

    // Create Supabase client for Realtime
    supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  });

  afterAll(async () => {
    await cleanupTestData(testUser.userId);
    await cleanupTestData(buddyUser.userId);
    await deleteTestUser(testUser.userId);
    await deleteTestUser(buddyUser.userId);
  });

  describe('Realtime Subscription for Buddy Notifications', () => {
    it('should receive realtime notification when buddy overrides lock', async () => {
      const serviceClient = createServiceClient();
      const notifications: any[] = [];

      // Create lock rule and buddy relationship
      const rule = await createTestLockRule(testUser.userId, {
        app_name: 'Instagram',
        lock_type: 'timer',
        daily_limit_minutes: 30,
      });

      await createTestBuddyRelationship(testUser.userId, buddyUser.userId, {
        rules_watching: [rule.id],
        status: 'active',
      });

      // Subscribe to buddy notifications
      const channel = supabase
        .channel('buddy-notifications-test')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'buddy_notifications',
            filter: `to_user_id=eq.${buddyUser.userId}`,
          },
          (payload) => {
            notifications.push(payload.new);
          }
        )
        .subscribe();

      // Wait for subscription to be ready
      await wait(1500);

      // Create override and notification
      await serviceClient.from('override_logs').insert({
        user_id: testUser.userId,
        lock_rule_id: rule.id,
        app_name: 'Instagram',
        mood: 'bored',
      });

      await serviceClient.from('buddy_notifications').insert({
        from_user_id: testUser.userId,
        to_user_id: buddyUser.userId,
        event_type: 'override',
        app_name: 'Instagram',
        message: 'Your buddy overrode their Instagram lock',
        is_read: false,
      });

      // Wait for realtime notification
      await wait(2000);

      // Verify notification received
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].from_user_id).toBe(testUser.userId);
      expect(notifications[0].to_user_id).toBe(buddyUser.userId);
      expect(notifications[0].event_type).toBe('override');
      expect(notifications[0].app_name).toBe('Instagram');

      // Cleanup
      await supabase.removeChannel(channel);
    }, 10000); // Longer timeout for Realtime

    it('should receive multiple notifications in sequence', async () => {
      const serviceClient = createServiceClient();
      const notifications: any[] = [];

      // Create multiple rules
      const rule1 = await createTestLockRule(testUser.userId, {
        app_name: 'YouTube',
        lock_type: 'timer',
        daily_limit_minutes: 45,
      });

      const rule2 = await createTestLockRule(testUser.userId, {
        app_name: 'TikTok',
        lock_type: 'timer',
        daily_limit_minutes: 20,
      });

      await createTestBuddyRelationship(testUser.userId, buddyUser.userId, {
        rules_watching: null, // Watch all rules
        status: 'active',
      });

      // Subscribe
      const channel = supabase
        .channel('buddy-notifications-multi-test')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'buddy_notifications',
            filter: `to_user_id=eq.${buddyUser.userId}`,
          },
          (payload) => {
            notifications.push(payload.new);
          }
        )
        .subscribe();

      await wait(1500);

      // Create multiple notifications
      await serviceClient.from('buddy_notifications').insert([
        {
          from_user_id: testUser.userId,
          to_user_id: buddyUser.userId,
          event_type: 'override',
          app_name: 'YouTube',
          message: 'Override 1',
        },
        {
          from_user_id: testUser.userId,
          to_user_id: buddyUser.userId,
          event_type: 'override',
          app_name: 'TikTok',
          message: 'Override 2',
        },
      ]);

      await wait(2500);

      // Verify both notifications received
      expect(notifications.length).toBeGreaterThanOrEqual(2);
      const appNames = notifications.map((n) => n.app_name);
      expect(appNames).toContain('YouTube');
      expect(appNames).toContain('TikTok');

      await supabase.removeChannel(channel);
    }, 12000);

    it('should not receive notifications for other users', async () => {
      const serviceClient = createServiceClient();
      const notifications: any[] = [];

      // Create third user
      const otherUser = await createTestUser();
      await createTestProfile(otherUser.userId);

      // Subscribe to buddyUser notifications
      const channel = supabase
        .channel('buddy-notifications-isolation-test')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'buddy_notifications',
            filter: `to_user_id=eq.${buddyUser.userId}`,
          },
          (payload) => {
            notifications.push(payload.new);
          }
        )
        .subscribe();

      await wait(1500);

      // Create notification for otherUser (not buddyUser)
      await serviceClient.from('buddy_notifications').insert({
        from_user_id: testUser.userId,
        to_user_id: otherUser.userId, // Different recipient
        event_type: 'override',
        app_name: 'Facebook',
        message: 'Should not be received',
      });

      await wait(2000);

      // Verify no notifications received
      expect(notifications.length).toBe(0);

      await supabase.removeChannel(channel);
      await cleanupTestData(otherUser.userId);
      await deleteTestUser(otherUser.userId);
    }, 10000);

    it('should receive streak_broken notification type', async () => {
      const serviceClient = createServiceClient();
      const notifications: any[] = [];

      await createTestBuddyRelationship(testUser.userId, buddyUser.userId, {
        rules_watching: null,
        status: 'active',
      });

      const channel = supabase
        .channel('buddy-notifications-streak-test')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'buddy_notifications',
            filter: `to_user_id=eq.${buddyUser.userId}`,
          },
          (payload) => {
            notifications.push(payload.new);
          }
        )
        .subscribe();

      await wait(1500);

      // Create streak_broken notification
      await serviceClient.from('buddy_notifications').insert({
        from_user_id: testUser.userId,
        to_user_id: buddyUser.userId,
        event_type: 'streak_broken',
        message: 'Your buddy broke their streak',
      });

      await wait(2000);

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].event_type).toBe('streak_broken');

      await supabase.removeChannel(channel);
    }, 10000);

    it('should receive weekly_summary notification type', async () => {
      const serviceClient = createServiceClient();
      const notifications: any[] = [];

      await createTestBuddyRelationship(testUser.userId, buddyUser.userId, {
        rules_watching: null,
        status: 'active',
      });

      const channel = supabase
        .channel('buddy-notifications-summary-test')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'buddy_notifications',
            filter: `to_user_id=eq.${buddyUser.userId}`,
          },
          (payload) => {
            notifications.push(payload.new);
          }
        )
        .subscribe();

      await wait(1500);

      // Create weekly_summary notification
      await serviceClient.from('buddy_notifications').insert({
        from_user_id: testUser.userId,
        to_user_id: buddyUser.userId,
        event_type: 'weekly_summary',
        message: 'Your buddy had 3 overrides this week',
      });

      await wait(2000);

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].event_type).toBe('weekly_summary');

      await supabase.removeChannel(channel);
    }, 10000);
  });

  describe('Realtime Subscription Lifecycle', () => {
    it('should successfully subscribe and unsubscribe', async () => {
      const channel = supabase
        .channel('lifecycle-test')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'buddy_notifications',
            filter: `to_user_id=eq.${buddyUser.userId}`,
          },
          () => {}
        )
        .subscribe();

      await wait(1500);

      // Verify subscription is active
      expect(channel.state).toBe('joined');

      // Unsubscribe
      await supabase.removeChannel(channel);

      // Verify channel is removed
      expect(channel.state).toBe('closed');
    }, 8000);

    it('should handle subscription errors gracefully', async () => {
      // Try to subscribe with invalid filter
      const channel = supabase
        .channel('error-test')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'nonexistent_table',
            filter: `to_user_id=eq.${buddyUser.userId}`,
          },
          () => {}
        )
        .subscribe();

      await wait(2000);

      // Channel should handle error (may be in error state or closed)
      expect(['error', 'closed', 'joined']).toContain(channel.state);

      await supabase.removeChannel(channel);
    }, 8000);
  });

  describe('Notification Marking as Read', () => {
    it('should update is_read field via Realtime', async () => {
      const serviceClient = createServiceClient();
      const updates: any[] = [];

      // Create notification
      const { data: notification } = await serviceClient
        .from('buddy_notifications')
        .insert({
          from_user_id: testUser.userId,
          to_user_id: buddyUser.userId,
          event_type: 'override',
          app_name: 'Twitter',
          message: 'Test notification',
          is_read: false,
        })
        .select()
        .single();

      // Subscribe to updates
      const channel = supabase
        .channel('notification-update-test')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'buddy_notifications',
            filter: `id=eq.${notification!.id}`,
          },
          (payload) => {
            updates.push(payload.new);
          }
        )
        .subscribe();

      await wait(1500);

      // Mark as read
      await serviceClient
        .from('buddy_notifications')
        .update({ is_read: true })
        .eq('id', notification!.id);

      await wait(2000);

      // Verify update received
      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0].is_read).toBe(true);

      await supabase.removeChannel(channel);
    }, 10000);
  });
});
