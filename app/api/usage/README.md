# Usage Sessions API

This API manages usage session tracking for FocusLock, allowing the system to record and aggregate app usage time.

## Endpoints

### POST /api/usage/start

Start a new usage session for an app.

**Requirements:** 5.1 - When a usage session begins, record user ID, app name, session start timestamp, and date

**Request Body:**
```json
{
  "app_name": "Instagram"
}
```

**Response (201 Created):**
```json
{
  "session": {
    "id": "uuid",
    "user_id": "uuid",
    "app_name": "Instagram",
    "session_start": "2024-01-15T10:30:00.000Z",
    "session_end": null,
    "minutes_used": null,
    "date": "2024-01-15",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Missing app_name
- `500 Internal Server Error` - Database error

---

### POST /api/usage/end

End an active usage session and calculate the duration.

**Requirements:** 5.2 - When a usage session ends, record session end timestamp and calculate minutes used

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
    "app_name": "Instagram",
    "session_start": "2024-01-15T10:30:00.000Z",
    "session_end": "2024-01-15T10:45:00.000Z",
    "minutes_used": 15,
    "date": "2024-01-15",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Missing session_id or session already ended
- `404 Not Found` - Session not found or doesn't belong to user
- `500 Internal Server Error` - Database error

---

### GET /api/usage/daily

Aggregate daily usage minutes per app for lock evaluation.

**Requirements:** 5.3 - Aggregate daily usage minutes per app for lock evaluation

**Query Parameters:**
- `date` (optional) - Date in YYYY-MM-DD format. Defaults to today.

**Example Request:**
```
GET /api/usage/daily?date=2024-01-15
```

**Response (200 OK):**
```json
{
  "date": "2024-01-15",
  "usage": [
    {
      "app_name": "Instagram",
      "total_minutes": 45,
      "session_count": 3
    },
    {
      "app_name": "YouTube",
      "total_minutes": 30,
      "session_count": 2
    }
  ],
  "total_minutes": 75
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Invalid date format
- `500 Internal Server Error` - Database error

---

## Security

**Row-Level Security (RLS):** Requirement 5.4 - Enforce row-level security so users can only access their own usage sessions

All endpoints enforce authentication and RLS policies ensure users can only:
- Create usage sessions for their own account
- End their own usage sessions
- View their own usage data

## Usage Flow

1. **Start Session:** When user opens an app, call `POST /api/usage/start` with the app name
2. **End Session:** When user closes the app, call `POST /api/usage/end` with the session ID
3. **Check Daily Usage:** To evaluate timer-based locks, call `GET /api/usage/daily` to get total minutes used today

## Integration with Lock Evaluator

The daily usage aggregation is used by the `lockEvaluator` module to determine if timer-based locks should be activated:

```typescript
// Example: Check if Instagram should be locked
const dailyUsage = await fetch('/api/usage/daily?date=2024-01-15');
const { usage } = await dailyUsage.json();
const instagramUsage = usage.find(u => u.app_name === 'Instagram');

if (instagramUsage && instagramUsage.total_minutes >= rule.daily_limit_minutes) {
  // Lock the app
}
```

## Database Schema

```sql
CREATE TABLE usage_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app_name       TEXT NOT NULL,
  session_start  TIMESTAMPTZ NOT NULL,
  session_end    TIMESTAMPTZ,
  minutes_used   INTEGER,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_sessions_user_date ON usage_sessions(user_id, date DESC);
CREATE INDEX idx_usage_sessions_app ON usage_sessions(user_id, app_name, date);
```
