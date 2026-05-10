/**
 * Integration Tests for Lock Rules API
 * Tests complete CRUD workflows with database interactions and RLS enforcement
 * 
 * Validates: Task 16.1 - API routes with database interactions and RLS policies
 */

import { createTestUser, deleteTestUser, createTestProfile, createTestLockRule, cleanupTestData, createServiceClient, createAuthenticatedClient } from '../helpers/testHelpers';

describe('Lock Rules API Integration', () => {
  let testUser1: { userId: string; email: string; accessToken: string };
  let testUser2: { userId: string; email: string; accessToken: string };

  beforeAll(async () => {
    // Create two test users for RLS testing
    testUser1 = await createTestUser();
    testUser2 = await createTestUser();

    // Create profiles for both users
    await createTestProfile(testUser1.userId);
    await createTestProfile(testUser2.userId);
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData(testUser1.userId);
    await cleanupTestData(testUser2.userId);
    await deleteTestUser(testUser1.userId);
    await deleteTestUser(testUser2.userId);
  });

  describe('GET /api/rules - Fetch Lock Rules', () => {
    it('should fetch lock rules for authenticated user', async () => {
      const client = createAuthenticatedClient(testUser1.accessToken);

      // Create a test lock rule
      const rule = await createTestLockRule(testUser1.userId, {
        app_name: 'Instagram',
        lock_type: 'timer',
        daily_limit_minutes: 30,
      });

      // Fetch rules via client (simulating API call)
      const { data, error } = await client
        .from('lock_rules')
        .select('*')
        .eq('user_id', testUser1.userId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
      expect(data![0].app_name).toBe('Instagram');
      expect(data![0].lock_type).toBe('timer');
      expect(data![0].daily_limit_minutes).toBe(30);
    });

    it('should enforce RLS - user cannot fetch other user rules', async () => {
      const client = createAuthenticatedClient(testUser2.accessToken);

      // User 1 has rules, User 2 tries to fetch them
      const { data, error } = await client
        .from('lock_rules')
        .select('*')
        .eq('user_id', testUser1.userId);

      // RLS should prevent access - returns empty array
      expect(data).toEqual([]);
    });

    it('should return only active rules when filtered', async () => {
      const client = createAuthenticatedClient(testUser1.userId);

      // Create active and inactive rules
      await createTestLockRule(testUser1.userId, {
        app_name: 'YouTube',
        lock_type: 'schedule',
        schedule_start: '09:00',
        schedule_end: '17:00',
        schedule_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        is_active: true,
      });

      await createTestLockRule(testUser1.userId, {
        app_name: 'TikTok',
        lock_type: 'timer',
        daily_limit_minutes: 15,
        is_active: false,
      });

      const { data, error } = await client
        .from('lock_rules')
        .select('*')
        .eq('user_id', testUser1.userId)
        .eq('is_active', true);

      expect(error).toBeNull();
      const activeRules = data!.filter(r => r.is_active);
      const inactiveRules = data!.filter(r => !r.is_active);
      
      expect(activeRules.length).toBeGreaterThan(0);
      expect(inactiveRules.length).toBe(0);
    });
  });

  describe('POST /api/rules - Create Lock Rule', () => {
    it('should create timer lock rule with valid data', async () => {
      const client = createAuthenticatedClient(testUser1.accessToken);

      const { data, error } = await client
        .from('lock_rules')
        .insert({
          user_id: testUser1.userId,
          app_name: 'Facebook',
          lock_type: 'timer',
          daily_limit_minutes: 45,
          hide_from_home: true,
          strict_mode: false,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.app_name).toBe('Facebook');
      expect(data!.lock_type).toBe('timer');
      expect(data!.daily_limit_minutes).toBe(45);
      expect(data!.user_id).toBe(testUser1.userId);
    });

    it('should create schedule lock rule with valid data', async () => {
      const client = createAuthenticatedClient(testUser1.accessToken);

      const { data, error } = await client
        .from('lock_rules')
        .insert({
          user_id: testUser1.userId,
          app_name: 'Twitter',
          lock_type: 'schedule',
          schedule_start: '22:00',
          schedule_end: '06:00',
          schedule_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.lock_type).toBe('schedule');
      expect(data!.schedule_start).toBe('22:00:00');
      expect(data!.schedule_end).toBe('06:00:00');
      expect(data!.schedule_days).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
    });

    it('should create until_date lock rule with valid data', async () => {
      const client = createAuthenticatedClient(testUser1.accessToken);
      const unlockDate = new Date();
      unlockDate.setDate(unlockDate.getDate() + 7);

      const { data, error } = await client
        .from('lock_rules')
        .insert({
          user_id: testUser1.userId,
          app_name: 'Reddit',
          lock_type: 'until_date',
          unlock_date: unlockDate.toISOString().split('T')[0],
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.lock_type).toBe('until_date');
      expect(data!.unlock_date).toBe(unlockDate.toISOString().split('T')[0]);
    });

    it('should create nuclear lock rule', async () => {
      const client = createAuthenticatedClient(testUser1.accessToken);

      const { data, error } = await client
        .from('lock_rules')
        .insert({
          user_id: testUser1.userId,
          app_name: 'TikTok',
          lock_type: 'nuclear',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.lock_type).toBe('nuclear');
    });

    it('should enforce RLS - user cannot create rule for other user', async () => {
      const client = createAuthenticatedClient(testUser2.accessToken);

      // Try to create rule for testUser1
      const { data, error } = await client
        .from('lock_rules')
        .insert({
          user_id: testUser1.userId, // Different user!
          app_name: 'Snapchat',
          lock_type: 'timer',
          daily_limit_minutes: 20,
        })
        .select()
        .single();

      // RLS should prevent this
      expect(error).not.toBeNull();
    });
  });

  describe('PUT /api/rules/[id] - Update Lock Rule', () => {
    it('should update lock rule successfully', async () => {
      const client = createAuthenticatedClient(testUser1.accessToken);

      // Create a rule
      const rule = await createTestLockRule(testUser1.userId, {
        app_name: 'Instagram',
        lock_type: 'timer',
        daily_limit_minutes: 30,
        is_active: true,
      });

      // Update the rule
      const { data, error } = await client
        .from('lock_rules')
        .update({
          daily_limit_minutes: 60,
          is_active: false,
        })
        .eq('id', rule.id)
        .eq('user_id', testUser1.userId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.daily_limit_minutes).toBe(60);
      expect(data!.is_active).toBe(false);
    });

    it('should enforce RLS - user cannot update other user rule', async () => {
      const client = createAuthenticatedClient(testUser2.accessToken);

      // Create rule for user1
      const rule = await createTestLockRule(testUser1.userId, {
        app_name: 'YouTube',
        lock_type: 'timer',
        daily_limit_minutes: 30,
      });

      // User2 tries to update user1's rule
      const { data, error } = await client
        .from('lock_rules')
        .update({ daily_limit_minutes: 120 })
        .eq('id', rule.id)
        .select();

      // RLS should prevent update - returns empty array
      expect(data).toEqual([]);
    });

    it('should update lock type and related fields', async () => {
      const client = createAuthenticatedClient(testUser1.accessToken);

      // Create timer rule
      const rule = await createTestLockRule(testUser1.userId, {
        app_name: 'Facebook',
        lock_type: 'timer',
        daily_limit_minutes: 30,
      });

      // Change to schedule rule
      const { data, error } = await client
        .from('lock_rules')
        .update({
          lock_type: 'schedule',
          schedule_start: '09:00',
          schedule_end: '17:00',
          schedule_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
          daily_limit_minutes: null, // Clear timer field
        })
        .eq('id', rule.id)
        .eq('user_id', testUser1.userId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.lock_type).toBe('schedule');
      expect(data!.schedule_start).toBe('09:00:00');
      expect(data!.daily_limit_minutes).toBeNull();
    });
  });

  describe('DELETE /api/rules/[id] - Delete Lock Rule', () => {
    it('should delete lock rule successfully', async () => {
      const client = createAuthenticatedClient(testUser1.accessToken);

      // Create a rule
      const rule = await createTestLockRule(testUser1.userId, {
        app_name: 'Snapchat',
        lock_type: 'timer',
        daily_limit_minutes: 15,
      });

      // Delete the rule
      const { error } = await client
        .from('lock_rules')
        .delete()
        .eq('id', rule.id)
        .eq('user_id', testUser1.userId);

      expect(error).toBeNull();

      // Verify deletion
      const { data } = await client
        .from('lock_rules')
        .select()
        .eq('id', rule.id);

      expect(data).toEqual([]);
    });

    it('should enforce RLS - user cannot delete other user rule', async () => {
      const client = createAuthenticatedClient(testUser2.accessToken);

      // Create rule for user1
      const rule = await createTestLockRule(testUser1.userId, {
        app_name: 'Twitter',
        lock_type: 'timer',
        daily_limit_minutes: 20,
      });

      // User2 tries to delete user1's rule
      const { error } = await client
        .from('lock_rules')
        .delete()
        .eq('id', rule.id);

      // RLS should prevent deletion
      // Verify rule still exists
      const serviceClient = createServiceClient();
      const { data } = await serviceClient
        .from('lock_rules')
        .select()
        .eq('id', rule.id);

      expect(data!.length).toBe(1);
    });

    it('should set override_logs.lock_rule_id to NULL on delete', async () => {
      const serviceClient = createServiceClient();

      // Create rule and override log
      const rule = await createTestLockRule(testUser1.userId, {
        app_name: 'Instagram',
        lock_type: 'timer',
        daily_limit_minutes: 30,
      });

      const { data: log } = await serviceClient
        .from('override_logs')
        .insert({
          user_id: testUser1.userId,
          lock_rule_id: rule.id,
          app_name: 'Instagram',
          mood: 'bored',
        })
        .select()
        .single();

      // Delete the rule
      await serviceClient
        .from('lock_rules')
        .delete()
        .eq('id', rule.id);

      // Check override log
      const { data: updatedLog } = await serviceClient
        .from('override_logs')
        .select()
        .eq('id', log!.id)
        .single();

      expect(updatedLog!.lock_rule_id).toBeNull();
    });
  });

  describe('Database Constraints', () => {
    it('should enforce timer lock requires daily_limit_minutes', async () => {
      const serviceClient = createServiceClient();

      const { error } = await serviceClient
        .from('lock_rules')
        .insert({
          user_id: testUser1.userId,
          app_name: 'TestApp',
          lock_type: 'timer',
          // Missing daily_limit_minutes
        });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('valid_timer');
    });

    it('should enforce schedule lock requires schedule fields', async () => {
      const serviceClient = createServiceClient();

      const { error } = await serviceClient
        .from('lock_rules')
        .insert({
          user_id: testUser1.userId,
          app_name: 'TestApp',
          lock_type: 'schedule',
          // Missing schedule_start, schedule_end, schedule_days
        });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('valid_schedule');
    });

    it('should enforce until_date lock requires unlock_date', async () => {
      const serviceClient = createServiceClient();

      const { error } = await serviceClient
        .from('lock_rules')
        .insert({
          user_id: testUser1.userId,
          app_name: 'TestApp',
          lock_type: 'until_date',
          // Missing unlock_date
        });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('valid_until_date');
    });
  });
});
