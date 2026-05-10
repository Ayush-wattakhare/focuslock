/**
 * Notification Service Unit Tests
 * Tests for browser notification functionality
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  isNotificationEnabled,
  sendNotification,
  sendUnlockReminder,
  sendBuddyOverrideNotification,
  sendBadgeEarnedNotification,
  scheduleNotification,
  cancelScheduledNotification,
} from '@/lib/core/notificationService';

// Mock window.Notification
const mockNotification = jest.fn();
const mockRequestPermission = jest.fn();

describe('Notification Service', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock window.Notification
    Object.defineProperty(global, 'Notification', {
      value: mockNotification,
      writable: true,
      configurable: true,
    });

    mockNotification.permission = 'default';
    mockNotification.requestPermission = mockRequestPermission;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isNotificationSupported', () => {
    it('should return true when Notification API is available', () => {
      expect(isNotificationSupported()).toBe(true);
    });

    it('should return false when Notification API is not available', () => {
      // @ts-ignore
      delete global.Notification;
      expect(isNotificationSupported()).toBe(false);
    });
  });

  describe('getNotificationPermission', () => {
    it('should return current permission status', () => {
      mockNotification.permission = 'granted';
      expect(getNotificationPermission()).toBe('granted');
    });

    it('should return null when notifications not supported', () => {
      // @ts-ignore
      delete global.Notification;
      expect(getNotificationPermission()).toBeNull();
    });
  });

  describe('requestNotificationPermission', () => {
    it('should return granted if already granted', async () => {
      mockNotification.permission = 'granted';
      const result = await requestNotificationPermission();
      expect(result).toBe('granted');
      expect(mockRequestPermission).not.toHaveBeenCalled();
    });

    it('should return denied if already denied', async () => {
      mockNotification.permission = 'denied';
      const result = await requestNotificationPermission();
      expect(result).toBe('denied');
      expect(mockRequestPermission).not.toHaveBeenCalled();
    });

    it('should request permission if default', async () => {
      mockNotification.permission = 'default';
      mockRequestPermission.mockResolvedValue('granted');
      
      const result = await requestNotificationPermission();
      
      expect(mockRequestPermission).toHaveBeenCalled();
      expect(result).toBe('granted');
    });

    it('should throw error if notifications not supported', async () => {
      // @ts-ignore
      delete global.Notification;
      
      await expect(requestNotificationPermission()).rejects.toThrow(
        'Notifications are not supported in this browser'
      );
    });
  });

  describe('isNotificationEnabled', () => {
    it('should return true for badge_earned by default', () => {
      (global.localStorage.getItem as jest.Mock).mockReturnValue(null);
      expect(isNotificationEnabled('badge_earned')).toBe(true);
    });

    it('should return false for other types by default', () => {
      (global.localStorage.getItem as jest.Mock).mockReturnValue(null);
      expect(isNotificationEnabled('unlock_reminder')).toBe(false);
      expect(isNotificationEnabled('buddy_override')).toBe(false);
      expect(isNotificationEnabled('streak_broken')).toBe(false);
    });

    it('should return stored preference value', () => {
      (global.localStorage.getItem as jest.Mock).mockReturnValue('true');
      expect(isNotificationEnabled('unlock_reminder')).toBe(true);

      (global.localStorage.getItem as jest.Mock).mockReturnValue('false');
      expect(isNotificationEnabled('badge_earned')).toBe(false);
    });

    it('should use correct localStorage keys', () => {
      isNotificationEnabled('unlock_reminder');
      expect(global.localStorage.getItem).toHaveBeenCalledWith('notify_unlock');

      isNotificationEnabled('buddy_override');
      expect(global.localStorage.getItem).toHaveBeenCalledWith('notify_buddy_override');

      isNotificationEnabled('badge_earned');
      expect(global.localStorage.getItem).toHaveBeenCalledWith('notify_badge_earned');

      isNotificationEnabled('streak_broken');
      expect(global.localStorage.getItem).toHaveBeenCalledWith('notify_streak_broken');
    });
  });

  describe('sendNotification', () => {
    beforeEach(() => {
      mockNotification.permission = 'granted';
      (global.localStorage.getItem as jest.Mock).mockReturnValue('true');
      
      // Mock Notification constructor
      mockNotification.mockImplementation(function(this: any, title: string, options: any) {
        this.title = title;
        this.options = options;
        this.close = jest.fn();
        return this;
      });
    });

    it('should send notification when permission granted and enabled', async () => {
      const result = await sendNotification({
        type: 'badge_earned',
        title: 'Test Title',
        body: 'Test Body',
      });

      expect(result).toBe(true);
      expect(mockNotification).toHaveBeenCalledWith('Test Title', expect.objectContaining({
        body: 'Test Body',
        icon: '/icon-192x192.png',
      }));
    });

    it('should not send notification if type is disabled', async () => {
      (global.localStorage.getItem as jest.Mock).mockReturnValue('false');
      
      const result = await sendNotification({
        type: 'unlock_reminder',
        title: 'Test',
        body: 'Test',
      });

      expect(result).toBe(false);
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('should not send notification if permission denied', async () => {
      mockNotification.permission = 'denied';
      
      const result = await sendNotification({
        type: 'badge_earned',
        title: 'Test',
        body: 'Test',
      });

      expect(result).toBe(false);
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('should request permission if default', async () => {
      mockNotification.permission = 'default';
      mockRequestPermission.mockResolvedValue('granted');
      
      const result = await sendNotification({
        type: 'badge_earned',
        title: 'Test',
        body: 'Test',
      });

      expect(mockRequestPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should use custom icon if provided', async () => {
      await sendNotification({
        type: 'badge_earned',
        title: 'Test',
        body: 'Test',
        icon: '/custom-icon.png',
      });

      expect(mockNotification).toHaveBeenCalledWith('Test', expect.objectContaining({
        icon: '/custom-icon.png',
      }));
    });

    it('should include tag and data if provided', async () => {
      await sendNotification({
        type: 'badge_earned',
        title: 'Test',
        body: 'Test',
        tag: 'test-tag',
        data: { key: 'value' },
      });

      expect(mockNotification).toHaveBeenCalledWith('Test', expect.objectContaining({
        tag: 'test-tag',
        data: { key: 'value' },
      }));
    });
  });

  describe('sendUnlockReminder', () => {
    beforeEach(() => {
      mockNotification.permission = 'granted';
      (global.localStorage.getItem as jest.Mock).mockReturnValue('true');
      mockNotification.mockImplementation(function(this: any) {
        this.close = jest.fn();
        return this;
      });
    });

    it('should send unlock reminder with correct message', async () => {
      const unlocksAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
      
      await sendUnlockReminder('Instagram', unlocksAt);

      expect(mockNotification).toHaveBeenCalledWith(
        'FocusLock Reminder',
        expect.objectContaining({
          body: 'Instagram will unlock in 5 minutes',
          tag: 'unlock_Instagram',
        })
      );
    });

    it('should handle singular minute correctly', async () => {
      const unlocksAt = new Date(Date.now() + 1 * 60 * 1000); // 1 minute from now
      
      await sendUnlockReminder('YouTube', unlocksAt);

      expect(mockNotification).toHaveBeenCalledWith(
        'FocusLock Reminder',
        expect.objectContaining({
          body: 'YouTube will unlock in 1 minute',
        })
      );
    });
  });

  describe('sendBuddyOverrideNotification', () => {
    beforeEach(() => {
      mockNotification.permission = 'granted';
      (global.localStorage.getItem as jest.Mock).mockReturnValue('true');
      mockNotification.mockImplementation(function(this: any) {
        this.close = jest.fn();
        return this;
      });
    });

    it('should send buddy override notification', async () => {
      await sendBuddyOverrideNotification('John Doe', 'Instagram');

      expect(mockNotification).toHaveBeenCalledWith(
        'Buddy Override Alert',
        expect.objectContaining({
          body: 'John Doe overrode their lock for Instagram',
          tag: 'buddy_override',
        })
      );
    });
  });

  describe('sendBadgeEarnedNotification', () => {
    beforeEach(() => {
      mockNotification.permission = 'granted';
      (global.localStorage.getItem as jest.Mock).mockReturnValue('true');
      mockNotification.mockImplementation(function(this: any) {
        this.close = jest.fn();
        return this;
      });
    });

    it('should send badge earned notification', async () => {
      await sendBadgeEarnedNotification('Quick Starter', '⚡');

      expect(mockNotification).toHaveBeenCalledWith(
        '🎉 Badge Earned!',
        expect.objectContaining({
          body: '⚡ You earned the "Quick Starter" badge!',
          tag: 'badge_Quick Starter',
        })
      );
    });
  });

  describe('scheduleNotification', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockNotification.permission = 'granted';
      (global.localStorage.getItem as jest.Mock).mockReturnValue('true');
      mockNotification.mockImplementation(function(this: any) {
        this.close = jest.fn();
        return this;
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should schedule notification for future time', () => {
      const sendAt = new Date(Date.now() + 5000); // 5 seconds from now
      
      const timeoutId = scheduleNotification({
        type: 'badge_earned',
        title: 'Test',
        body: 'Test',
      }, sendAt);

      expect(timeoutId).toBeGreaterThan(0);
      expect(mockNotification).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      expect(mockNotification).toHaveBeenCalled();
    });

    it('should send immediately if time has passed', () => {
      const sendAt = new Date(Date.now() - 5000); // 5 seconds ago
      
      const timeoutId = scheduleNotification({
        type: 'badge_earned',
        title: 'Test',
        body: 'Test',
      }, sendAt);

      expect(timeoutId).toBe(-1);
      expect(mockNotification).toHaveBeenCalled();
    });
  });

  describe('cancelScheduledNotification', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should cancel scheduled notification', () => {
      const sendAt = new Date(Date.now() + 5000);
      
      const timeoutId = scheduleNotification({
        type: 'badge_earned',
        title: 'Test',
        body: 'Test',
      }, sendAt);

      cancelScheduledNotification(timeoutId);

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      // Notification should not be sent
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('should handle invalid timeout ID', () => {
      expect(() => cancelScheduledNotification(-1)).not.toThrow();
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy Requirement 21.1 - Request notification permission', async () => {
      mockNotification.permission = 'default';
      mockRequestPermission.mockResolvedValue('granted');
      
      const permission = await requestNotificationPermission();
      
      expect(permission).toBe('granted');
      expect(mockRequestPermission).toHaveBeenCalled();
    });

    it('should satisfy Requirement 21.2 - Send notification when app unlocks', async () => {
      mockNotification.permission = 'granted';
      (global.localStorage.getItem as jest.Mock).mockReturnValue('true');
      mockNotification.mockImplementation(function(this: any) {
        this.close = jest.fn();
        return this;
      });

      const unlocksAt = new Date(Date.now() + 5 * 60 * 1000);
      const result = await sendUnlockReminder('Instagram', unlocksAt);

      expect(result).toBe(true);
      expect(mockNotification).toHaveBeenCalledWith(
        'FocusLock Reminder',
        expect.objectContaining({
          body: expect.stringContaining('Instagram will unlock'),
        })
      );
    });

    it('should satisfy Requirement 21.3 - Send notification for buddy override', async () => {
      mockNotification.permission = 'granted';
      (global.localStorage.getItem as jest.Mock).mockReturnValue('true');
      mockNotification.mockImplementation(function(this: any) {
        this.close = jest.fn();
        return this;
      });

      const result = await sendBuddyOverrideNotification('John', 'Instagram');

      expect(result).toBe(true);
      expect(mockNotification).toHaveBeenCalledWith(
        'Buddy Override Alert',
        expect.objectContaining({
          body: expect.stringContaining('John overrode their lock for Instagram'),
        })
      );
    });

    it('should satisfy Requirement 21.4 - Send notification for badge earned', async () => {
      mockNotification.permission = 'granted';
      (global.localStorage.getItem as jest.Mock).mockReturnValue('true');
      mockNotification.mockImplementation(function(this: any) {
        this.close = jest.fn();
        return this;
      });

      const result = await sendBadgeEarnedNotification('Quick Starter', '⚡');

      expect(result).toBe(true);
      expect(mockNotification).toHaveBeenCalledWith(
        '🎉 Badge Earned!',
        expect.objectContaining({
          body: expect.stringContaining('Quick Starter'),
        })
      );
    });

    it('should satisfy Requirement 21.5 - Respect notification preferences', async () => {
      mockNotification.permission = 'granted';
      (global.localStorage.getItem as jest.Mock).mockReturnValue('false');

      const result = await sendNotification({
        type: 'unlock_reminder',
        title: 'Test',
        body: 'Test',
      });

      expect(result).toBe(false);
      expect(mockNotification).not.toHaveBeenCalled();
    });
  });
});
