/**
 * Property-Based Tests for Override API
 * 
 * Feature: focuslock-app
 * Property 12: Override Log Completeness
 * 
 * **Validates: Requirements 4.4**
 * 
 * Tests that the override API correctly logs all required fields when an override is created.
 * For any override with mood and optional reason text, the created override log SHALL contain
 * all required fields (user_id, lock_rule_id, app_name, mood, reason_text, overridden_at).
 */

import fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';
import type { Database, LockRuleInsert } from '@/types/database';

// Create a Supabase client for testing (using service role key to bypass RLS)
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test user ID (we'll create this in beforeAll)
let testUserId: string;

// Helper to create a test user
async function createTestUser(): Promise<string> {
  const userId = fc.sample(fc.uuid(), 1)[0];
  
  const { error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: 'Test User',
      timezone: 'Asia/Kolkata',
    });
  
  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }
  
  return userId;
}

// Helper to clean up test data
async function cleanupTestData(userId: string) {
  // Delete all override logs for the test user
  await supabase.from('override_logs').delete().eq('user_id', userId);
  
  // Delete all lock rules for the test user (cascade will handle related data)
  await supabase.from('lock_rules').delete().eq('user_id', userId);
  
  // Delete the test user profile
  await supabase.from('profiles').delete().eq('id', userId);
}

// Custom arbitraries for generating test data
const appNameArbitrary = fc.string({ minLength: 1, maxLength: 50 });
const moodArbitrary = fc.constantFrom('bored', 'stressed', 'tired', 'news', 'other');
const reasonTextArbitrary = fc.option(
  fc.string({ minLength: 1, maxLength: 200 }),
  { nil: null }
);

// Arbitrary for generating timer lock rules (simplest type for testing)
const timerLockRuleArbitrary = fc.record({
  app_name: appNameArbitrary,
  daily_limit_minutes: fc.integer({ min: 1, max: 1440 }),
}).map(rule => ({
  user_id: testUserId,
  app_name: rule.app_name,
  lock_type: 'timer' as const,
  daily_limit_minutes: rule.daily_limit_minutes,
}));

