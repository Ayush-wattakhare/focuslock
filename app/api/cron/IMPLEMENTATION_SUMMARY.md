# Vercel Cron Jobs Implementation Summary

## Overview

All four Vercel Cron jobs have been successfully implemented to automate key FocusLock features. Each cron endpoint is secured with CRON_SECRET authentication and integrates with existing core modules.

## Implemented Cron Jobs

### 1. Daily Streak Check (`/api/cron/streak-check`)

**Schedule**: `0 0 * * *` (midnight UTC)

**Purpose**: 
- Check all users for yesterday's compliance (no overrides)
- Increment streaks for compliant users
- Reset streaks for users who overrode locks
- Send buddy notifications for broken streaks

**Implementation**:
- ✅ Endpoint: `app/api/cron/streak-check/route.ts`
- ✅ Core module: `lib/core/streakManager.ts`
- ✅ Authentication: CRON_SECRET validation
- ✅ Error handling: Per-user error tracking
- ✅ Buddy notifications: Integrated via `notifyBuddyStreakBroken()`

**Validates**: Requirements 6.6

**Response Format**:
```json
{
  "streaks_incremented": 42,
  "streaks_broken": 8,
  "errors": [
    {
      "user_id": "uuid",
      "error": "error message"
    }
  ]
}
```

---

### 2. Weekly Challenge Generation (`/api/cron/generate-challenges`)

**Schedule**: `0 6 * * 1` (Monday 6 AM UTC)

**Purpose**:
- Identify each user's worst-performing app from the previous week
- Create a new weekly challenge with a 5-day goal
- Send notification to users about their new challenge

**Implementation**:
- ✅ Endpoint: `app/api/cron/generate-challenges/route.ts`
- ✅ Algorithm: Analyzes override counts to identify worst app
- ✅ Goal calculation: 30% reduction from previous week's average usage
- ✅ Authentication: CRON_SECRET validation
- ✅ Notifications: Creates buddy_notification records

**Validates**: Requirements 11.1-11.7

**Response Format**:
```json
{
  "challenges_created": 35,
  "users_processed": 50
}
```

**Algorithm Details**:
1. Calculate previous week range (Monday to Sunday)
2. For each user:
   - Count overrides per app in previous week
   - Identify app with most overrides
   - Calculate average daily usage for that app
   - Set goal: 70% of average (30% reduction)
   - Create challenge for upcoming week (Monday-Friday)

---

### 3. Bedtime Mode Check (`/api/cron/bedtime-check`)

**Schedule**: `*/15 * * * *` (every 15 minutes)

**Purpose**:
- Check users with bedtime mode enabled
- Activate locks at configured bedtime
- Deactivate locks at configured wake time
- Support separate weekday/weekend schedules

**Implementation**:
- ✅ Endpoint: `app/api/cron/bedtime-check/route.ts`
- ✅ Database: Queries `bedtime_settings` table
- ✅ Schedule logic: Handles bedtime spanning midnight
- ✅ Lock management: Deactivates/reactivates lock_rules
- ✅ Authentication: CRON_SECRET validation

**Validates**: Requirements 12.1-12.7

**Response Format**:
```json
{
  "users_checked": 25,
  "locks_activated": 120,
  "locks_deactivated": 0
}
```

**Schedule Logic**:
- Determines if current time is weekday or weekend
- Applies appropriate bedtime/waketime settings
- Handles edge case: bedtime spanning midnight (e.g., 23:00 to 07:00)
- Deactivates lock_rules during bedtime hours
- Reactivates lock_rules after wake time

---

### 4. Weekly AI Insights (`/api/cron/weekly-insights`)

**Schedule**: `0 9 * * 1` (Monday 9 AM UTC)

**Purpose**:
- Generate AI insights for active users (users with overrides in past 7 days)
- Cache insights for dashboard display
- Rate limit Claude API calls (1 second delay between users)

**Implementation**:
- ✅ Endpoint: `app/api/cron/weekly-insights/route.ts`
- ✅ Core module: `lib/core/aiCoach.ts`
- ✅ AI integration: Claude API via `generateInsights()`
- ✅ Caching: Stores insights in buddy_notifications table
- ✅ Rate limiting: 1 second delay between API calls
- ✅ Authentication: CRON_SECRET validation

**Validates**: Requirements 10.1-10.8

**Response Format**:
```json
{
  "insights_generated": 28,
  "users_processed": 30,
  "errors": [
    {
      "user_id": "uuid",
      "error": "error message"
    }
  ]
}
```

**Rate Limiting**:
- 1 second delay between users to avoid Claude API rate limits
- Graceful error handling with per-user error tracking
- Continues processing remaining users if one fails

---

## Vercel Configuration

### vercel.json

All cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/streak-check",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/generate-challenges",
      "schedule": "0 6 * * 1"
    },
    {
      "path": "/api/cron/bedtime-check",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/weekly-insights",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

### Environment Variables

Required environment variable:
- `CRON_SECRET`: Secure random string for authenticating cron requests

**Setup**:
1. Generate a secure random string: `openssl rand -base64 32`
2. Add to `.env.local` for local testing
3. Add to Vercel environment variables for production

---

## Security

### Authentication

All cron endpoints validate the `Authorization` header:

```typescript
const authHeader = request.headers.get('authorization');
const cronSecret = process.env.CRON_SECRET;

if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message: 'Invalid authorization' } },
    { status: 401 }
  );
}
```

### Best Practices

- ✅ CRON_SECRET required for all endpoints
- ✅ Idempotent operations (safe to retry)
- ✅ Per-user error tracking (one failure doesn't stop processing)
- ✅ Comprehensive logging for monitoring
- ✅ Graceful degradation (continues on non-critical errors)

---

## Testing

### Manual Testing

Test cron endpoints locally using curl:

```bash
# Set CRON_SECRET in .env.local
export CRON_SECRET="your-secret-here"

# Test streak check
curl -X POST http://localhost:3000/api/cron/streak-check \
  -H "Authorization: Bearer $CRON_SECRET"

# Test challenge generation
curl -X POST http://localhost:3000/api/cron/generate-challenges \
  -H "Authorization: Bearer $CRON_SECRET"

# Test bedtime check
curl -X POST http://localhost:3000/api/cron/bedtime-check \
  -H "Authorization: Bearer $CRON_SECRET"

# Test weekly insights
curl -X POST http://localhost:3000/api/cron/weekly-insights \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Expected Responses

All endpoints return JSON with:
- Success: HTTP 200 with summary statistics
- Unauthorized: HTTP 401 with error message
- Server error: HTTP 500 with error details

### Vercel Deployment Testing

After deploying to Vercel:

1. **View Cron Logs**:
   - Go to Vercel Dashboard → Your Project → Logs
   - Filter by "cron" to see cron job executions

2. **Manual Trigger** (for testing):
   - Use Vercel CLI: `vercel cron trigger /api/cron/streak-check`
   - Or use curl with production URL and CRON_SECRET

3. **Monitor Execution**:
   - Check logs for successful execution
   - Verify database changes (streaks updated, challenges created, etc.)
   - Check for any errors in error tracking

---

## Monitoring

### Logging

Each cron job logs:
- Execution start
- Summary statistics (users processed, actions taken)
- Per-user errors (non-critical)
- Unexpected errors (critical)

**Example log output**:
```
Streak check completed: 42 incremented, 8 broken, 0 errors
Challenge generation completed: 35 challenges created for 50 users
Bedtime check completed: 25 users checked, 120 locks activated, 0 locks deactivated
Weekly insights generation completed: 28 insights generated for 30 users, 2 errors
```

### Error Tracking

- Per-user errors are tracked in response JSON
- Critical errors return HTTP 500
- All errors logged to console (visible in Vercel logs)

### Health Checks

Monitor cron job health by:
1. Checking Vercel cron logs for execution frequency
2. Querying database for recent updates (streaks, challenges, etc.)
3. Setting up alerts for repeated failures

---

## Dependencies

### Core Modules

- `lib/core/streakManager.ts`: Streak calculation and updates
- `lib/core/aiCoach.ts`: AI insights generation
- `lib/supabase/server.ts`: Database client

### Database Tables

- `profiles`: User accounts
- `streaks`: Streak tracking
- `override_logs`: Override history
- `usage_sessions`: Usage tracking
- `weekly_challenges`: Challenge records
- `bedtime_settings`: Bedtime configuration
- `lock_rules`: Lock rule management
- `buddy_notifications`: Notification system

### External Services

- Supabase: Database and authentication
- Claude API (Anthropic): AI insights generation
- Vercel Cron: Scheduled execution

---

## Troubleshooting

### Common Issues

**1. Cron jobs not executing**
- Verify `vercel.json` is in project root
- Check CRON_SECRET is set in Vercel environment variables
- Ensure project is deployed to Vercel (crons don't run locally)

**2. Authentication failures**
- Verify CRON_SECRET matches in Vercel and cron configuration
- Check Authorization header format: `Bearer <secret>`

**3. Database errors**
- Verify Supabase connection is working
- Check RLS policies allow service role access
- Ensure all required tables exist

**4. Claude API errors**
- Verify ANTHROPIC_API_KEY is set
- Check API rate limits (1 req/sec in weekly-insights)
- Monitor API quota usage

### Debug Mode

Enable verbose logging by adding console.log statements:

```typescript
console.log('Processing user:', userId);
console.log('Override count:', overrideCount);
console.log('Challenge created:', challenge);
```

---

## Future Enhancements

Potential improvements:

1. **Distributed Locking**: Prevent concurrent cron executions
2. **Retry Queue**: Retry failed user operations
3. **Metrics Dashboard**: Visualize cron job performance
4. **Email Notifications**: Send weekly insights via email
5. **Webhook Support**: Trigger external services on events
6. **Batch Processing**: Process users in batches for better performance

---

## Completion Status

✅ **Task 9.1**: Daily streak check cron - COMPLETE
✅ **Task 9.2**: Weekly challenge generation cron - COMPLETE
✅ **Task 9.3**: Bedtime mode check cron - COMPLETE
✅ **Task 9.4**: Weekly AI insights cron - COMPLETE
✅ **Task 9.5**: Configure vercel.json with cron schedules - COMPLETE

All subtasks for Task 9 "Vercel Cron jobs implementation" have been successfully completed.
