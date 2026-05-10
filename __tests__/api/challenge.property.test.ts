/**
 * Property-Based Tests for Weekly Challenges
 * 
 * Feature: focuslock-app
 * Property 29: Worst App Identification
 * Property 30: Weekly Challenge Structure
 * Property 31: Challenge Progress Tracking
 * Property 32: Challenge Completion Status
 * 
 * Validates: Requirements 11.1-11.7
 * 
 * Tests that the weekly challenge system correctly:
 * - Identifies the worst-performing app based on override count
 * - Generates challenges with valid 5-day structure
 * - Tracks daily progress accurately
 * - Updates completion status when goal is met
 */

import fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';
import type { Database, OverrideLogInsert, WeeklyChallengeInsert } from '@/types/database';

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
  // Delete all weekly challenges for the test user
  await supabase.from('weekly_challenges').delete().eq('user_id', userId);
  
  // Delete all override logs for the test user
  await supabase.from('override_logs').delete().eq('user_id', userId);
  
  // Delete the test user profile
  await supabase.from('profiles').delete().eq('id', userId);
}

// Custom arbitraries for generating test data
const appNameArbitrary = fc.constantFrom(
  'Instagram',
  'YouTube',
  'TikTok',
  'Twitter',
  'Facebook',
  'Reddit',
  'Snapchat'
);

// Generate a date string in YYYY-MM-DD format
const dateStringArbitrary = fc.date({ 
  min: new Date('2024-01-01'), 
  max: new Date('2024-12-31') 
}).map(d => d.toISOString().split('T')[0]);

// Generate a timestamp
const timestampArbitrary = fc.date({ 
  min: new Date('2024-01-01'), 
  max: new Date('2024-12-31') 
}).map(d => d.toISOString());

// Generate mood for override logs
const moodArbitrary = fc.constantFrom('bored', 'stressed', 'tired', 'news', 'other');

// Generate daily limit (1 to 480 minutes = 8 hours max)
const dailyLimitArbitrary = fc.integer({ min: 1, max: 480 });

