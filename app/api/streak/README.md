# Streak API

This API manages user streak tracking and daily streak checks.

## Endpoints

### GET /api/streak

Fetches the authenticated user's current streak data.

**Authentication:** Required (user session)

**Response:**
```json
{
  "current_streak": 7,
  "longest_streak": 14,
  "last_active_date": "2024-01-15"
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `500 Internal Server Error` - Database error

---

### POST /api/streak/check

Daily cron job endpoint that checks and updates streaks for all users.

**Authentication:** Required (cron secret via Bearer token)

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "success": true,
  "streaksIncremented": 150,
  "streaksBroken": 12,
  "errors": []
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing cron secret
- `500 Internal Server Error` - Server configuration error or execution error

**Cron Schedule:**
- Runs daily at midnight UTC (configured in `vercel.json`)
- Schedule: `0 0 * * *`

## Implementation Details

### Streak Logic

The streak system follows these rules:

1. **Increment Streak**: If a user had no overrides yesterday, their `current_streak` increments by 1
2. **Break Streak**: If a user had any overrides yesterday, their `current_streak` resets to 0
3. **Longest Streak**: When `current_streak` exceeds `longest_streak`, the longest is updated
4. **Buddy Notification**: When a streak is broken, all active buddies are notified
5. **Badge Awards**: Streak milestones trigger badge checks (7-day, 30-day, etc.)

### Security

- **User Endpoint**: Uses Supabase authentication via session cookies
- **Cron Endpoint**: Uses Bearer token authentication with `CRON_SECRET` environment variable
- **RLS Policies**: Database-level security ensures users can only access their own streak data

### Environment Variables

```env
CRON_SECRET=your_secure_random_string
```

Generate a secure random string for production:
```bash
openssl rand -base64 32
```

## Related Modules

- `lib/core/streakManager.ts` - Core streak business logic
- `lib/core/badgeEngine.ts` - Badge awarding system
- `app/api/override/route.ts` - Resets streak on override

## Testing

### Test User Endpoint
```bash
curl http://localhost:3000/api/streak \
  -H "Cookie: sb-access-token=<your-token>"
```

### Test Cron Endpoint
```bash
curl -X POST http://localhost:3000/api/streak/check \
  -H "Authorization: Bearer your_cron_secret"
```

## Requirements Validation

**Validates: Requirements 6.1-6.7**

- ✅ 6.1: Streak initialized on user creation (handled by database trigger)
- ✅ 6.2: Increment streak on compliant days
- ✅ 6.3: Update longest streak when current exceeds it
- ✅ 6.4: Reset current streak on override (handled by override API)
- ✅ 6.5: Update last_active_date on streak increment
- ✅ 6.6: Daily cron job at midnight to check and update streaks
- ✅ 6.7: Row-level security enforced via Supabase RLS policies
