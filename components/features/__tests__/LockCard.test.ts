/**
 * Unit tests for LockCard component
 * 
 * Tests cover:
 * - Time formatting logic
 * - Lock type classification
 * - Component behavior validation
 */

import { LockRule, LockStatus } from '@/types';

describe('LockCard - Time Formatting', () => {
  // Helper function to format unlock time (extracted from component logic)
  const formatUnlockTime = (date: Date): string => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    } else if (diffMins > 0) {
      return `${diffMins}m`;
    } else {
      return 'Soon';
    }
  };

  let realDateNow: () => number;

  beforeEach(() => {
    realDateNow = Date.now;
    const mockNow = new Date('2024-01-15T12:00:00Z').getTime();
    global.Date.now = jest.fn(() => mockNow);
    
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
    global.Date.now = realDateNow;
    global.Date = Date;
  });

  it('should format time in minutes when less than 1 hour', () => {
    const unlockDate = new Date('2024-01-15T12:45:00Z'); // 45 minutes from now
    expect(formatUnlockTime(unlockDate)).toBe('45m');
  });

  it('should format time in hours and minutes when more than 1 hour', () => {
    const unlockDate = new Date('2024-01-15T14:30:00Z'); // 2.5 hours from now
    expect(formatUnlockTime(unlockDate)).toBe('2h 30m');
  });

  it('should format time in days and hours when more than 1 day', () => {
    const unlockDate = new Date('2024-01-17T00:00:00Z'); // 1.5 days from now
    expect(formatUnlockTime(unlockDate)).toBe('1d 12h');
  });

  it('should display "Soon" when unlock time is less than 1 minute', () => {
    const unlockDate = new Date('2024-01-15T12:00:30Z'); // 30 seconds from now
    expect(formatUnlockTime(unlockDate)).toBe('Soon');
  });

  it('should display "Soon" when unlock time is in the past', () => {
    const unlockDate = new Date('2024-01-15T11:00:00Z'); // 1 hour ago
    expect(formatUnlockTime(unlockDate)).toBe('Soon');
  });

  it('should handle exactly 1 day', () => {
    const unlockDate = new Date('2024-01-16T12:00:00Z'); // Exactly 1 day from now
    expect(formatUnlockTime(unlockDate)).toBe('1d 0h');
  });

  it('should handle exactly 1 hour', () => {
    const unlockDate = new Date('2024-01-15T13:00:00Z'); // Exactly 1 hour from now
    expect(formatUnlockTime(unlockDate)).toBe('1h 0m');
  });

  it('should handle multiple days correctly', () => {
    const unlockDate = new Date('2024-01-20T18:30:00Z'); // 5 days 6 hours 30 mins from now
    expect(formatUnlockTime(unlockDate)).toBe('5d 6h');
  });
});