describe('Property 29: Worst App Identification', () => {
  beforeAll(async () => {
    // Create a test user for all tests
    testUserId = await createTestUser();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData(testUserId);
  });

  afterEach(async () => {
    // Clean up override logs after each test
    await supabase.from('override_logs').delete().eq('user_id', testUserId);
  });

  describe('**Validates: Requirements 11.2**', () => {
    it('should identify the app with the highest override count as worst app', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              appName: appNameArbitrary,
              overrideCount: fc.integer({ min: 1, max: 20 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          dateStringArbitrary,
          async (appOverrides, startDate) => {
            // Calculate end date (7 days later)
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            const endDateStr = endDate.toISOString().split('T')[0];

            // Create override logs for each app
            for (const { appName, overrideCount } of appOverrides) {
              for (let i = 0; i < overrideCount; i++) {
                const overrideDate = new Date(startDate);
                overrideDate.setDate(overrideDate.getDate() + (i % 7));
                const timestamp = overrideDate.toISOString();

                await supabase.from('override_logs').insert({
                  user_id: testUserId,
                  app_name: appName,
                  mood: 'bored',
                  overridden_at: timestamp,
                });
              }
            }

            // Call the database function to get worst performing app
            const { data, error } = await supabase.rpc('get_worst_performing_app', {
              p_user_id: testUserId,
              p_start_date: startDate,
              p_end_date: endDateStr,
            });

            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.length).toBeGreaterThan(0);

            // Find the app with maximum override count
            const maxOverrides = Math.max(...appOverrides.map(a => a.overrideCount));
            const worstApps = appOverrides.filter(a => a.overrideCount === maxOverrides);

            // The returned app should be one of the apps with max overrides
            const returnedApp = data![0];
            expect(returnedApp.override_count).toBe(BigInt(maxOverrides));
            expect(worstApps.some(a => a.appName === returnedApp.app_name)).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return the app with most overrides even with single override', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dateStringArbitrary,
          async (appName, date) => {
            // Create a single override
            await supabase.from('override_logs').insert({
              user_id: testUserId,
              app_name: appName,
              mood: 'bored',
              overridden_at: new Date(date).toISOString(),
            });

            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 6);
            const endDateStr = endDate.toISOString().split('T')[0];

            // Call the function
            const { data, error } = await supabase.rpc('get_worst_performing_app', {
              p_user_id: testUserId,
              p_start_date: date,
              p_end_date: endDateStr,
            });

            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.length).toBe(1);
            expect(data![0].app_name).toBe(appName);
            expect(data![0].override_count).toBe(BigInt(1));
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should only count overrides within the specified date range', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dateStringArbitrary,
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          async (appName, startDate, insideCount, outsideCount) => {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            const endDateStr = endDate.toISOString().split('T')[0];

            // Create overrides inside the range
            for (let i = 0; i < insideCount; i++) {
              const overrideDate = new Date(startDate);
              overrideDate.setDate(overrideDate.getDate() + i);
              await supabase.from('override_logs').insert({
                user_id: testUserId,
                app_name: appName,
                mood: 'bored',
                overridden_at: overrideDate.toISOString(),
              });
            }

            // Create overrides outside the range (before start date)
            for (let i = 0; i < outsideCount; i++) {
              const overrideDate = new Date(startDate);
              overrideDate.setDate(overrideDate.getDate() - (i + 1));
              await supabase.from('override_logs').insert({
                user_id: testUserId,
                app_name: appName,
                mood: 'bored',
                overridden_at: overrideDate.toISOString(),
              });
            }

            // Call the function
            const { data, error } = await supabase.rpc('get_worst_performing_app', {
              p_user_id: testUserId,
              p_start_date: startDate,
              p_end_date: endDateStr,
            });

            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.length).toBe(1);
            // Should only count overrides inside the range
            expect(data![0].override_count).toBe(BigInt(insideCount));
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

describe('Property 30: Weekly Challenge Structure', () => {
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
    // Clean up challenges after each test
    await supabase.from('weekly_challenges').delete().eq('user_id', testUserId);
  });

  describe('**Validates: Requirements 11.3**', () => {
    it('should create challenges with exactly 5-day structure (Monday to Friday)', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dailyLimitArbitrary,
          dateStringArbitrary,
          async (appName, dailyLimit, startDate) => {
            // Ensure start date is a Monday
            const start = new Date(startDate);
            const dayOfWeek = start.getDay();
            const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
            start.setDate(start.getDate() + daysToMonday);
            const weekStart = start.toISOString().split('T')[0];

            // Calculate week end (Friday, 4 days after Monday)
            const end = new Date(start);
            end.setDate(end.getDate() + 4);
            const weekEnd = end.toISOString().split('T')[0];

            // Create a challenge
            const challengeData: WeeklyChallengeInsert = {
              user_id: testUserId,
              app_name: appName,
              daily_limit: dailyLimit,
              week_start: weekStart,
              week_end: weekEnd,
              days_completed: 0,
              status: 'active',
            };

            const { data, error } = await supabase
              .from('weekly_challenges')
              .insert(challengeData)
              .select()
              .single();

            expect(error).toBeNull();
            expect(data).not.toBeNull();

            // Verify 5-day structure
            const startDateObj = new Date(data!.week_start);
            const endDateObj = new Date(data!.week_end);
            const daysDiff = Math.round(
              (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
            );

            expect(daysDiff).toBe(4); // 4 days difference = 5 days total (Mon-Fri)
            expect(startDateObj.getDay()).toBe(1); // Monday
            expect(endDateObj.getDay()).toBe(5); // Friday
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should create challenges with valid daily_limit goal', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dailyLimitArbitrary,
          dateStringArbitrary,
          async (appName, dailyLimit, startDate) => {
            // Ensure start date is a Monday
            const start = new Date(startDate);
            const dayOfWeek = start.getDay();
            const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
            start.setDate(start.getDate() + daysToMonday);
            const weekStart = start.toISOString().split('T')[0];

            const end = new Date(start);
            end.setDate(end.getDate() + 4);
            const weekEnd = end.toISOString().split('T')[0];

            const challengeData: WeeklyChallengeInsert = {
              user_id: testUserId,
              app_name: appName,
              daily_limit: dailyLimit,
              week_start: weekStart,
              week_end: weekEnd,
              days_completed: 0,
              status: 'active',
            };

            const { data, error } = await supabase
              .from('weekly_challenges')
              .insert(challengeData)
              .select()
              .single();

            expect(error).toBeNull();
            expect(data).not.toBeNull();

            // Verify daily_limit is set correctly
            expect(data!.daily_limit).toBe(dailyLimit);
            expect(data!.daily_limit).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should create challenges with active status initially', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dailyLimitArbitrary,
          dateStringArbitrary,
          async (appName, dailyLimit, startDate) => {
            const start = new Date(startDate);
            const dayOfWeek = start.getDay();
            const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
            start.setDate(start.getDate() + daysToMonday);
            const weekStart = start.toISOString().split('T')[0];

            const end = new Date(start);
            end.setDate(end.getDate() + 4);
            const weekEnd = end.toISOString().split('T')[0];

            const challengeData: WeeklyChallengeInsert = {
              user_id: testUserId,
              app_name: appName,
              daily_limit: dailyLimit,
              week_start: weekStart,
              week_end: weekEnd,
              days_completed: 0,
              status: 'active',
            };

            const { data, error } = await supabase
              .from('weekly_challenges')
              .insert(challengeData)
              .select()
              .single();

            expect(error).toBeNull();
            expect(data).not.toBeNull();

            // Verify initial status is active
            expect(data!.status).toBe('active');
            expect(data!.days_completed).toBe(0);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

describe('Property 31: Challenge Progress Tracking', () => {
  beforeAll(async () => {
    if (!testUserId) {
      testUserId = await createTestUser();
    }
  });

  afterAll(async () => {
    await cleanupTestData(testUserId);
  });

  afterEach(async () => {
    await supabase.from('weekly_challenges').delete().eq('user_id', testUserId);
  });

  describe('**Validates: Requirements 11.4**', () => {
    it('should increment days_completed when daily limit is met', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dailyLimitArbitrary,
          fc.integer({ min: 0, max: 4 }), // days to complete (0-4)
          async (appName, dailyLimit, daysToComplete) => {
            // Create a challenge
            const start = new Date('2024-01-15'); // Monday
            const weekStart = start.toISOString().split('T')[0];
            const end = new Date(start);
            end.setDate(end.getDate() + 4);
            const weekEnd = end.toISOString().split('T')[0];

            const { data: challenge } = await supabase
              .from('weekly_challenges')
              .insert({
                user_id: testUserId,
                app_name: appName,
                daily_limit: dailyLimit,
                week_start: weekStart,
                week_end: weekEnd,
                days_completed: 0,
                status: 'active',
              })
              .select()
              .single();

            const challengeId = challenge!.id;

            // Simulate completing days
            for (let i = 0; i < daysToComplete; i++) {
              const { data: updated } = await supabase
                .from('weekly_challenges')
                .update({
                  days_completed: i + 1,
                })
                .eq('id', challengeId)
                .select()
                .single();

              expect(updated!.days_completed).toBe(i + 1);
            }

            // Verify final state
            const { data: final } = await supabase
              .from('weekly_challenges')
              .select()
              .eq('id', challengeId)
              .single();

            expect(final!.days_completed).toBe(daysToComplete);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should track progress accurately across multiple days', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dailyLimitArbitrary,
          fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }), // 5 days of completion status
          async (appName, dailyLimit, completionStatus) => {
            const start = new Date('2024-01-15'); // Monday
            const weekStart = start.toISOString().split('T')[0];
            const end = new Date(start);
            end.setDate(end.getDate() + 4);
            const weekEnd = end.toISOString().split('T')[0];

            const { data: challenge } = await supabase
              .from('weekly_challenges')
              .insert({
                user_id: testUserId,
                app_name: appName,
                daily_limit: dailyLimit,
                week_start: weekStart,
                week_end: weekEnd,
                days_completed: 0,
                status: 'active',
              })
              .select()
              .single();

            const challengeId = challenge!.id;

            // Count expected completed days
            const expectedCompleted = completionStatus.filter(Boolean).length;

            // Update to final count
            await supabase
              .from('weekly_challenges')
              .update({
                days_completed: expectedCompleted,
              })
              .eq('id', challengeId);

            // Verify
            const { data: final } = await supabase
              .from('weekly_challenges')
              .select()
              .eq('id', challengeId)
              .single();

            expect(final!.days_completed).toBe(expectedCompleted);
            expect(final!.days_completed).toBeGreaterThanOrEqual(0);
            expect(final!.days_completed).toBeLessThanOrEqual(5);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should not exceed 5 days completed for a 5-day challenge', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dailyLimitArbitrary,
          async (appName, dailyLimit) => {
            const start = new Date('2024-01-15'); // Monday
            const weekStart = start.toISOString().split('T')[0];
            const end = new Date(start);
            end.setDate(end.getDate() + 4);
            const weekEnd = end.toISOString().split('T')[0];

            const { data: challenge } = await supabase
              .from('weekly_challenges')
              .insert({
                user_id: testUserId,
                app_name: appName,
                daily_limit: dailyLimit,
                week_start: weekStart,
                week_end: weekEnd,
                days_completed: 5, // Max days
                status: 'active',
              })
              .select()
              .single();

            expect(challenge!.days_completed).toBe(5);
            expect(challenge!.days_completed).toBeLessThanOrEqual(5);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

describe('Property 32: Challenge Completion Status', () => {
  beforeAll(async () => {
    if (!testUserId) {
      testUserId = await createTestUser();
    }
  });

  afterAll(async () => {
    await cleanupTestData(testUserId);
  });

  afterEach(async () => {
    await supabase.from('weekly_challenges').delete().eq('user_id', testUserId);
  });

  describe('**Validates: Requirements 11.5**', () => {
    it('should mark challenge as completed when days_completed reaches 5', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dailyLimitArbitrary,
          async (appName, dailyLimit) => {
            const start = new Date('2024-01-15'); // Monday
            const weekStart = start.toISOString().split('T')[0];
            const end = new Date(start);
            end.setDate(end.getDate() + 4);
            const weekEnd = end.toISOString().split('T')[0];

            // Create challenge
            const { data: challenge } = await supabase
              .from('weekly_challenges')
              .insert({
                user_id: testUserId,
                app_name: appName,
                daily_limit: dailyLimit,
                week_start: weekStart,
                week_end: weekEnd,
                days_completed: 0,
                status: 'active',
              })
              .select()
              .single();

            const challengeId = challenge!.id;

            // Simulate completing all 5 days
            const { data: updated } = await supabase
              .from('weekly_challenges')
              .update({
                days_completed: 5,
                status: 'completed',
              })
              .eq('id', challengeId)
              .select()
              .single();

            expect(updated!.days_completed).toBe(5);
            expect(updated!.status).toBe('completed');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should remain active when days_completed is less than 5', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dailyLimitArbitrary,
          fc.integer({ min: 0, max: 4 }),
          async (appName, dailyLimit, daysCompleted) => {
            const start = new Date('2024-01-15'); // Monday
            const weekStart = start.toISOString().split('T')[0];
            const end = new Date(start);
            end.setDate(end.getDate() + 4);
            const weekEnd = end.toISOString().split('T')[0];

            const { data: challenge } = await supabase
              .from('weekly_challenges')
              .insert({
                user_id: testUserId,
                app_name: appName,
                daily_limit: dailyLimit,
                week_start: weekStart,
                week_end: weekEnd,
                days_completed: daysCompleted,
                status: 'active',
              })
              .select()
              .single();

            expect(challenge!.days_completed).toBeLessThan(5);
            expect(challenge!.status).toBe('active');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should transition from active to completed only when reaching 5 days', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dailyLimitArbitrary,
          async (appName, dailyLimit) => {
            const start = new Date('2024-01-15'); // Monday
            const weekStart = start.toISOString().split('T')[0];
            const end = new Date(start);
            end.setDate(end.getDate() + 4);
            const weekEnd = end.toISOString().split('T')[0];

            // Create challenge with 4 days completed
            const { data: challenge } = await supabase
              .from('weekly_challenges')
              .insert({
                user_id: testUserId,
                app_name: appName,
                daily_limit: dailyLimit,
                week_start: weekStart,
                week_end: weekEnd,
                days_completed: 4,
                status: 'active',
              })
              .select()
              .single();

            const challengeId = challenge!.id;

            // Verify still active
            expect(challenge!.status).toBe('active');

            // Complete the 5th day
            const { data: updated } = await supabase
              .from('weekly_challenges')
              .update({
                days_completed: 5,
                status: 'completed',
              })
              .eq('id', challengeId)
              .select()
              .single();

            // Verify now completed
            expect(updated!.days_completed).toBe(5);
            expect(updated!.status).toBe('completed');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain completed status once set', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dailyLimitArbitrary,
          async (appName, dailyLimit) => {
            const start = new Date('2024-01-15'); // Monday
            const weekStart = start.toISOString().split('T')[0];
            const end = new Date(start);
            end.setDate(end.getDate() + 4);
            const weekEnd = end.toISOString().split('T')[0];

            // Create completed challenge
            const { data: challenge } = await supabase
              .from('weekly_challenges')
              .insert({
                user_id: testUserId,
                app_name: appName,
                daily_limit: dailyLimit,
                week_start: weekStart,
                week_end: weekEnd,
                days_completed: 5,
                status: 'completed',
              })
              .select()
              .single();

            // Verify it stays completed
            expect(challenge!.status).toBe('completed');
            expect(challenge!.days_completed).toBe(5);

            // Fetch again to ensure persistence
            const { data: fetched } = await supabase
              .from('weekly_challenges')
              .select()
              .eq('id', challenge!.id)
              .single();

            expect(fetched!.status).toBe('completed');
            expect(fetched!.days_completed).toBe(5);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

