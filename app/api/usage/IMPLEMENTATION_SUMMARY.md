# Usage Sessions API - Implementation Summary

## Task 4.5: Implement usage sessions API

**Status:** ✅ Complete

**Requirements Implemented:**
- ✅ 5.1: When a usage session begins, record user ID, app name, session start timestamp, and date
- ✅ 5.2: When a usage session ends, record session end timestamp and calculate minutes used
- ✅ 5.3: Aggregate daily usage minutes per app for lock evaluation
- ✅ 5.4: Enforce row-level security so users can only access their own usage sessions

## Files Created

### 1. `/app/api/usage/start/route.ts`
**Purpose:** Start a new usage session

**Key Features:**
- Records user ID, app name, session start timestamp, and date
- Validates authentication and required fields
- Returns created session with all fields
- Proper error handling with structured error responses

**API Contract:**
```typescript
POST /api/usage/start
Body: { app_name: string }
Response: { session: UsageSession }
```

### 2. `/app/api/usage/end/route.ts`
**Purpose:** End an active usage session and calculate duration

**Key Features:**
- Validates session exists and belongs to authenticated user
- Prevents ending already-ended sessions
- Calculates duration in minutes from start to end time
- Updates session_end and minutes_used fields
- Proper error handling for not found and validation errors

**API Contract:**
```typescript
POST /api/usage/end
Body: { session_id: string }
Response: { session: UsageSession }
```

### 3. `/app/api/usage/daily/route.ts`
**Purpose:** Aggregate daily usage minutes per app

**Key Features:**
- Accepts optional date query parameter (defaults to today)
- Validates date format (YYYY-MM-DD)
- Aggregates total minutes and session count per app
- Only includes completed sessions (where minutes_used is not null)
- Returns sorted results (highest usage first)
- Calculates total minutes across all apps

**API Contract:**
```typescript
GET /api/usage/daily?date=YYYY-MM-DD
Response: {
  date: string,
  usage: Array<{ app_name, total_minutes, session_count }>,
  total_minutes: number
}
```

### 4. `/app/api/usage/README.md`
**Purpose:** API documentation

**Contents:**
- Endpoint descriptions with examples
- Request/response schemas
- Error response documentation
- Security notes about RLS
- Usage flow explanation
- Integration guidance with lockEvaluator
- Database schema reference

### 5. `/app/api/usage/IMPLEMENTATION_SUMMARY.md`
**Purpose:** Implementation documentation (this file)

## Design Decisions

### 1. Session Start Endpoint
- **Decision:** Automatically set `date` field to current date
- **Rationale:** Simplifies client code and ensures consistency
- **Requirement:** 5.1 specifies recording the date

### 2. Session End Endpoint
- **Decision:** Calculate minutes_used on the server side
- **Rationale:** Ensures accurate calculation, prevents client manipulation
- **Requirement:** 5.2 specifies calculating minutes used

### 3. Duration Calculation
- **Decision:** Round to nearest minute using `Math.round()`
- **Rationale:** Provides reasonable precision without fractional minutes
- **Alternative Considered:** `Math.ceil()` - rejected as it would overcount short sessions

### 4. Daily Aggregation Endpoint
- **Decision:** Use GET method with query parameter for date
- **Rationale:** Follows REST conventions for read operations
- **Requirement:** 5.3 specifies aggregation for lock evaluation

### 5. Incomplete Sessions
- **Decision:** Exclude sessions where `minutes_used` is null from daily aggregation
- **Rationale:** Only completed sessions should count toward daily limits
- **Edge Case:** Handles app crashes or sessions not properly ended

### 6. Error Handling
- **Decision:** Structured error responses with code, message, and optional details
- **Rationale:** Consistent with existing API patterns (rules, override)
- **Pattern:**
  ```typescript
  {
    error: {
      code: 'ERROR_CODE',
      message: 'Human-readable message',
      details?: 'Additional context'
    }
  }
  ```

## Security Implementation

