# Browser Notifications Implementation

## Overview

This document describes the implementation of the browser notification system for FocusLock, which alerts users about important events like upcoming unlocks, buddy activity, and badge achievements.

## Requirements Addressed

**Requirement 21: Notification System**
- 21.1: Request notification permission from the user
- 21.2: Send notification when app is about to unlock
- 21.3: Send notification when buddy overrides watched rule
- 21.4: Send notification when user earns new badge
- 21.5: Allow users to configure notification preferences in settings

## Implementation Details

### Core Service: `lib/core/notificationService.ts`

The notification service provides a centralized API for managing browser notifications:

#### Key Functions

1. **Permission Management**
   - `isNotificationSupported()`: Checks if browser supports notifications
   - `getNotificationPermission()`: Gets current permission status
   - `requestNotificationPermission()`: Requests permission from user

2. **Preference Management**
   - `isNotificationEnabled(type)`: Checks if notification type is enabled
   - Preferences stored in localStorage with keys:
     - `notify_unlock`: Unlock reminders
     - `notify_buddy_override`: Buddy override alerts
     - `notify_badge_earned`: Badge earned celebrations (default: true)
     - `notify_streak_broken`: Streak broken warnings

3. **Notification Sending**
   - `sendNotification(data)`: Generic notification sender
   - `sendUnlockReminder(appName, unlocksAt)`: Unlock reminder
   - `sendBuddyOverrideNotification(buddyName, appName)`: Buddy override alert
   - `sendBadgeEarnedNotification(badgeName, badgeIcon)`: Badge earned celebration
   - `sendStreakBrokenNotification(streakLength)`: Streak broken warning

4. **Scheduling**
   - `scheduleNotification(data, sendAt)`: Schedule notification for future time
   - `cancelScheduledNotification(timeoutId)`: Cancel scheduled notification

#### Notification Flow

```
User Action → Check Permission → Check Preferences → Send Notification
                    ↓                    ↓                    ↓
              Request if needed    Skip if disabled    Auto-close after 5s
```

### Integration Points

#### 1. Badge Engine (`lib/core/badgeEngine.ts`)

Updated `sendBadgeNotification()` to use the notification service:

```typescript
async function sendBadgeNotification(userId: string, badge: BadgeDefinition): Promise<void> {
  if (typeof window !== 'undefined') {
    const { sendBadgeEarnedNotification } = await import('./notificationService');
    await sendBadgeEarnedNotification(badge.name, badge.icon || '🏆');
  }
}
```

#### 2. Lock Screen (`app/(dashboard)/lock/[appId]/LockScreenClient.tsx`)

Updated unlock reminder functionality to use the notification service:

```typescript
const handleSetReminder = async () => {
  const permission = await requestNotificationPermission();
  if (permission === 'granted' && lockStatus?.unlocksAt) {
    await sendUnlockReminder(rule.app_name, lockStatus.unlocksAt);
    setReminderSet(true);
  }
};
```

#### 3. Buddy Notifications Hook (`lib/hooks/useBuddyNotifications.ts`)

Created a React hook to listen for real-time buddy notifications:

```typescript
export function useBuddyNotifications(userId: string | null) {
  // Subscribes to Supabase Realtime for buddy_notifications
  // Automatically sends browser notification when buddy overrides
}
```

#### 4. Dashboard (`app/(dashboard)/dashboard/DashboardClient.tsx`)

Integrated the buddy notifications hook:

```typescript
useBuddyNotifications(user?.id || null);
```

### Settings Integration

The notification preferences are already integrated in `app/(dashboard)/settings/SettingsClient.tsx`:

- Checkboxes for each notification type
- Preferences saved to localStorage
- Synced when user saves settings

## Testing

Comprehensive unit tests in `__tests__/core/notificationService.test.ts`:

- ✅ 31 tests covering all functionality
- ✅ Permission management
- ✅ Preference checking
- ✅ Notification sending
- ✅ Scheduling and cancellation
- ✅ Requirements validation

## Browser Compatibility

The notification system uses the standard Web Notifications API:

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support (requires user interaction)
- ❌ IE: Not supported (graceful degradation)

## Security & Privacy

1. **Permission-based**: Requires explicit user permission
2. **Preference-based**: Users can disable any notification type
3. **Auto-close**: Notifications auto-close after 5 seconds
4. **No tracking**: No analytics or tracking of notification interactions

## Future Enhancements

Potential improvements for future iterations:

1. **Service Worker Integration**: Persistent notifications even when app is closed
2. **Action Buttons**: Add action buttons to notifications (e.g., "View App", "Dismiss")
3. **Sound Customization**: Allow users to customize notification sounds
4. **Quiet Hours**: Automatically disable notifications during configured hours
5. **Notification History**: Store notification history for review

## Usage Examples

### Request Permission

```typescript
import { requestNotificationPermission } from '@/lib/core/notificationService';

const permission = await requestNotificationPermission();
if (permission === 'granted') {
  console.log('Notifications enabled!');
}
```

### Send Unlock Reminder

```typescript
import { sendUnlockReminder } from '@/lib/core/notificationService';

const unlocksAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
await sendUnlockReminder('Instagram', unlocksAt);
```

### Send Badge Notification

```typescript
import { sendBadgeEarnedNotification } from '@/lib/core/notificationService';

await sendBadgeEarnedNotification('Quick Starter', '⚡');
```

### Schedule Notification

```typescript
import { scheduleNotification, cancelScheduledNotification } from '@/lib/core/notificationService';

const timeoutId = scheduleNotification({
  type: 'unlock_reminder',
  title: 'FocusLock',
  body: 'Instagram is now unlocked!',
}, new Date(Date.now() + 60000)); // 1 minute

// Cancel if needed
cancelScheduledNotification(timeoutId);
```

## Troubleshooting

### Notifications Not Showing

1. Check browser permission: `Notification.permission`
2. Check user preferences: localStorage keys
3. Check browser support: `'Notification' in window`
4. Check HTTPS: Notifications require secure context

### Permission Denied

- User must manually enable in browser settings
- Cannot be programmatically reset
- Provide clear instructions to user

### Notifications Not Persisting

- Current implementation uses in-memory scheduling
- For persistent notifications, implement Service Worker
- See "Future Enhancements" section

## Related Files

- `lib/core/notificationService.ts` - Core service
- `lib/hooks/useBuddyNotifications.ts` - Buddy notifications hook
- `lib/core/badgeEngine.ts` - Badge notification integration
- `app/(dashboard)/lock/[appId]/LockScreenClient.tsx` - Unlock reminder integration
- `app/(dashboard)/dashboard/DashboardClient.tsx` - Dashboard integration
- `app/(dashboard)/settings/SettingsClient.tsx` - Settings UI
- `__tests__/core/notificationService.test.ts` - Unit tests
