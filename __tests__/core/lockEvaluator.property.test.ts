/**
 * Property-based tests for lockEvaluator module
 * Uses fast-check to validate correctness properties across many randomly generated inputs
 * 
 * Tests Properties 7-11 from the FocusLock design document
 */

import fc from 'fast-check';
import { evaluateLock, toTimezone } from '@/lib/core/lockEvaluator';
import { LockRule } from '@/types';

// Helper to create a base lock rule with required fields
const createBaseLockRule = (overrides: Partial<LockRule> = {}): LockRule => ({
  id: '1',
  user_id: 'user1',
  app_name: 'TestApp',
  app_icon_url: null,
  app_scheme: null,
  lock_type: 'timer',
  daily_limit_minutes: null,
  schedule_start: null,
  schedule_end: null,
  schedule_days: null,
  unlock_date: null,
  hide_from_home: true,
  hide_from_search: true,
  strict_mode: false,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});

// Custom arbitraries for generating test data
const timeStringArbitrary = fc.tuple(
  fc.integer({ min: 0, max: 23 }),
  fc.integer({ min: 0, max: 59 })
).map(([hour, minute]) => 
  `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
);

const dayOfWeekArbitrary = fc.constantFrom('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');

const timezoneArbitrary = fc.constantFrom(
  'UTC',
  'Asia/Kolkata',
  'America/New_York',
  'Europe/London',
  'Australia/Sydney',
  'Asia/Tokyo'
);

describe('Property 7: Timer Lock Evaluation', () => {
  it('Feature: focuslock-app, Property 7: Timer lock status based on usage vs limit', () => {
    /**
     * **Validates: Requirements 3.2**
     * 
     * For any timer lock rule with daily_limit_minutes and current usage,
     * the lock status SHALL be locked when usage >= limit, unlocked otherwise,
     * and when locked the unlock time SHALL be midnight in the user's timezone.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 480 }), // daily_limit_minutes (1-8 hours)
        fc.integer({ min: 0, max: 600 }), // todayUsageMinutes
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
        timezoneArbitrary,
        (dailyLimit, usage, now, timezone) => {
          // Skip invalid dates
          fc.pre(!isNaN(now.getTime()));
          
          const rule = createBaseLockRule({
            lock_type: 'timer',
            daily_limit_minutes: dailyLimit
          });

          const result = evaluateLock(rule, now, usage, timezone);

          if (usage >= dailyLimit) {
            // Should be locked
            expect(result.isLocked).toBe(true);
            expect(result.unlocksAt).not.toBeNull();
            expect(result.reason).toContain('Daily limit');
            expect(result.reason).toContain(`${dailyLimit} minutes`);
            
            // Unlock time should be midnight (next day at 00:00:00)
            const userNow = toTimezone(now, timezone);
            const expectedMidnight = new Date(userNow);
            expectedMidnight.setHours(24, 0, 0, 0);
            
            expect(result.unlocksAt!.getHours()).toBe(0);
            expect(result.unlocksAt!.getMinutes()).toBe(0);
            expect(result.unlocksAt!.getSeconds()).toBe(0);
          } else {
            // Should be unlocked
            expect(result.isLocked).toBe(false);
            expect(result.unlocksAt).toBeNull();
            expect(result.reason).toBeNull();
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 8: Schedule Lock Evaluation', () => {
  it('Feature: focuslock-app, Property 8: Schedule lock status based on time window and day', () => {
    /**
     * **Validates: Requirements 3.3, 3.4**
     * 
     * For any schedule lock rule with schedule_start, schedule_end, and schedule_days,
     * the lock status SHALL be locked when current time falls within the schedule window
     * on a scheduled day, and the unlock time SHALL be the schedule_end time.
     */
    fc.assert(
      fc.property(
        timeStringArbitrary, // schedule_start
        timeStringArbitrary, // schedule_end
        fc.array(dayOfWeekArbitrary, { minLength: 1, maxLength: 7 }).map(days => [...new Set(days)]), // unique days
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        timezoneArbitrary,
        (scheduleStart, scheduleEnd, scheduleDays, now, timezone) => {
          // Ensure schedule_end is after schedule_start
          const [startHour, startMin] = scheduleStart.split(':').map(Number);
          const [endHour, endMin] = scheduleEnd.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          // Skip if end is not after start
          fc.pre(endMinutes > startMinutes);

          const rule = createBaseLockRule({
            lock_type: 'schedule',
            schedule_start: scheduleStart,
            schedule_end: scheduleEnd,
            schedule_days: scheduleDays
          });

          const result = evaluateLock(rule, now, 0, timezone);
          
          const userNow = toTimezone(now, timezone);
          const dayOfWeek = userNow.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
          const nowMinutes = userNow.getHours() * 60 + userNow.getMinutes();
          
          const isDayScheduled = scheduleDays.includes(dayOfWeek);
          const isInTimeWindow = nowMinutes >= startMinutes && nowMinutes < endMinutes;

          if (isDayScheduled && isInTimeWindow) {
            // Should be locked
            expect(result.isLocked).toBe(true);
            expect(result.unlocksAt).not.toBeNull();
            expect(result.reason).toContain('Locked by schedule');
            
            // Unlock time should be schedule_end
            expect(result.unlocksAt!.getHours()).toBe(endHour);
            expect(result.unlocksAt!.getMinutes()).toBe(endMin);
          } else {
            // Should be unlocked
            expect(result.isLocked).toBe(false);
            expect(result.unlocksAt).toBeNull();
            expect(result.reason).toBeNull();
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 9: Until-Date Lock Evaluation', () => {
  it('Feature: focuslock-app, Property 9: Until-date lock status based on date comparison', () => {
    /**
     * **Validates: Requirements 3.5**
     * 
     * For any until_date lock rule with unlock_date, the lock status SHALL be locked
     * when current date < unlock_date, and the unlock time SHALL be the unlock_date at midnight.
     */
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }), // unlock_date
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }), // current date
        timezoneArbitrary,
        (unlockDate, now, timezone) => {
          // Skip invalid dates
          fc.pre(!isNaN(unlockDate.getTime()) && !isNaN(now.getTime()));
          
          const rule = createBaseLockRule({
            lock_type: 'until_date',
            unlock_date: unlockDate.toISOString().split('T')[0] // YYYY-MM-DD format
          });

          const result = evaluateLock(rule, now, 0, timezone);
          
          // The implementation converts now to user timezone first, then compares dates at midnight
          const userNow = toTimezone(now, timezone);
          
          // The unlock_date is parsed as a date string (YYYY-MM-DD) which creates a date at midnight LOCAL time
          // We need to compare using the same logic as the implementation
          const unlockDateStr = unlockDate.toISOString().split('T')[0];
          const unlockDateParsed = new Date(unlockDateStr);
          unlockDateParsed.setHours(0, 0, 0, 0);
          
          const currentDateMidnight = new Date(userNow);
          currentDateMidnight.setHours(0, 0, 0, 0);

          // Use getTime() for reliable comparison
          const isLocked = currentDateMidnight.getTime() < unlockDateParsed.getTime();

          if (isLocked) {
            // Should be locked
            expect(result.isLocked).toBe(true);
            expect(result.unlocksAt).not.toBeNull();
            expect(result.reason).toContain('Locked until');
            
            // Unlock time should be unlock_date at midnight
            expect(result.unlocksAt!.getHours()).toBe(0);
            expect(result.unlocksAt!.getMinutes()).toBe(0);
            expect(result.unlocksAt!.getSeconds()).toBe(0);
          } else {
            // Should be unlocked
            expect(result.isLocked).toBe(false);
            expect(result.unlocksAt).toBeNull();
            expect(result.reason).toBeNull();
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 10: Lock Evaluation Timezone Consistency', () => {
  it('Feature: focuslock-app, Property 10: Lock evaluation uses user timezone consistently', () => {
    /**
     * **Validates: Requirements 3.7**
     * 
     * For any lock rule and user timezone, evaluating the lock status SHALL use
     * the user's timezone for all time calculations, ensuring consistent behavior
     * across timezones.
     */
    fc.assert(
      fc.property(
        fc.constantFrom('timer', 'schedule', 'until_date'),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        timezoneArbitrary,
        (lockType, now, timezone) => {
          let rule: LockRule;
          
          if (lockType === 'timer') {
            rule = createBaseLockRule({
              lock_type: 'timer',
              daily_limit_minutes: 30
            });
          } else if (lockType === 'schedule') {
            rule = createBaseLockRule({
              lock_type: 'schedule',
              schedule_start: '09:00',
              schedule_end: '17:00',
              schedule_days: ['mon', 'tue', 'wed', 'thu', 'fri']
            });
          } else {
            rule = createBaseLockRule({
              lock_type: 'until_date',
              unlock_date: '2024-06-01'
            });
          }

          // Evaluate with the specified timezone
          const result = evaluateLock(rule, now, 0, timezone);
          
          // Convert now to user timezone
          const userNow = toTimezone(now, timezone);
          
          // Verify that the evaluation is consistent with the user's timezone
          // by checking that unlock times (if present) are in the same day context
          if (result.unlocksAt) {
            // For timer locks, unlock should be midnight in user timezone
            if (lockType === 'timer') {
              expect(result.unlocksAt.getHours()).toBe(0);
              expect(result.unlocksAt.getMinutes()).toBe(0);
            }
            
            // For schedule locks, unlock should be schedule_end time
            if (lockType === 'schedule' && result.isLocked) {
              expect(result.unlocksAt.getHours()).toBe(17);
              expect(result.unlocksAt.getMinutes()).toBe(0);
            }
            
            // For until_date locks, unlock should be at midnight
            if (lockType === 'until_date') {
              expect(result.unlocksAt.getHours()).toBe(0);
              expect(result.unlocksAt.getMinutes()).toBe(0);
            }
          }
          
          // The result should be deterministic for the same inputs
          const result2 = evaluateLock(rule, now, 0, timezone);
          expect(result.isLocked).toBe(result2.isLocked);
          expect(result.reason).toBe(result2.reason);
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 11: Lock Status Reason Presence', () => {
  it('Feature: focuslock-app, Property 11: Locked status always includes reason string', () => {
    /**
     * **Validates: Requirements 3.8**
     * 
     * For any lock rule that evaluates to locked status, the system SHALL provide
     * a non-empty reason string explaining why the app is locked.
     */
    fc.assert(
      fc.property(
        fc.constantFrom('timer', 'schedule', 'until_date', 'nuclear'),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        fc.integer({ min: 0, max: 600 }),
        timezoneArbitrary,
        (lockType, now, usage, timezone) => {
          let rule: LockRule;
          
          if (lockType === 'timer') {
            rule = createBaseLockRule({
              lock_type: 'timer',
              daily_limit_minutes: 30
            });
          } else if (lockType === 'schedule') {
            rule = createBaseLockRule({
              lock_type: 'schedule',
              schedule_start: '09:00',
              schedule_end: '17:00',
              schedule_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
            });
          } else if (lockType === 'until_date') {
            rule = createBaseLockRule({
              lock_type: 'until_date',
              unlock_date: '2025-12-31'
            });
          } else {
            rule = createBaseLockRule({
              lock_type: 'nuclear'
            });
          }

          const result = evaluateLock(rule, now, usage, timezone);
          
          // Property: If locked, reason must be non-empty string
          if (result.isLocked) {
            expect(result.reason).not.toBeNull();
            expect(result.reason).not.toBe('');
            expect(typeof result.reason).toBe('string');
            expect(result.reason!.length).toBeGreaterThan(0);
          }
          
          // Unlocked status should have null reason
          if (!result.isLocked) {
            expect(result.reason).toBeNull();
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
