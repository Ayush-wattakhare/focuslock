/**
 * Notification Service Module
 * Handles browser notifications for important events
 * 
 * Supports notifications for:
 * - App unlock reminders
 * - Buddy override alerts
 * - Badge earned celebrations
 * - Streak broken warnings
 */

/**
 * Notification types supported by the system
 */
export type NotificationType =
  | 'unlock_reminder'
  | 'buddy_override'
  | 'badge_earned'
  | 'streak_broken';

/**
 * Notification data structure
 */
export interface NotificationData {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, any>;
}

/**
 * Checks if browser notifications are supported
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets the current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (!isNotificationSupported()) {
    return null;
  }
  return Notification.permission;
}

/**
 * Requests notification permission from the user
 * @returns Promise resolving to the permission status
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Checks if a specific notification type is enabled in user preferences
 * Reads from localStorage (synced from profile)
 * @param type - The notification type to check
 * @returns True if the notification type is enabled
 */
export function isNotificationEnabled(type: NotificationType): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const preferenceKey = getPreferenceKey(type);
  const value = localStorage.getItem(preferenceKey);
  
  // Default to true for badge_earned, false for others
  if (value === null) {
    return type === 'badge_earned';
  }
  
  return value === 'true';
}

/**
 * Syncs notification preferences from profile to localStorage
 * Should be called when profile is loaded or updated
 * @param profile - User profile with notification preferences
 */
export function syncNotificationPreferences(profile: {
  notify_unlock: boolean;
  notify_buddy_override: boolean;
  notify_streak_broken: boolean;
  notify_badge_earned: boolean;
}): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem('notify_unlock', String(profile.notify_unlock));
  localStorage.setItem('notify_buddy_override', String(profile.notify_buddy_override));
  localStorage.setItem('notify_streak_broken', String(profile.notify_streak_broken));
  localStorage.setItem('notify_badge_earned', String(profile.notify_badge_earned));
}

/**
 * Gets the localStorage key for a notification type preference
 */
function getPreferenceKey(type: NotificationType): string {
  switch (type) {
    case 'unlock_reminder':
      return 'notify_unlock';
    case 'buddy_override':
      return 'notify_buddy_override';
    case 'badge_earned':
      return 'notify_badge_earned';
    case 'streak_broken':
      return 'notify_streak_broken';
    default:
      return `notify_${type}`;
  }
}

/**
 * Sends a browser notification if permissions and preferences allow
 * @param data - Notification data
 * @returns True if notification was sent, false otherwise
 */
export async function sendNotification(data: NotificationData): Promise<boolean> {
  // Check if notifications are supported
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported in this browser');
    return false;
  }

  // Check if user has enabled this notification type
  if (!isNotificationEnabled(data.type)) {
    console.log(`Notification type ${data.type} is disabled by user preference`);
    return false;
  }

  // Check permission
  const permission = getNotificationPermission();
  
  if (permission === 'denied') {
    console.warn('Notification permission denied');
    return false;
  }

  if (permission === 'default') {
    // Try to request permission
    const newPermission = await requestNotificationPermission();
    if (newPermission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }
  }

  // Send the notification
  try {
    const notification = new Notification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      tag: data.tag,
      data: data.data,
      badge: '/icon-192x192.png',
      requireInteraction: false,
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return true;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}

/**
 * Sends an unlock reminder notification
 * @param appName - Name of the app that is unlocking
 * @param unlocksAt - Date when the app unlocks
 */
export async function sendUnlockReminder(appName: string, unlocksAt: Date): Promise<boolean> {
  const minutesUntilUnlock = Math.round((unlocksAt.getTime() - Date.now()) / 60000);
  
  return sendNotification({
    type: 'unlock_reminder',
    title: 'FocusLock Reminder',
    body: `${appName} will unlock in ${minutesUntilUnlock} minute${minutesUntilUnlock !== 1 ? 's' : ''}`,
    tag: `unlock_${appName}`,
    data: { appName, unlocksAt: unlocksAt.toISOString() },
  });
}

/**
 * Sends a buddy override notification
 * @param buddyName - Name of the buddy who overrode
 * @param appName - Name of the app that was overridden
 */
export async function sendBuddyOverrideNotification(
  buddyName: string,
  appName: string
): Promise<boolean> {
  return sendNotification({
    type: 'buddy_override',
    title: 'Buddy Override Alert',
    body: `${buddyName} overrode their lock for ${appName}`,
    tag: 'buddy_override',
    data: { buddyName, appName },
  });
}

/**
 * Sends a badge earned notification
 * @param badgeName - Name of the badge earned
 * @param badgeIcon - Icon/emoji for the badge
 */
export async function sendBadgeEarnedNotification(
  badgeName: string,
  badgeIcon: string
): Promise<boolean> {
  return sendNotification({
    type: 'badge_earned',
    title: '🎉 Badge Earned!',
    body: `${badgeIcon} You earned the "${badgeName}" badge!`,
    tag: `badge_${badgeName}`,
    data: { badgeName, badgeIcon },
  });
}

/**
 * Sends a streak broken notification
 * @param streakLength - Length of the streak that was broken
 */
export async function sendStreakBrokenNotification(streakLength: number): Promise<boolean> {
  return sendNotification({
    type: 'streak_broken',
    title: 'Streak Broken',
    body: `Your ${streakLength}-day streak was broken. Start fresh tomorrow!`,
    tag: 'streak_broken',
    data: { streakLength },
  });
}

/**
 * Schedules a notification to be sent at a specific time
 * @param data - Notification data
 * @param sendAt - Date/time to send the notification
 * @returns Timeout ID that can be used to cancel the scheduled notification
 */
export function scheduleNotification(data: NotificationData, sendAt: Date): number {
  const delay = sendAt.getTime() - Date.now();
  
  if (delay <= 0) {
    // Send immediately if time has passed
    sendNotification(data);
    return -1;
  }

  const timeoutId = window.setTimeout(() => {
    sendNotification(data);
  }, delay);

  return timeoutId;
}

/**
 * Cancels a scheduled notification
 * @param timeoutId - The timeout ID returned by scheduleNotification
 */
export function cancelScheduledNotification(timeoutId: number): void {
  if (timeoutId !== -1) {
    clearTimeout(timeoutId);
  }
}
