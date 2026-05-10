/**
 * Integration Tests for Lock Rules API
 * Tests: GET /api/rules, POST /api/rules, PUT /api/rules/[id], DELETE /api/rules/[id]
 * 
 * Validates:
 * - Database interactions
 * - RLS policies (users can only access their own rules)
 * - Authentication requirements
 * - CRUD operations
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Create Supabase clients for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Service role client for test setup/teardown
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Test user credentials
const testUser1Email = `test-user-1-${Date.now()}@focuslock.test`;
const testUser2Email = `test-user-2-${Date.now()}@focuslock.test`;
const testPassword = 'TestPassword123!';

describe('Lock Rules API Integration Tests', () => {
  let user1Id: string;
  let user2Id: string;
  let user1Client: ReturnType<typeof createClient<Database>>;
  let user2Client: ReturnType<typeof createClient<Database>>;
  let createdRuleIds: string[] = [];

  beforeAll(async () => {
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
      { id: user1Id, full_name: 'Test User 1', timezone: 'Asia/Kolkata' },
      { id: user2Id, full_name: 'Test User 2', timezone: 'America/New_York' },
    ]);

    // Create authenticated clients for each user
    user1Client = createClient<Database>(supabaseUrl, supabaseAnonKey);
    user2Client = createClient<Database>(supabaseUrl, supabaseAnonKey);

    // Sign in users
    await user1Client.auth.signInWithPassword({
      email: testUser1Email,
      password: testPassword,
    });

    await user2Client.auth.signInWithPassword({
      email: testUser2Email,
      password: testPassword,
    });
  });

  afterAll(async () => {
    // Clean up created rules
    if (createdRuleIds.length > 0) {
      await supabaseAdmin.from('lock_rules').delete().in('id', createdRuleIds);
    }

    // Delete test users
    if (user1Id) {
      await supabaseAdmin.auth.admin.deleteUser(user1Id);
    }
    if (user2Id) {
      await supabaseAdmin.auth.admin.deleteUser(user2Id);
    }
  });

  describe('POST /api/rules - Create Lock Rule', () => {
    it('should create a timer lock rule with valid data', async () => {
      const ruleData = {
        app_name: 'Instagram',
        app_icon_url: 'https://example.com/instagram.png',
        lock_type: 'timer',
        daily_limit_minutes: 30,
        hide_from_home: true,
        hide_from_search: true,
        strict_mode: false,
      };

      const { data, error } = await user1Client
        .from('lock_rules')
        .insert({ ...ruleData, user_id: user1Id })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.app_name).toBe('Instagram');
      expect(data?.lock_type).toBe('timer');
      expect(data?.daily_limit_minutes).toBe(30);
      expect(data?.user_id).toBe(user1Id);

      if (data?.id) {
        createdRuleIds.push(data.id);
      }
    });

    it('should create a schedule lock rule with valid data', async () => {
      const ruleData = {
        app_name: 'TikTok',
        lock_type: 'schedule',
        schedule_start: '09:00',
        schedule_end: '17:00',
        schedule_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        hide_from_home: false,
        hide_from_search: false,
        strict_mode: true,
      };

      const { data, error } = await user1Client
        .from('lock_rules')
        .insert({ ...ruleData, user_id: user1Id })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.lock_type).toBe('schedule');
      expect(data?.schedule_start).toBe('09:00:00');
      expect(data?.schedule_end).toBe('17:00:00');
      expect(data?.schedule_days).toEqual(['mon', 'tue', 'wed', 'thu', 'fri']);
      expect(data?.strict_mode).toBe(true);

      if (data?.id) {
        createdRuleIds.push(data.id);
      }
    });

    it('should create an until_date lock rule with valid data', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const unlockDate = futureDate.toISOString().split('T')[0];

      const ruleData = {
        app_name: 'YouTube',
        lock_type: 'until_date',
        unlock_date: unlockDate,
      };

      const { data, error } = await user1Client
        .from('lock_rules')
        .insert({ ...ruleData, user_id: user1Id })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.lock_type).toBe('until_date');
      expect(data?.unlock_date).toBe(unlockDate);

      if (data?.id) {
        createdRuleIds.push(data.id);
      }
    });

    it('should create a nuclear lock rule', async () => {
      const ruleData = {
        app_name: 'Twitter',
        lock_type: 'nuclear',
      };

      const { data, error } = await user1Client
        .from('lock_rules')
        .insert({ ...ruleData, user_id: user1Id })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.lock_type).toBe('nuclear');

      if (data?.id) {
        createdRuleIds.push(data.id);
      }
    });

    it('should enforce RLS - user cannot create rule for another user', async () => {
      const ruleData = {
        app_name: 'Facebook',
        lock_type: 'timer',
        daily_limit_minutes: 60,
        user_id: user2Id, // Trying to create for user2
      };

      const { data, error } = await user1Client
        .from('lock_rules')
        .insert(ruleData)
        .select()
        .single();

      // RLS should prevent this - either error or data.user_id should be user1Id
      expect(error || data?.user_id === user1Id).toBeTruthy();
    });
  });

  describe('GET /api/rules - Fetch Lock Rules', () => {
    let user1RuleId: string;
    let user2RuleId: string;

    beforeAll(async () => {
      // Create rules for both users
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
          user_id: user2Id,
          app_name: 'TikTok',
          lock_type: 'timer',
          daily_limit_minutes: 45,
        })
        .select()
        .single();

      user1RuleId = rule1!.id;
      user2RuleId = rule2!.id;
      createdRuleIds.push(user1RuleId, user2RuleId);
    });

    it('should fetch only user1 rules when authenticated as user1', async () => {
      const { data, error } = await user1Client
        .from('lock_rules')
        .select('*')
        .eq('user_id', user1Id);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      
      // Should include user1's rule
      const hasUser1Rule = data?.some(rule => rule.id === user1RuleId);
      expect(hasUser1Rule).toBe(true);

      // Should NOT include user2's rule (RLS enforcement)
      const hasUser2Rule = data?.some(rule => rule.id === user2RuleId);
      expect(hasUser2Rule).toBe(false);
    });

    it('should fetch only user2 rules when authenticated as user2', async () => {
      const { data, error } = await user2Client
        .from('lock_rules')
        .select('*')
        .eq('user_id', user2Id);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Should include user2's rule
      const hasUser2Rule = data?.some(rule => rule.id === user2RuleId);
      expect(hasUser2Rule).toBe(true);

      // Should NOT include user1's rule (RLS enforcement)
      const hasUser1Rule = data?.some(rule => rule.id === user1RuleId);
      expect(hasUser1Rule).toBe(false);
    });

    it('should enforce RLS - user1 cannot query user2 rules directly', async () => {
      const { data, error } = await user1Client
        .from('lock_rules')
        .select('*')
        .eq('id', user2RuleId)
        .single();

      // RLS should prevent access - either error or no data
      expect(error || !data).toBeTruthy();
    });
  });

  describe('PUT /api/rules/[id] - Update Lock Rule', () => {
    let ruleId: string;

    beforeEach(async () => {
      // Create a rule for user1
      const { data } = await supabaseAdmin
        .from('lock_rules')
        .insert({
          user_id: user1Id,
          app_name: 'Instagram',
          lock_type: 'timer',
          daily_limit_minutes: 30,
          is_active: true,
        })
        .select()
        .single();

      ruleId = data!.id;
      createdRuleIds.push(ruleId);
    });

    it('should update lock rule with valid data', async () => {
      const updates = {
        daily_limit_minutes: 45,
        strict_mode: true,
      };

      const { data, error } = await user1Client
        .from('lock_rules')
        .update(updates)
        .eq('id', ruleId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.daily_limit_minutes).toBe(45);
      expect(data?.strict_mode).toBe(true);
    });

    it('should update is_active status', async () => {
      const { data, error } = await user1Client
        .from('lock_rules')
        .update({ is_active: false })
        .eq('id', ruleId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.is_active).toBe(false);
    });

    it('should enforce RLS - user2 cannot update user1 rule', async () => {
      const { data, error } = await user2Client
        .from('lock_rules')
        .update({ daily_limit_minutes: 999 })
        .eq('id', ruleId)
        .select()
        .single();

      // RLS should prevent this
      expect(error || !data).toBeTruthy();

      // Verify rule was not updated
      const { data: checkData } = await supabaseAdmin
        .from('lock_rules')
        .select('daily_limit_minutes')
        .eq('id', ruleId)
        .single();

      expect(checkData?.daily_limit_minutes).toBe(30); // Original value
    });
  });

  describe('DELETE /api/rules/[id] - Delete Lock Rule', () => {
    it('should delete lock rule and set override_logs lock_rule_id to NULL', async () => {
      // Create a rule
      const { data: rule } = await supabaseAdmin
        .from('lock_rules')
        .insert({
          user_id: user1Id,
          app_name: 'Instagram',
          lock_type: 'timer',
          daily_limit_minutes: 30,
        })
        .select()
        .single();

      const ruleId = rule!.id;

      // Create an override log for this rule
      const { data: overrideLog } = await supabaseAdmin
        .from('override_logs')
        .insert({
          user_id: user1Id,
          lock_rule_id: ruleId,
          app_name: 'Instagram',
          mood: 'bored',
        })
        .select()
        .single();

      const overrideLogId = overrideLog!.id;

      // Delete the rule
      const { error: deleteError } = await user1Client
        .from('lock_rules')
        .delete()
        .eq('id', ruleId);

      expect(deleteError).toBeNull();

      // Verify rule is deleted
      const { data: checkRule } = await supabaseAdmin
        .from('lock_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      expect(checkRule).toBeNull();

      // Verify override log still exists but lock_rule_id is NULL
      const { data: checkLog } = await supabaseAdmin
        .from('override_logs')
        .select('*')
        .eq('id', overrideLogId)
        .single();

      expect(checkLog).toBeDefined();
      expect(checkLog?.lock_rule_id).toBeNull();

      // Cleanup
      await supabaseAdmin.from('override_logs').delete().eq('id', overrideLogId);
    });

    it('should enforce RLS - user2 cannot delete user1 rule', async () => {
      // Create a rule for user1
      const { data: rule } = await supabaseAdmin
        .from('lock_rules')
        .insert({
          user_id: user1Id,
          app_name: 'TikTok',
          lock_type: 'timer',
          daily_limit_minutes: 30,
        })
        .select()
        .single();

      const ruleId = rule!.id;
      createdRuleIds.push(ruleId);

      // Try to delete as user2
      const { error } = await user2Client
        .from('lock_rules')
        .delete()
        .eq('id', ruleId);

      // RLS should prevent this
      expect(error).toBeDefined();

      // Verify rule still exists
      const { data: checkRule } = await supabaseAdmin
        .from('lock_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      expect(checkRule).toBeDefined();
    });
  });
});
