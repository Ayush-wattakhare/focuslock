# Override API

## Overview

The Override API handles emergency overrides of lock rules. When a user overrides a lock, the system:

1. Logs the override with mood tracking
2. Resets the user's streak to 0
3. Checks for active buddies watching the rule
4. Creates buddy notifications via Supabase Realtime

## Endpoint

### POST /api/override

Logs an override event and triggers side effects.

**Authentication:** Required (JWT token)

**Request Body:**

```typescript
{
  lock_rule_id: string;      // UUID of the lock rule being overridden
  app_name: string;          // Name of the app (e.g., "Instagram")
  mood: 'bored' | 'stressed' | 'tired' | 'news' | 'other';  // User's emotional state
  reason_text?: string;      // Optional explanation (required for strict mode rules)
}
```

**Response (201 Created):**

```typescript
{
  log: {
    id: string;
    user_id: string;
    lock_rule_id: string | null;
    app_name: string;
    mood: string | null;
    reason_text: string | null;
    overridden_at: string;  // ISO timestamp
  };
  streakBroken: boolean;     // Whether streak was successfully reset
  buddyNotified: boolean;    // Whether buddy notifications were sent
}
```

**Error Responses:**

- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Missing or invalid fields
- `403 Forbidden` - Attempting to override nuclear mode lock
- `404 Not Found` - Lock rule not found or doesn't belong to user
- `500 Internal Server Error` - Database or unexpected error

## Implementation Details

### 1. Override Logging

The override is logged to the `override_logs` table with:
- User ID (from authenticated session)
- Lock rule ID
- App name
- Mood selection
- Optional reason text
- Timestamp (auto-generated)

### 2. Streak Reset

The system calls `resetStreak(userId)` from `lib/core/streakManager.ts` to:
- Set `current_streak` to 0
- Preserve `longest_streak`
- Keep `last_active_date` unchanged

If streak reset fails, the error is logged but the request continues successfully.

### 3. Buddy Notifications

The system queries the `buddies` table for active buddies where:
- `user_id` matches the current user
- `status` is 'active'
- `rules_watching` is null/empty (watching all rules) OR contains the overridden rule ID

For each matching buddy, a notification is created in `buddy_notifications`:
- `from_user_id`: Current user
- `to_user_id`: Buddy's user ID
- `event_type`: 'override'
- `app_name`: The overridden app
- `message`: "Your buddy overrode their {app_name} lock"
- `is_read`: false

### 4. Supabase Realtime

Buddy notifications are automatically broadcast via Supabase Realtime when inserted into the `buddy_notifications` table. Clients subscribe to changes filtered by `to_user_id`:

```typescript
const subscription = supabase
  .channel('buddy_notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'buddy_notifications',
    filter: `to_user_id=eq.${userId}`
  }, (payload) => {
    showNotification(payload.new);
  })
  .subscribe();
```

## Validation Rules

1. **Required Fields:** `lock_rule_id`, `app_name`, `mood`
2. **Mood Values:** Must be one of: 'bored', 'stressed', 'tired', 'news', 'other'
3. **Lock Rule Ownership:** Rule must belong to authenticated user
4. **Nuclear Mode:** Cannot override nuclear mode locks (returns 403)
5. **Strict Mode:** For strict mode rules, `reason_text` should have minimum 10 characters (enforced client-side)

## Error Handling

The API uses graceful degradation:
- If streak reset fails, the override is still logged
- If buddy notification fails, the override is still logged
- Errors are logged to console for debugging
- Non-critical failures don't block the main operation

## Security

- Row-level security (RLS) ensures users can only override their own rules
- Authentication required for all requests
- Lock rule ownership verified before override
- Nuclear mode locks cannot be overridden

## Related Requirements

**Validates: Requirements 4.1-4.6**

- 4.1: Display mood prompt before allowing access
- 4.2: Provide mood options (bored, stressed, tired, news, other)
- 4.3: Allow optional text reason
- 4.4: Log override with all details
- 4.5: Deny override for nuclear mode
- 4.6: Enforce RLS for override logs

## Testing

Unit tests cover:
- Authentication validation
- Request body validation
- Lock rule verification
- Nuclear mode blocking
- Override logging
- Streak reset integration
- Buddy notification logic
- Error handling and graceful degradation

Run tests:
```bash
npm test -- __tests__/api/override.test.ts
```

## Usage Example

```typescript
// Client-side code
async function handleOverride(lockRuleId: string, appName: string) {
  // Show mood prompt
  const mood = await showMoodPrompt();
  const reasonText = mood === 'other' ? await askForReason() : undefined;

  // Call API
  const response = await fetch('/api/override', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lock_rule_id: lockRuleId,
      app_name: appName,
      mood,
      reason_text: reasonText,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  const data = await response.json();
  
  if (data.streakBroken) {
    showStreakBrokenMessage();
  }
  
  if (data.buddyNotified) {
    showBuddyNotifiedMessage();
  }

  // Navigate to unlocked app
  navigateToApp(appName);
}
```

## Integration Points

### streakManager
- `resetStreak(userId)` - Resets current streak to 0

### Supabase Tables
- `lock_rules` - Verify rule ownership and type
- `override_logs` - Log override events
- `buddies` - Find active buddies watching rules
- `buddy_notifications` - Create notifications

### Supabase Realtime
- Automatic broadcast of buddy notifications
- Clients subscribe to `buddy_notifications` table changes
