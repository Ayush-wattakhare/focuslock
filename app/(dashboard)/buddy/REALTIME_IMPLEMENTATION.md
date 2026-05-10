# Supabase Realtime Buddy Notifications Implementation

## Task 13.2: Implement Supabase Realtime subscriptions

**Status:** ✅ COMPLETED

**Requirements Validated:**
- ✅ Requirement 9.5: THE FocusLock_System SHALL send buddy notifications via Supabase Realtime
- ✅ Requirement 21.2: WHEN a buddy overrides a watched rule, THE FocusLock_System SHALL send a real-time notification to the watching buddy
- ✅ Requirement 21.3: WHEN a user breaks their streak, THE FocusLock_System SHALL send a notification to their buddy if one is configured

---

## Implementation Summary

This task implements real-time buddy notifications using Supabase Realtime subscriptions. When a user overrides a watched lock rule or breaks their streak, their buddy receives an instant notification through Supabase Realtime.

### Components Implemented

#### 1. **useBuddyNotifications Hook** (`lib/hooks/useBuddyNotifications.ts`)

A React hook that subscribes to the `buddy_notifications` table and handles real-time notifications.

**Features:**
- Subscribes to Supabase Realtime for `buddy_notifications` table
- Filters notifications for the current user (`to_user_id=eq.${userId}`)
- Fetches `from_user` profile data (full_name, avatar_url) for each notification
- Displays browser notifications for override events
- Provides `isSubscribed` status indicator
- Automatically cleans up subscriptions on component unmount
- Handles errors gracefully (e.g., profile fetch failures)

**API:**
```typescript
useBuddyNotifications(
  userId: string | null,
  onNewNotification?: (notification: BuddyNotification) => void
): { isSubscribed: boolean }
```

**Usage Example:**
```typescript
const { isSubscribed } = useBuddyNotifications(user?.id || null, (newNotification) => {
  // Handle new notification (e.g., add to state)
  setNotifications((prev) => [newNotification, ...prev]);
});
```

#### 2. **BuddyClient Component** (`app/(dashboard)/buddy/BuddyClient.tsx`)

The buddy page client component that displays notifications and uses the real-time hook.

**Features:**
- Uses `useBuddyNotifications` hook to subscribe to real-time notifications
- Displays notifications list with read/unread status
- Shows unread notification count badge
- Marks notifications as read when clicked
- Displays "Live" indicator when subscribed to Realtime
- Formats notification messages based on event type
- Filters out removed buddies from display

**Real-time Notification Handling:**
```typescript
const { isSubscribed } = useBuddyNotifications(user?.id || null, (newNotification) => {
  // Add new notification to the top of the list
  setNotifications((prev) => [newNotification, ...prev]);
});
```

#### 3. **Buddy Notifications API** (`app/api/buddy/notifications/route.ts`)

API endpoints for fetching and marking notifications as read.

**Endpoints:**
- `GET /api/buddy/notifications` - Fetch notifications for authenticated user
  - Query params: `limit` (1-100, default 50), `unread_only` (boolean)
  - Returns: notifications array with `from_user` profile data, unread_count
  
- `PATCH /api/buddy/notifications` - Mark notifications as read
  - Body: `{ notification_ids: string[] }`
  - Returns: updated_count, updated notifications

#### 4. **Buddy Page Server Component** (`app/(dashboard)/buddy/page.tsx`)

Server component that fetches initial data and renders the BuddyClient.

**Data Fetched:**
- Buddy relationships for the current user
- Active lock rules
- Recent buddy notifications (last 50) with `from_user` profile data

---

## Database Schema

### buddy_notifications Table

```sql
CREATE TABLE buddy_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL CHECK (event_type IN ('override','streak_broken','weekly_summary')),
  app_name     TEXT,
  message      TEXT,
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_buddy_notifications_to_user ON buddy_notifications(to_user_id, created_at DESC);
```

### Row-Level Security

```sql
-- Users can view notifications sent to them
CREATE POLICY "Users can view own notifications" ON buddy_notifications
  FOR SELECT USING (auth.uid() = to_user_id);

-- Users can create notifications
CREATE POLICY "Users can create notifications" ON buddy_notifications
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);
```

---

## Supabase Realtime Configuration

### Subscription Setup

```typescript
const channel = supabase
  .channel('buddy_notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'buddy_notifications',
      filter: `to_user_id=eq.${userId}`,
    },
    handleNotification
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      setIsSubscribed(true);
    }
  });
```

### Cleanup

```typescript
useEffect(() => {
  // ... subscription setup ...
  
  return () => {
    setIsSubscribed(false);
    supabase.removeChannel(channel);
  };
}, [userId, handleNotification]);
```

---

## Event Types

### 1. Override Event (`event_type: 'override'`)

Triggered when a buddy overrides a watched lock rule.

**Notification Data:**
```typescript
{
  event_type: 'override',
  app_name: 'Instagram',
  message: null, // Optional custom message
  from_user: {
    full_name: 'John Doe',
    avatar_url: 'https://...'
  }
}
```

**Browser Notification:**
- Title: "Buddy Override"
- Body: "{buddy_name} overrode {app_name}"

