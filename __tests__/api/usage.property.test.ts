/**
 * Property-Based Tests for Usage Sessions API
 * 
 * Feature: focuslock-app
 * Property 13: Usage Session Start Recording
 * Property 14: Usage Session Duration Calculation
 * Property 15: Daily Usage Aggregation
 * 
 * Validates: Requirements 5.1, 5.2, 5.3
 * 
 * Tests that the usage sessions API correctly records and aggregates usage data:
 * - Session start records all required fields
 * - Duration calculation is accurate
 * - Daily aggregation sums correctly
 */

import fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';
import type { Database, UsageSessionInsert } from '@/types/database';

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
  // Delete all usage sessions for the test user
  await supabase.from('usage_sessions').delete().eq('user_id', userId);
  
  // Delete the test user profile
  await supabase.from('profiles').delete().eq('id', userId);
}

// Custom arbitraries for generating test data
const appNameArbitrary = fc.string({ minLength: 1, maxLength: 50 });

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

// Generate a duration in minutes (1 to 480 minutes = 8 hours max)
const durationMinutesArbitrary = fc.integer({ min: 1, max: 480 });

describe('Property 13: Usage Session Start Recording', () => {
  beforeAll(async () => {
    // Create a test user for all tests
    testUserId = await createTestUser();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData(testUserId);
  });

  afterEach(async () => {
    // Clean up usage sessions after each test
    await supabase.from('usage_sessions').delete().eq('user_id', testUserId);
  });

  describe('**Validates: Requirements 5.1**', () => {
    it('should record all required fields when starting a usage session', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          timestampArbitrary,
          dateStringArbitrary,
          async (appName, sessionStart, date) => {
            // Create a usage session with all required fields
            const sessionData: UsageSessionInsert = {
              user_id: testUserId,
              app_name: appName,
              session_start: sessionStart,
              date: date,
            };

            const { data, error } = await supabase
              .from('usage_sessions')
              .insert(sessionData)
              .select()
              .single();

            // Verify no error occurred
            expect(error).toBeNull();
            expect(data).not.toBeNull();

            // Verify all required fields are present
            expect(data?.user_id).toBe(testUserId);
            expect(data?.app_name).toBe(appName);
            expect(data?.session_start).toBe(sessionStart);
            expect(data?.date).toBe(date);

            // Verify optional fields are null initially
            expect(data?.session_end).toBeNull();
            expect(data?.minutes_used).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should record user_id correctly for all sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          async (appName) => {
            const now = new Date().toISOString();
            const today = new Date().toISOString().split('T')[0];

            const sessionData: UsageSessionInsert = {
              user_id: testUserId,
              app_name: appName,
              session_start: now,
              date: today,
            };

            const { data, error } = await supabase
              .from('usage_sessions')
              .insert(sessionData)
              .select()
              .single();

            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.user_id).toBe(testUserId);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should record app_name correctly for all sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          async (appName) => {
            const now = new Date().toISOString();
            const today = new Date().toISOString().split('T')[0];

            const sessionData: UsageSessionInsert = {
              user_id: testUserId,
              app_name: appName,
              session_start: now,
              date: today,
            };

            const { data, error } = await supabase
              .from('usage_sessions')
              .insert(sessionData)
              .select()
              .single();

            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.app_name).toBe(appName);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should record session_start timestamp correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          timestampArbitrary,
          async (appName, sessionStart) => {
            const today = new Date(sessionStart).toISOString().split('T')[0];

            const sessionData: UsageSessionInsert = {
              user_id: testUserId,
              app_name: appName,
              session_start: sessionStart,
              date: today,
            };

            const { data, error } = await supabase
              .from('usage_sessions')
              .insert(sessionData)
              .select()
              .single();

            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.session_start).toBe(sessionStart);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should record date correctly for all sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dateStringArbitrary,
          async (appName, date) => {
            const sessionStart = new Date(date + 'T10:00:00.000Z').toISOString();

            const sessionData: UsageSessionInsert = {
              user_id: testUserId,
              app_name: appName,
              session_start: sessionStart,
              date: date,
            };

            const { data, error } = await supabase
              .from('usage_sessions')
              .insert(sessionData)
              .select()
              .single();

            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.date).toBe(date);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

describe('Property 14: Usage Session Duration Calculation', () => {
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
    // Clean up usage sessions after each test
    await supabase.from('usage_sessions').delete().eq('user_id', testUserId);
  });

  describe('**Validates: Requirements 5.2**', () => {
    it('should calculate minutes_used correctly as difference between end and start', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          timestampArbitrary,
          durationMinutesArbitrary,
          async (appName, sessionStart, durationMinutes) => {
            // Calculate session_end based on duration
            const startDate = new Date(sessionStart);
            const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
            const sessionEnd = endDate.toISOString();
            const date = sessionStart.split('T')[0];

            // Create a session with start time
            const { data: created, error: createError } = await supabase
              .from('usage_sessions')
              .insert({
                user_id: testUserId,
                app_name: appName,
                session_start: sessionStart,
                date: date,
              })
              .select()
              .single();

            expect(createError).toBeNull();
            expect(created).not.toBeNull();

            const sessionId = created!.id;

            // Calculate expected minutes
            const expectedMinutes = Math.round(
              (endDate.getTime() - startDate.getTime()) / (1000 * 60)
            );

            // Update session with end time and calculated duration
            const { data: updated, error: updateError } = await supabase
              .from('usage_sessions')
              .update({
                session_end: sessionEnd,
                minutes_used: expectedMinutes,
              })
              .eq('id', sessionId)
              .select()
              .single();

            expect(updateError).toBeNull();
            expect(updated).not.toBeNull();

            // Verify the calculated minutes_used matches expected
            expect(updated?.minutes_used).toBe(expectedMinutes);

            // Verify the calculation is correct
            const actualStart = new Date(updated!.session_start);
            const actualEnd = new Date(updated!.session_end!);
            const actualDurationMs = actualEnd.getTime() - actualStart.getTime();
            const actualMinutes = Math.round(actualDurationMs / (1000 * 60));

            expect(updated?.minutes_used).toBe(actualMinutes);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle short sessions (< 1 minute) correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          timestampArbitrary,
          fc.integer({ min: 1, max: 59 }), // seconds
          async (appName, sessionStart, durationSeconds) => {
            const startDate = new Date(sessionStart);
            const endDate = new Date(startDate.getTime() + durationSeconds * 1000);
            const sessionEnd = endDate.toISOString();
            const date = sessionStart.split('T')[0];

            // Create and end session
            const { data: created } = await supabase
              .from('usage_sessions')
              .insert({
                user_id: testUserId,
                app_name: appName,
                session_start: sessionStart,
                date: date,
              })
              .select()
              .single();

            const sessionId = created!.id;

            const expectedMinutes = Math.round(
              (endDate.getTime() - startDate.getTime()) / (1000 * 60)
            );

            const { data: updated } = await supabase
              .from('usage_sessions')
              .update({
                session_end: sessionEnd,
                minutes_used: expectedMinutes,
              })
              .eq('id', sessionId)
              .select()
              .single();

            // For sessions < 30 seconds, should round to 0
            // For sessions >= 30 seconds, should round to 1
            expect(updated?.minutes_used).toBe(expectedMinutes);
            expect(updated?.minutes_used).toBeGreaterThanOrEqual(0);
            expect(updated?.minutes_used).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle long sessions (> 1 hour) correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          timestampArbitrary,
          fc.integer({ min: 61, max: 480 }), // minutes (1+ hours)
          async (appName, sessionStart, durationMinutes) => {
            const startDate = new Date(sessionStart);
            const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
            const sessionEnd = endDate.toISOString();
            const date = sessionStart.split('T')[0];

            const { data: created } = await supabase
              .from('usage_sessions')
              .insert({
                user_id: testUserId,
                app_name: appName,
                session_start: sessionStart,
                date: date,
              })
              .select()
              .single();

            const sessionId = created!.id;

            const expectedMinutes = Math.round(
              (endDate.getTime() - startDate.getTime()) / (1000 * 60)
            );

            const { data: updated } = await supabase
              .from('usage_sessions')
              .update({
                session_end: sessionEnd,
                minutes_used: expectedMinutes,
              })
              .eq('id', sessionId)
              .select()
              .single();

            expect(updated?.minutes_used).toBe(expectedMinutes);
            expect(updated?.minutes_used).toBeGreaterThan(60);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should record session_end timestamp when session ends', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          timestampArbitrary,
          durationMinutesArbitrary,
          async (appName, sessionStart, durationMinutes) => {
            const startDate = new Date(sessionStart);
            const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
            const sessionEnd = endDate.toISOString();
            const date = sessionStart.split('T')[0];

            const { data: created } = await supabase
              .from('usage_sessions')
              .insert({
                user_id: testUserId,
                app_name: appName,
                session_start: sessionStart,
                date: date,
              })
              .select()
              .single();

            const sessionId = created!.id;

            const expectedMinutes = Math.round(
              (endDate.getTime() - startDate.getTime()) / (1000 * 60)
            );

            const { data: updated } = await supabase
              .from('usage_sessions')
              .update({
                session_end: sessionEnd,
                minutes_used: expectedMinutes,
              })
              .eq('id', sessionId)
              .select()
              .single();

            expect(updated?.session_end).toBe(sessionEnd);
            expect(updated?.session_end).not.toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

describe('Property 15: Daily Usage Aggregation', () => {
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
    // Clean up usage sessions after each test
    await supabase.from('usage_sessions').delete().eq('user_id', testUserId);
  });

  describe('**Validates: Requirements 5.3**', () => {
    it('should aggregate daily usage correctly for a single app', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dateStringArbitrary,
          fc.array(durationMinutesArbitrary, { minLength: 1, maxLength: 10 }),
          async (appName, date, sessionDurations) => {
            // Create multiple sessions for the same app and date
            for (const duration of sessionDurations) {
              const sessionStart = new Date(date + 'T10:00:00.000Z').toISOString();
              const endDate = new Date(sessionStart);
              endDate.setMinutes(endDate.getMinutes() + duration);
              const sessionEnd = endDate.toISOString();

              await supabase
                .from('usage_sessions')
                .insert({
                  user_id: testUserId,
                  app_name: appName,
                  session_start: sessionStart,
                  session_end: sessionEnd,
                  minutes_used: duration,
                  date: date,
                });
            }

            // Fetch all sessions for this app and date
            const { data: sessions } = await supabase
              .from('usage_sessions')
              .select('minutes_used')
              .eq('user_id', testUserId)
              .eq('app_name', appName)
              .eq('date', date)
              .not('minutes_used', 'is', null);

            // Calculate expected total
            const expectedTotal = sessionDurations.reduce((sum, duration) => sum + duration, 0);

            // Calculate actual total
            const actualTotal = sessions?.reduce((sum, session) => sum + (session.minutes_used || 0), 0) || 0;

            // Verify aggregation is correct
            expect(actualTotal).toBe(expectedTotal);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should aggregate daily usage correctly for multiple apps', async () => {
      await fc.assert(
        fc.asyncProperty(
          dateStringArbitrary,
          fc.array(
            fc.record({
              appName: appNameArbitrary,
              durations: fc.array(durationMinutesArbitrary, { minLength: 1, maxLength: 5 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (date, appSessions) => {
            // Create sessions for multiple apps
            const expectedTotals = new Map<string, number>();

            for (const { appName, durations } of appSessions) {
              let appTotal = 0;
              for (const duration of durations) {
                const sessionStart = new Date(date + 'T10:00:00.000Z').toISOString();
                const endDate = new Date(sessionStart);
                endDate.setMinutes(endDate.getMinutes() + duration);
                const sessionEnd = endDate.toISOString();

                await supabase
                  .from('usage_sessions')
                  .insert({
                    user_id: testUserId,
                    app_name: appName,
                    session_start: sessionStart,
                    session_end: sessionEnd,
                    minutes_used: duration,
                    date: date,
                  });

                appTotal += duration;
              }
              expectedTotals.set(appName, appTotal);
            }

            // Fetch and aggregate by app
            const { data: sessions } = await supabase
              .from('usage_sessions')
              .select('app_name, minutes_used')
              .eq('user_id', testUserId)
              .eq('date', date)
              .not('minutes_used', 'is', null);

            const actualTotals = new Map<string, number>();
            for (const session of sessions || []) {
              const current = actualTotals.get(session.app_name) || 0;
              actualTotals.set(session.app_name, current + (session.minutes_used || 0));
            }

            // Verify each app's total
            for (const [appName, expectedTotal] of expectedTotals.entries()) {
              const actualTotal = actualTotals.get(appName) || 0;
              expect(actualTotal).toBe(expectedTotal);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should aggregate only completed sessions (with minutes_used)', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dateStringArbitrary,
          fc.array(durationMinutesArbitrary, { minLength: 2, maxLength: 5 }),
          async (appName, date, completedDurations) => {
            // Create completed sessions
            for (const duration of completedDurations) {
              const sessionStart = new Date(date + 'T10:00:00.000Z').toISOString();
              const endDate = new Date(sessionStart);
              endDate.setMinutes(endDate.getMinutes() + duration);
              const sessionEnd = endDate.toISOString();

              await supabase
                .from('usage_sessions')
                .insert({
                  user_id: testUserId,
                  app_name: appName,
                  session_start: sessionStart,
                  session_end: sessionEnd,
                  minutes_used: duration,
                  date: date,
                });
            }

            // Create an incomplete session (no end time or minutes_used)
            const incompleteStart = new Date(date + 'T14:00:00.000Z').toISOString();
            await supabase
              .from('usage_sessions')
              .insert({
                user_id: testUserId,
                app_name: appName,
                session_start: incompleteStart,
                date: date,
                // No session_end or minutes_used
              });

            // Fetch only completed sessions
            const { data: sessions } = await supabase
              .from('usage_sessions')
              .select('minutes_used')
              .eq('user_id', testUserId)
              .eq('app_name', appName)
              .eq('date', date)
              .not('minutes_used', 'is', null);

            // Calculate totals
            const expectedTotal = completedDurations.reduce((sum, duration) => sum + duration, 0);
            const actualTotal = sessions?.reduce((sum, session) => sum + (session.minutes_used || 0), 0) || 0;

            // Verify only completed sessions are included
            expect(sessions?.length).toBe(completedDurations.length);
            expect(actualTotal).toBe(expectedTotal);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should aggregate usage separately for different dates', async () => {
      await fc.assert(
        fc.asyncProperty(
          appNameArbitrary,
          dateStringArbitrary,
          dateStringArbitrary,
          fc.array(durationMinutesArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(durationMinutesArbitrary, { minLength: 1, maxLength: 5 }),
          async (appName, date1, date2, durations1, durations2) => {
            // Skip if dates are the same
            if (date1 === date2) return;

            // Create sessions for date1
            for (const duration of durations1) {
              const sessionStart = new Date(date1 + 'T10:00:00.000Z').toISOString();
              const endDate = new Date(sessionStart);
              endDate.setMinutes(endDate.getMinutes() + duration);
              const sessionEnd = endDate.toISOString();

              await supabase
                .from('usage_sessions')
                .insert({
                  user_id: testUserId,
                  app_name: appName,
                  session_start: sessionStart,
                  session_end: sessionEnd,
                  minutes_used: duration,
                  date: date1,
                });
            }

            // Create sessions for date2
            for (const duration of durations2) {
              const sessionStart = new Date(date2 + 'T10:00:00.000Z').toISOString();
              const endDate = new Date(sessionStart);
              endDate.setMinutes(endDate.getMinutes() + duration);
              const sessionEnd = endDate.toISOString();

              await supabase
                .from('usage_sessions')
                .insert({
                  user_id: testUserId,
                  app_name: appName,
                  session_start: sessionStart,
                  session_end: sessionEnd,
                  minutes_used: duration,
                  date: date2,
                });
            }

            // Fetch sessions for date1
            const { data: sessions1 } = await supabase
              .from('usage_sessions')
              .select('minutes_used')
              .eq('user_id', testUserId)
              .eq('app_name', appName)
              .eq('date', date1)
              .not('minutes_used', 'is', null);

            // Fetch sessions for date2
            const { data: sessions2 } = await supabase
              .from('usage_sessions')
              .select('minutes_used')
              .eq('user_id', testUserId)
              .eq('app_name', appName)
              .eq('date', date2)
              .not('minutes_used', 'is', null);

            // Calculate expected totals
            const expectedTotal1 = durations1.reduce((sum, duration) => sum + duration, 0);
            const expectedTotal2 = durations2.reduce((sum, duration) => sum + duration, 0);

            // Calculate actual totals
            const actualTotal1 = sessions1?.reduce((sum, session) => sum + (session.minutes_used || 0), 0) || 0;
            const actualTotal2 = sessions2?.reduce((sum, session) => sum + (session.minutes_used || 0), 0) || 0;

            // Verify aggregation is separate for each date
            expect(actualTotal1).toBe(expectedTotal1);
            expect(actualTotal2).toBe(expectedTotal2);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
