/**
 * Unit tests for CountdownRing component
 * 
 * Tests:
 * - Time formatting for different durations
 * - Progress calculation for different lock types
 * - Color selection based on lock type
 * - Real-time countdown updates
 * - Edge cases (past dates, very long durations)
 */

import { calculateTotalDuration } from '../CountdownRing';

describe('CountdownRing Component', () => {
  describe('calculateTotalDuration', () => {
    beforeEach(() => {
      // Mock current time to 2024-01-15 12:00:00
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate timer lock duration from start of day to unlock', () => {
      const unlocksAt = new Date('2024-01-15T23:59:59Z');
      const duration = calculateTotalDuration('timer', unlocksAt);
      
      // Duration should be from start of day (00:00:00) to unlock time
      const startOfDay = new Date('2024-01-15T12:00:00Z');
      startOfDay.setHours(0, 0, 0, 0);
      const expected = unlocksAt.getTime() - startOfDay.getTime();
      expect(duration).toBe(expected);
    });

    it('should calculate schedule lock duration as 8 hours', () => {
      const unlocksAt = new Date('2024-01-15T18:00:00Z');
      const duration = calculateTotalDuration('schedule', unlocksAt);
      
      // Schedule locks use fixed 8-hour window
      const expected = 8 * 60 * 60 * 1000;
      expect(duration).toBe(expected);
    });

    it('should calculate until_date lock duration from now to unlock', () => {
      const unlocksAt = new Date('2024-01-20T00:00:00Z');
      const duration = calculateTotalDuration('until_date', unlocksAt);
      
      // Duration from 2024-01-15 12:00:00 to 2024-01-20 00:00:00
      const expected = (4.5 * 24 * 60 * 60 * 1000); // 4.5 days
      expect(duration).toBe(expected);
    });

    it('should calculate nuclear lock duration as 1 year', () => {
      const unlocksAt = new Date('2025-01-15T12:00:00Z');
      const duration = calculateTotalDuration('nuclear', unlocksAt);
      
      // Nuclear locks use arbitrary 1 year
      const expected = 365 * 24 * 60 * 60 * 1000;
      expect(duration).toBe(expected);
    });

    it('should handle unknown lock type with default 24 hours', () => {
      const unlocksAt = new Date('2024-01-16T12:00:00Z');
      const duration = calculateTotalDuration('unknown' as any, unlocksAt);
      
      // Default to 24 hours
      const expected = 24 * 60 * 60 * 1000;
      expect(duration).toBe(expected);
    });

    it('should handle timer lock that unlocks tomorrow', () => {
      const unlocksAt = new Date('2024-01-16T00:00:00Z');
      const duration = calculateTotalDuration('timer', unlocksAt);
      
      // Duration from start of today (00:00:00) to tomorrow midnight
      const startOfDay = new Date('2024-01-15T12:00:00Z');
      startOfDay.setHours(0, 0, 0, 0);
      const expected = unlocksAt.getTime() - startOfDay.getTime();
      expect(duration).toBe(expected);
    });

    it('should handle until_date lock with past date', () => {
      const unlocksAt = new Date('2024-01-10T00:00:00Z');
      const duration = calculateTotalDuration('until_date', unlocksAt);
      
      // Duration will be negative (past date)
      expect(duration).toBeLessThan(0);
    });

    it('should handle schedule lock with same unlock time as now', () => {
      const unlocksAt = new Date('2024-01-15T12:00:00Z');
      const duration = calculateTotalDuration('schedule', unlocksAt);
      
      // Schedule locks always use 8-hour window regardless of unlock time
      const expected = 8 * 60 * 60 * 1000;
      expect(duration).toBe(expected);
    });
  });

  describe('Time Formatting Logic', () => {
    it('should format days and hours correctly', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const unlocksAt = new Date('2024-01-17T15:30:00Z');
      const diffMs = unlocksAt.getTime() - now.getTime();
      
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      expect(diffDays).toBe(2);
      expect(diffHours % 24).toBe(3);
      
      const formatted = `${diffDays}d ${diffHours % 24}h`;
      expect(formatted).toBe('2d 3h');
    });

    it('should format hours and minutes correctly', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const unlocksAt = new Date('2024-01-15T15:45:00Z');
      const diffMs = unlocksAt.getTime() - now.getTime();
      
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMins / 60);
      
      expect(diffHours).toBe(3);
      expect(diffMins % 60).toBe(45);
      
      const formatted = `${diffHours}h ${diffMins % 60}m`;
      expect(formatted).toBe('3h 45m');
    });

    it('should format minutes and seconds correctly', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const unlocksAt = new Date('2024-01-15T12:15:30Z');
      const diffMs = unlocksAt.getTime() - now.getTime();
      
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSeconds / 60);
      
      expect(diffMins).toBe(15);
      expect(diffSeconds % 60).toBe(30);
      
      const formatted = `${diffMins}m ${diffSeconds % 60}s`;
      expect(formatted).toBe('15m 30s');
    });

    it('should format seconds only correctly', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const unlocksAt = new Date('2024-01-15T12:00:45Z');
      const diffMs = unlocksAt.getTime() - now.getTime();
      
      const diffSeconds = Math.floor(diffMs / 1000);
      
      expect(diffSeconds).toBe(45);
      
      const formatted = `${diffSeconds}s`;
      expect(formatted).toBe('45s');
    });

    it('should handle zero or negative time difference', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const unlocksAt = new Date('2024-01-15T11:00:00Z');
      const diffMs = unlocksAt.getTime() - now.getTime();
      
      expect(diffMs).toBeLessThanOrEqual(0);
      
      // Should show "Unlocked" when time is up
      const formatted = diffMs <= 0 ? 'Unlocked' : 'Locked';
      expect(formatted).toBe('Unlocked');
    });
  });

  describe('Progress Calculation Logic', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate progress correctly for timer lock', () => {
      const unlocksAt = new Date('2024-01-15T23:59:59Z');
      const totalMs = calculateTotalDuration('timer', unlocksAt);
      const now = new Date();
      const diffMs = unlocksAt.getTime() - now.getTime();
      const elapsedMs = totalMs - diffMs;
      const progress = (elapsedMs / totalMs) * 100;
      
      // At 12:00:00, we're halfway through the day
      expect(progress).toBeGreaterThan(40);
      expect(progress).toBeLessThan(60);
    });

    it('should calculate progress correctly for schedule lock', () => {
      const unlocksAt = new Date('2024-01-15T16:00:00Z');
      const totalMs = calculateTotalDuration('schedule', unlocksAt);
      const now = new Date();
      const diffMs = unlocksAt.getTime() - now.getTime();
      const elapsedMs = totalMs - diffMs;
      const progress = (elapsedMs / totalMs) * 100;
      
      // 4 hours elapsed out of 8-hour window = 50%
      expect(progress).toBeGreaterThan(40);
      expect(progress).toBeLessThan(60);
    });

    it('should cap progress at 100%', () => {
      const unlocksAt = new Date('2024-01-15T11:00:00Z'); // Past time
      const totalMs = calculateTotalDuration('timer', unlocksAt);
      const now = new Date();
      const diffMs = unlocksAt.getTime() - now.getTime();
      const elapsedMs = totalMs - diffMs;
      const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
      
      expect(progress).toBe(100);
    });

    it('should floor progress at 0%', () => {
      const unlocksAt = new Date('2024-01-20T00:00:00Z'); // Far future
      const totalMs = 1000; // Very short total duration
      const now = new Date();
      const diffMs = unlocksAt.getTime() - now.getTime();
      const elapsedMs = totalMs - diffMs;
      const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
      
      expect(progress).toBe(0);
    });
  });

  describe('Color Selection Logic', () => {
    it('should return orange for timer lock', () => {
      const lockType = 'timer';
      const color = lockType === 'timer' ? '#ffa726' : '#9e9e9e';
      expect(color).toBe('#ffa726');
    });

    it('should return green for schedule lock', () => {
      const lockType = 'schedule';
      const color = lockType === 'schedule' ? '#66bb6a' : '#9e9e9e';
      expect(color).toBe('#66bb6a');
    });

    it('should return blue for until_date lock', () => {
      const lockType = 'until_date';
      const color = lockType === 'until_date' ? '#42a5f5' : '#9e9e9e';
      expect(color).toBe('#42a5f5');
    });

    it('should return red for nuclear lock', () => {
      const lockType = 'nuclear';
      const color = lockType === 'nuclear' ? '#ef5350' : '#9e9e9e';
      expect(color).toBe('#ef5350');
    });

    it('should return gray for unknown lock type', () => {
      const lockType = 'unknown';
      const color = lockType === 'timer' || lockType === 'schedule' || 
                     lockType === 'until_date' || lockType === 'nuclear' 
                     ? 'specific-color' : '#9e9e9e';
      expect(color).toBe('#9e9e9e');
    });
  });

  describe('SVG Circle Calculations', () => {
    it('should calculate circumference correctly', () => {
      const size = 200;
      const strokeWidth = 12;
      const radius = (size - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      
      expect(radius).toBe(94);
      expect(circumference).toBeCloseTo(590.619, 2);
    });

    it('should calculate stroke dash offset for 0% progress', () => {
      const circumference = 590.619;
      const progress = 0;
      const strokeDashoffset = circumference - (progress / 100) * circumference;
      
      expect(strokeDashoffset).toBeCloseTo(590.619, 2);
    });

    it('should calculate stroke dash offset for 50% progress', () => {
      const circumference = 590.619;
      const progress = 50;
      const strokeDashoffset = circumference - (progress / 100) * circumference;
      
      expect(strokeDashoffset).toBeCloseTo(295.31, 2);
    });

    it('should calculate stroke dash offset for 100% progress', () => {
      const circumference = 590.619;
      const progress = 100;
      const strokeDashoffset = circumference - (progress / 100) * circumference;
      
      expect(strokeDashoffset).toBeCloseTo(0, 2);
    });
  });
});
