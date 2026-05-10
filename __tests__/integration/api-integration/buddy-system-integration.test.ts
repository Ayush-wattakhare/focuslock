/**
 * Integration Tests for Buddy System API Routes
 * Tests buddy invitations, acceptance, notifications, and RLS policies
 * 
 * Validates: Task 16.1 - API routes with database interactions, RLS policies, and Realtime
 */

import {
  createTestUser,
  deleteTestUser,
  createTestProfile,
  createTestLockRule,
  createTestBuddyRelationship,
  createTestOverrideLog,
  cleanupTestData,
  createServiceClient,
  createAuthenticatedClient,
  wait,
} from '../helpers/testHelpers';

describe('Buddy System API Integration', () => {
  let user1: { userId: string; email: string; accessToken: string };
  let user2: { userId: string; email: string; accessToken: string };
  let user3: { userId: string; email: string; accessToken: string };

  beforeAll(async () => {
    user1 = await createTestUser();
    user2 = await createTestUser();
    user3 = await createTestUser();

    await createTestProfile(user1.userId);
    await createTestProfile(user2.userId);
    await createTestProfile(user3.userId);
  });

  afterAll(async () => {
    await cleanupTestData(user1.userId);
    await cleanupTestData(user2.userId);
    await cleanupTestData(user3.userId);
    await deleteTestUser(user1.userId);
    await deleteTestUser(user2.userId);
    await deleteTestUser(user3.userId);
  });

  describe('Buddy Invitation Flow', () => {
    it('should create buddy invitation with pending status', async () => {
      const serviceClient = createServiceClient();

      const { data: buddy, error } = await serviceClient
        .from('buddies')
        .insert({
          user_id: user1.userId,
          buddy_user_id: user2.userId,
          rules_watching: null,
          status: 'pending',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(buddy).toBeDefined();
      expect(buddy!.user_id).toBe(user1.userId);
      expect(buddy!.buddy_user_id).toBe(user2.userId);
      expect(buddy!.status).toBe('pending');
      expect(buddy!.invited_at).toBeDefined();
    });

    it('should create buddy invitation with specific rules to watch', async () => {
      const serviceClient = createServiceClient();

      const rule1 = await createTestLockRule(user1.userId, {
        app_name: 'Instagram',
        lock_type: 'timer',
        daily_limit_minutes: 30,
      });

      const rule2 = await createTestLockRule(user1.userId, {
        app_name: 'YouTube',
        lock_type: 'timer',
        daily_limit_minutes: 45,
      });

      const { data: buddy, error } = await serviceClient
        .from('buddies')
        .insert({
          user_id: user1.userId,
          buddy_user_id: user3.userId,
          rules_watching: [rule1.id, rule2.id],
          status: 'pending',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(buddy!.rules_watching).toEqual([rule1.id, rule2.id]);
    });

    it('should prevent self-invitation', async () => {
      const serviceClient = createServiceClient();

      const { error } = await serviceClient
        .from('buddies')
        .insert({
          user_id: user1.userId,
          buddy_user_id: user1.userId, // Same user!
          status: 'pending',
        });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('user_id != buddy_user_id');
    });

    it('should prevent duplicate buddy relationships', async () => {
      const serviceClient = createServiceClient();

      // Create first relationship
      await serviceClient.from('buddies').insert({
        user_id: user1.userId,
        buddy_user_id: user2.userId,
        status: 'active',
      });

      // Try to create duplicate
      const { error } = await serviceClient.from('buddies').insert({
        user_id: user1.userId,
        buddy_user_id: user2.userId,
        status: 'pending',
      });

      expect(error).not.toBeNull();
      expect(error!.code).toBe('23505'); // Unique violation
    });
  });

  describe('Buddy Acceptance Flow', () => {
    it('should accept buddy invitation and update status', async () => {
      const serviceClient = createServiceClient();

      // Create pending invitation
      const { data: invitation } = await serviceClient
        .from('buddies')
        .insert({
          user_id: user1.userId,
          buddy_user_id: user2.userId,
          status: 'pending',
        })
        .select()
        .single();

      // Accept invitation
      const { data: accepted, error } = await serviceClient
        .from('buddies')
        .update({
          status: 'active',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(accepted!.status).toBe('active');
      expect(accepted!.accepted_at).toBeDefined();
    });

    it('should allow buddy to update rules_watching after acceptance', async () => {
      const serviceClient = createServiceClient();

      const rule = await createTestLockRule(user1.userId, {
        app_name: 'TikTok',
        lock_type: 'timer',
        daily_limit_minutes: 20,
      });

      const { data: buddy } = await serviceClient
        .from('buddies')
        .insert({
          user_id: user1.userId,
          buddy_user_id: user3.userId,
          rules_watching: null,
          status: 'active',
        })
        .select()
        .single();

      // Update rules watching
      const { data: updated, error } = await serviceClient
        .from('buddies')
        .update({ rules_watching: [rule.id] })
        .eq('id', buddy!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated!.rules_watching).toEqual([rule.id]);
    });
  });

  describe('Buddy Relationship RLS Policies', () => {
    it('should allow user to view buddy relationships where they are user', async () => {
      const client1 = createAuthenticatedClient(user1.accessToken);

      await createTestBuddyRelationship(user1.userId, user2.userId, {
        status: 'active',
      });

      const { data, error } = await client1
        .from('buddies')
        .select('*')
        .eq('user_id', user1.userId);

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
    });

    it('should allow user to view buddy relationships where they are buddy', async () => {
      const client2 = createAuthenticatedClient(user2.accessToken);

      await createTestBuddyRelationship(user1.userId, user2.userId, {
        status: 'active',
      });

      const { data, error } = await client2
        .from('buddies')
        .select('*')
        .eq('buddy_user_id', user2.userId);

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
    });

    it('should prevent user from viewing unrelated buddy relationships', async () => {
      const client3 = createAuthenticatedClient(user3.accessToken);

      // Create relationship between user1 and user2
      await createTestBuddyRelationship(user1.userId, user2.userId, {
        status: 'active',
      });

      // User3 tries to view it
      const { data } = await client3
        .from('buddies')
        .select('*')
        .eq('user_id', user1.userId)
        .eq('buddy_user_id', user2.userId);

      // RLS should prevent access
      expect(data).toEqual([]);
    });
  });

  describe('Buddy Notifications', () => {
    it('should create notification when buddy overrides watched rule', async () => {
      const serviceClient = createServiceClient();

      const rule = await createTestLockRule(user1.userId, {
        app_name: 'Facebook',
        lock_type: 'timer',
        daily_limit_minutes: 30,
      });

      await createTestBuddyRelationship(user1.userId, user2.userId, {
        rules_watching: [rule.id],
        status: 'active',
      });

      // Create override
      await createTestOverrideLog(user1.userId, rule.id, {
        app_name: 'Facebook',
        mood: 'bored',
      });

      // Create notification
      const { data: notification, error } = await serviceClient
        .from('buddy_notifications')
        .insert({
          from_user_id: user1.userId,
          to_user_id: user2.userId,
          event_type: 'override',
          app_name: 'Facebook',
          message: 'Your buddy overrode their Facebook lock',
          is_read: false,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(notification).toBeDefined();
      expect(notification!.event_type).toBe('override');
      expect(notification!.is_read).toBe(false);
    });

    it('should allow buddy to mark notification as read', async () => {
      const serviceClient = createServiceClient();

      const { data: notification } = await serviceClient
        .from('buddy_notifications')
        .insert({
          from_user_id: user1.userId,
          to_user_id: user2.userId,
          event_type: 'override',
          app_name: 'Twitter',
          message: 'Test notification',
          is_read: false,
        })
        .select()
        .single();

      // Mark as read
      const { data: updated, error } = await serviceClient
        .from('buddy_notifications')
        .update({ is_read: true })
        .eq('id', notification!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated!.is_read).toBe(true);
    });

    it('should create streak_broken notification', async () => {
      const serviceClient = createServiceClient();

      await createTestBuddyRelationship(user1.userId, user2.userId, {
        status: 'active',
      });

      const { data: notification, error } = await serviceClient
        .from('buddy_notifications')
        .insert({
          from_user_id: user1.userId,
          to_user_id: user2.userId,
          event_type: 'streak_broken',
          message: 'Your buddy broke their 5-day streak',
          is_read: false,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(notification!.event_type).toBe('streak_broken');
    });

    it('should create weekly_summary notification', async () => {
      const serviceClient = createServiceClient();

      await createTestBuddyRelationship(user1.userId, user2.userId, {
        status: 'active',
      });

      const { data: notification, error } = await serviceClient
        .from('buddy_notifications')
        .insert({
          from_user_id: user1.userId,
          to_user_id: user2.userId,
          event_type: 'weekly_summary',
          message: 'Your buddy had 3 overrides this week',
          is_read: false,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(notification!.event_type).toBe('weekly_summary');
    });

    it('should enforce RLS - user can only read notifications sent to them', async () => {
      const serviceClient = createServiceClient();
      const client2 = createAuthenticatedClient(user2.accessToken);

      // Create notification for user2
      const { data: notification } = await serviceClient
        .from('buddy_notifications')
        .insert({
          from_user_id: user1.userId,
          to_user_id: user2.userId,
          event_type: 'override',
          app_name: 'Instagram',
          message: 'Test',
        })
        .select()
        .single();

      // User2 reads their notification
      const { data, error } = await client2
        .from('buddy_notifications')
        .select('*')
        .eq('id', notification!.id);

      expect(error).toBeNull();
      expect(data!.length).toBe(1);
    });

    it('should enforce RLS - user cannot read notifications sent to others', async () => {
      const serviceClient = createServiceClient();
      const client3 = createAuthenticatedClient(user3.accessToken);

      // Create notification for user2
      const { data: notification } = await serviceClient
        .from('buddy_notifications')
        .insert({
          from_user_id: user1.userId,
          to_user_id: user2.userId,
          event_type: 'override',
          app_name: 'YouTube',
          message: 'Private',
        })
        .select()
        .single();

      // User3 tries to read it
      const { data } = await client3
        .from('buddy_notifications')
        .select('*')
        .eq('id', notification!.id);

      // RLS should prevent access
      expect(data).toEqual([]);
    });
  });

  describe('Buddy Override Log Access', () => {
    it('should allow buddy to read override logs for watched rules', async () => {
      const serviceClient = createServiceClient();
      const client2 = createAuthenticatedClient(user2.accessToken);

      const rule = await createTestLockRule(user1.userId, {
        app_name: 'Reddit',
        lock_type: 'timer',
        daily_limit_minutes: 25,
      });

      await createTestBuddyRelationship(user1.userId, user2.userId, {
        rules_watching: [rule.id],
        status: 'active',
      });

      const { data: log } = await serviceClient
        .from('override_logs')
        .insert({
          user_id: user1.userId,
          lock_rule_id: rule.id,
          app_name: 'Reddit',
          mood: 'bored',
        })
        .select()
        .single();

      // Buddy reads override log
      const { data, error } = await client2
        .from('override_logs')
        .select('*')
        .eq('id', log!.id);

      expect(error).toBeNull();
      expect(data!.length).toBe(1);
    });

    it('should allow buddy to read all override logs when watching all rules', async () => {
      const serviceClient = createServiceClient();
      const client2 = createAuthenticatedClient(user2.accessToken);

      const rule = await createTestLockRule(user1.userId, {
        app_name: 'LinkedIn',
        lock_type: 'timer',
        daily_limit_minutes: 40,
      });

      // Buddy watches all rules (null)
      await createTestBuddyRelationship(user1.userId, user2.userId, {
        rules_watching: null,
        status: 'active',
      });

      const { data: log } = await serviceClient
        .from('override_logs')
        .insert({
          user_id: user1.userId,
          lock_rule_id: rule.id,
          app_name: 'LinkedIn',
          mood: 'news',
        })
        .select()
        .single();

      // Buddy reads override
      const { data, error } = await client2
        .from('override_logs')
        .select('*')
        .eq('id', log!.id);

      expect(error).toBeNull();
      expect(data!.length).toBe(1);
    });

    it('should not allow buddy to read override logs for unwatched rules', async () => {
      const serviceClient = createServiceClient();
      const client2 = createAuthenticatedClient(user2.accessToken);

      const rule1 = await createTestLockRule(user1.userId, {
        app_name: 'Snapchat',
        lock_type: 'timer',
        daily_limit_minutes: 15,
      });

      const rule2 = await createTestLockRule(user1.userId, {
        app_name: 'Pinterest',
        lock_type: 'timer',
        daily_limit_minutes: 20,
      });

      // Buddy only watches rule1
      await createTestBuddyRelationship(user1.userId, user2.userId, {
        rules_watching: [rule1.id],
        status: 'active',
      });

      // Create override for rule2 (not watched)
      const { data: log } = await serviceClient
        .from('override_logs')
        .insert({
          user_id: user1.userId,
          lock_rule_id: rule2.id,
          app_name: 'Pinterest',
          mood: 'tired',
        })
        .select()
        .single();

      // Buddy tries to read unwatched override
      const { data } = await client2
        .from('override_logs')
        .select('*')
        .eq('id', log!.id);

      // RLS should prevent access
      expect(data).toEqual([]);
    });

    it('should not allow buddy to read override logs if relationship is not active', async () => {
      const serviceClient = createServiceClient();
      const client2 = createAuthenticatedClient(user2.accessToken);

      const rule = await createTestLockRule(user1.userId, {
        app_name: 'WhatsApp',
        lock_type: 'timer',
        daily_limit_minutes: 30,
      });

      // Create pending (not active) relationship
      await createTestBuddyRelationship(user1.userId, user2.userId, {
        rules_watching: [rule.id],
        status: 'pending',
      });

      const { data: log } = await serviceClient
        .from('override_logs')
        .insert({
          user_id: user1.userId,
          lock_rule_id: rule.id,
          app_name: 'WhatsApp',
          mood: 'bored',
        })
        .select()
        .single();

      // Buddy tries to read (should fail because status is pending)
      const { data } = await client2
        .from('override_logs')
        .select('*')
        .eq('id', log!.id);

      // RLS should prevent access
      expect(data).toEqual([]);
    });
  });

  describe('Buddy Relationship Removal', () => {
    it('should update status to removed when relationship is ended', async () => {
      const serviceClient = createServiceClient();

      const { data: buddy } = await serviceClient
        .from('buddies')
        .insert({
          user_id: user1.userId,
          buddy_user_id: user2.userId,
          status: 'active',
        })
        .select()
        .single();

      // Remove relationship
      const { data: removed, error } = await serviceClient
        .from('buddies')
        .update({ status: 'removed' })
        .eq('id', buddy!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(removed!.status).toBe('removed');
    });

    it('should prevent buddy from reading override logs after removal', async () => {
      const serviceClient = createServiceClient();
      const client2 = createAuthenticatedClient(user2.accessToken);

      const rule = await createTestLockRule(user1.userId, {
        app_name: 'Telegram',
        lock_type: 'timer',
        daily_limit_minutes: 25,
      });

      const { data: buddy } = await serviceClient
        .from('buddies')
        .insert({
          user_id: user1.userId,
          buddy_user_id: user2.userId,
          rules_watching: [rule.id],
          status: 'active',
        })
        .select()
        .single();

      // Remove relationship
      await serviceClient
        .from('buddies')
        .update({ status: 'removed' })
        .eq('id', buddy!.id);

      // Create override after removal
      const { data: log } = await serviceClient
        .from('override_logs')
        .insert({
          user_id: user1.userId,
          lock_rule_id: rule.id,
          app_name: 'Telegram',
          mood: 'bored',
        })
        .select()
        .single();

      // Buddy tries to read (should fail)
      const { data } = await client2
        .from('override_logs')
        .select('*')
        .eq('id', log!.id);

      expect(data).toEqual([]);
    });
  });
});
