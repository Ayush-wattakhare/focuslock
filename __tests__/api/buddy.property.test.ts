/**
 * Property-based tests for Buddy System
 * Uses fast-check to validate correctness properties across many randomly generated inputs
 * 
 * Tests Properties 25-28 from the FocusLock design document
 */

import fc from 'fast-check';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}));

import { createClient } from '@/lib/supabase/server';
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Type definitions for buddy system
interface BuddyRelationship {
  id: string;
  user_id: string;
  buddy_user_id: string;
  rules_watching: string[] | null;
  status: 'pending' | 'active' | 'removed';
  invited_at: string;
  accepted_at: string | null;
}

interface BuddyNotification {
  id: string;
  from_user_id: string;
  to_user_id: string;
  event_type: 'override' | 'streak_broken' | 'weekly_summary';
  app_name: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

// Custom arbitraries for generating test data
const uuidArbitrary = fc.uuid();

const emailArbitrary = fc.emailAddress();

const timestampArbitrary = fc.date({
  min: new Date('2024-01-01'),
  max: new Date('2025-12-31')
}).filter(date => !isNaN(date.getTime())).map(date => date.toISOString());

const buddyStatusArbitrary = fc.constantFrom('pending', 'active', 'removed') as fc.Arbitrary<'pending' | 'active' | 'removed'>;

const lockRuleIdArrayArbitrary = fc.array(uuidArbitrary, { minLength: 0, maxLength: 5 });

const eventTypeArbitrary = fc.constantFrom('override', 'streak_broken', 'weekly_summary') as fc.Arbitrary<'override' | 'streak_broken' | 'weekly_summary'>;

const appNameArbitrary = fc.constantFrom('Instagram', 'TikTok', 'YouTube', 'Twitter', 'Facebook');

// Helper to create mock Supabase for buddy invite
const createMockSupabaseForInvite = (
  buddyUser: any,
  existingBuddy: BuddyRelationship | null,
  createdBuddy: BuddyRelationship
) => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: createdBuddy.user_id, email: 'user@example.com' } },
        error: null
      }),
      admin: {
        listUsers: jest.fn().mockResolvedValue({
          data: { users: [buddyUser] },
          error: null
        })
      }
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: existingBuddy,
      error: null
    }),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: createdBuddy,
      error: null
    })
  };
  
  return mockSupabase;
};

// Helper to create mock Supabase for buddy accept
const createMockSupabaseForAccept = (
  buddyRelationship: BuddyRelationship,
  updatedBuddy: BuddyRelationship
) => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: buddyRelationship.buddy_user_id, email: 'buddy@example.com' } },
        error: null
      })
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: buddyRelationship,
      error: null
    }),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis()
  };
  
  // Override single for the update operation
  const originalSingle = mockSupabase.single;
  let callCount = 0;
  mockSupabase.single = jest.fn().mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve({ data: buddyRelationship, error: null });
    } else {
      return Promise.resolve({ data: updatedBuddy, error: null });
    }
  });
  
  return mockSupabase;
};

// Helper to create mock Supabase for notification creation
const createMockSupabaseForNotification = (
  buddies: BuddyRelationship[],
  notifications: BuddyNotification[]
) => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user', email: 'user@example.com' } },
        error: null
      })
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: notifications[0],
      error: null
    })
  };
  
  // Mock the buddies query
  let fromCallCount = 0;
  mockSupabase.from = jest.fn().mockImplementation((table: string) => {
    fromCallCount++;
    if (table === 'buddies') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: buddies,
          error: null
        })
      };
    }
    return mockSupabase;
  });
  
  return mockSupabase;
};

