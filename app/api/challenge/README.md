# Weekly Challenge API

This module implements the weekly challenge system where users are challenged to reduce usage of their worst-performing app.

## Endpoints

### POST /api/challenge/generate (Cron Endpoint)

**Purpose**: Generate new weekly challenges for all users (runs Monday 6 AM UTC via Vercel Cron)

**Authentication**: Requires `Authorization: Bearer ${CRON_SECRET}` header

**Requirements Implemented**:
- 11.1: Identify worst app from previous week's usage data
- 11.2: Generate weekly challenge with 5-day goal (reduce usage by 30%)
- 11.6: Send notification when new challenge is generated

**Response**:
```json
{
  "challenges_created": 42,
  "users_processed": 50
}
```

**Algorithm**:
1. Calculate current week range (Monday-Friday)
2. Calculate previous week range for analysis
3. For each user:
   - Query `get_worst_performing_app()` function to find app with most overrides
   - Calculate average daily usage from previous week
   - Set goal: 30% reduction (daily_limit = avg * 0.7)
   - Create challenge record with 5-day goal
   - Send notification to user

**Vercel Cron Configuration** (add to `vercel.json`):
```json
{
  "crons": [{
    "path": "/api/challenge/generate",
    "schedule": "0 6 * * 1"
  }]
}
```

---

### GET /api/challenge/current

**Purpose**: Fetch the active challenge for the current user

**Authentication**: Requires authenticated user session

**Requirements Implemented**:
- 11.7: Display challenge progress on dashboard

**Response**:
```json
{
  "challenge": {
    "id": "uuid",
    "user_id": "uuid",
    "app_name": "Instagram",
    "daily_limit": 21,
    "week_start": "2024-01-15",
    "week_end": "2024-01-19",
    "days_completed": 2,
    "status": "active",
    "created_at": "2024-01-15T06:00:00Z"
  },
  "progress": {
    "days_completed": 2,
    "days_remaining": 3,
    "current_day_usage": 15,
    "is_today_completed": true
  }
}
```

**Returns null if no active challenge**:
```json
{
  "challenge": null,
  "progress": null
}
```

---

### POST /api/challenge/update-progress

**Purpose**: Track daily progress towards the challenge goal

**Authentication**: Requires authenticated user session

**Requirements Implemented**:
- 11.3: Track daily progress with day-dot row (M T W T F)
- 11.4: Mark challenge as completed when goal is met
- 11.5: Award challenge_champion badge on completion

**Request Body**:
```json
{
  "challenge_id": "uuid",
  "date": "2024-01-15" // Optional, defaults to today
}
```

**Response**:
```json
{
  "challenge": {
    "id": "uuid",
    "days_completed": 5,
    "status": "completed"
  },
  "day_completed": true,
  "challenge_completed": true,
  "badge_awarded": true
}
```

**Algorithm**:
1. Verify challenge belongs to user and is active
2. Verify date is within challenge period (week_start to week_end)
3. Query usage_sessions for the specified date and app
4. Calculate total usage for the day
5. Check if usage <= daily_limit
6. If day completed:
   - Increment days_completed
   - If days_completed >= 5:
     - Mark challenge as 'completed'
     - Award 'iron_will' badge via badgeEngine
7. Return progress update

---

## Database Schema

### weekly_challenges Table

```sql
CREATE TABLE weekly_challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app_name        TEXT NOT NULL,
  daily_limit     INTEGER NOT NULL,
  week_start      DATE NOT NULL,
  week_end        DATE NOT NULL,
  days_completed  INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','completed','failed')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Integration Points

### Badge Engine Integration

When a challenge is completed (5 days), the system calls:

```typescript
await checkAndAwardBadges(user.id, 'challenge_completed', {});
```

This triggers the badge engine to award the 'iron_will' badge.

### Notification System

When a new challenge is generated, a buddy_notification is created:

```typescript
await supabase
  .from('buddy_notifications')
  .insert({
    from_user_id: user.id,
    to_user_id: user.id,
    event_type: 'weekly_summary',
    app_name: targetApp.app_name,
    message: `New weekly challenge: Limit ${targetApp.app_name} to ${dailyLimit} minutes/day for 5 days`,
    is_read: false
  });
```

### Database Functions Used

- `get_worst_performing_app(user_id, start_date, end_date)`: Returns app with most overrides in date range
- Defined in: `supabase/migrations/20240101000003_functions_and_triggers.sql`

---

## Error Handling

All endpoints follow the standard error format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": "Optional technical details"
  }
}
```

**Error Codes**:
- `AUTH_REQUIRED`: User not authenticated
- `UNAUTHORIZED`: Invalid cron secret
- `VALIDATION_ERROR`: Invalid input data
- `NOT_FOUND`: Challenge not found
- `INVALID_STATE`: Challenge is not active
- `DATABASE_ERROR`: Database operation failed
- `INTERNAL_ERROR`: Unexpected server error

---

## Testing

### Manual Testing

1. **Generate Challenge** (requires CRON_SECRET):
```bash
curl -X POST http://localhost:3000/api/challenge/generate \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

2. **Get Current Challenge**:
```bash
curl http://localhost:3000/api/challenge/current \
  -H "Cookie: sb-access-token=${TOKEN}"
```

3. **Update Progress**:
```bash
curl -X POST http://localhost:3000/api/challenge/update-progress \
  -H "Cookie: sb-access-token=${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"challenge_id": "uuid"}'
```

### Unit Tests

See `__tests__/api/challenge.test.ts` for comprehensive test coverage.

---

## Future Enhancements

1. **Day Tracking**: Currently days_completed is a simple counter. Consider adding a `days_completed_dates` JSONB field to track specific dates.

2. **Failed Challenges**: Implement logic to mark challenges as 'failed' if the week ends without completion.

3. **Challenge History**: Add endpoint to view past challenges and completion rate.

4. **Custom Challenges**: Allow users to create custom challenges beyond the auto-generated ones.

5. **Challenge Streaks**: Track consecutive weeks of challenge completion.
