/**
 * Property-based tests for badgeEngine module
 * Uses fast-check to validate correctness properties across many randomly generated inputs
 * 
 * Tests Properties 20-21 from the FocusLock design document
 */

import fc from 'fast-check';
import { awardBadge, checkAndAwardBadges } from '@/lib/core/badgeEngine';
import type { BadgeDefinition } from '@/types/database';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}));

import { createClient } from '@/lib/supabase/client';
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Helper to create mock Supabase client for awardBadge
const createMockSupabaseForAward = () => {
  let capturedData: any = null;
  
  const mockUpsert = jest.fn().mockImplementation((data: any) => {
    capturedData = data;
    return Promise.resolve({ error: null });
  });
  
  return {
    from: jest.fn().mockReturnThis(),
    upsert: mockUpsert,
    mockUpsert, // Expose for assertions
    getCapturedData: () => capturedData
  };
};

// Helper to create mock Supabase client for checkAndAwardBadges
const createMockSupabaseForCheck = (
  badges: BadgeDefinition[],
  earnedBadgeIds: string[]
) => {
  const mockUpsert = jest.fn().mockResolvedValue({ error: null });
  
  const mockSupabase: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    upsert: mockUpsert,
    mockUpsert // Expose for assertions
  };
  
  // Setup chain for badge_definitions fetch (first select call)
  mockSupabase.select.mockReturnValueOnce({
    data: badges,
    error: null
  });
  
  // Setup chain for user_badges fetch (first eq call)
  mockSupabase.eq.mockReturnValueOnce({
    data: earnedBadgeIds.map(id => ({ badge_id: id })),
    error: null
  });
  
  return mockSupabase;
};

// Custom arbitraries for generating test data
const userIdArbitrary = fc.uuid();
const badgeIdArbitrary = fc.constantFrom(
  'quick_start',
  'first_week',
  'seven_day_warrior',
  'iron_will',
  'social_detox',
  'night_owl_slayer',
  'pomodoro_master'
);

describe('badgeEngine property tests', () => {

describe('Property 20: Badge Award Idempotence', () => {
  it('Feature: focuslock-app, Property 20: Awarding badge uses upsert with duplicate prevention', () => {
    /**
     * **Validates: Requirements 7.4**
     * 
     * For any user and badge combination, the award mechanism SHALL use upsert with
     * ignoreDuplicates to prevent duplicate records.
     */
    fc.assert(
      fc.property(
        userIdArbitrary,
        badgeIdArbitrary,
        async (userId, badgeId) => {
          const mockSupabase = createMockSupabaseForAward();
          mockCreateClient.mockReturnValueOnce(mockSupabase);
          
          await awardBadge(userId, badgeId);
          
          // Property: upsert must be called with ignoreDuplicates: true
          // This ensures database-level duplicate prevention
          expect(mockSupabase.mockUpsert).toHaveBeenCalledWith(
            {
              user_id: userId,
              badge_id: badgeId,
              earned_at: expect.any(String)
            },
            {
              onConflict: 'user_id,badge_id',
              ignoreDuplicates: true
            }
          );
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 21: Badge Award on Condition Met', () => {
  it('Feature: focuslock-app, Property 21: Badge awarded with earned_at timestamp', () => {
    /**
     * **Validates: Requirements 7.3**
     * 
     * For any user and badge, awarding a badge SHALL include an earned_at timestamp in ISO format.
     */
    fc.assert(
      fc.property(
        userIdArbitrary,
        badgeIdArbitrary,
        async (userId, badgeId) => {
          const mockSupabase = createMockSupabaseForAward();
          mockCreateClient.mockReturnValueOnce(mockSupabase as any);
          
          await awardBadge(userId, badgeId);
          
          // Property: Badge award must include earned_at timestamp
          expect(mockSupabase.mockUpsert).toHaveBeenCalledTimes(1);
          const capturedData = mockSupabase.getCapturedData();
          
          expect(capturedData).toEqual({
            user_id: userId,
            badge_id: badgeId,
            earned_at: expect.any(String)
          });
          
          // Verify earned_at is a valid ISO timestamp
          const earnedAt = capturedData.earned_at;
          expect(new Date(earnedAt).toISOString()).toBe(earnedAt);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Feature: focuslock-app, Property 21: Badge award uses upsert with conflict resolution', () => {
    /**
     * **Validates: Requirements 7.3, 7.4**
     * 
     * For any badge award, the system SHALL use upsert with onConflict to handle duplicates.
     */
    fc.assert(
      fc.property(
        userIdArbitrary,
        badgeIdArbitrary,
        async (userId, badgeId) => {
          const mockSupabase = createMockSupabaseForAward();
          mockCreateClient.mockReturnValueOnce(mockSupabase as any);
          
          await awardBadge(userId, badgeId);
          
          // Property: Award must use upsert with proper conflict resolution
          expect(mockSupabase.mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
              user_id: userId,
              badge_id: badgeId
            }),
            {
              onConflict: 'user_id,badge_id',
              ignoreDuplicates: true
            }
          );
        }
      ),
      { numRuns: 20 }
    );
  });
});

});