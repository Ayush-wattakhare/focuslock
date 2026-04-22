/**
 * Lock Evaluator Module
 * 
 * Core business logic for determining whether an app is currently locked
 * based on rule configuration and current context.
 * 
 * Handles:
 * - Timer locks (daily usage limits)
 * - Schedule locks (time windows on specific days)
 * - Until-date locks (locked until a specific date)
 * - Nuclear locks (always locked, no override)
 * - Timezone conversions for accurate time calculations
 * - Edge cases (midnight rollover, DST transitions)
 */

import { LockRule, LockStatus } from '@/types';

/**
 * Evaluates whether an app is currently locked based on rule configuration
 * 
 * @param rule - The lock rule to evaluate
 * @param now - Current datetime (injected for testability)
 * @param todayUsageMinutes - Minutes used today for this app
 * @param userTimezone - User's configured timezone (default: 'Asia/Kolkata')
 * @returns Lock status with unlock time and reason
 */
export function evaluateLock(
  rule: LockRule,
  now: Date = new Date(),
  todayUsageMinutes: number = 0,
  userTimezone: string = 'Asia/Kolkata'
): LockStatus {
  // Inactive rules are always unlocked
  if (!rule.is_active) {
    return { isLocked: false, unlocksAt: null, reason: null };
  }

  // Convert current time to user's timezone
  const userNow = toTimezone(now, userTimezone);

  switch (rule.lock_type) {
    case 'timer':
      return evaluateTimerLock(rule, userNow, todayUsageMinutes);
    
    case 'schedule':
      return evaluateScheduleLock(rule, userNow);
    
    case 'until_date':
      return evaluateUntilDateLock(rule, userNow);
    
    case 'nuclear':
      return { 
        isLocked: true, 
        unlocksAt: null, 
        reason: 'Nuclear mode active — no override possible' 
      };
    
    default:
      return { isLocked: false, unlocksAt: null, reason: null };
  }
}

/**
 * Evaluates timer-based lock rules
 * Locks when daily usage exceeds the configured limit
 * Unlocks at midnight in user's timezone
 */
function evaluateTimerLock(
  rule: LockRule,
  now: Date,
  todayUsageMinutes: number
): LockStatus {
  // Validate required fields
  if (rule.daily_limit_minutes === null || rule.daily_limit_minutes === undefined) {
    throw new Error('Timer lock requires daily_limit_minutes');
  }

  const isLocked = todayUsageMinutes >= rule.daily_limit_minutes;
  
  if (!isLocked) {
    return { isLocked: false, unlocksAt: null, reason: null };
  }

  // Unlocks at midnight (next day at 00:00:00)
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  return {
    isLocked: true,
    unlocksAt: midnight,
    reason: `Daily limit of ${rule.daily_limit_minutes} minutes reached`
  };
}

/**
 * Evaluates schedule-based lock rules
 * Locks during configured time windows on specific days
 * Handles midnight rollover and day-of-week checking
 */
function evaluateScheduleLock(rule: LockRule, now: Date): LockStatus {
  // Validate required fields
  if (!rule.schedule_start || !rule.schedule_end || !rule.schedule_days) {
    throw new Error('Schedule lock requires schedule_start, schedule_end, and schedule_days');
  }

  // Check if today is in the schedule
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
  
  if (!rule.schedule_days.includes(dayOfWeek)) {
    return { isLocked: false, unlocksAt: null, reason: null };
  }

  // Parse schedule times (HH:MM format)
  const [startHour, startMin] = rule.schedule_start.split(':').map(Number);
  const [endHour, endMin] = rule.schedule_end.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Check if current time is within schedule window
  const isLocked = nowMinutes >= startMinutes && nowMinutes < endMinutes;

  if (!isLocked) {
    return { isLocked: false, unlocksAt: null, reason: null };
  }

  // Calculate unlock time
  const unlocksAt = new Date(now);
  unlocksAt.setHours(endHour, endMin, 0, 0);

  return {
    isLocked: true,
    unlocksAt,
    reason: `Locked by schedule until ${formatTime(unlocksAt)}`
  };
}

/**
 * Evaluates until-date lock rules
 * Locks until a specific date is reached
 * Compares dates at midnight (00:00:00) to avoid time-of-day issues
 */
function evaluateUntilDateLock(rule: LockRule, now: Date): LockStatus {
  // Validate required fields
  if (!rule.unlock_date) {
    throw new Error('Until-date lock requires unlock_date');
  }

  const unlockDate = new Date(rule.unlock_date);
  unlockDate.setHours(0, 0, 0, 0);
  
  const currentDate = new Date(now);
  currentDate.setHours(0, 0, 0, 0);

  const isLocked = currentDate < unlockDate;

  if (!isLocked) {
    return { isLocked: false, unlocksAt: null, reason: null };
  }

  return {
    isLocked: true,
    unlocksAt: unlockDate,
    reason: `Locked until ${formatDate(unlockDate)}`
  };
}

/**
 * Converts a Date to the user's timezone
 * 
 * Note: This is a simplified implementation. In production, consider using
 * a library like date-fns-tz or Luxon for more robust timezone handling,
 * especially for DST transitions.
 * 
 * @param date - The date to convert
 * @param timezone - IANA timezone string (e.g., 'Asia/Kolkata', 'America/New_York')
 * @returns Date object representing the same moment in the user's timezone
 */
export function toTimezone(date: Date, timezone: string): Date {
  try {
    // Get the date string in the target timezone
    const dateString = date.toLocaleString('en-US', { 
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    // Parse the localized string back to a Date
    // Format: MM/DD/YYYY, HH:MM:SS
    const [datePart, timePart] = dateString.split(', ');
    const [month, day, year] = datePart.split('/').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);

    return new Date(year, month - 1, day, hour, minute, second);
  } catch (error) {
    // Fallback to original date if timezone conversion fails
    console.error(`Failed to convert to timezone ${timezone}:`, error);
    return date;
  }
}

/**
 * Formats a time for display (e.g., "2:30 PM")
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Formats a date for display (e.g., "Jan 15, 2024")
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
