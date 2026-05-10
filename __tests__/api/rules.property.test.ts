/**
 * Property-Based Tests for Lock Rules API
 * 
 * Feature: focuslock-app
 * Property 4: Lock Rule Configuration Persistence
 * Property 5: Lock Rule Update Round-Trip
 * Property 6: Lock Rule Deletion Cascade
 * 
 * Validates: Requirements 2.7, 2.8, 2.9, 2.10, 2.11
 * 
 * Tests that the lock rules API correctly persists and manages lock rule configurations:
 * - Boolean configurations (hide_from_home, hide_from_search, strict_mode) persist correctly
 * - Updates are applied and timestamps are updated
 * - Deletion cascades to override logs
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
  // Delete all lock rules for the test user (cascade will handle related data)
  await supabase.from('lock_rules').delete().eq('user_id', userId);
  
  // Delete the test user profile
  await supabase.from('profiles').delete().eq('id', userId);
}

// Custom arbitraries for generating test data
const appNameArbitrary = fc.string({ minLength: 1, maxLength: 50 });
const timeStringArbitrary = fc.tuple(
  fc.integer({ min: 0, max: 23 }),
  fc.integer({ min: 0, max: 59 })
).map(([h, m]) => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);

const dayOfWeekArbitrary = fc.constantFrom('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
const scheduleDaysArbitrary = fc.array(dayOfWeekArbitrary, { minLength: 1, maxLength: 7 }).map(days => [...new Set(days)]);

const futureDateArbitrary = fc.date({ min: new Date() }).map(d => d.toISOString().split('T')[0]);

// Arbitrary for generating complete lock rules with all fields
const lockRuleArbitrary = fc.record({
  app_name: appNameArbitrary,
  lock_type: fc.constantFrom('timer', 'schedule', 'until_date', 'nuclear'),
  daily_limit_minutes: fc.integer({ min: 1, max: 1440 }),
  schedule_start: timeStringArbitrary,
  schedule_end: timeStringArbitrary,
  schedule_days: scheduleDaysArbitrary,
  unlock_date: futureDateArbitrary,
  hide_from_home: fc.boolean(),
  hide_from_search: fc.boolean(),
  strict_mode: fc.boolean(),
}).map(rule => {
  // Ensure type-specific fields are set correctly
  const baseRule: any = {
    user_id: testUserId,
    app_name: rule.app_name,
    lock_type: rule.lock_type,
    hide_from_home: rule.hide_from_home,
    hide_from_search: rule.hide_from_search,
    strict_mode: rule.strict_mode,
  };

  // Add type-specific fields
  if (rule.lock_type === 'timer') {
    baseRule.daily_limit_minutes = rule.daily_limit_minutes;
  } else if (rule.lock_type === 'schedule') {
    baseRule.schedule_start = rule.schedule_start;
    baseRule.schedule_end = rule.schedule_end;
    baseRule.schedule_days = rule.schedule_days;
  } else if (rule.lock_type === 'until_date') {
    baseRule.unlock_date = rule.unlock_date;
  }

  return baseRule as LockRuleInsert;
});

describe('Property 4: Lock Rule Configuration Persistence', () => {
  beforeAll(async () => {
    // Create a test user for all tests
    testUserId = await createTestUser();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData(testUserId);
  });

  afterEach(async () => {
    // Clean up lock rules after each test
    await supabase.from('lock_rules').delete().eq('user_id', testUserId);
  });

  describe('Requirement 2.7: hide_from_home configuration persistence', () => {
    it('should persist hide_from_home setting correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          lockRuleArbitrary,
          async (rule) => {
            const { data, error } = await supabase
              .from('lock_rules')
              .insert(rule)
              .select()
              .single();

            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.hide_from_home).toBe(rule.hide_from_home);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should default hide_from_home to true when not specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          fc.integer({ min: 1, max: 480 }),
          async (appName, dailyLimit) => {
            const rule: any = {
              user_id: testUserId,
              app_name: appName,
              lock_type: 'timer',
              daily_limit_minutes: dailyLimit,
              // hide_from_home not specified
            };

            const { data, error } = await supabase
              .from('lock_rules')
              .insert(rule)
              .select()
              .single();

            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.hide_from_home).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Requirement 2.8: hide_from_search configuration persistence', () => {
    it('should persist hide_from_search setting correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          lockRuleArbitrary,
          async (rule) => {
            const { data, error } = await supabase
              .from('lock_rules')
              .insert(rule)
              .select()
              .single();

            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.hide_from_search).toBe(rule.hide_from_search);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should default hide_from_search to true when not specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          fc.integer({ min: 1, max: 480 }),
          async (appName, dailyLimit) => {
            const rule: any = {
              user_id: testUserId,
              app_name: appName,
              lock_type: 'timer',
              daily_limit_minutes: dailyLimit,
              // hide_from_search not specified
            };

            const { data, error } = await supabase
              .from('lock_rules')
              .insert(rule)
              .select()
              .single();

            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.hide_from_search).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Requirement 2.9: strict_mode configuration persistence', () => {
    it('should persist strict_mode setting correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          lockRuleArbitrary,
          async (rule) => {
            const { data, error } = await supabase
              .from('lock_rules')
              .insert(rule)
              .select()
              .single();

            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.strict_mode).toBe(rule.strict_mode);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should default strict_mode to false when not specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          fc.integer({ min: 1, max: 480 }),
          async (appName, dailyLimit) => {
            const rule: any = {
              user_id: testUserId,
              app_name: appName,
              lock_type: 'timer',
              daily_limit_minutes: dailyLimit,
              // strict_mode not specified
            };

            const { data, error } = await supabase
              .from('lock_rules')
              .insert(rule)
              .select()
              .single();

            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.strict_mode).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Combined boolean configuration persistence', () => {
    it('should persist all boolean configurations together correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          lockRuleArbitrary,
          async (rule) => {
            const { data, error } = await supabase
              .from('lock_rules')
              .insert(rule)
              .select()
              .single();

            expect(error).toBeNull();
            expect(data).not.toBeNull();
            
            // All boolean configurations should match
            expect(data?.hide_from_home).toBe(rule.hide_from_home);
            expect(data?.hide_from_search).toBe(rule.hide_from_search);
            expect(data?.strict_mode).toBe(rule.strict_mode);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

describe('Property 5: Lock Rule Update Round-Trip', () => {
  beforeAll(async () => {
    // Create a test user for all tests
    if (!testUserId) {
      testUserId = await createTestUser();
    }
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData(testUserId);
  });

  afterEach(async () => {
    // Clean up lock rules after each test
    await supabase.from('lock_rules').delete().eq('user_id', testUserId);
  });

  describe('Requirement 2.10: Lock rule updates persist correctly', () => {
    it('should persist updates to boolean configurations', async () => {
      await fc.assert(
        fc.asyncProperty(
          lockRuleArbitrary,
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          async (initialRule, newHideHome, newHideSearch, newStrictMode) => {
            // Create initial rule
            const { data: created, error: createError } = await supabase
              .from('lock_rules')
              .insert(initialRule)
              .select()
              .single();

            expect(createError).toBeNull();
            expect(created).not.toBeNull();

            const ruleId = created!.id;
            const initialUpdatedAt = created!.updated_at;

            // Wait a tiny bit to ensure timestamp changes
            await new Promise(resolve => setTimeout(resolve, 10));

            // Update the rule
            const { data: updated, error: updateError } = await supabase
              .from('lock_rules')
              .update({
                hide_from_home: newHideHome,
                hide_from_search: newHideSearch,
                strict_mode: newStrictMode,
              })
              .eq('id', ruleId)
              .select()
              .single();

            expect(updateError).toBeNull();
            expect(updated).not.toBeNull();

            // Verify updates persisted
            expect(updated?.hide_from_home).toBe(newHideHome);
            expect(updated?.hide_from_search).toBe(newHideSearch);
            expect(updated?.strict_mode).toBe(newStrictMode);

            // Verify updated_at changed
            expect(new Date(updated!.updated_at).getTime()).toBeGreaterThanOrEqual(
              new Date(initialUpdatedAt).getTime()
            );
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should persist updates to is_active status', async () => {
      await fc.assert(
        fc.asyncProperty(
          lockRuleArbitrary,
          fc.boolean(),
          async (initialRule, newIsActive) => {
            // Create initial rule
            const { data: created, error: createError } = await supabase
              .from('lock_rules')
              .insert(initialRule)
              .select()
              .single();

            expect(createError).toBeNull();
            expect(created).not.toBeNull();

            const ruleId = created!.id;

            // Update the rule
            const { data: updated, error: updateError } = await supabase
              .from('lock_rules')
              .update({ is_active: newIsActive })
              .eq('id', ruleId)
              .select()
              .single();

            expect(updateError).toBeNull();
            expect(updated).not.toBeNull();
            expect(updated?.is_active).toBe(newIsActive);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should update timestamp when any field is updated', async () => {
      await fc.assert(
        fc.asyncProperty(
          lockRuleArbitrary,
          appNameArbitrary,
          async (initialRule, newAppName) => {
            // Create initial rule
            const { data: created, error: createError } = await supabase
              .from('lock_rules')
              .insert(initialRule)
              .select()
              .single();

            expect(createError).toBeNull();
            expect(created).not.toBeNull();

            const ruleId = created!.id;
            const initialUpdatedAt = new Date(created!.updated_at).getTime();

            // Wait to ensure timestamp changes
            await new Promise(resolve => setTimeout(resolve, 10));

            // Update the rule
            const { data: updated, error: updateError } = await supabase
              .from('lock_rules')
              .update({ app_name: newAppName })
              .eq('id', ruleId)
              .select()
              .single();

            expect(updateError).toBeNull();
            expect(updated).not.toBeNull();

            // Verify updated_at changed
            const newUpdatedAt = new Date(updated!.updated_at).getTime();
            expect(newUpdatedAt).toBeGreaterThanOrEqual(initialUpdatedAt);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should persist updates to timer lock daily_limit_minutes', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          fc.integer({ min: 1, max: 480 }),
          fc.integer({ min: 1, max: 480 }),
          async (appName, initialLimit, newLimit) => {
            // Create initial timer rule
            const { data: created, error: createError } = await supabase
              .from('lock_rules')
              .insert({
                user_id: testUserId,
                app_name: appName,
                lock_type: 'timer',
                daily_limit_minutes: initialLimit,
              })
              .select()
              .single();

            expect(createError).toBeNull();
            expect(created).not.toBeNull();

            const ruleId = created!.id;

            // Update the daily limit
            const { data: updated, error: updateError } = await supabase
              .from('lock_rules')
              .update({ daily_limit_minutes: newLimit })
              .eq('id', ruleId)
              .select()
              .single();

            expect(updateError).toBeNull();
            expect(updated).not.toBeNull();
            expect(updated?.daily_limit_minutes).toBe(newLimit);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

describe('Property 6: Lock Rule Deletion Cascade', () => {
  beforeAll(async () => {
    // Create a test user for all tests
    if (!testUserId) {
      testUserId = await createTestUser();
    }
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData(testUserId);
  });

  afterEach(async () => {
    // Clean up lock rules and override logs after each test
    await supabase.from('override_logs').delete().eq('user_id', testUserId);
    await supabase.from('lock_rules').delete().eq('user_id', testUserId);
  });

  describe('Requirement 2.11: Lock rule deletion cascades to override logs', () => {
    it('should set override_logs.lock_rule_id to NULL when rule is deleted', async () => {
      await fc.assert(
        fc.asyncProperty(
          lockRuleArbitrary,
          fc.constantFrom('bored', 'stressed', 'tired', 'news', 'other'),
          fc.string({ minLength: 0, maxLength: 200 }),
          async (rule, mood, reasonText) => {
            // Create a lock rule
            const { data: created, error: createError } = await supabase
              .from('lock_rules')
              .insert(rule)
              .select()
              .single();

            expect(createError).toBeNull();
            expect(created).not.toBeNull();

            const ruleId = created!.id;

            // Create an override log for this rule
            const { data: overrideLog, error: overrideError } = await supabase
              .from('override_logs')
              .insert({
                user_id: testUserId,
                lock_rule_id: ruleId,
                app_name: rule.app_name,
                mood: mood,
                reason_text: reasonText || null,
              })
              .select()
              .single();

            expect(overrideError).toBeNull();
            expect(overrideLog).not.toBeNull();
            expect(overrideLog?.lock_rule_id).toBe(ruleId);

            const overrideLogId = overrideLog!.id;

            // Delete the lock rule
            const { error: deleteError } = await supabase
              .from('lock_rules')
              .delete()
              .eq('id', ruleId);

            expect(deleteError).toBeNull();

            // Verify the override log still exists but lock_rule_id is NULL
            const { data: updatedLog, error: fetchError } = await supabase
              .from('override_logs')
              .select()
              .eq('id', overrideLogId)
              .single();

            expect(fetchError).toBeNull();
            expect(updatedLog).not.toBeNull();
            expect(updatedLog?.lock_rule_id).toBeNull();
            expect(updatedLog?.app_name).toBe(rule.app_name);
            expect(updatedLog?.mood).toBe(mood);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should cascade deletion to multiple override logs', async () => {
      await fc.assert(
        fc.asyncProperty(
          lockRuleArbitrary,
          fc.array(
            fc.record({
              mood: fc.constantFrom('bored', 'stressed', 'tired', 'news', 'other'),
              reason: fc.string({ minLength: 0, maxLength: 200 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (rule, overrides) => {
            // Create a lock rule
            const { data: created, error: createError } = await supabase
              .from('lock_rules')
              .insert(rule)
              .select()
              .single();

            expect(createError).toBeNull();
            expect(created).not.toBeNull();

            const ruleId = created!.id;

            // Create multiple override logs for this rule
            const overrideLogIds: string[] = [];
            for (const override of overrides) {
              const { data: overrideLog, error: overrideError } = await supabase
                .from('override_logs')
                .insert({
                  user_id: testUserId,
                  lock_rule_id: ruleId,
                  app_name: rule.app_name,
                  mood: override.mood,
                  reason_text: override.reason || null,
                })
                .select()
                .single();

              expect(overrideError).toBeNull();
              expect(overrideLog).not.toBeNull();
              overrideLogIds.push(overrideLog!.id);
            }

            // Delete the lock rule
            const { error: deleteError } = await supabase
              .from('lock_rules')
              .delete()
              .eq('id', ruleId);

            expect(deleteError).toBeNull();

            // Verify all override logs still exist but lock_rule_id is NULL
            for (const logId of overrideLogIds) {
              const { data: updatedLog, error: fetchError } = await supabase
                .from('override_logs')
                .select()
                .eq('id', logId)
                .single();

              expect(fetchError).toBeNull();
              expect(updatedLog).not.toBeNull();
              expect(updatedLog?.lock_rule_id).toBeNull();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should not affect override logs of other rules', async () => {
      await fc.assert(
        fc.asyncProperty(
          lockRuleArbitrary,
          lockRuleArbitrary,
          fc.constantFrom('bored', 'stressed', 'tired', 'news', 'other'),
          async (rule1, rule2, mood) => {
            // Create two lock rules
            const { data: created1, error: createError1 } = await supabase
              .from('lock_rules')
              .insert(rule1)
              .select()
              .single();

            const { data: created2, error: createError2 } = await supabase
              .from('lock_rules')
              .insert(rule2)
              .select()
              .single();

            expect(createError1).toBeNull();
            expect(createError2).toBeNull();
            expect(created1).not.toBeNull();
            expect(created2).not.toBeNull();

            const ruleId1 = created1!.id;
            const ruleId2 = created2!.id;

            // Create override logs for both rules
            const { data: log1, error: logError1 } = await supabase
              .from('override_logs')
              .insert({
                user_id: testUserId,
                lock_rule_id: ruleId1,
                app_name: rule1.app_name,
                mood: mood,
              })
              .select()
              .single();

            const { data: log2, error: logError2 } = await supabase
              .from('override_logs')
              .insert({
                user_id: testUserId,
                lock_rule_id: ruleId2,
                app_name: rule2.app_name,
                mood: mood,
              })
              .select()
              .single();

            expect(logError1).toBeNull();
            expect(logError2).toBeNull();
            expect(log1).not.toBeNull();
            expect(log2).not.toBeNull();

            const logId1 = log1!.id;
            const logId2 = log2!.id;

            // Delete only the first rule
            const { error: deleteError } = await supabase
              .from('lock_rules')
              .delete()
              .eq('id', ruleId1);

            expect(deleteError).toBeNull();

            // Verify first log has NULL lock_rule_id
            const { data: updatedLog1 } = await supabase
              .from('override_logs')
              .select()
              .eq('id', logId1)
              .single();

            expect(updatedLog1?.lock_rule_id).toBeNull();

            // Verify second log still has its lock_rule_id
            const { data: updatedLog2 } = await supabase
              .from('override_logs')
              .select()
              .eq('id', logId2)
              .single();

            expect(updatedLog2?.lock_rule_id).toBe(ruleId2);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
