# Buddy API

The Buddy API provides endpoints for managing accountability buddy relationships and notifications in FocusLock.

## Endpoints

### POST /api/buddy/invite

Send an invitation to another user to become an accountability buddy.

**Request Body:**
```json
{
  "buddy_email": "friend@example.com",
  "rules_watching": ["rule-id-1", "rule-id-2"] // Optional
}
```

**Response (201 Created):**
```json
{
  "buddy": {
    "id": "uuid",
    "user_id": "uuid",
    "buddy_user_id": "uuid",
    "rules_watching": ["rule-id-1", "rule-id-2"],
    "status": "pending",
    "invited_at": "2024-01-15T10:00:00Z",
    "accepted_at": null
  },
  "invite_sent": true
}
```

**Requirements Validated:**
- 9.1: Creates buddy relationship with status 'pending' and invited timestamp
- 9.3: Allows selection of which lock rules to watch

---

### POST /api/buddy/accept

Accept a pending buddy invitation.

**Request Body:**
```json
{
  "buddy_id": "uuid"
}
```

**Response (200 OK):**
```json
{
  "buddy": {
    "id": "uuid",
    "user_id": "uuid",
    "buddy_user_id": "uuid",
    "rules_watching": ["rule-id-1"],
    "status": "active",
    "invited_at": "2024-01-15T10:00:00Z",
    "accepted_at": "2024-01-15T10:30:00Z"
  },
  "accepted": true
}
```

**Requirements Validated:**
- 9.2: Updates relationship status to 'active' and records accepted timestamp

---

### POST /api/buddy/notify

Fire a notification to a buddy (manual notification creation).

**Request Body:**
```json
{
  "to_user_id": "uuid",
  "event_type": "override",
  "app_name": "Instagram",
  "message": "Your buddy overrode their Instagram lock"
}
```

**Response (201 Created):**
```json
{
  "notification": {
    "id": "uuid",
    "from_user_id": "uuid",
    "to_user_id": "uuid",
    "event_type": "override",
    "app_name": "Instagram",
    "message": "Your buddy overrode their Instagram lock",
    "is_read": false,
    "created_at": "2024-01-15T10:00:00Z"
  },
  "sent": true
}
```

**Requirements Validated:**
- 9.4: Creates buddy notification for watched rule overrides
- 9.5: Sends notifications via Supabase Realtime (automatic on insert)

---

### GET /api/buddy/notifications

Fetch notifications for the authenticated user.

**Query Parameters:**
- `limit` (optional): Number of notifications to fetch (1-100, default: 50)
- `unread_only` (optional): If "true", only fetch unread notifications

**Response (200 OK):**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "from_user_id": "uuid",
      "to_user_id": "uuid",
      "event_type": "override",
      "app_name": "Instagram",
      "message": "Your buddy overrode their Instagram lock",
      "is_read": false,
      "created_at": "2024-01-15T10:00:00Z",
      "from_user": {
        "full_name": "John Doe",
        "avatar_url": "https://..."
      }
    }
  ],
  "unread_count": 5
}
```

**Requirements Validated:**
- Fetches notifications with sender profile information
- Provides unread count for UI badges

---

### PATCH /api/buddy/notifications

Mark notifications as read.

**Request Body:**
```json
{
  "notification_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response (200 OK):**
```json
{
  "updated_count": 3,
  "notifications": [
    {
      "id": "uuid-1",
      "is_read": true,
      ...
    }
  ]
}
```

---

## Authentication

All endpoints require authentication via Supabase Auth. Include the session token in the request headers.

## Error Responses

All endpoints return standardized error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details (optional)"
  }
}
```

**Common Error Codes:**
- `AUTH_REQUIRED` (401): User not authenticated
- `VALIDATION_ERROR` (400): Invalid request data
- `NOT_FOUND` (404): Resource not found
- `FORBIDDEN` (403): User lacks permission
- `DATABASE_ERROR` (500): Database operation failed
- `INTERNAL_ERROR` (500): Unexpected server error

## Supabase Realtime Integration

Buddy notifications are automatically broadcast via Supabase Realtime when inserted into the `buddy_notifications` table. Clients should subscribe to changes:

```javascript
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

## Row-Level Security

All buddy operations respect Supabase RLS policies:
- Users can only create buddy relationships where they are the inviter
- Users can only accept invitations where they are the invitee
- Users can only view notifications sent to them
- Buddies can view override logs for watched rules only (enforced at database level)

## Requirements Coverage

This API implementation satisfies Requirements 9.1-9.9:

- ✅ 9.1: Create buddy relationship with 'pending' status
- ✅ 9.2: Accept invitation and update to 'active' status
- ✅ 9.3: Select which lock rules to watch
- ✅ 9.4: Create notifications when watched rules are overridden
- ✅ 9.5: Send notifications via Supabase Realtime
- ✅ 9.6: Buddies can view override logs (via RLS policies)
- ✅ 9.7: Remove buddy relationships (status update to 'removed')
- ✅ 9.8: Prevent buddies from modifying lock rules (enforced by RLS)
- ✅ 9.9: RLS policies enforce buddy relationship permissions