### Authentication
All endpoints verify authentication using:
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
```

Returns `401 Unauthorized` if user is not authenticated.

### Row-Level Security (RLS)
- Database RLS policies enforce user isolation
- All queries filter by `user_id = auth.uid()`
- Users cannot access other users' sessions
- **Requirement 5.4:** ✅ Implemented

### Validation
- Required fields validated before database operations
- Date format validated with regex: `/^\d{4}-\d{2}-\d{2}$/`
- Session ownership verified before ending sessions

## Integration Points

### 1. Lock Evaluator Integration
The daily aggregation endpoint is designed to be called by `lockEvaluator.evaluateLock()` when evaluating timer-based locks:

```typescript
// In lockEvaluator.ts
async function evaluateTimerLock(rule, now, userId) {
  const response = await fetch(`/api/usage/daily?date=${formatDate(now)}`);
  const { usage } = await response.json();
  const appUsage = usage.find(u => u.app_name === rule.app_name);
  const todayMinutes = appUsage?.total_minutes || 0;
  
  return todayMinutes >= rule.daily_limit_minutes;
}
```

### 2. Client Usage Flow
```typescript
// 1. User opens app
const startResponse = await fetch('/api/usage/start', {
  method: 'POST',
  body: JSON.stringify({ app_name: 'Instagram' })
});
const { session } = await startResponse.json();

// 2. User uses app...

// 3. User closes app
await fetch('/api/usage/end', {
  method: 'POST',
  body: JSON.stringify({ session_id: session.id })
});
```

### 3. Dashboard Integration
```typescript
// Display today's usage
const response = await fetch('/api/usage/daily');
const { usage, total_minutes } = await response.json();

// Show per-app breakdown
usage.forEach(app => {
  console.log(`${app.app_name}: ${app.total_minutes} minutes`);
});
```

## Testing Considerations

### Unit Tests (Future)
- Test session start with valid/invalid data
- Test session end with valid/invalid session IDs
- Test duration calculation accuracy
- Test daily aggregation with multiple sessions
- Test date parameter validation

### Integration Tests (Future)
- Test complete session lifecycle (start → end)
- Test RLS policies with different users
- Test aggregation with overlapping sessions
- Test timezone handling

### Edge Cases Handled
1. ✅ Missing required fields → 400 Bad Request
2. ✅ Invalid date format → 400 Bad Request
3. ✅ Session already ended → 400 Bad Request
4. ✅ Session not found → 404 Not Found
5. ✅ Unauthenticated user → 401 Unauthorized
6. ✅ Incomplete sessions excluded from aggregation
7. ✅ Empty usage data returns empty array

## Performance Considerations

### Database Indexes
The implementation relies on existing indexes:
```sql
CREATE INDEX idx_usage_sessions_user_date ON usage_sessions(user_id, date DESC);
CREATE INDEX idx_usage_sessions_app ON usage_sessions(user_id, app_name, date);
```

### Query Optimization
- Daily aggregation filters by user_id and date (indexed)
- Aggregation done in application code (could be moved to database function if needed)
- Results sorted in memory (acceptable for daily data)

### Caching Opportunities (Future)
- Daily aggregation could be cached with 5-minute TTL
- Cache invalidation on session end
- Reduces database load for frequent lock evaluations

## Compliance with Requirements

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| 5.1 - Record session start | ✅ | POST /api/usage/start records user_id, app_name, session_start, date |
| 5.2 - Record session end and calculate duration | ✅ | POST /api/usage/end records session_end and calculates minutes_used |
| 5.3 - Aggregate daily usage | ✅ | GET /api/usage/daily aggregates minutes per app for specified date |
| 5.4 - Enforce RLS | ✅ | All endpoints verify authentication and filter by user_id |

## Next Steps

### Immediate (Task 4.6)
- Write property-based tests for usage sessions
- Test Property 13: Usage Session Start Recording
- Test Property 14: Usage Session Duration Calculation
- Test Property 15: Daily Usage Aggregation

### Future Enhancements
- Add batch session creation for offline sync
- Add session pause/resume functionality
- Add weekly/monthly aggregation endpoints
- Add usage trends and analytics
- Implement caching for daily aggregation
- Add database function for aggregation (performance)

## Conclusion

Task 4.5 is complete. All three endpoints are implemented with:
- ✅ Proper authentication and authorization
- ✅ Input validation
- ✅ Error handling
- ✅ Structured responses
- ✅ RLS enforcement
- ✅ Documentation

The implementation follows the existing API patterns in the codebase and satisfies all requirements 5.1-5.4.
