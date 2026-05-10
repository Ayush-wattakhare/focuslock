# Vercel Cron Jobs

This directory contains all Vercel Cron job endpoints for FocusLock. These endpoints are automatically triggered by Vercel's cron scheduler based on the schedules defined in `vercel.json`.

## Overview

FocusLock uses four cron jobs to automate key features:

1. **Daily Streak Check** - Runs at midnight UTC to update user streaks
2. **Weekly Challenge Generation** - Runs Monday 6 AM UTC to create new challenges
3. **Bedtime Mode Check** - Runs every 15 minutes to manage bedtime locks
4. **Weekly AI Insights** - Runs Monday 9 AM UTC to generate AI coaching insights

## Endpoints

### 1. `/api/cron/streak-check`

**Schedule**: `0 0 * * *` (midnight UTC, daily)

**Purpose**: Check all users for yesterday's compliance and update streaks

**Actions**:
- Checks if each user had any overrides yesterday
- Increments streak for compliant users
- Resets streak to 0 for users who overrode locks
- Sends buddy notifications for broken streaks
- Awards streak-related badges (7-day, 30-day)

**Response**:
```json
{
  "streaks_incremented": 42,
  "streaks_broken": 8,
  "errors": []
}
```

---

### 2. `/api/cron/generate-challenges`

**Schedule**: `0 6 * * 1` (Monday 6 AM UTC, weekly)

**Purpose**: Generate weekly challenges based on previous week's performance

**Actions**:
- Analyzes previous week's override logs per user
- Identifies worst-performing app (most overrides)
- Calculates average daily usage for that app
- Creates 5-day challenge with 30% reduction goal
- Sends notification to user about new challenge

**Response**:
```json
{
  "challenges_created": 35,
  "users_processed": 50
}
```

---

### 3. `/api/cron/bedtime-check`

**Schedule**: `*/15 * * * *` (every 15 minutes)

**Purpose**: Activate/deactivate bedtime mode locks based on user schedules

**Actions**:
- Checks all users with bedtime mode enabled
- Determines if current time is within bedtime window
- Deactivates lock_rules during bedtime hours
- Reactivates lock_rules after wake time
- Supports separate weekday/weekend schedules

**Response**:
```json
{
  "users_checked": 25,
  "locks_activated": 120,
  "locks_deactivated": 0
}
```

---

### 4. `/api/cron/weekly-insights`

**Schedule**: `0 9 * * 1` (Monday 9 AM UTC, weekly)

**Purpose**: Generate AI coaching insights for active users

**Actions**:
- Identifies users with overrides in past 7 days
- Fetches override logs for each active user
- Calls Claude API to generate personalized insights
- Caches insights in buddy_notifications table
- Rate limits API calls (1 second delay between users)

**Response**:
```json
{
  "insights_generated": 28,
  "users_processed": 30,
  "errors": []
}
```

---

## Authentication

All cron endpoints require authentication using the `CRON_SECRET` environment variable.

**Request Format**:
```bash
curl -X POST https://your-app.vercel.app/api/cron/streak-check \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Security**:
- CRON_SECRET must be set in Vercel environment variables
- Requests without valid Authorization header return 401 Unauthorized
- Secret should be a cryptographically secure random string

**Generate a secure secret**:
```bash
openssl rand -base64 32
```

---

## Configuration

### vercel.json

Cron schedules are defined in the root `vercel.json` file:

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

### Cron Schedule Format

Vercel uses standard cron syntax: `minute hour day month weekday`

Examples:
- `0 0 * * *` - Every day at midnight
- `0 6 * * 1` - Every Monday at 6 AM
- `*/15 * * * *` - Every 15 minutes
- `0 9 * * 1` - Every Monday at 9 AM

**Note**: All times are in UTC.

---

## Testing

### Local Testing

Cron jobs don't run automatically in local development. Test manually using curl:

```bash
# Load CRON_SECRET from .env.local
export CRON_SECRET=$(grep CRON_SECRET .env.local | cut -d '=' -f2)

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

### Automated Testing

Use the provided test script:

```bash
# Make script executable
chmod +x scripts/test-cron-endpoints.sh

# Run tests
./scripts/test-cron-endpoints.sh

# Test against production
./scripts/test-cron-endpoints.sh https://your-app.vercel.app
```

### Vercel Testing

After deploying to Vercel:

1. **View Logs**:
   ```bash
   vercel logs --follow
   ```

2. **Manual Trigger** (requires Vercel CLI):
   ```bash
   vercel cron trigger /api/cron/streak-check
   ```

3. **Check Execution**:
   - Go to Vercel Dashboard → Your Project → Logs
   - Filter by "cron" to see cron job executions
   - Verify successful execution and response data

