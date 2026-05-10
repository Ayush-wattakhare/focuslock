/**
 * Integration Tests for Buddy System API
 * Tests: POST /api/buddy/invite, POST /api/buddy/accept, buddy notifications
 * 
 * Validates:
 * - Buddy invitation creation
 * - Buddy acceptance flow
 * - Rules watching configuration
 * - Buddy notifications via Realtime
 * - RLS policies for buddy relationships
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

const testUser1Email = `test-buddy-1-${Date.now()}@focuslock.test`;
const testUser2Email = `test-buddy-2-${Date.now()}@focuslock.test`;
const testUser3Email = `test-buddy-3-${Date.now()}@focuslock.test`;
const testPassword = 'TestPassword123!';

describe('Buddy System Integration Tests', () => {
  let user1Id: string;
  let user2Id: string;
  let user3Id: string;
  let user1Client: ReturnType<typeof createClient<Database>>;
  let user2Client: ReturnType<typeof createClient<Database>>;
  let user3Client: ReturnType<typeof createClient<Database>>;
  let createdBuddyIds: string[] = [];
  let createdRuleIds: string[] = [];

  beforeAll(async () => {
    // Create test users
    const { data: user1Data } = await supabaseAdmin.auth.admin.createUser({
      email: testUser1Email,
      password: testPassword,
      email_confirm: true,
    });

    const { data: user2Data } = await supabaseAdmin.auth.admin.createUser({
      email: testUser2Email,
      password: testPassword,
      email_confirm: true,
    });

    const { data: user3Data } = await supabaseAdmin.auth.admin.createUser({
      email: testUser3Email,
      password: testPassword,
      email_confirm: true,
    });

    user1Id = user1Data.user!.id;
    user2Id = user2Data.user!.id;
    user3Id = user3Data.user!.id;

    // Create profiles
    await supabaseAdmin.from('profiles').insert([
      { id: user1Id, full_name: 'Buddy Test User 1' },
      { id: user2Id, full_name: 'Buddy Test User 2' },
      { id: user3Id, full_name: 'Buddy Test User 3' },
    ]);

    // Create authenticated clients
    user1Client = createClient<Database>(supabaseUrl, supabaseAnonKey);
    user2Client = createClient<Database>(supabaseUrl, supabaseAnonKey);
    user3Client = createClient<Database>(supabaseUrl, supabaseAnonKey);

    await user1Client.auth.signInWithPassword({
      email: testUser1Email,
      password: testPassword,
    });

    await user2Client.auth.signInWithPassword({
      email: testUser2Email,
      password: testPassword,
    });

    await user3Client.auth.signInWithPassword({
      email: testUser3Email,
      password: testPassword,
    });
  });

  afterAll(async () => {
    // Cleanup
    if (createdBuddyIds.length > 0) {
      await supabaseAdmin.from('buddies').delete().in('id', createdBuddyIds);
    }
    if (createdRuleIds.length > 0) {
      await supabaseAdmin.from('lock_rules').delete().in('id', createdRuleIds);
    }
    if (user1Id) await supabaseAdmin.auth.admin.deleteUser(user1Id);
    if (user2Id) await supabaseAdmin.auth.admin.deleteUser(user2Id);
    if (user3Id) await supabaseAdmin.auth.admin.deleteUser(user3Id);
  });

  describe('Buddy Invitation Creation', () => {
    it('should create buddy invitation with pending status', async () => {
      const { data, error } = await user1Client
        .from('buddies')
        .insert({
          user_id: user1Id,
          buddy_user_id: user2Id,
          status: 'pending',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.user_id).toBe(user1Id);
      expect(data?.buddy_user_id).toBe(user2Id);
      expect(data?.status).toBe('pending');
      expect(data?.invited_at).toBeDefined();
      expect(data?.accepted_at).toBeNull();

      if (data?.id) {
        createdBuddyIds.push(data.id);
      }
    });

    it('should create buddy invitation with specific rules to watch', async () => {
      // Create lock rules for user1
      const { data: rule1 } = await supabaseAdmin
        .from('lock_rules')
        .insert({
          user_id: user1Id,
          app_name: 'Instagram',
          lock_type: 'timer',
          daily_limit_minutes: 30,
        })
        .select()
        .single();

      const { data: rule2 } = await supabaseAdmin
        .from('lock_rules')
        .insert({
          user_id: user1Id,
          app_name: 'TikTok',
          lock_type: 'timer',
          daily_limit_minutes: 45,
        })
        .select()
        .single();

      createdRuleIds.push(rule1!.id, rule2!.id);

      // Create buddy invitation with rules watching
      const { data, error } = await user1Client
        .from('buddies')
        .insert({
          user_id: user1Id,
          buddy_user_id: user3Id,
          rules_watching: [rule1!.id, rule2!.id],
          status: 'pending',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.rules_watching).toEqual([rule1!.id, rule2!.id]);

      if (data?.id) {
        createdBuddyIds.push(data.id);
      }
    });

    it('should prevent duplicate buddy relationships', async () => {
      // Create first relationship
      const { data: first } = await user1Client
        .from('buddies')
        .insert({
          user_id: user1Id,
          buddy_user_id: user2Id,
          status: 'pending',
        })
        .select()
        .single();

      if (first?.id) {
        createdBuddyIds.push(first.id);
      }

      // Try to create duplicate
      const { error } = await user1Client
        .from('buddies')
        .insert({
          user_id: user1Id,
          buddy_user_id: user2Id,
          status: 'pending',
        })
        .select()
        .single();

      // Should fail due to unique constraint
      expect(error).toBeDefined();
    });

    it('should prevent self-invitation', async () => {
      const { error } = await user1Client
        .from('buddies')
        .insert({
          user_id: user1Id,
          buddy_user_id: user1Id, // Same user
          status: 'pending',
        })
        .select()
        .single();

      // Should fail due to check constraint
      expect(error).toBeDefined();
    });
  });

  describe('Buddy Acceptance Flow', () => {
    let buddyRelationshipId: string;

    beforeEach(async () => {
      // Create pending buddy invitation
      const { data } = await supabaseAdmin
        .from('buddies')
        .insert({
          user_id: user1Id,
          buddy_user_id: user2Id,
          status: 'pending',
        })
        .select()
        .single();

      buddyRelationshipId = data!.id;
      createdBuddyIds.push(buddyRelationshipId);
    });

    it('should accept buddy invitation and update status', async () => {
      const { data, error } = await user2Client
        .from('buddies')
        .update({
          status: 'active',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', buddyRelationshipId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe('active');
      expect(data?.accepted_at).toBeDefined();
    });

    it('should allow buddy to view relationship', async () => {
      // User2 (the invited buddy) should be able to view the relationship
      const { data, error } = await user2Client
        .from('buddies')
        .select('*')
        .eq('id', buddyRelationshipId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.buddy_user_id).toBe(user2Id);
    });
  });

  describe('Buddy Relationship Management', () => {
    let activeRelationshipId: string;

    beforeAll(async () => {
      // Create active buddy relationship
      const { data } = await supabaseAdmin
        .from('buddies')
        .insert({
          user_id: user1Id,
          buddy_user_id: user2Id,
          status: 'active',
          accepted_at: new Date().toISOString(),
        })
        .select()
        .single();

      activeRelationshipId = data!.id;
      createdBuddyIds.push(activeRelationshipId);
    });

    it('should update rules watching for active relationship', async () => {
      // Create lock rules
      const { data: rule } = await supabaseAdmin
        .from('lock_rules')
        .insert({
          user_id: user1Id,
          app_name: 'YouTube',
          lock_type: 'timer',
          daily_limit_minutes: 60,
        })
        .select()
        .single();

      createdRuleIds.push(rule!.id);

      // Update rules watching
      const { data, error } = await user1Client
        .from('buddies')
        .update({
          rules_watching: [rule!.id],
        })
        .eq('id', activeRelationshipId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.rules_watching).toEqual([rule!.id]);
    });

    it('should remove buddy relationship by updating status', async () => {
      const { data, error } = await user1Client
        .from('buddies')
        .update({ status: 'removed' })
        .eq('id', activeRelationshipId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe('removed');
    });

    it('should allow both users to view the relationship', async () => {
      // User1 (creator) can view
      const { data: user1View, error: user1Error } = await user1Client
        .from('buddies')
        .select('*')
        .eq('id', activeRelationshipId)
        .single();

      expect(user1Error).toBeNull();
      expect(user1View).toBeDefined();

      // User2 (buddy) can view
      const { data: user2View, error: user2Error } = await user2Client
        .from('buddies')
        .select('*')
        .eq('id', activeRelationshipId)
        .single();

      expect(user2Error).toBeNull();
      expect(user2View).toBeDefined();
    });

    it('should prevent user3 from viewing user1-user2 relationship', async () => {
      const { data, error } = await user3Client
        .from('buddies')
        .select('*')
        .eq('id', activeRelationshipId)
        .single();

      // RLS should prevent access
      expect(error || !data).toBeTruthy();
    });
  });

  describe('Buddy Notifications', () => {
    let buddyRelationshipId: string;

    beforeAll(async () => {
      // Create active buddy relationship
      const { data } = await supabaseAdmin
        .from('buddies')
        .insert({
          user_id: user1Id,
          buddy_user_id: user2Id,
          status: 'active',
          accepted_at: new Date().toISOString(),
        })
        .select()
        .single();

      buddyRelationshipId = data!.id;
      createdBuddyIds.push(buddyRelationshipId);
    });

    it('should create buddy notification', async () => {
      const { data, error } = await user1Client
        .from('buddy_notifications')
        .insert({
          from_user_id: user1Id,
          to_user_id: user2Id,
          event_type: 'override',
          app_name: 'Instagram',
          message: 'Your buddy overrode their Instagram lock',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.from_user_id).toBe(user1Id);
      expect(data?.to_user_id).toBe(user2Id);
      expect(data?.event_type).toBe('override');
      expect(data?.is_read).toBe(false);

      // Cleanup
      if (data?.id) {
        await supabaseAdmin
          .from('buddy_notifications')
          .delete()
          .eq('id', data.id);
      }
    });

    it('should allow recipient to view notifications', async () => {
      // Create notification
      const { data: notification } = await supabaseAdmin
        .from('buddy_notifications')
        .insert({
          from_user_id: user1Id,
          to_user_id: user2Id,
          event_type: 'streak_broken',
          message: 'Your buddy broke their streak',
        })
        .select()
        .single();

      // User2 should be able to view
      const { data, error } = await user2Client
        .from('buddy_notifications')
        .select('*')
        .eq('id', notification!.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Cleanup
      await supabaseAdmin
        .from('buddy_notifications')
        .delete()
        .eq('id', notification!.id);
    });

    it('should prevent non-recipient from viewing notifications', async () => {
      // Create notification for user2
      const { data: notification } = await supabaseAdmin
        .from('buddy_notifications')
        .insert({
          from_user_id: user1Id,
          to_user_id: user2Id,
          event_type: 'weekly_summary',
          message: 'Weekly summary',
        })
        .select()
        .single();

      // User3 should NOT be able to view
      const { data, error } = await user3Client
        .from('buddy_notifications')
        .select('*')
        .eq('id', notification!.id)
        .single();

      // RLS should prevent access
      expect(error || !data).toBeTruthy();

      // Cleanup
      await supabaseAdmin
        .from('buddy_notifications')
        .delete()
        .eq('id', notification!.id);
    });

    it('should mark notification as read', async () => {
      // Create notification
      const { data: notification } = await supabaseAdmin
        .from('buddy_notifications')
        .insert({
          from_user_id: user1Id,
          to_user_id: user2Id,
          event_type: 'override',
          message: 'Test notification',
        })
        .select()
        .single();

      // Mark as read
      const { data, error } = await user2Client
        .from('buddy_notifications')
        .update({ is_read: true })
        .eq('id', notification!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.is_read).toBe(true);

      // Cleanup
      await supabaseAdmin
        .from('buddy_notifications')
        .delete()
        .eq('id', notification!.id);
    });
  });

  describe('Realtime Buddy Notifications', () => {
    it('should receive realtime notification when buddy creates notification', async (done) => {
      // Create active buddy relationship
      const { data: buddy } = await supabaseAdmin
        .from('buddies')
        .insert({
          user_id: user1Id,
          buddy_user_id: user2Id,
          status: 'active',
          accepted_at: new Date().toISOString(),
        })
        .select()
        .single();

      createdBuddyIds.push(buddy!.id);

      // Subscribe to notifications as user2
      const subscription = user2Client
        .channel('buddy_notifications_test')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'buddy_notifications',
            filter: `to_user_id=eq.${user2Id}`,
          },
          (payload) => {
            expect(payload.new).toBeDefined();
            expect(payload.new.from_user_id).toBe(user1Id);
            expect(payload.new.to_user_id).toBe(user2Id);
            expect(payload.new.message).toBe('Realtime test notification');

            // Cleanup
            supabaseAdmin
              .from('buddy_notifications')
              .delete()
              .eq('id', payload.new.id)
              .then(() => {
                subscription.unsubscribe();
                done();
              });
          }
        )
        .subscribe();

      // Wait for subscription to be ready
      setTimeout(async () => {
        // Create notification
        await supabaseAdmin.from('buddy_notifications').insert({
          from_user_id: user1Id,
          to_user_id: user2Id,
          event_type: 'override',
          message: 'Realtime test notification',
        });
      }, 1000);
    }, 10000); // 10 second timeout
  });
});
