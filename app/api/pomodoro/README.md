# Pomodoro API

This API manages Pomodoro focus sessions for the FocusLock application.

## Overview

The Pomodoro API provides three endpoints to manage focus sessions using the Pomodoro Technique:
- Start a new Pomodoro session
- Complete a work block (increment sessions counter)
- End a session (mark as completed or abandoned)

## Requirements

Implements Requirements 8.1-8.7:
- 8.1: Start Pomodoro session with task label, work/break minutes, and sessions target
- 8.2: Default to 25 minutes work and 5 minutes break
- 8.3: Lock apps during work blocks (handled by client)
- 8.4: Unlock apps during break blocks (handled by client)
- 8.5: Increment sessions_done counter when work block completes
- 8.6: Mark session as completed when sessions_done reaches sessions_target
- 8.7: Allow abandoning sessions
- 8.8: Row-level security (users can only access their own sessions)

## Endpoints

### POST /api/pomodoro/start

Start a new Pomodoro session.

**Request Body:**
```json
{
  "task_label": "Focus work",      // Optional
  "work_minutes": 25,              // Optional, defaults to 25
  "break_minutes": 5,              // Optional, defaults to 5
  "sessions_target": 4             // Optional, defaults to 4
}
```

**Response (201 Created):**
```json
{
  "session": {
    "id": "uuid",
    "user_id": "uuid",
    "task_label": "Focus work",
    "work_minutes": 25,
    "break_minutes": 5,
    "sessions_target": 4,
    "sessions_done": 0,
    "status": "active",
    "started_at": "2024-01-15T10:00:00.000Z",
    "ended_at": null
  }
}
```

**Error Responses:**
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Database error

---

### POST /api/pomodoro/complete-block

Increment the sessions_done counter after completing a work block.

**Request Body:**
```json
{
  "session_id": "uuid"
}
```

**Response (200 OK):**
```json
{
  "session": {
    "id": "uuid",
    "user_id": "uuid",
    "task_label": "Focus work",
    "work_minutes": 25,
    "break_minutes": 5,
    "sessions_target": 4,
    "sessions_done": 2,
    "status": "active",
    "started_at": "2024-01-15T10:00:00.000Z",
    "ended_at": null
  },
  "completed": false
}
```

When the target is reached, the session is automatically marked as completed:
```json
{
  "session": {
    "id": "uuid",
    "user_id": "uuid",
    "task_label": "Focus work",
    "work_minutes": 25,
    "break_minutes": 5,
    "sessions_target": 4,
    "sessions_done": 4,
    "status": "completed",
    "started_at": "2024-01-15T10:00:00.000Z",
    "ended_at": "2024-01-15T12:00:00.000Z"
  },
  "completed": true
}
```

**Error Responses:**
- `400 Bad Request`: Missing session_id or session is not active
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Session not found
- `500 Internal Server Error`: Database error

---

### POST /api/pomodoro/end

End a Pomodoro session, marking it as completed or abandoned.

**Request Body:**
```json
{
  "session_id": "uuid",
  "status": "completed"  // or "abandoned"
}
```

**Response (200 OK):**
```json
{
  "session": {
    "id": "uuid",
    "user_id": "uuid",
    "task_label": "Focus work",
    "work_minutes": 25,
    "break_minutes": 5,
    "sessions_target": 4,
    "sessions_done": 2,
    "status": "completed",
    "started_at": "2024-01-15T10:00:00.000Z",
    "ended_at": "2024-01-15T11:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields, invalid status, or session already ended
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Session not found
- `500 Internal Server Error`: Database error

## Database Schema

The `pomodoro_sessions` table:

```sql
CREATE TABLE pomodoro_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_label      TEXT,
  work_minutes    INTEGER DEFAULT 25,
  break_minutes   INTEGER DEFAULT 5,
  sessions_target INTEGER DEFAULT 4,
  sessions_done   INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ
);
```

## Security

- All endpoints require authentication
- Row-level security ensures users can only access their own sessions
- Session ownership is verified on all update operations

## Usage Example

```javascript
// Start a Pomodoro session
const startResponse = await fetch('/api/pomodoro/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task_label: 'Write documentation',
    work_minutes: 25,
    break_minutes: 5,
    sessions_target: 4
  })
});
const { session } = await startResponse.json();

// Complete a work block
const completeResponse = await fetch('/api/pomodoro/complete-block', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: session.id
  })
});
const { session: updatedSession, completed } = await completeResponse.json();

// End the session
const endResponse = await fetch('/api/pomodoro/end', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: session.id,
    status: 'completed'
  })
});
```

## Testing

Unit tests are located in `__tests__/api/pomodoro.test.ts`.

Run tests:
```bash
npm test -- __tests__/api/pomodoro.test.ts
```

All tests verify:
- Default values (25 min work, 5 min break, 4 sessions target)
- Custom configuration support
- Sessions counter increment
- Automatic completion when target reached
- Manual completion and abandonment
- Authentication and authorization
- Row-level security
```
