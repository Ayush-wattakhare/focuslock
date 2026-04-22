/**
 * Property-Based Tests for Lock Rules Database Schema Constraints
 * 
 * Feature: focuslock-app
 * Property 3: Lock Rule Validation by Type
 * Validates: Requirements 2.1, 2.3, 2.4, 2.5, 2.6
 * 
 * Tests that the database schema correctly enforces type-specific constraints:
 * - Timer locks require daily_limit_minutes
 * - Schedule locks require schedule_start, schedule_end, and schedule_days
 * - Until_date locks require unlock_date
 * - All lock types require app_name and lock_type
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

describe('Property 3: Lock Rule Validation by Type', () => {
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

  describe('Requirement 2.1: All lock rules require app_name and lock_type', () => {
    it('should reject lock rules without app_name', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('timer', 'schedule', 'until_date', 'nuclear'),
          fc.integer({ min: 1, max: 480 }),
          async (lockType, dailyLimit) => {
            const rule: any = {
              user_id: testUserId,
              lock_type: lockType,
              daily_limit_minutes: dailyLimit,
            };
            // Missing app_name

            const { error } = await supabase.from('lock_rules').insert(rule);
            
            // Should fail due to NOT NULL constraint on app_name
            expect(error).not.toBeNull();
            expect(error?.message).toMatch(/null value|violates not-null constraint|app_name/i);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject lock rules without lock_type', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          async (appName) => {
            const rule: any = {
              user_id: testUserId,
              app_name: appName,
            };
            // Missing lock_type

            const { error } = await supabase.from('lock_rules').insert(rule);
            
            // Should fail due to NOT NULL constraint on lock_type
            expect(error).not.toBeNull();
            expect(error?.message).toMatch(/null value|violates not-null constraint|lock_type/i);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should accept lock rules with valid app_name and lock_type', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          fc.constantFrom('timer', 'schedule', 'until_date', 'nuclear'),
          fc.integer({ min: 1, max: 480 }),
          timeStringArbitrary,
          timeStringArbitrary,
          scheduleDaysArbitrary,
          futureDateArbitrary,
          async (appName, lockType, dailyLimit, scheduleStart, scheduleEnd, scheduleDays, unlockDate) => {
            const rule: LockRuleInsert = {
              user_id: testUserId,
              app_name: appName,
              lock_type: lockType,
              // Provide all optional fields to satisfy constraints
              daily_limit_minutes: lockType === 'timer' ? dailyLimit : null,
              schedule_start: lockType === 'schedule' ? scheduleStart : null,
              schedule_end: lockType === 'schedule' ? scheduleEnd : null,
              schedule_days: lockType === 'schedule' ? scheduleDays : null,
              unlock_date: lockType === 'until_date' ? unlockDate : null,
            };

            const { data, error } = await supabase.from('lock_rules').insert(rule).select().single();
            
            // Should succeed
            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.app_name).toBe(appName);
            expect(data?.lock_type).toBe(lockType);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Requirement 2.3: Timer lock type requires daily_limit_minutes', () => {
    it('should reject timer locks without daily_limit_minutes', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          async (appName) => {
            const rule: LockRuleInsert = {
              user_id: testUserId,
              app_name: appName,
              lock_type: 'timer',
              daily_limit_minutes: null, // Missing required field
            };

            const { error } = await supabase.from('lock_rules').insert(rule);
            
            // Should fail due to CHECK constraint
            expect(error).not.toBeNull();
            expect(error?.message).toMatch(/check constraint|valid_timer/i);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should accept timer locks with valid daily_limit_minutes', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          fc.integer({ min: 1, max: 1440 }), // 1 minute to 24 hours
          async (appName, dailyLimit) => {
            const rule: LockRuleInsert = {
              user_id: testUserId,
              app_name: appName,
              lock_type: 'timer',
              daily_limit_minutes: dailyLimit,
            };

            const { data, error } = await supabase.from('lock_rules').insert(rule).select().single();
            
            // Should succeed
            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.lock_type).toBe('timer');
            expect(data?.daily_limit_minutes).toBe(dailyLimit);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Requirement 2.4: Schedule lock type requires schedule_start, schedule_end, and schedule_days', () => {
    it('should reject schedule locks without schedule_start', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          timeStringArbitrary,
          scheduleDaysArbitrary,
          async (appName, scheduleEnd, scheduleDays) => {
            const rule: LockRuleInsert = {
              user_id: testUserId,
              app_name: appName,
              lock_type: 'schedule',
              schedule_start: null, // Missing required field
              schedule_end: scheduleEnd,
              schedule_days: scheduleDays,
            };

            const { error } = await supabase.from('lock_rules').insert(rule);
            
            // Should fail due to CHECK constraint
            expect(error).not.toBeNull();
            expect(error?.message).toMatch(/check constraint|valid_schedule/i);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should reject schedule locks without schedule_end', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          timeStringArbitrary,
          scheduleDaysArbitrary,
          async (appName, scheduleStart, scheduleDays) => {
            const rule: LockRuleInsert = {
              user_id: testUserId,
              app_name: appName,
              lock_type: 'schedule',
              schedule_start: scheduleStart,
              schedule_end: null, // Missing required field
              schedule_days: scheduleDays,
            };

            const { error } = await supabase.from('lock_rules').insert(rule);
            
            // Should fail due to CHECK constraint
            expect(error).not.toBeNull();
            expect(error?.message).toMatch(/check constraint|valid_schedule/i);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should reject schedule locks without schedule_days', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          timeStringArbitrary,
          timeStringArbitrary,
          async (appName, scheduleStart, scheduleEnd) => {
            const rule: LockRuleInsert = {
              user_id: testUserId,
              app_name: appName,
              lock_type: 'schedule',
              schedule_start: scheduleStart,
              schedule_end: scheduleEnd,
              schedule_days: null, // Missing required field
            };

            const { error } = await supabase.from('lock_rules').insert(rule);
            
            // Should fail due to CHECK constraint
            expect(error).not.toBeNull();
            expect(error?.message).toMatch(/check constraint|valid_schedule/i);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should accept schedule locks with all required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          timeStringArbitrary,
          timeStringArbitrary,
          scheduleDaysArbitrary,
          async (appName, scheduleStart, scheduleEnd, scheduleDays) => {
            const rule: LockRuleInsert = {
              user_id: testUserId,
              app_name: appName,
              lock_type: 'schedule',
              schedule_start: scheduleStart,
              schedule_end: scheduleEnd,
              schedule_days: scheduleDays,
            };

            const { data, error } = await supabase.from('lock_rules').insert(rule).select().single();
            
            // Should succeed
            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.lock_type).toBe('schedule');
            expect(data?.schedule_start).toBe(scheduleStart);
            expect(data?.schedule_end).toBe(scheduleEnd);
            expect(data?.schedule_days).toEqual(scheduleDays);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Requirement 2.5: Until_date lock type requires unlock_date', () => {
    it('should reject until_date locks without unlock_date', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          async (appName) => {
            const rule: LockRuleInsert = {
              user_id: testUserId,
              app_name: appName,
              lock_type: 'until_date',
              unlock_date: null, // Missing required field
            };

            const { error } = await supabase.from('lock_rules').insert(rule);
            
            // Should fail due to CHECK constraint
            expect(error).not.toBeNull();
            expect(error?.message).toMatch(/check constraint|valid_until_date/i);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should accept until_date locks with valid unlock_date', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          futureDateArbitrary,
          async (appName, unlockDate) => {
            const rule: LockRuleInsert = {
              user_id: testUserId,
              app_name: appName,
              lock_type: 'until_date',
              unlock_date: unlockDate,
            };

            const { data, error } = await supabase.from('lock_rules').insert(rule).select().single();
            
            // Should succeed
            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.lock_type).toBe('until_date');
            expect(data?.unlock_date).toBe(unlockDate);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Requirement 2.6: Nuclear lock type disables all override capabilities', () => {
    it('should accept nuclear locks without any time-based constraints', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          async (appName) => {
            const rule: LockRuleInsert = {
              user_id: testUserId,
              app_name: appName,
              lock_type: 'nuclear',
              // Nuclear locks don't require any additional fields
              daily_limit_minutes: null,
              schedule_start: null,
              schedule_end: null,
              schedule_days: null,
              unlock_date: null,
            };

            const { data, error } = await supabase.from('lock_rules').insert(rule).select().single();
            
            // Should succeed
            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.lock_type).toBe('nuclear');
            // Nuclear locks should not have any time-based constraints
            expect(data?.daily_limit_minutes).toBeNull();
            expect(data?.schedule_start).toBeNull();
            expect(data?.schedule_end).toBeNull();
            expect(data?.schedule_days).toBeNull();
            expect(data?.unlock_date).toBeNull();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Cross-type validation: Non-matching constraints should be null', () => {
    it('should allow timer locks without schedule or date constraints', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          fc.integer({ min: 1, max: 480 }),
          async (appName, dailyLimit) => {
            const rule: LockRuleInsert = {
              user_id: testUserId,
              app_name: appName,
              lock_type: 'timer',
              daily_limit_minutes: dailyLimit,
              schedule_start: null,
              schedule_end: null,
              schedule_days: null,
              unlock_date: null,
            };

            const { data, error } = await supabase.from('lock_rules').insert(rule).select().single();
            
            expect(error).toBeNull();
            expect(data?.lock_type).toBe('timer');
            expect(data?.schedule_start).toBeNull();
            expect(data?.unlock_date).toBeNull();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should allow schedule locks without timer or date constraints', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          timeStringArbitrary,
          timeStringArbitrary,
          scheduleDaysArbitrary,
          async (appName, scheduleStart, scheduleEnd, scheduleDays) => {
            const rule: LockRuleInsert = {
              user_id: testUserId,
              app_name: appName,
              lock_type: 'schedule',
              schedule_start: scheduleStart,
              schedule_end: scheduleEnd,
              schedule_days: scheduleDays,
              daily_limit_minutes: null,
              unlock_date: null,
            };

            const { data, error } = await supabase.from('lock_rules').insert(rule).select().single();
            
            expect(error).toBeNull();
            expect(data?.lock_type).toBe('schedule');
            expect(data?.daily_limit_minutes).toBeNull();
            expect(data?.unlock_date).toBeNull();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should allow until_date locks without timer or schedule constraints', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          futureDateArbitrary,
          async (appName, unlockDate) => {
            const rule: LockRuleInsert = {
              user_id: testUserId,
              app_name: appName,
              lock_type: 'until_date',
              unlock_date: unlockDate,
              daily_limit_minutes: null,
              schedule_start: null,
              schedule_end: null,
              schedule_days: null,
            };

            const { data, error } = await supabase.from('lock_rules').insert(rule).select().single();
            
            expect(error).toBeNull();
            expect(data?.lock_type).toBe('until_date');
            expect(data?.daily_limit_minutes).toBeNull();
            expect(data?.schedule_start).toBeNull();
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