describe('Property 12: Override Log Completeness', () => {
  beforeAll(async () => {
    // Create a test user for all tests
    testUserId = await createTestUser();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData(testUserId);
  });

  afterEach(async () => {
    // Clean up override logs and lock rules after each test
    await supabase.from('override_logs').delete().eq('user_id', testUserId);
    await supabase.from('lock_rules').delete().eq('user_id', testUserId);
  });

  describe('Requirement 4.4: Override log contains all required fields', () => {
    it('should create override log with all required fields when reason_text is provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          timerLockRuleArbitrary,
          moodArbitrary,
          fc.string({ minLength: 1, maxLength: 200 }),
          async (lockRule, mood, reasonText) => {
            // Create a lock rule
            const { data: createdRule, error: ruleError } = await supabase
              .from('lock_rules')
              .insert(lockRule)
              .select()
              .single();

            expect(ruleError).toBeNull();
            expect(createdRule).not.toBeNull();

            const ruleId = createdRule!.id;

            // Create an override log
            const beforeOverride = new Date();
            
            const { data: overrideLog, error: overrideError } = await supabase
              .from('override_logs')
              .insert({
                user_id: testUserId,
                lock_rule_id: ruleId,
                app_name: lockRule.app_name,
                mood: mood,
                reason_text: reasonText,
              })
              .select()
              .single();

            const afterOverride = new Date();

            expect(overrideError).toBeNull();
            expect(overrideLog).not.toBeNull();

            // Verify all required fields are present
            expect(overrideLog?.user_id).toBe(testUserId);
            expect(overrideLog?.lock_rule_id).toBe(ruleId);
            expect(overrideLog?.app_name).toBe(lockRule.app_name);
            expect(overrideLog?.mood).toBe(mood);
            expect(overrideLog?.reason_text).toBe(reasonText);
            expect(overrideLog?.overridden_at).toBeDefined();

            // Verify overridden_at is a valid timestamp within reasonable bounds
            const overriddenAt = new Date(overrideLog!.overridden_at);
            expect(overriddenAt.getTime()).toBeGreaterThanOrEqual(beforeOverride.getTime());
            expect(overriddenAt.getTime()).toBeLessThanOrEqual(afterOverride.getTime());
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should create override log with all required fields when reason_text is null', async () => {
      await fc.assert(
        fc.asyncProperty(
          timerLockRuleArbitrary,
          moodArbitrary,
          async (lockRule, mood) => {
            // Create a lock rule
            const { data: createdRule, error: ruleError } = await supabase
              .from('lock_rules')
              .insert(lockRule)
              .select()
              .single();

            expect(ruleError).toBeNull();
            expect(createdRule).not.toBeNull();

            const ruleId = createdRule!.id;

            // Create an override log without reason_text
            const beforeOverride = new Date();
            
            const { data: overrideLog, error: overrideError } = await supabase
              .from('override_logs')
              .insert({
                user_id: testUserId,
                lock_rule_id: ruleId,
                app_name: lockRule.app_name,
                mood: mood,
                reason_text: null,
              })
              .select()
              .single();

            const afterOverride = new Date();

            expect(overrideError).toBeNull();
            expect(overrideLog).not.toBeNull();

            // Verify all required fields are present
            expect(overrideLog?.user_id).toBe(testUserId);
            expect(overrideLog?.lock_rule_id).toBe(ruleId);
            expect(overrideLog?.app_name).toBe(lockRule.app_name);
            expect(overrideLog?.mood).toBe(mood);
            expect(overrideLog?.reason_text).toBeNull();
            expect(overrideLog?.overridden_at).toBeDefined();

            // Verify overridden_at is a valid timestamp within reasonable bounds
            const overriddenAt = new Date(overrideLog!.overridden_at);
            expect(overriddenAt.getTime()).toBeGreaterThanOrEqual(beforeOverride.getTime());
            expect(overriddenAt.getTime()).toBeLessThanOrEqual(afterOverride.getTime());
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should create override log with all required fields for any mood and optional reason', async () => {
      await fc.assert(
        fc.asyncProperty(
          timerLockRuleArbitrary,
          moodArbitrary,
          reasonTextArbitrary,
          async (lockRule, mood, reasonText) => {
            // Create a lock rule
            const { data: createdRule, error: ruleError } = await supabase
              .from('lock_rules')
              .insert(lockRule)
              .select()
              .single();

            expect(ruleError).toBeNull();
            expect(createdRule).not.toBeNull();

            const ruleId = createdRule!.id;

            // Create an override log
            const beforeOverride = new Date();
            
            const { data: overrideLog, error: overrideError } = await supabase
              .from('override_logs')
              .insert({
                user_id: testUserId,
                lock_rule_id: ruleId,
                app_name: lockRule.app_name,
                mood: mood,
                reason_text: reasonText,
              })
              .select()
              .single();

            const afterOverride = new Date();

            expect(overrideError).toBeNull();
            expect(overrideLog).not.toBeNull();

            // Verify all required fields are present and correct
            expect(overrideLog?.user_id).toBe(testUserId);
            expect(overrideLog?.lock_rule_id).toBe(ruleId);
            expect(overrideLog?.app_name).toBe(lockRule.app_name);
            expect(overrideLog?.mood).toBe(mood);
            expect(overrideLog?.reason_text).toBe(reasonText);
            expect(overrideLog?.overridden_at).toBeDefined();

            // Verify overridden_at is a valid timestamp
            const overriddenAt = new Date(overrideLog!.overridden_at);
            expect(overriddenAt.getTime()).toBeGreaterThanOrEqual(beforeOverride.getTime());
            expect(overriddenAt.getTime()).toBeLessThanOrEqual(afterOverride.getTime());

            // Verify the log has an ID (auto-generated)
            expect(overrideLog?.id).toBeDefined();
            expect(typeof overrideLog?.id).toBe('string');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should preserve field values exactly as provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          timerLockRuleArbitrary,
          moodArbitrary,
          reasonTextArbitrary,
          async (lockRule, mood, reasonText) => {
            // Create a lock rule
            const { data: createdRule, error: ruleError } = await supabase
              .from('lock_rules')
              .insert(lockRule)
              .select()
              .single();

            expect(ruleError).toBeNull();
            expect(createdRule).not.toBeNull();

            const ruleId = createdRule!.id;

            // Create an override log
            const overrideData = {
              user_id: testUserId,
              lock_rule_id: ruleId,
              app_name: lockRule.app_name,
              mood: mood,
              reason_text: reasonText,
            };

            const { data: overrideLog, error: overrideError } = await supabase
              .from('override_logs')
              .insert(overrideData)
              .select()
              .single();

            expect(overrideError).toBeNull();
            expect(overrideLog).not.toBeNull();

            // Verify no data transformation occurred (values match exactly)
            expect(overrideLog?.user_id).toBe(overrideData.user_id);
            expect(overrideLog?.lock_rule_id).toBe(overrideData.lock_rule_id);
            expect(overrideLog?.app_name).toBe(overrideData.app_name);
            expect(overrideLog?.mood).toBe(overrideData.mood);
            expect(overrideLog?.reason_text).toBe(overrideData.reason_text);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should create multiple override logs with complete fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          timerLockRuleArbitrary,
          fc.array(
            fc.record({
              mood: moodArbitrary,
              reason_text: reasonTextArbitrary,
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (lockRule, overrides) => {
            // Create a lock rule
            const { data: createdRule, error: ruleError } = await supabase
              .from('lock_rules')
              .insert(lockRule)
              .select()
              .single();

            expect(ruleError).toBeNull();
            expect(createdRule).not.toBeNull();

            const ruleId = createdRule!.id;

            // Create multiple override logs
            for (const override of overrides) {
              const { data: overrideLog, error: overrideError } = await supabase
                .from('override_logs')
                .insert({
                  user_id: testUserId,
                  lock_rule_id: ruleId,
                  app_name: lockRule.app_name,
                  mood: override.mood,
                  reason_text: override.reason_text,
                })
                .select()
                .single();

              expect(overrideError).toBeNull();
              expect(overrideLog).not.toBeNull();

              // Verify all required fields are present for each log
              expect(overrideLog?.user_id).toBe(testUserId);
              expect(overrideLog?.lock_rule_id).toBe(ruleId);
              expect(overrideLog?.app_name).toBe(lockRule.app_name);
              expect(overrideLog?.mood).toBe(override.mood);
              expect(overrideLog?.reason_text).toBe(override.reason_text);
              expect(overrideLog?.overridden_at).toBeDefined();
              expect(overrideLog?.id).toBeDefined();
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