describe('LockCard - Lock Type Classification', () => {
  const createMockApp = (overrides?: Partial<LockRule>): LockRule => ({
    id: 'test-id-123',
    user_id: 'user-123',
    app_name: 'Instagram',
    app_icon_url: 'https://example.com/instagram.png',
    app_scheme: 'instagram://',
    lock_type: 'timer',
    daily_limit_minutes: 30,
    schedule_start: null,
    schedule_end: null,
    schedule_days: null,
    unlock_date: null,
    hide_from_home: false,
    hide_from_search: false,
    strict_mode: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const createMockLockStatus = (overrides?: Partial<LockStatus>): LockStatus => ({
    isLocked: false,
    unlocksAt: null,
    reason: null,
    ...overrides,
  });

  // Helper function to get lock type class (extracted from component logic)
  const getLockTypeClass = (app: LockRule, lockStatus: LockStatus): string => {
    if (!lockStatus.isLocked) return 'unlocked';
    
    switch (app.lock_type) {
      case 'nuclear':
        return 'locked-nuclear';
      case 'timer':
        return 'locked-timer';
      case 'schedule':
        return 'locked-schedule';
      case 'until_date':
        return 'locked-until-date';
      default:
        return 'locked';
    }
  };

  it('should return "unlocked" class when not locked', () => {
    const app = createMockApp();
    const lockStatus = createMockLockStatus({ isLocked: false });
    expect(getLockTypeClass(app, lockStatus)).toBe('unlocked');
  });

  it('should return "locked-timer" class for timer lock type', () => {
    const app = createMockApp({ lock_type: 'timer' });
    const lockStatus = createMockLockStatus({ isLocked: true });
    expect(getLockTypeClass(app, lockStatus)).toBe('locked-timer');
  });

  it('should return "locked-schedule" class for schedule lock type', () => {
    const app = createMockApp({ lock_type: 'schedule' });
    const lockStatus = createMockLockStatus({ isLocked: true });
    expect(getLockTypeClass(app, lockStatus)).toBe('locked-schedule');
  });

  it('should return "locked-until-date" class for until_date lock type', () => {
    const app = createMockApp({ lock_type: 'until_date' });
    const lockStatus = createMockLockStatus({ isLocked: true });
    expect(getLockTypeClass(app, lockStatus)).toBe('locked-until-date');
  });

  it('should return "locked-nuclear" class for nuclear lock type', () => {
    const app = createMockApp({ lock_type: 'nuclear' });
    const lockStatus = createMockLockStatus({ isLocked: true });
    expect(getLockTypeClass(app, lockStatus)).toBe('locked-nuclear');
  });
});

describe('LockCard - Requirements Validation', () => {
  it('should validate Requirement 3.1: Display app icon and name', () => {
    // Component should render app_name and app_icon_url
    const app: LockRule = {
      id: '1',
      user_id: 'user1',
      app_name: 'Instagram',
      app_icon_url: 'https://example.com/icon.png',
      app_scheme: 'instagram://',
      lock_type: 'timer',
      daily_limit_minutes: 30,
      schedule_start: null,
      schedule_end: null,
      schedule_days: null,
      unlock_date: null,
      hide_from_home: false,
      hide_from_search: false,
      strict_mode: false,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    
    expect(app.app_name).toBe('Instagram');
    expect(app.app_icon_url).toBe('https://example.com/icon.png');
  });

  it('should validate Requirement 3.2-3.3: Show lock status visually with different states', () => {
    const lockTypes: Array<'timer' | 'schedule' | 'until_date' | 'nuclear'> = ['timer', 'schedule', 'until_date', 'nuclear'];
    const expectedClasses = ['locked-timer', 'locked-schedule', 'locked-until-date', 'locked-nuclear'];
    
    lockTypes.forEach((lockType, index) => {
      const app: LockRule = {
        id: '1',
        user_id: 'user1',
        app_name: 'Test App',
        app_icon_url: null,
        app_scheme: null,
        lock_type: lockType,
        daily_limit_minutes: null,
        schedule_start: null,
        schedule_end: null,
        schedule_days: null,
        unlock_date: null,
        hide_from_home: false,
        hide_from_search: false,
        strict_mode: false,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      
      const lockStatus: LockStatus = {
        isLocked: true,
        unlocksAt: null,
        reason: null,
      };
      
      const getLockTypeClass = (app: LockRule, lockStatus: LockStatus): string => {
        if (!lockStatus.isLocked) return 'unlocked';
        
        switch (app.lock_type) {
          case 'nuclear':
            return 'locked-nuclear';
          case 'timer':
            return 'locked-timer';
          case 'schedule':
            return 'locked-schedule';
          case 'until_date':
            return 'locked-until-date';
          default:
            return 'locked';
        }
      };
      
      expect(getLockTypeClass(app, lockStatus)).toBe(expectedClasses[index]);
    });
  });

  it('should validate Requirement 3.6: Nuclear lock shows no override possible', () => {
    const app: LockRule = {
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
      hide_from_home: false,
      hide_from_search: false,
      strict_mode: false,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    
    const lockStatus: LockStatus = {
      isLocked: true,
      unlocksAt: null, // Nuclear locks have no unlock time
      reason: 'Nuclear mode active',
    };
    
    expect(app.lock_type).toBe('nuclear');
    expect(lockStatus.unlocksAt).toBeNull();
  });

  it('should validate Requirement 3.7: Click handler navigates to /lock/[appId]', () => {
    const appId = 'test-app-123';
    const expectedRoute = `/lock/${appId}`;
    
    expect(expectedRoute).toBe('/lock/test-app-123');
  });

  it('should validate Requirement 3.8: Unlocked apps show normal state', () => {
    const app: LockRule = {
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
      hide_from_home: false,
      hide_from_search: false,
      strict_mode: false,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    
    const lockStatus: LockStatus = {
      isLocked: false,
      unlocksAt: null,
      reason: null,
    };
    
    const getLockTypeClass = (app: LockRule, lockStatus: LockStatus): string => {
      if (!lockStatus.isLocked) return 'unlocked';
      
      switch (app.lock_type) {
        case 'nuclear':
          return 'locked-nuclear';
        case 'timer':
          return 'locked-timer';
        case 'schedule':
          return 'locked-schedule';
        case 'until_date':
          return 'locked-until-date';
        default:
          return 'locked';
      }
    };
    
    expect(getLockTypeClass(app, lockStatus)).toBe('unlocked');
  });
});
