/**
 * Property-based tests for streakManager module
 * Uses fast-check to validate correctness properties across many randomly generated inputs
 * 
 * Tests Properties 16-19 from the FocusLock design document
 */

import fc from 'fast-check';
import { incrementStreak, resetStreak } from '@/lib/core/streakManager';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}));

import { createClient } from '@/lib/supabase/server';
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Helper to create mock Supabase client for incrementStreak
const createMockSupabaseForIncrement = (
  currentStreak: number,
  longestStreak: number,
  lastActiveDate: string | null
) => {
  const mockEq = jest.fn().mockResolvedValue({ error: null });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
  
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: {
        user_id: 'test-user',
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_active_date: lastActiveDate
      },
      error: null
    }),
    update: mockUpdate,
    mockUpdate // Expose for assertions
  };
  
  return mockSupabase;
};

// Helper to create mock Supabase client for resetStreak
const createMockSupabaseForReset = () => {
  const mockEq = jest.fn().mockResolvedValue({ error: null });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
  
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    update: mockUpdate,
    eq: mockEq,
    mockUpdate // Expose for assertions
  };
  
  return mockSupabase;
};

// Custom arbitraries for generating test data
const dateArbitrary = fc.date({
  min: new Date('2024-01-01'),
  max: new Date('2024-12-31')
});

const streakCountArbitrary = fc.integer({ min: 0, max: 100 });

const dateStringArbitrary = dateArbitrary.map(date => 
  date.toISOString().split('T')[0]
);

