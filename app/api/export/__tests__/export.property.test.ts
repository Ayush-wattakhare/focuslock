// Property-Based Tests for Data Export API
// Feature: focuslock-app
// **Validates: Requirements 22.1-22.5**

import fc from 'fast-check';
import { GET } from '../route';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Property-Based Tests: Data Export', () => {
  let mockSupabase: {
    auth: { getUser: jest.Mock };
    from: jest.Mock;
  };
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = new NextRequest('http://localhost:3000/api/export');

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  // Arbitraries (generators) for test data
  const userIdArbitrary = fc.uuid();
  const emailArbitrary = fc.emailAddress();
  const nameArbitrary = fc.string({ minLength: 1, maxLength: 50 });
  const timezoneArbitrary = fc.constantFrom(
    'America/New_York',
    'Europe/London',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Australia/Sydney'
  );

  // Use timestamp-based date generation to avoid invalid dates
  const timestampArbitrary = fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2025-12-31') });

  const lockRuleArbitrary = fc.record({
    id: fc.uuid(),
    user_id: userIdArbitrary,
    app_name: fc.constantFrom('Instagram', 'YouTube', 'TikTok', 'Twitter', 'Facebook'),
    lock_type: fc.constantFrom('timer', 'schedule', 'until_date', 'nuclear'),
    daily_limit_minutes: fc.option(fc.integer({ min: 1, max: 480 })),
    created_at: timestampArbitrary.map(ts => new Date(ts).toISOString()),
  });

  const overrideLogArbitrary = fc.record({
    id: fc.uuid(),
    user_id: userIdArbitrary,
    lock_rule_id: fc.uuid(),
    app_name: fc.constantFrom('Instagram', 'YouTube', 'TikTok'),
    mood: fc.constantFrom('bored', 'stressed', 'tired', 'news', 'other'),
    reason_text: fc.option(fc.string({ maxLength: 200 })),
    overridden_at: timestampArbitrary.map(ts => new Date(ts).toISOString()),
  });

  const usageSessionArbitrary = fc.record({
    id: fc.uuid(),
    user_id: userIdArbitrary,
    app_name: fc.constantFrom('Instagram', 'YouTube', 'TikTok'),
    session_start: timestampArbitrary.map(ts => new Date(ts).toISOString()),
    session_end: timestampArbitrary.map(ts => new Date(ts).toISOString()),
    minutes_used: fc.integer({ min: 1, max: 480 }),
    date: timestampArbitrary.map(ts => new Date(ts).toISOString().split('T')[0]),
  });

  const streakArbitrary = fc.record({
    user_id: userIdArbitrary,
    current_streak: fc.integer({ min: 0, max: 365 }),
    longest_streak: fc.integer({ min: 0, max: 365 }),
    last_active_date: fc.option(timestampArbitrary.map(ts => new Date(ts).toISOString().split('T')[0])),
    updated_at: timestampArbitrary.map(ts => new Date(ts).toISOString()),
  });

  const badgeArbitrary = fc.record({
    id: fc.uuid(),
    badge_id: fc.constantFrom('quick_start', 'first_week', 'seven_day_warrior', 'iron_will'),
    earned_at: timestampArbitrary.map(ts => new Date(ts).toISOString()),
    badge_definitions: fc.record({
      id: fc.constantFrom('quick_start', 'first_week', 'seven_day_warrior', 'iron_will'),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      description: fc.string({ maxLength: 200 }),
      icon: fc.constantFrom('⚡', '🌱', '⚔️', '🛡️'),
      condition: fc.string({ maxLength: 100 }),
    }),
  });

  const buddyArbitrary = fc.record({
    id: fc.uuid(),
    user_id: userIdArbitrary,
    buddy_user_id: fc.uuid(),
    rules_watching: fc.array(fc.uuid(), { maxLength: 5 }),
    status: fc.constantFrom('pending', 'active', 'removed'),
    invited_at: timestampArbitrary.map(ts => new Date(ts).toISOString()),
    accepted_at: fc.option(timestampArbitrary.map(ts => new Date(ts).toISOString())),
  });

  const pomodoroSessionArbitrary = fc.record({
    id: fc.uuid(),
    user_id: userIdArbitrary,
    task_label: fc.option(fc.string({ maxLength: 100 })),
    work_minutes: fc.integer({ min: 15, max: 60 }),
    break_minutes: fc.integer({ min: 5, max: 15 }),
    sessions_target: fc.integer({ min: 1, max: 8 }),
    sessions_done: fc.integer({ min: 0, max: 8 }),
    status: fc.constantFrom('active', 'completed', 'abandoned'),
    started_at: timestampArbitrary.map(ts => new Date(ts).toISOString()),
  });

  const weeklyChallengeArbitrary = fc.record({
    id: fc.uuid(),
    user_id: userIdArbitrary,
    app_name: fc.constantFrom('Instagram', 'YouTube', 'TikTok'),
    daily_limit: fc.integer({ min: 10, max: 120 }),
    week_start: timestampArbitrary.map(ts => new Date(ts).toISOString().split('T')[0]),
    week_end: timestampArbitrary.map(ts => new Date(ts).toISOString().split('T')[0]),
    days_completed: fc.integer({ min: 0, max: 5 }),
    status: fc.constantFrom('active', 'completed', 'failed'),
    created_at: timestampArbitrary.map(ts => new Date(ts).toISOString()),
  });

  /**
   * **Property 34: Data Export Completeness**
   * 
   * For any user requesting data export, the generated export SHALL contain all user data
   * including lock_rules, override_logs, usage_sessions, streaks, user_badges, buddies,
   * and pomodoro_sessions.
   * 
   * **Validates: Requirements 22.1-22.5**
   */
  describe('Property 34: Data Export Completeness', () => {
    it('should include all required tables in export for any user', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          emailArbitrary,
          nameArbitrary,
          timezoneArbitrary,
          async (userId, email, fullName, timezone) => {
            // Setup mock user
            const mockUser = { id: userId, email };
            const mockProfile = { full_name: fullName, timezone };

            mockSupabase.auth.getUser.mockResolvedValue({
              data: { user: mockUser },
              error: null,
            });

            // Mock all database queries
            mockSupabase.from.mockImplementation((table: string) => {
              switch (table) {
                case 'profiles':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
                      }),
                    }),
                  };
                case 'streaks':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                      }),
                    }),
                  };
                case 'buddies':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockImplementation(() => Promise.resolve({ data: [], error: null })),
                    }),
                  };
                default:
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: [], error: null }),
                      }),
                    }),
                  };
              }
            });

            const response = await GET(mockRequest);
            const data = await response.json();

            // Property: All required tables must be present
            expect(data).toHaveProperty('metadata');
            expect(data).toHaveProperty('lock_rules');
            expect(data).toHaveProperty('override_logs');
            expect(data).toHaveProperty('usage_sessions');
            expect(data).toHaveProperty('streaks');
            expect(data).toHaveProperty('badges');
            expect(data).toHaveProperty('buddies');
            expect(data).toHaveProperty('pomodoro_sessions');
            expect(data).toHaveProperty('weekly_challenges');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include all user records and no records from other users', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          emailArbitrary,
          nameArbitrary,
          timezoneArbitrary,
          fc.array(lockRuleArbitrary, { minLength: 0, maxLength: 10 }),
          fc.array(overrideLogArbitrary, { minLength: 0, maxLength: 20 }),
          fc.array(usageSessionArbitrary, { minLength: 0, maxLength: 30 }),
          async (userId, email, fullName, timezone, lockRules, overrideLogs, usageSessions) => {
            // Ensure all generated data belongs to the test user
            const userLockRules = lockRules.map(r => ({ ...r, user_id: userId }));
            const userOverrideLogs = overrideLogs.map(l => ({ ...l, user_id: userId }));
            const userUsageSessions = usageSessions.map(s => ({ ...s, user_id: userId }));

            const mockUser = { id: userId, email };
            const mockProfile = { full_name: fullName, timezone };

            mockSupabase.auth.getUser.mockResolvedValue({
              data: { user: mockUser },
              error: null,
            });

            mockSupabase.from.mockImplementation((table: string) => {
              switch (table) {
                case 'profiles':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
                      }),
                    }),
                  };
                case 'lock_rules':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: userLockRules, error: null }),
                      }),
                    }),
                  };
                case 'override_logs':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: userOverrideLogs, error: null }),
                      }),
                    }),
                  };
                case 'usage_sessions':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: userUsageSessions, error: null }),
                      }),
                    }),
                  };
                case 'streaks':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                      }),
                    }),
                  };
                case 'user_badges':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: [], error: null }),
                      }),
                    }),
                  };
                case 'buddies':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockImplementation(() => Promise.resolve({ data: [], error: null })),
                    }),
                  };
                case 'pomodoro_sessions':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: [], error: null }),
                      }),
                    }),
                  };
                case 'weekly_challenges':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: [], error: null }),
                      }),
                    }),
                  };
                default:
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: [], error: null }),
                      }),
                    }),
                  };
              }
            });

            const response = await GET(mockRequest);
            const data = await response.json();

            // Property: All records belong to the authenticated user
            expect(data.lock_rules).toHaveLength(userLockRules.length);
            expect(data.override_logs).toHaveLength(userOverrideLogs.length);
            expect(data.usage_sessions).toHaveLength(userUsageSessions.length);

            // Property: No records from other users
            if (data.lock_rules.length > 0) {
              expect(data.lock_rules.every((r: { user_id: string }) => r.user_id === userId)).toBe(true);
            }
            if (data.override_logs.length > 0) {
              expect(data.override_logs.every((l: { user_id: string }) => l.user_id === userId)).toBe(true);
            }
            if (data.usage_sessions.length > 0) {
              expect(data.usage_sessions.every((s: { user_id: string }) => s.user_id === userId)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include complete and accurate metadata for any user', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          emailArbitrary,
          nameArbitrary,
          timezoneArbitrary,
          async (userId, email, fullName, timezone) => {
            const mockUser = { id: userId, email };
            const mockProfile = { full_name: fullName, timezone };

            mockSupabase.auth.getUser.mockResolvedValue({
              data: { user: mockUser },
              error: null,
            });

            mockSupabase.from.mockImplementation((table: string) => {
              if (table === 'profiles') {
                return {
                  select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
                    }),
                  }),
                };
              }
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: [], error: null }),
                    single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                  }),
                }),
              };
            });

            const beforeExport = Date.now();
            const response = await GET(mockRequest);
            const data = await response.json();
            const afterExport = Date.now();

            // Property: Metadata must be complete
            expect(data.metadata).toBeDefined();
            expect(data.metadata.user_id).toBe(userId);
            expect(data.metadata.user_email).toBe(email);
            expect(data.metadata.full_name).toBe(fullName);
            expect(data.metadata.timezone).toBe(timezone);
            expect(data.metadata.export_date).toBeDefined();

            // Property: Export date must be accurate (within test execution window)
            const exportDate = new Date(data.metadata.export_date).getTime();
            expect(exportDate).toBeGreaterThanOrEqual(beforeExport);
            expect(exportDate).toBeLessThanOrEqual(afterExport);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should export complete data structure with all table types', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          emailArbitrary,
          nameArbitrary,
          timezoneArbitrary,
          fc.array(lockRuleArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(overrideLogArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(usageSessionArbitrary, { minLength: 1, maxLength: 5 }),
          streakArbitrary,
          fc.array(badgeArbitrary, { minLength: 1, maxLength: 3 }),
          fc.array(buddyArbitrary, { minLength: 1, maxLength: 3 }),
          fc.array(pomodoroSessionArbitrary, { minLength: 1, maxLength: 3 }),
          fc.array(weeklyChallengeArbitrary, { minLength: 1, maxLength: 2 }),
          async (
            userId,
            email,
            fullName,
            timezone,
            lockRules,
            overrideLogs,
            usageSessions,
            streak,
            badges,
            buddies,
            pomodoroSessions,
            weeklyChallenges
          ) => {
            // Ensure all data belongs to the test user
            const userLockRules = lockRules.map(r => ({ ...r, user_id: userId }));
            const userOverrideLogs = overrideLogs.map(l => ({ ...l, user_id: userId }));
            const userUsageSessions = usageSessions.map(s => ({ ...s, user_id: userId }));
            const userStreak = { ...streak, user_id: userId };
            const userBuddies = buddies.map(b => ({ ...b, user_id: userId }));
            const userPomodoroSessions = pomodoroSessions.map(p => ({ ...p, user_id: userId }));
            const userWeeklyChallenges = weeklyChallenges.map(c => ({ ...c, user_id: userId }));

            const mockUser = { id: userId, email };
            const mockProfile = { full_name: fullName, timezone };

            mockSupabase.auth.getUser.mockResolvedValue({
              data: { user: mockUser },
              error: null,
            });

            mockSupabase.from.mockImplementation((table: string) => {
              switch (table) {
                case 'profiles':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
                      }),
                    }),
                  };
                case 'lock_rules':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: userLockRules, error: null }),
                      }),
                    }),
                  };
                case 'override_logs':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: userOverrideLogs, error: null }),
                      }),
                    }),
                  };
                case 'usage_sessions':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: userUsageSessions, error: null }),
                      }),
                    }),
                  };
                case 'streaks':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: userStreak, error: null }),
                      }),
                    }),
                  };
                case 'user_badges':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: badges, error: null }),
                      }),
                    }),
                  };
                case 'buddies':
                  // Create a closure to track eq call count per test
                  return (() => {
                    let eqCallCount = 0;
                    return {
                      select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockImplementation(() => {
                          eqCallCount++;
                          if (eqCallCount === 1) {
                            return Promise.resolve({ data: userBuddies, error: null });
                          } else {
                            return Promise.resolve({ data: [], error: null });
                          }
                        }),
                      }),
                    };
                  })();
                case 'pomodoro_sessions':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: userPomodoroSessions, error: null }),
                      }),
                    }),
                  };
                case 'weekly_challenges':
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: userWeeklyChallenges, error: null }),
                      }),
                    }),
                  };
                default:
                  return {
                    select: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: [], error: null }),
                      }),
                    }),
                  };
              }
            });

            const response = await GET(mockRequest);
            const data = await response.json();

            // Property: All tables present with correct data
            expect(data.lock_rules).toHaveLength(userLockRules.length);
            expect(data.override_logs).toHaveLength(userOverrideLogs.length);
            expect(data.usage_sessions).toHaveLength(userUsageSessions.length);
            expect(data.streaks).toEqual(userStreak);
            expect(data.badges).toHaveLength(badges.length);
            // Note: buddies array includes both user and buddy relationships, so it's userBuddies.length (from first call)
            // The second call returns empty array, so total is userBuddies.length
            expect(data.buddies.length).toBeGreaterThanOrEqual(userBuddies.length);
            expect(data.pomodoro_sessions).toHaveLength(userPomodoroSessions.length);
            expect(data.weekly_challenges).toHaveLength(userWeeklyChallenges.length);

            // Property: All records have correct user_id (or are related to user via buddy relationship)
            data.lock_rules.forEach((r: { user_id: string }) => {
              expect(r.user_id).toBe(userId);
            });
            data.override_logs.forEach((l: { user_id: string }) => {
              expect(l.user_id).toBe(userId);
            });
            data.usage_sessions.forEach((s: { user_id: string }) => {
              expect(s.user_id).toBe(userId);
            });
            // Buddies can have user_id OR buddy_user_id matching the authenticated user
            data.buddies.forEach((b: { user_id: string; buddy_user_id: string }) => {
              expect(b.user_id === userId || b.buddy_user_id === userId).toBe(true);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should set correct Content-Disposition header for file download', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          emailArbitrary,
          nameArbitrary,
          timezoneArbitrary,
          async (userId, email, fullName, timezone) => {
            const mockUser = { id: userId, email };
            const mockProfile = { full_name: fullName, timezone };

            mockSupabase.auth.getUser.mockResolvedValue({
              data: { user: mockUser },
              error: null,
            });

            mockSupabase.from.mockImplementation((table: string) => {
              if (table === 'profiles') {
                return {
                  select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
                    }),
                  }),
                };
              }
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: [], error: null }),
                    single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                  }),
                }),
              };
            });

            const response = await GET(mockRequest);

            // Property: Response must have correct headers for download
            expect(response.headers.get('Content-Type')).toBe('application/json');
            expect(response.headers.get('Content-Disposition')).toMatch(
              /^attachment; filename="focuslock-data-export-\d{4}-\d{2}-\d{2}\.json"$/
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle users with no data gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          emailArbitrary,
          nameArbitrary,
          timezoneArbitrary,
          async (userId, email, fullName, timezone) => {
            const mockUser = { id: userId, email };
            const mockProfile = { full_name: fullName, timezone };

            mockSupabase.auth.getUser.mockResolvedValue({
              data: { user: mockUser },
              error: null,
            });

            // Mock all tables returning empty data
            mockSupabase.from.mockImplementation((table: string) => {
              if (table === 'profiles') {
                return {
                  select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
                    }),
                  }),
                };
              }
              if (table === 'streaks') {
                return {
                  select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                    }),
                  }),
                };
              }
              if (table === 'buddies') {
                return {
                  select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockImplementation(() => Promise.resolve({ data: [], error: null })),
                  }),
                };
              }
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              };
            });

            const response = await GET(mockRequest);
            const data = await response.json();

            // Property: Export succeeds with empty arrays for users with no data
            expect(response.status).toBe(200);
            expect(data.lock_rules).toEqual([]);
            expect(data.override_logs).toEqual([]);
            expect(data.usage_sessions).toEqual([]);
            expect(data.streaks).toBeNull();
            expect(data.badges).toEqual([]);
            expect(data.buddies).toEqual([]);
            expect(data.pomodoro_sessions).toEqual([]);
            expect(data.weekly_challenges).toEqual([]);
            expect(data.metadata).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