### 2. Streak Broken Event (`event_type: 'streak_broken'`)

Triggered when a buddy breaks their streak.

**Notification Data:**
```typescript
{
  event_type: 'streak_broken',
  app_name: null,
  message: 'Your buddy broke their streak',
  from_user: {
    full_name: 'John Doe',
    avatar_url: 'https://...'
  }
}
```

### 3. Weekly Summary Event (`event_type: 'weekly_summary'`)

Triggered for weekly progress summaries.

**Notification Data:**
```typescript
{
  event_type: 'weekly_summary',
  app_name: null,
  message: 'Weekly summary from your buddy',
  from_user: {
    full_name: 'John Doe',
    avatar_url: 'https://...'
  }
}
```

---

## Testing

### Unit Tests (`lib/hooks/__tests__/useBuddyNotifications.test.ts`)

**Test Coverage:**
- ✅ Subscribes to buddy_notifications table for current user
- ✅ Returns isSubscribed as true when subscription is successful
- ✅ Does not subscribe when userId is null
- ✅ Calls onNewNotification callback when new notification is received
- ✅ Displays browser notification for override events
- ✅ Handles streak_broken event type
- ✅ Handles weekly_summary event type
- ✅ Fetches from_user profile data for notifications
- ✅ Cleans up subscription on unmount
- ✅ Does not display browser notification for non-override events
- ✅ Does not display browser notification when app_name is missing
- ✅ Handles profile fetch errors gracefully

**Test Results:**
```
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
```

### Integration Tests (`app/(dashboard)/buddy/__tests__/BuddyClient.test.tsx`)

**Test Coverage:**
- ✅ Renders page header
- ✅ Displays unread notification count
- ✅ Renders BuddyPanel with correct props
- ✅ Displays notifications list
- ✅ Handles buddy invitation successfully
- ✅ Handles buddy invitation error
- ✅ Marks notification as read when clicked
- ✅ Displays empty state when no notifications
- ✅ Filters out removed buddies from BuddyPanel
- ✅ Formats notification message for override event
- ✅ Formats notification message for weekly_summary event
- ✅ Uses custom message when provided
- ✅ Displays real-time connection indicator when subscribed
- ✅ Adds new notification to the list when received via real-time

---

## UI Features

### Real-time Indicator

When subscribed to Supabase Realtime, a "Live" indicator is displayed:

```tsx
{isSubscribed && (
  <div className="realtime-indicator">
    <span className="realtime-dot"></span>
    <span className="realtime-text">Live</span>
  </div>
)}
```

### Notification Card

Each notification displays:
- Avatar (initials from buddy's name)
- Notification message (formatted based on event type)
- Timestamp
- Unread indicator (blue dot)
- Read/unread styling

### Mark as Read

Clicking an unread notification marks it as read:
- Calls `PATCH /api/buddy/notifications` with notification ID
- Updates local state to reflect read status
- Removes unread indicator
- Updates unread count badge

---

## Error Handling

### Profile Fetch Errors

If fetching the `from_user` profile fails:
- Notification is still displayed
- `from_user` is set to `undefined`
- Fallback text is used: "Your buddy" instead of the buddy's name

### Subscription Errors

If Supabase Realtime subscription fails:
- `isSubscribed` remains `false`
- "Live" indicator is not displayed
- User can still view notifications (fetched on page load)
- Notifications are not received in real-time until page refresh

### API Errors

If marking notifications as read fails:
- Error is logged to console
- Notification remains unread in UI
- User can try again by clicking the notification

---

## Performance Considerations

### Subscription Cleanup

The hook properly cleans up subscriptions on unmount to prevent memory leaks:

```typescript
return () => {
  setIsSubscribed(false);
  supabase.removeChannel(channel);
};
```

### Notification Limit

- Initial fetch: 50 most recent notifications
- Real-time: Only new notifications are added
- Older notifications can be fetched via pagination (future enhancement)

### Profile Data Caching

- Profile data is fetched once per notification
- Could be optimized with a profile cache (future enhancement)

---

## Future Enhancements

1. **Pagination**: Load more notifications on scroll
2. **Mark All as Read**: Bulk action to mark all notifications as read
3. **Notification Filtering**: Filter by event type (override, streak_broken, etc.)
4. **Notification Settings**: Allow users to configure which events trigger notifications
5. **Push Notifications**: Integrate with browser push notifications API
6. **Profile Caching**: Cache buddy profiles to reduce API calls
7. **Optimistic Updates**: Update UI immediately before API call completes

---

## Conclusion

Task 13.2 is fully implemented and tested. The Supabase Realtime subscription system is working correctly, and all requirements (9.5, 21.2, 21.3) are validated through comprehensive unit and integration tests.

**Key Achievements:**
- ✅ Real-time buddy notifications via Supabase Realtime
- ✅ Browser notifications for override events
- ✅ Mark notifications as read functionality
- ✅ Proper subscription cleanup
- ✅ Comprehensive test coverage (12 unit tests, 14 integration tests)
- ✅ Error handling and graceful degradation
- ✅ Live connection indicator
- ✅ Unread notification count badge