// Clear mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe('Property 16: Streak Increment Without Override', () => {
  it('Feature: focuslock-app, Property 16: Streak increment for compliant day', () => {
    /**
     * **Validates: Requirements 6.2**
     * 
     * For any user with no overrides on a given date, checking and updating the streak
     * SHALL increment current_streak by 1 (or set to 1 if not consecutive).
     */
    fc.assert(
      fc.property(
        streakCountArbitrary, // current_streak
        streakCountArbitrary, // longest_streak
        dateArbitrary, // last_active_date
        dateArbitrary, // new date for increment
        async (currentStreak, longestStreak, lastActiveDate, newDate) => {
          // Skip invalid dates
          fc.pre(!isNaN(lastActiveDate.getTime()) && !isNaN(newDate.getTime()));
          
          // Ensure longest_streak >= current_streak (valid state)
          const validLongestStreak = Math.max(longestStreak, currentStreak);
          
          const lastActiveDateStr = lastActiveDate.toISOString().split('T')[0];
          const mockSupabase = createMockSupabaseForIncrement(
            currentStreak,
            validLongestStreak,
            lastActiveDateStr
          );

          mockCreateClient.mockResolvedValue(mockSupabase as any);

          const newStreak = await incrementStreak('test-user', newDate);

          // Check if dates are consecutive
          const d1 = new Date(lastActiveDate);
          d1.setHours(0, 0, 0, 0);
          const d2 = new Date(newDate);
          d2.setHours(0, 0, 0, 0);
          const diffMs = d2.getTime() - d1.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          const isConsecutive = diffDays === 1;

          // Property: If consecutive, increment by 1; otherwise reset to 1
          if (isConsecutive) {
            expect(newStreak).toBe(currentStreak + 1);
          } else {
            expect(newStreak).toBe(1);
          }

          // Verify update was called with correct values
          expect(mockSupabase.mockUpdate).toHaveBeenCalled();
          const updateCall = mockSupabase.mockUpdate.mock.calls[0][0];
          expect(updateCall.current_streak).toBe(newStreak);
          expect(updateCall.last_active_date).toBe(newDate.toISOString().split('T')[0]);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Feature: focuslock-app, Property 16: Streak starts at 1 for first compliant day', () => {
    /**
     * **Validates: Requirements 6.2**
     * 
     * For any user with no last_active_date (first time), incrementing the streak
     * SHALL set current_streak to 1.
     */
    fc.assert(
      fc.property(
        streakCountArbitrary, // longest_streak
        dateArbitrary, // new date for increment
        async (longestStreak, newDate) => {
          // Skip invalid dates
          fc.pre(!isNaN(newDate.getTime()));
          
          const mockSupabase = createMockSupabaseForIncrement(
            0,
            longestStreak,
            null // No last_active_date
          );

          mockCreateClient.mockResolvedValue(mockSupabase as any);

          const newStreak = await incrementStreak('test-user', newDate);

          // Property: First increment should set streak to 1
          expect(newStreak).toBe(1);

          // Verify update was called with correct values
          expect(mockSupabase.mockUpdate).toHaveBeenCalled();
          const updateCall = mockSupabase.mockUpdate.mock.calls[0][0];
          expect(updateCall.current_streak).toBe(1);
          expect(updateCall.last_active_date).toBe(newDate.toISOString().split('T')[0]);
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 17: Longest Streak Invariant', () => {
  it('Feature: focuslock-app, Property 17: Longest streak always >= current streak', () => {
    /**
     * **Validates: Requirements 6.3**
     * 
     * For any streak update, the longest_streak SHALL always be greater than
     * or equal to current_streak.
     */
    fc.assert(
      fc.property(
        streakCountArbitrary, // current_streak
        streakCountArbitrary, // longest_streak
        dateArbitrary, // last_active_date
        dateArbitrary, // new date for increment
        async (currentStreak, longestStreak, lastActiveDate, newDate) => {
          // Skip invalid dates
          fc.pre(!isNaN(lastActiveDate.getTime()) && !isNaN(newDate.getTime()));
          
          // Ensure longest_streak >= current_streak (valid initial state)
          const validLongestStreak = Math.max(longestStreak, currentStreak);
          
          const lastActiveDateStr = lastActiveDate.toISOString().split('T')[0];
          const mockSupabase = createMockSupabaseForIncrement(
            currentStreak,
            validLongestStreak,
            lastActiveDateStr
          );

          mockCreateClient.mockResolvedValue(mockSupabase as any);

          await incrementStreak('test-user', newDate);

          // Verify update was called
          expect(mockSupabase.mockUpdate).toHaveBeenCalled();
          const updateCall = mockSupabase.mockUpdate.mock.calls[0][0];
          
          // Property: longest_streak >= current_streak ALWAYS
          expect(updateCall.longest_streak).toBeGreaterThanOrEqual(updateCall.current_streak);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Feature: focuslock-app, Property 17: Longest streak updates when current exceeds it', () => {
    /**
     * **Validates: Requirements 6.3**
     * 
     * When current_streak exceeds longest_streak after an increment,
     * longest_streak SHALL be updated to match current_streak.
     */
    fc.assert(
      fc.property(
        streakCountArbitrary, // current_streak
        dateArbitrary, // last_active_date (yesterday)
        async (currentStreak, lastActiveDate) => {
          // Skip invalid dates
          fc.pre(!isNaN(lastActiveDate.getTime()));
          
          // Set longest_streak equal to current_streak (boundary case)
          const longestStreak = currentStreak;
          
          // Create date strings in YYYY-MM-DD format (as stored in DB)
          // Normalize to midnight to avoid timezone issues
          const d1 = new Date(lastActiveDate);
          d1.setHours(0, 0, 0, 0);
          const lastActiveDateStr = d1.toISOString().split('T')[0];
          
          // Create new date from the string (simulating DB retrieval)
          const lastActiveDateFromDB = new Date(lastActiveDateStr);
          
          // Create consecutive date (exactly 1 day later)
          const newDate = new Date(lastActiveDateFromDB);
          newDate.setDate(lastActiveDateFromDB.getDate() + 1);
          
          const mockSupabase = createMockSupabaseForIncrement(
            currentStreak,
            longestStreak,
            lastActiveDateStr
          );

          mockCreateClient.mockResolvedValue(mockSupabase as any);

          await incrementStreak('test-user', newDate);

          // Verify update was called
          expect(mockSupabase.mockUpdate).toHaveBeenCalled();
          const updateCall = mockSupabase.mockUpdate.mock.calls[0][0];
          
          // Property: When current increments past longest, longest updates
          // Since dates are consecutive, current should increment by 1
          const newCurrentStreak = currentStreak + 1;
          expect(updateCall.current_streak).toBe(newCurrentStreak);
          // Longest should be updated to match the new current
          expect(updateCall.longest_streak).toBe(newCurrentStreak);
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 18: Streak Reset on Override', () => {
  it('Feature: focuslock-app, Property 18: Current streak resets to 0 on override', () => {
    /**
     * **Validates: Requirements 6.4**
     * 
     * For any user who logs an override, the current_streak SHALL be reset to 0.
     */
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }), // user_id
        async (userId) => {
          const mockSupabase = createMockSupabaseForReset();

          mockCreateClient.mockResolvedValue(mockSupabase as any);

          await resetStreak(userId);

          // Property: Reset always sets current_streak to 0
          expect(mockSupabase.mockUpdate).toHaveBeenCalledWith({
            current_streak: 0
          });
          expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Feature: focuslock-app, Property 18: Longest streak preserved on reset', () => {
    /**
     * **Validates: Requirements 6.4**
     * 
     * When resetting current_streak to 0, the longest_streak SHALL be preserved
     * (not modified by the reset operation).
     */
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }), // user_id
        async (userId) => {
          const mockSupabase = createMockSupabaseForReset();

          mockCreateClient.mockResolvedValue(mockSupabase as any);

          await resetStreak(userId);

          // Property: Reset only modifies current_streak, not longest_streak
          expect(mockSupabase.mockUpdate).toHaveBeenCalledWith({
            current_streak: 0
          });
          
          const updateCall = mockSupabase.mockUpdate.mock.calls[0][0];
          expect(updateCall).not.toHaveProperty('longest_streak');
          expect(updateCall).not.toHaveProperty('last_active_date');
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 19: Streak Last Active Date Update', () => {
  it('Feature: focuslock-app, Property 19: Last active date updates on increment', () => {
    /**
     * **Validates: Requirements 6.5**
     * 
     * For any streak increment, the last_active_date SHALL be updated to
     * the date of the increment.
     */
    fc.assert(
      fc.property(
        streakCountArbitrary, // current_streak
        streakCountArbitrary, // longest_streak
        dateStringArbitrary, // last_active_date
        dateArbitrary, // new date for increment
        async (currentStreak, longestStreak, lastActiveDateStr, newDate) => {
          // Skip invalid dates
          fc.pre(!isNaN(newDate.getTime()));
          
          // Ensure longest_streak >= current_streak (valid state)
          const validLongestStreak = Math.max(longestStreak, currentStreak);
          
          const mockSupabase = createMockSupabaseForIncrement(
            currentStreak,
            validLongestStreak,
            lastActiveDateStr
          );

          mockCreateClient.mockResolvedValue(mockSupabase as any);

          await incrementStreak('test-user', newDate);

          // Verify update was called
          expect(mockSupabase.mockUpdate).toHaveBeenCalled();
          const updateCall = mockSupabase.mockUpdate.mock.calls[0][0];
          
          // Property: last_active_date MUST be updated to the increment date
          const expectedDateStr = newDate.toISOString().split('T')[0];
          expect(updateCall.last_active_date).toBe(expectedDateStr);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Feature: focuslock-app, Property 19: Last active date format is YYYY-MM-DD', () => {
    /**
     * **Validates: Requirements 6.5**
     * 
     * The last_active_date SHALL be stored in YYYY-MM-DD format.
     */
    fc.assert(
      fc.property(
        streakCountArbitrary, // current_streak
        streakCountArbitrary, // longest_streak
        dateStringArbitrary, // last_active_date
        dateArbitrary, // new date for increment
        async (currentStreak, longestStreak, lastActiveDateStr, newDate) => {
          // Skip invalid dates
          fc.pre(!isNaN(newDate.getTime()));
          
          // Ensure longest_streak >= current_streak (valid state)
          const validLongestStreak = Math.max(longestStreak, currentStreak);
          
          const mockSupabase = createMockSupabaseForIncrement(
            currentStreak,
            validLongestStreak,
            lastActiveDateStr
          );

          mockCreateClient.mockResolvedValue(mockSupabase as any);

          await incrementStreak('test-user', newDate);

          // Verify update was called
          expect(mockSupabase.mockUpdate).toHaveBeenCalled();
          const updateCall = mockSupabase.mockUpdate.mock.calls[0][0];
          
          // Property: last_active_date format is YYYY-MM-DD
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          expect(updateCall.last_active_date).toMatch(dateRegex);
        }
      ),
      { numRuns: 20 }
    );
  });
});