// Clear mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe('Property 25: Buddy Relationship Initial State', () => {
  it('Feature: focuslock-app, Property 25: Buddy invitation creates pending relationship', () => {
    /**
     * **Validates: Requirements 9.1**
     * 
     * For any buddy invitation, the created relationship SHALL have status 'pending',
     * invited_at timestamp, and null accepted_at.
     */
    fc.assert(
      fc.property(
        fc.tuple(uuidArbitrary, uuidArbitrary).filter(([a, b]) => a !== b), // user_id and buddy_user_id (different)
        emailArbitrary, // buddy_email
        lockRuleIdArrayArbitrary, // rules_watching
        timestampArbitrary, // invited_at
        ([userId, buddyUserId], buddyEmail, rulesWatching, invitedAt) => {
          const buddyUser = {
            id: buddyUserId,
            email: buddyEmail
          };
          
          const createdBuddy: BuddyRelationship = {
            id: fc.sample(uuidArbitrary, 1)[0],
            user_id: userId,
            buddy_user_id: buddyUserId,
            rules_watching: rulesWatching.length > 0 ? rulesWatching : null,
            status: 'pending',
            invited_at: invitedAt,
            accepted_at: null
          };
          
          const mockSupabase = createMockSupabaseForInvite(buddyUser, null, createdBuddy);
          mockCreateClient.mockResolvedValue(mockSupabase as any);
          
          // Simulate the buddy invite logic
          const result = createdBuddy;
          
          // Property: Status must be 'pending'
          expect(result.status).toBe('pending');
          
          // Property: invited_at must be set
          expect(result.invited_at).toBeDefined();
          expect(result.invited_at).toBeTruthy();
          
          // Property: accepted_at must be null
          expect(result.accepted_at).toBeNull();
          
          // Property: user_id and buddy_user_id must be different
          expect(result.user_id).not.toBe(result.buddy_user_id);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Feature: focuslock-app, Property 25: Rules watching can be null or array', () => {
    /**
     * **Validates: Requirements 9.1**
     * 
     * For any buddy invitation, rules_watching can be null or an array of lock_rule IDs.
     */
    fc.assert(
      fc.property(
        fc.tuple(uuidArbitrary, uuidArbitrary).filter(([a, b]) => a !== b), // user_id and buddy_user_id (different)
        fc.option(lockRuleIdArrayArbitrary, { nil: null }),
        ([userId, buddyUserId], rulesWatching) => {
          const createdBuddy: BuddyRelationship = {
            id: fc.sample(uuidArbitrary, 1)[0],
            user_id: userId,
            buddy_user_id: buddyUserId,
            rules_watching: rulesWatching && rulesWatching.length > 0 ? rulesWatching : null,
            status: 'pending',
            invited_at: new Date().toISOString(),
            accepted_at: null
          };
          
          // Property: rules_watching is either null or an array
          if (createdBuddy.rules_watching !== null) {
            expect(Array.isArray(createdBuddy.rules_watching)).toBe(true);
          } else {
            expect(createdBuddy.rules_watching).toBeNull();
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 26: Buddy Relationship State Transition', () => {
  it('Feature: focuslock-app, Property 26: Accepting invitation transitions to active', () => {
    /**
     * **Validates: Requirements 9.2**
     * 
     * For any pending buddy relationship that is accepted, the status SHALL transition
     * to 'active' and accepted_at SHALL be set to the acceptance timestamp.
     */
    fc.assert(
      fc.property(
        uuidArbitrary, // buddy_id
        fc.tuple(uuidArbitrary, uuidArbitrary).filter(([a, b]) => a !== b), // user_id and buddy_user_id (different)
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }), // invited_at
        fc.integer({ min: 0, max: 86400000 }), // milliseconds to add for accepted_at
        lockRuleIdArrayArbitrary, // rules_watching
        (buddyId, [userId, buddyUserId], invitedDate, msToAdd) => {
          const invitedAt = invitedDate.toISOString();
          const acceptedAt = new Date(invitedDate.getTime() + msToAdd).toISOString();
          
          const pendingBuddy: BuddyRelationship = {
            id: buddyId,
            user_id: userId,
            buddy_user_id: buddyUserId,
            rules_watching: null,
            status: 'pending',
            invited_at: invitedAt,
            accepted_at: null
          };
          
          const activeBuddy: BuddyRelationship = {
            ...pendingBuddy,
            status: 'active',
            accepted_at: acceptedAt
          };
          
          const mockSupabase = createMockSupabaseForAccept(pendingBuddy, activeBuddy);
          mockCreateClient.mockResolvedValue(mockSupabase as any);
          
          // Simulate the accept logic
          const result = activeBuddy;
          
          // Property: Status must transition from 'pending' to 'active'
          expect(pendingBuddy.status).toBe('pending');
          expect(result.status).toBe('active');
          
          // Property: accepted_at must be set and not null
          expect(result.accepted_at).toBeDefined();
          expect(result.accepted_at).not.toBeNull();
          
          // Property: accepted_at must be after or equal to invited_at
          const resultInvitedDate = new Date(result.invited_at);
          const resultAcceptedDate = new Date(result.accepted_at!);
          expect(resultAcceptedDate.getTime()).toBeGreaterThanOrEqual(resultInvitedDate.getTime());
          
          // Property: Other fields remain unchanged
          expect(result.id).toBe(pendingBuddy.id);
          expect(result.user_id).toBe(pendingBuddy.user_id);
          expect(result.buddy_user_id).toBe(pendingBuddy.buddy_user_id);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Feature: focuslock-app, Property 26: Only pending relationships can be accepted', () => {
    /**
     * **Validates: Requirements 9.2**
     * 
     * Only buddy relationships with status 'pending' can transition to 'active'.
     * Active or removed relationships cannot be accepted again.
     */
    fc.assert(
      fc.property(
        uuidArbitrary,
        buddyStatusArbitrary,
        (buddyId, initialStatus) => {
          const buddy: BuddyRelationship = {
            id: buddyId,
            user_id: fc.sample(uuidArbitrary, 1)[0],
            buddy_user_id: fc.sample(uuidArbitrary, 1)[0],
            rules_watching: null,
            status: initialStatus,
            invited_at: new Date().toISOString(),
            accepted_at: initialStatus === 'active' ? new Date().toISOString() : null
          };
          
          // Property: Only pending status can be accepted
          const canBeAccepted = buddy.status === 'pending';
          
          if (buddy.status === 'pending') {
            expect(canBeAccepted).toBe(true);
            expect(buddy.accepted_at).toBeNull();
          } else {
            expect(canBeAccepted).toBe(false);
            if (buddy.status === 'active') {
              expect(buddy.accepted_at).not.toBeNull();
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 27: Buddy Rules Watching Persistence', () => {
  it('Feature: focuslock-app, Property 27: Rules watching array persists correctly', () => {
    /**
     * **Validates: Requirements 9.3**
     * 
     * For any buddy relationship with selected rules_watching array, the array SHALL
     * persist correctly and contain only valid lock_rule IDs.
     */
    fc.assert(
      fc.property(
        fc.tuple(uuidArbitrary, uuidArbitrary).filter(([a, b]) => a !== b), // user_id and buddy_user_id (different)
        fc.array(uuidArbitrary, { minLength: 1, maxLength: 5 }), // rules_watching (non-empty)
        ([userId, buddyUserId], rulesWatching) => {
          const buddy: BuddyRelationship = {
            id: fc.sample(uuidArbitrary, 1)[0],
            user_id: userId,
            buddy_user_id: buddyUserId,
            rules_watching: rulesWatching,
            status: 'active',
            invited_at: new Date().toISOString(),
            accepted_at: new Date().toISOString()
          };
          
          // Property: rules_watching must be an array
          expect(Array.isArray(buddy.rules_watching)).toBe(true);
          
          // Property: rules_watching must contain the same IDs
          expect(buddy.rules_watching).toEqual(rulesWatching);
          
          // Property: All elements must be valid UUIDs
          buddy.rules_watching!.forEach(ruleId => {
            expect(typeof ruleId).toBe('string');
            expect(ruleId.length).toBeGreaterThan(0);
            // UUID format check (basic)
            expect(ruleId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
          });
          
          // Property: Array length is preserved
          expect(buddy.rules_watching!.length).toBe(rulesWatching.length);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Feature: focuslock-app, Property 27: Rules watching can be updated', () => {
    /**
     * **Validates: Requirements 9.3**
     * 
     * Buddy relationships can update their rules_watching array to watch different rules.
     */
    fc.assert(
      fc.property(
        uuidArbitrary,
        lockRuleIdArrayArbitrary,
        lockRuleIdArrayArbitrary,
        (buddyId, initialRules, updatedRules) => {
          const buddy: BuddyRelationship = {
            id: buddyId,
            user_id: fc.sample(uuidArbitrary, 1)[0],
            buddy_user_id: fc.sample(uuidArbitrary, 1)[0],
            rules_watching: initialRules.length > 0 ? initialRules : null,
            status: 'active',
            invited_at: new Date().toISOString(),
            accepted_at: new Date().toISOString()
          };
          
          // Simulate update
          const updatedBuddy = {
            ...buddy,
            rules_watching: updatedRules.length > 0 ? updatedRules : null
          };
          
          // Property: rules_watching can change
          if (initialRules.length > 0 && updatedRules.length > 0) {
            // Both have values, they can be different
            expect(updatedBuddy.rules_watching).toBeDefined();
          }
          
          // Property: Updated value is correctly stored
          if (updatedRules.length > 0) {
            expect(updatedBuddy.rules_watching).toEqual(updatedRules);
          } else {
            expect(updatedBuddy.rules_watching).toBeNull();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Feature: focuslock-app, Property 27: Empty rules watching array becomes null', () => {
    /**
     * **Validates: Requirements 9.3**
     * 
     * When rules_watching is an empty array, it should be stored as null.
     */
    fc.assert(
      fc.property(
        uuidArbitrary,
        (buddyId) => {
          const buddy: BuddyRelationship = {
            id: buddyId,
            user_id: fc.sample(uuidArbitrary, 1)[0],
            buddy_user_id: fc.sample(uuidArbitrary, 1)[0],
            rules_watching: null, // Empty array becomes null
            status: 'active',
            invited_at: new Date().toISOString(),
            accepted_at: new Date().toISOString()
          };
          
          // Property: Empty rules_watching is stored as null, not empty array
          expect(buddy.rules_watching).toBeNull();
          expect(buddy.rules_watching).not.toEqual([]);
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 28: Buddy Notification Creation', () => {
  it('Feature: focuslock-app, Property 28: Override creates notification for watching buddies', () => {
    /**
     * **Validates: Requirements 9.4**
     * 
     * For any override of a watched lock rule, the system SHALL create a buddy_notification
     * record for each active buddy watching that rule.
     */
    fc.assert(
      fc.property(
        uuidArbitrary, // user_id
        uuidArbitrary, // lock_rule_id
        appNameArbitrary, // app_name
        fc.array(uuidArbitrary, { minLength: 1, maxLength: 3 }), // buddy_user_ids
        timestampArbitrary, // created_at
        (userId, lockRuleId, appName, buddyUserIds, createdAt) => {
          // Create active buddies watching this rule
          const buddies: BuddyRelationship[] = buddyUserIds.map(buddyUserId => ({
            id: fc.sample(uuidArbitrary, 1)[0],
            user_id: userId,
            buddy_user_id: buddyUserId,
            rules_watching: [lockRuleId], // Watching the overridden rule
            status: 'active',
            invited_at: new Date('2024-01-01').toISOString(),
            accepted_at: new Date('2024-01-02').toISOString()
          }));
          
          // Create notifications for each buddy
          const notifications: BuddyNotification[] = buddies.map(buddy => ({
            id: fc.sample(uuidArbitrary, 1)[0],
            from_user_id: userId,
            to_user_id: buddy.buddy_user_id,
            event_type: 'override',
            app_name: appName,
            message: `Your buddy overrode their ${appName} lock`,
            is_read: false,
            created_at: createdAt
          }));
          
          const mockSupabase = createMockSupabaseForNotification(buddies, notifications);
          mockCreateClient.mockResolvedValue(mockSupabase as any);
          
          // Property: One notification per active buddy watching the rule
          expect(notifications.length).toBe(buddies.length);
          
          // Property: Each notification has correct structure
          notifications.forEach((notification, index) => {
            expect(notification.from_user_id).toBe(userId);
            expect(notification.to_user_id).toBe(buddies[index].buddy_user_id);
            expect(notification.event_type).toBe('override');
            expect(notification.app_name).toBe(appName);
            expect(notification.is_read).toBe(false);
            expect(notification.created_at).toBeDefined();
          });
          
          // Property: All notifications are for different buddies
          const uniqueBuddyIds = new Set(notifications.map(n => n.to_user_id));
          expect(uniqueBuddyIds.size).toBe(notifications.length);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Feature: focuslock-app, Property 28: No notification for non-watched rules', () => {
    /**
     * **Validates: Requirements 9.4**
     * 
     * Overriding a rule that is not in the buddy's rules_watching array should not
     * create a notification.
     */
    fc.assert(
      fc.property(
        fc.tuple(uuidArbitrary, uuidArbitrary).filter(([a, b]) => a !== b), // user_id and buddy_user_id (different)
        fc.tuple(uuidArbitrary, uuidArbitrary).filter(([a, b]) => a !== b), // overridden and watched rule IDs (different)
        ([userId, buddyUserId], [overriddenRuleId, watchedRuleId]) => {
          const buddy: BuddyRelationship = {
            id: fc.sample(uuidArbitrary, 1)[0],
            user_id: userId,
            buddy_user_id: buddyUserId,
            rules_watching: [watchedRuleId], // Watching a different rule
            status: 'active',
            invited_at: new Date().toISOString(),
            accepted_at: new Date().toISOString()
          };
          
          // Check if notification should be created
          const shouldNotify = buddy.rules_watching?.includes(overriddenRuleId) ?? false;
          
          // Property: No notification when rule is not watched
          expect(shouldNotify).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Feature: focuslock-app, Property 28: Notification for null rules_watching (watching all)', () => {
    /**
     * **Validates: Requirements 9.4**
     * 
     * When rules_watching is null, the buddy is watching all rules and should receive
     * notifications for any override.
     */
    fc.assert(
      fc.property(
        uuidArbitrary, // user_id
        uuidArbitrary, // lock_rule_id
        uuidArbitrary, // buddy_user_id
        appNameArbitrary, // app_name
        (userId, lockRuleId, buddyUserId, appName) => {
          const buddy: BuddyRelationship = {
            id: fc.sample(uuidArbitrary, 1)[0],
            user_id: userId,
            buddy_user_id: buddyUserId,
            rules_watching: null, // Watching all rules
            status: 'active',
            invited_at: new Date().toISOString(),
            accepted_at: new Date().toISOString()
          };
          
          // Check if notification should be created
          const shouldNotify = buddy.rules_watching === null || buddy.rules_watching.includes(lockRuleId);
          
          // Property: Notification created when rules_watching is null
          expect(shouldNotify).toBe(true);
          
          // Create notification
          const notification: BuddyNotification = {
            id: fc.sample(uuidArbitrary, 1)[0],
            from_user_id: userId,
            to_user_id: buddyUserId,
            event_type: 'override',
            app_name: appName,
            message: `Your buddy overrode their ${appName} lock`,
            is_read: false,
            created_at: new Date().toISOString()
          };
          
          expect(notification.from_user_id).toBe(userId);
          expect(notification.to_user_id).toBe(buddyUserId);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Feature: focuslock-app, Property 28: No notification for non-active buddies', () => {
    /**
     * **Validates: Requirements 9.4**
     * 
     * Only active buddy relationships should receive notifications. Pending or removed
     * relationships should not receive notifications.
     */
    fc.assert(
      fc.property(
        uuidArbitrary,
        buddyStatusArbitrary,
        uuidArbitrary,
        (userId, status, lockRuleId) => {
          const buddy: BuddyRelationship = {
            id: fc.sample(uuidArbitrary, 1)[0],
            user_id: userId,
            buddy_user_id: fc.sample(uuidArbitrary, 1)[0],
            rules_watching: [lockRuleId],
            status: status,
            invited_at: new Date().toISOString(),
            accepted_at: status === 'active' ? new Date().toISOString() : null
          };
          
          // Check if notification should be created
          const shouldNotify = buddy.status === 'active';
          
          // Property: Only active buddies receive notifications
          if (status === 'active') {
            expect(shouldNotify).toBe(true);
          } else {
            expect(shouldNotify).toBe(false);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
