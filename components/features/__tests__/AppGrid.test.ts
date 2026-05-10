/**
 * Unit Tests for AppGrid Component
 * 
 * Tests the core logic functions:
 * - prepareAppsForDisplay: Filters hidden apps and evaluates lock status
 * - formatUnlockTime: Formats unlock time for display
 */

import { prepareAppsForDisplay, formatUnlockTime } from '../AppGrid';
import { LockRule } from '@/types';
import * as lockEvaluator from '@/lib/core/lockEvaluator';

// Mock the lockEvaluator module
jest.mock('@/lib/core/lockEvaluator');

describe('AppGrid - prepareAppsForDisplay', () => {
  const mockEvaluateLock = lockEvaluator.evaluateLock as jest.MockedFunction<typeof lockEvaluator.evaluateLock>;

  const mockRules: LockRule[] = [
    {
      id: '1',
      user_id: 'user1',
      app_name: 'Instagram',
      app_icon_url: 'https://example.com/instagram.png',
      app_scheme: 'instagram://',
      lock_type: 'timer',
      daily_limit_minutes: 30,
      schedule_start: null,
      schedule_end: null,
      schedule_days: null,
      unlock_date: null,
      hide_from_home: false, // Visible
      hide_from_search: false,
      strict_mode: false,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      user_id: 'user1',
      app_name: 'YouTube',
      app_icon_url: null,
      app_scheme: 'youtube://',
      lock_type: 'timer',
      daily_limit_minutes: 60,
      schedule_start: null,
      schedule_end: null,
      schedule_days: null,
      unlock_date: null,
      hide_from_home: false, // Visible
      hide_from_search: false,
      strict_mode: false,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '3',
      user_id: 'user1',
      app_name: 'TikTok',
      app_icon_url: 'https://example.com/tiktok.png',
      app_scheme: 'tiktok://',
      lock_type: 'nuclear',
      daily_limit_minutes: null,
      schedule_start: null,
      schedule_end: null,
      schedule_days: null,
      unlock_date: null,
      hide_from_home: true, // Hidden - should be filtered out
      hide_from_search: true,
      strict_mode: false,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockEvaluateLock.mockImplementation((rule, now, todayUsage) => {
      if (rule.lock_type === 'timer' && rule.daily_limit_minutes) {
        const isLocked = todayUsage >= rule.daily_limit_minutes;
        return {
          isLocked,
          unlocksAt: isLocked ? new Date(now.getTime() + 3600000) : null,
          reason: isLocked ? `Daily limit of ${rule.daily_limit_minutes} minutes reached` : null,
        };
      }
      return {
        isLocked: false,
        unlocksAt: null,
        reason: null,
      };
    });
  });

  it('should filter out hidden apps (Requirement 2.7)', () => {
    const usageData = new Map<string, number>();
    const result = prepareAppsForDisplay(mockRules, usageData, 'Asia/Kolkata');

    // Should only include Instagram and YouTube (not TikTok which is hidden)
    expect(result).toHaveLength(2);
    expect(result[0].rule.app_name).toBe('Instagram');
    expect(result[1].rule.app_name).toBe('YouTube');
    
    // TikTok should be filtered out
    const tiktokApp = result.find(app => app.rule.app_name === 'TikTok');
    expect(tiktokApp).toBeUndefined();
  });

  it('should evaluate lock status for each visible app', () => {
    const usageData = new Map([
      ['Instagram', 35], // Exceeds 30 min limit
      ['YouTube', 20],   // Below 60 min limit
    ]);

    const result = prepareAppsForDisplay(mockRules, usageData, 'Asia/Kolkata');

    // Should call evaluateLock for each visible app
    expect(mockEvaluateLock).toHaveBeenCalledTimes(2);
    
    // Instagram should be locked
    expect(result[0].rule.app_name).toBe('Instagram');
    expect(result[0].lockStatus.isLocked).toBe(true);
    expect(result[0].lockStatus.reason).toContain('Daily limit of 30 minutes reached');
    
    // YouTube should be unlocked
    expect(result[1].rule.app_name).toBe('YouTube');
    expect(result[1].lockStatus.isLocked).toBe(false);
  });

  it('should use provided usage data for lock evaluation', () => {
    const usageData = new Map([
      ['Instagram', 25],
      ['YouTube', 50],
    ]);

    prepareAppsForDisplay(mockRules, usageData, 'Asia/Kolkata');

    // Check that evaluateLock was called with correct usage values
    expect(mockEvaluateLock).toHaveBeenCalledWith(
      expect.objectContaining({ app_name: 'Instagram' }),
      expect.any(Date),
      25,
      'Asia/Kolkata'
    );

    expect(mockEvaluateLock).toHaveBeenCalledWith(
      expect.objectContaining({ app_name: 'YouTube' }),
      expect.any(Date),
      50,
      'Asia/Kolkata'
    );
  });

  it('should default to 0 usage when app not in usage data', () => {
    const usageData = new Map<string, number>(); // Empty usage data

    prepareAppsForDisplay(mockRules, usageData, 'Asia/Kolkata');

    // Should call evaluateLock with 0 usage for all apps
    expect(mockEvaluateLock).toHaveBeenCalledWith(
      expect.objectContaining({ app_name: 'Instagram' }),
      expect.any(Date),
      0,
      'Asia/Kolkata'
    );

    expect(mockEvaluateLock).toHaveBeenCalledWith(
      expect.objectContaining({ app_name: 'YouTube' }),
      expect.any(Date),
      0,
      'Asia/Kolkata'
    );
  });

  it('should use provided timezone for lock evaluation', () => {
    const usageData = new Map<string, number>();
    const timezone = 'America/New_York';

    prepareAppsForDisplay(mockRules, usageData, timezone);

    // Check that evaluateLock was called with correct timezone
    expect(mockEvaluateLock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Date),
      expect.any(Number),
      'America/New_York'
    );
  });

  it('should return empty array when all rules are hidden', () => {
    const hiddenRules = mockRules.map(rule => ({ ...rule, hide_from_home: true }));
    const usageData = new Map<string, number>();

    const result = prepareAppsForDisplay(hiddenRules, usageData, 'Asia/Kolkata');

    expect(result).toHaveLength(0);
    expect(mockEvaluateLock).not.toHaveBeenCalled();
  });

  it('should return empty array when no rules provided', () => {
    const usageData = new Map<string, number>();

    const result = prepareAppsForDisplay([], usageData, 'Asia/Kolkata');

    expect(result).toHaveLength(0);
    expect(mockEvaluateLock).not.toHaveBeenCalled();
  });

  it('should handle rules with hide_from_home=false correctly (Requirement 2.7)', () => {
    const visibleRules = mockRules.map(rule => ({ ...rule, hide_from_home: false }));
    const usageData = new Map<string, number>();

    const result = prepareAppsForDisplay(visibleRules, usageData, 'Asia/Kolkata');

    // All 3 apps should be visible
    expect(result).toHaveLength(3);
    expect(result.map(app => app.rule.app_name)).toEqual(['Instagram', 'YouTube', 'TikTok']);
  });
});

