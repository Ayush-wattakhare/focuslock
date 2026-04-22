/**
 * Unit tests for lockEvaluator module
 * Tests all lock types and edge cases
 */

import { evaluateLock, toTimezone } from '@/lib/core/lockEvaluator';
import { LockRule } from '@/types';

describe('lockEvaluator', () => {
  describe('evaluateLock - inactive rules', () => {
    it('should return unlocked for inactive rules', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'timer',
        daily_limit_minutes: 30,
        schedule_start: null,
        schedule_end: null,
        schedule_days: null,
        unlock_date: null,
        hide_from_home: true,
        hide_from_search: true,
        strict_mode: false,
        is_active: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = evaluateLock(rule, new Date(), 0);
      
      expect(result.isLocked).toBe(false);
      expect(result.unlocksAt).toBeNull();
      expect(result.reason).toBeNull();
    });
  });

  describe('evaluateLock - timer locks', () => {
    it('should unlock when usage is below limit', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'timer',
        daily_limit_minutes: 30,
        schedule_start: null,
        schedule_end: null,
        schedule_days: null,
        unlock_date: null,
        hide_from_home: true,
        hide_from_search: true,
        strict_mode: false,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = evaluateLock(rule, new Date(), 20);
      
      expect(result.isLocked).toBe(false);
      expect(result.unlocksAt).toBeNull();
      expect(result.reason).toBeNull();
    });

    it('should lock when usage reaches limit', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'timer',
        daily_limit_minutes: 30,
        schedule_start: null,
        schedule_end: null,
        schedule_days: null,
        unlock_date: null,
        hide_from_home: true,
        hide_from_search: true,
        strict_mode: false,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = evaluateLock(rule, new Date(), 30);
      
      expect(result.isLocked).toBe(true);
      expect(result.unlocksAt).not.toBeNull();
      expect(result.reason).toContain('Daily limit');
      expect(result.reason).toContain('30 minutes');
    });

    it('should lock when usage exceeds limit', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'timer',
        daily_limit_minutes: 30,
        schedule_start: null,
        schedule_end: null,
        schedule_days: null,
        unlock_date: null,
        hide_from_home: true,
        hide_from_search: true,
        strict_mode: false,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = evaluateLock(rule, new Date(), 45);
      
      expect(result.isLocked).toBe(true);
      expect(result.unlocksAt).not.toBeNull();
    });

    it('should unlock at midnight', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'timer',
        daily_limit_minutes: 30,
        schedule_start: null,
        schedule_end: null,
        schedule_days: null,
        unlock_date: null,
        hide_from_home: true,
        hide_from_search: true,
        strict_mode: false,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Use a date that's already in the user's timezone context
      const now = new Date(2024, 0, 15, 22, 0, 0); // Jan 15, 2024, 22:00 local time
      const result = evaluateLock(rule, now, 30, 'UTC');
      
      expect(result.isLocked).toBe(true);
      expect(result.unlocksAt).not.toBeNull();
      expect(result.unlocksAt!.getHours()).toBe(0);
      expect(result.unlocksAt!.getMinutes()).toBe(0);
      expect(result.unlocksAt!.getDate()).toBe(16);
    });

    it('should throw error if daily_limit_minutes is missing', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
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
        updated_at: '2024-01-01T00:00:00Z'
      };

      expect(() => evaluateLock(rule, new Date(), 0)).toThrow('Timer lock requires daily_limit_minutes');
    });
  });

  describe('evaluateLock - schedule locks', () => {
    it('should unlock when current day is not in schedule', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'schedule',
        daily_limit_minutes: null,
        schedule_start: '09:00',
        schedule_end: '17:00',
        schedule_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        unlock_date: null,
        hide_from_home: true,
        hide_from_search: true,
        strict_mode: false,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Saturday
      const now = new Date('2024-01-13T12:00:00Z');
      const result = evaluateLock(rule, now, 0);
      
      expect(result.isLocked).toBe(false);
      expect(result.unlocksAt).toBeNull();
    });

    it('should lock when current time is within schedule window', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'schedule',
        daily_limit_minutes: null,
        schedule_start: '09:00',
        schedule_end: '17:00',
        schedule_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        unlock_date: null,
        hide_from_home: true,
        hide_from_search: true,
        strict_mode: false,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Create a date that's definitely Monday at 12:00 in the local timezone
      // We'll pass the date directly without timezone conversion
      const now = new Date(2024, 0, 15, 12, 0, 0); // Jan 15, 2024 is a Monday
      
      // Call evaluateLock with the date already in the correct timezone
      // by passing the same date as both now and using a mock timezone
      const userNow = now; // Already in correct timezone
      
      // Manually call the schedule evaluation to bypass timezone conversion
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
      expect(dayOfWeek).toBe('mon'); // Verify it's Monday
      expect(rule.schedule_days).toContain(dayOfWeek);
      
      const result = evaluateLock(rule, now, 0, 'Asia/Kolkata');
      
      expect(result.isLocked).toBe(true);
      expect(result.unlocksAt).not.toBeNull();
      expect(result.reason).toContain('Locked by schedule');
    });

    it('should unlock when current time is before schedule start', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'schedule',
        daily_limit_minutes: null,
        schedule_start: '09:00',
        schedule_end: '17:00',
        schedule_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        unlock_date: null,
        hide_from_home: true,
        hide_from_search: true,
        strict_mode: false,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Monday at 08:00 local time
      const now = new Date(2024, 0, 15, 8, 0, 0);
      const result = evaluateLock(rule, now, 0, 'UTC');
      
      expect(result.isLocked).toBe(false);
    });

    it('should unlock when current time is at or after schedule end', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'schedule',
        daily_limit_minutes: null,
        schedule_start: '09:00',
        schedule_end: '17:00',
        schedule_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        unlock_date: null,
        hide_from_home: true,
        hide_from_search: true,
        strict_mode: false,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Monday at 17:00
      const now = new Date('2024-01-15T17:00:00Z');
      const result = evaluateLock(rule, now, 0);
      
      expect(result.isLocked).toBe(false);
    });

    it('should set unlock time to schedule end', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'schedule',
        daily_limit_minutes: null,
        schedule_start: '09:00',
        schedule_end: '17:30',
        schedule_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        unlock_date: null,
        hide_from_home: true,
        hide_from_search: true,
        strict_mode: false,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Monday at 12:00 local time
      const now = new Date(2024, 0, 15, 12, 0, 0);
      const result = evaluateLock(rule, now, 0, 'Asia/Kolkata');
      
      expect(result.isLocked).toBe(true);
      expect(result.unlocksAt).not.toBeNull();
      expect(result.unlocksAt!.getHours()).toBe(17);
      expect(result.unlocksAt!.getMinutes()).toBe(30);
    });

    it('should throw error if schedule fields are missing', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'schedule',
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
        updated_at: '2024-01-01T00:00:00Z'
      };

      expect(() => evaluateLock(rule, new Date(), 0)).toThrow('Schedule lock requires');
    });
  });

  describe('evaluateLock - until_date locks', () => {
    it('should lock when current date is before unlock date', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'until_date',
        daily_limit_minutes: null,
        schedule_start: null,
        schedule_end: null,
        schedule_days: null,
        unlock_date: '2024-02-01',
        hide_from_home: true,
        hide_from_search: true,
        strict_mode: false,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const now = new Date('2024-01-15T12:00:00Z');
      const result = evaluateLock(rule, now, 0);
      
      expect(result.isLocked).toBe(true);
      expect(result.unlocksAt).not.toBeNull();
      expect(result.reason).toContain('Locked until');
    });

    it('should unlock when current date is on or after unlock date', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'until_date',
        daily_limit_minutes: null,
        schedule_start: null,
        schedule_end: null,
        schedule_days: null,
        unlock_date: '2024-01-15',
        hide_from_home: true,
        hide_from_search: true,
        strict_mode: false,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const now = new Date('2024-01-15T12:00:00Z');
      const result = evaluateLock(rule, now, 0);
      
      expect(result.isLocked).toBe(false);
    });

    it('should unlock when current date is after unlock date', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'until_date',
        daily_limit_minutes: null,
        schedule_start: null,
        schedule_end: null,
        schedule_days: null,
        unlock_date: '2024-01-10',
        hide_from_home: true,
        hide_from_search: true,
        strict_mode: false,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const now = new Date('2024-01-15T12:00:00Z');
      const result = evaluateLock(rule, now, 0);
      
      expect(result.isLocked).toBe(false);
    });

    it('should throw error if unlock_date is missing', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'until_date',
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
        updated_at: '2024-01-01T00:00:00Z'
      };

      expect(() => evaluateLock(rule, new Date(), 0)).toThrow('Until-date lock requires unlock_date');
    });
  });

  describe('evaluateLock - nuclear locks', () => {
    it('should always lock with no unlock time', () => {
      const rule: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Instagram',
        app_icon_url: null,
        app_scheme: null,
        lock_type: 'nuclear',
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
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = evaluateLock(rule, new Date(), 0);
      
      expect(result.isLocked).toBe(true);
      expect(result.unlocksAt).toBeNull();
      expect(result.reason).toContain('Nuclear mode');
    });
  });

  describe('toTimezone', () => {
    it('should convert date to target timezone', () => {
      const utcDate = new Date('2024-01-15T12:00:00Z');
      
      // Asia/Kolkata is UTC+5:30
      const istDate = toTimezone(utcDate, 'Asia/Kolkata');
      
      // Should be 17:30 in IST
      expect(istDate.getHours()).toBe(17);
      expect(istDate.getMinutes()).toBe(30);
    });

    it('should handle different timezones', () => {
      const utcDate = new Date('2024-01-15T12:00:00Z');
      
      // America/New_York is UTC-5 (EST)
      const estDate = toTimezone(utcDate, 'America/New_York');
      
      // Should be 07:00 in EST
      expect(estDate.getHours()).toBe(7);
    });

    it('should return original date on invalid timezone', () => {
      const originalDate = new Date('2024-01-15T12:00:00Z');
      const result = toTimezone(originalDate, 'Invalid/Timezone');
      
      // Should fallback to original date
      expect(result).toEqual(originalDate);
    });
  });
});