---

## Monitoring

### Logging

Each cron job logs:
- Execution start time
- Summary statistics (users processed, actions taken)
- Per-user errors (non-critical)
- Unexpected errors (critical)

**View logs in Vercel**:
1. Go to Vercel Dashboard
2. Select your project
3. Click "Logs" tab
4. Filter by "cron" or specific endpoint path

### Error Handling

- **Per-user errors**: Tracked in response JSON, processing continues
- **Critical errors**: Return HTTP 500, stop execution
- **Rate limiting**: Handled with exponential backoff (weekly-insights)
- **Database errors**: Logged and returned in response

### Health Checks

Monitor cron job health by:
1. Checking Vercel logs for execution frequency
2. Querying database for recent updates
3. Setting up alerts for repeated failures
4. Monitoring response times and error rates

---

## Troubleshooting

### Cron jobs not executing

**Symptoms**: No logs in Vercel dashboard, database not updating

**Solutions**:
1. Verify `vercel.json` is in project root
2. Check cron configuration syntax
3. Ensure project is deployed to Vercel (crons don't run locally)
4. Verify Vercel plan supports cron jobs (Hobby plan: 1 cron, Pro: unlimited)

### Authentication failures

**Symptoms**: HTTP 401 responses in logs

**Solutions**:
1. Verify CRON_SECRET is set in Vercel environment variables
2. Check secret matches in both Vercel and cron configuration
3. Ensure Authorization header format: `Bearer <secret>`
4. Regenerate secret if compromised

### Database errors

**Symptoms**: HTTP 500 responses, "Failed to fetch" errors

**Solutions**:
1. Verify Supabase connection is working
2. Check RLS policies allow service role access
3. Ensure all required tables exist
4. Verify SUPABASE_SERVICE_ROLE_KEY is set

### Claude API errors

**Symptoms**: Weekly insights failing, rate limit errors

**Solutions**:
1. Verify ANTHROPIC_API_KEY is set
2. Check API rate limits (default: 1 req/sec)
3. Monitor API quota usage in Anthropic dashboard
4. Increase delay between users if needed

### Performance issues

**Symptoms**: Timeouts, slow execution

**Solutions**:
1. Optimize database queries (add indexes)
2. Batch process users (process in chunks)
3. Increase Vercel function timeout (max 60s on Hobby, 300s on Pro)
4. Consider splitting large cron jobs into smaller ones

---

## Dependencies

### Core Modules

- `lib/core/streakManager.ts` - Streak calculation and updates
- `lib/core/aiCoach.ts` - AI insights generation
- `lib/supabase/server.ts` - Database client

### Database Tables

- `profiles` - User accounts
- `streaks` - Streak tracking
- `override_logs` - Override history
- `usage_sessions` - Usage tracking
- `weekly_challenges` - Challenge records
- `bedtime_settings` - Bedtime configuration
- `lock_rules` - Lock rule management
- `buddy_notifications` - Notification system

### External Services

- **Supabase**: Database and authentication
- **Claude API (Anthropic)**: AI insights generation
- **Vercel Cron**: Scheduled execution

---

## Best Practices

### Idempotency

All cron jobs are designed to be idempotent (safe to retry):
- Streak checks use date-based logic (yesterday's date)
- Challenge generation checks for existing challenges
- Bedtime checks are time-based (current time)
- AI insights use caching to avoid duplicates

### Error Handling

- Per-user errors don't stop processing
- Critical errors are logged and returned
- Graceful degradation for non-critical operations
- Comprehensive error messages for debugging

### Performance

- Batch database queries where possible
- Rate limit external API calls
- Use indexes for efficient queries
- Log execution time for monitoring

### Security

- Always validate CRON_SECRET
- Use service role key for database access
- Never expose secrets in logs
- Rotate secrets regularly

---

## Future Enhancements

Potential improvements:

1. **Distributed Locking**: Prevent concurrent executions
2. **Retry Queue**: Retry failed operations
3. **Metrics Dashboard**: Visualize cron job performance
4. **Email Notifications**: Send insights via email
5. **Webhook Support**: Trigger external services
6. **Batch Processing**: Process users in parallel batches

---

## Related Documentation

- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Detailed implementation notes
- [vercel.json](../../../vercel.json) - Cron configuration
- [lib/core/streakManager.ts](../../../lib/core/streakManager.ts) - Streak logic
- [lib/core/aiCoach.ts](../../../lib/core/aiCoach.ts) - AI insights logic

---

## Support

For issues or questions:
1. Check Vercel logs for error messages
2. Review this documentation
3. Check related module documentation
4. Open an issue on GitHub