describe('AppGrid - formatUnlockTime', () => {
  let realDateNow: () => number;

  beforeEach(() => {
    // Save the real Date.now
    realDateNow = Date.now;
    
    // Mock Date constructor and Date.now() to return consistent time
    const mockNow = new Date('2024-01-15T12:00:00Z').getTime();
    global.Date.now = jest.fn(() => mockNow);
    
    // Also mock the Date constructor to return the mocked time when called without arguments
    const RealDate = Date;
    global.Date = class extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(mockNow);
        } else {
          super(...args);
        }
      }
      static now() {
        return mockNow;
      }
    } as any;
  });

  afterEach(() => {
    // Restore Date.now
    global.Date.now = realDateNow;
    // Restore Date constructor
    global.Date = Date;
  });

  it('should format time in days and hours when > 24 hours', () => {
    const unlockDate = new Date('2024-01-17T15:30:00Z'); // 2 days 3 hours 30 mins from now
    const result = formatUnlockTime(unlockDate);
    expect(result).toBe('2d 3h');
  });

  it('should format time in hours and minutes when < 24 hours', () => {
    const unlockDate = new Date('2024-01-15T15:45:00Z'); // 3 hours 45 mins from now
    const result = formatUnlockTime(unlockDate);
    expect(result).toBe('3h 45m');
  });

  it('should format time in minutes when < 1 hour', () => {
    const unlockDate = new Date('2024-01-15T12:30:00Z'); // 30 mins from now
    const result = formatUnlockTime(unlockDate);
    expect(result).toBe('30m');
  });

  it('should return "Soon" when < 1 minute', () => {
    const unlockDate = new Date('2024-01-15T12:00:30Z'); // 30 seconds from now
    const result = formatUnlockTime(unlockDate);
    expect(result).toBe('Soon');
  });

  it('should return "Soon" when unlock time is in the past', () => {
    const unlockDate = new Date('2024-01-15T11:00:00Z'); // 1 hour ago
    const result = formatUnlockTime(unlockDate);
    expect(result).toBe('Soon');
  });

  it('should handle exactly 1 day', () => {
    const unlockDate = new Date('2024-01-16T12:00:00Z'); // Exactly 1 day from now
    const result = formatUnlockTime(unlockDate);
    expect(result).toBe('1d 0h');
  });

  it('should handle exactly 1 hour', () => {
    const unlockDate = new Date('2024-01-15T13:00:00Z'); // Exactly 1 hour from now
    const result = formatUnlockTime(unlockDate);
    expect(result).toBe('1h 0m');
  });

  it('should handle multiple days correctly', () => {
    const unlockDate = new Date('2024-01-20T18:30:00Z'); // 5 days 6 hours 30 mins from now
    const result = formatUnlockTime(unlockDate);
    expect(result).toBe('5d 6h');
  });
});
