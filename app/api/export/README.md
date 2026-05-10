# Data Export API

## Overview

The Data Export API provides users with the ability to download all their FocusLock data in JSON format. This endpoint is essential for data portability and GDPR compliance, allowing users to maintain ownership of their information.

## Endpoint

### GET /api/export

Generates a comprehensive JSON export of all user data.

**Authentication:** Required (Bearer token via Supabase Auth)

**Response Format:** JSON file download

**Response Headers:**
- `Content-Type: application/json`
- `Content-Disposition: attachment; filename="focuslock-data-export-YYYY-MM-DD.json"`

## Response Structure

```typescript
interface DataExportResponse {
  metadata: {
    export_date: string;        // ISO 8601 timestamp
    user_id: string;            // User's UUID
    user_email: string;         // User's email address
    full_name: string | null;   // User's full name
    timezone: string;           // User's timezone
  };
  lock_rules: LockRule[];       // All lock rules
  override_logs: OverrideLog[]; // All override logs
  usage_sessions: UsageSession[]; // All usage sessions
  streaks: Streak | null;       // Streak data (null if not initialized)
  badges: UserBadge[];          // All earned badges with definitions
  buddies: Buddy[];             // All buddy relationships (as user and as buddy)
  pomodoro_sessions: PomodoroSession[]; // All Pomodoro sessions
  weekly_challenges: WeeklyChallenge[]; // All weekly challenges
}
```

## Data Included

The export includes data from the following tables:

1. **lock_rules** - All lock rules created by the user
2. **override_logs** - Complete history of lock overrides
3. **usage_sessions** - All app usage tracking data
4. **streaks** - Current and longest streak information
5. **badges** - All earned badges with their definitions
6. **buddies** - Accountability buddy relationships (both directions)
7. **pomodoro_sessions** - All Pomodoro focus sessions
8. **weekly_challenges** - All weekly challenge records

## Privacy & Security

- **User Isolation:** Only exports data belonging to the authenticated user
- **Row-Level Security:** Enforced by Supabase RLS policies
- **No Third-Party Sharing:** Data is never shared with external services
- **GDPR Compliant:** Supports data portability requirements

## Example Usage

### JavaScript/TypeScript

```typescript
async function exportUserData() {
  const response = await fetch('/api/export', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  // Download as file
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `focuslock-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
```

### cURL

```bash
curl -X GET https://focuslock.app/api/export \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o focuslock-export.json
```

## Error Responses

### 401 Unauthorized

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required"
  }
}
```

**Cause:** User is not authenticated or token is invalid.

### 500 Internal Server Error

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to fetch [table_name]",
    "details": "Error details"
  }
}
```

**Cause:** Database query failed. Check server logs for details.

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

**Cause:** Unexpected server error. Check server logs for details.

## Implementation Details

### Data Aggregation

The endpoint performs the following operations:

1. Authenticates the user via Supabase Auth
2. Fetches user profile for metadata
3. Queries all relevant tables with user_id filter
4. Handles buddy relationships from both perspectives (user and buddy)
5. Gracefully handles missing data (e.g., no streaks for new users)
6. Combines all data into a single JSON structure
7. Returns with appropriate download headers

### Performance Considerations

- **Query Optimization:** Uses indexed columns (user_id) for fast lookups
- **Parallel Queries:** Could be optimized with Promise.all() for concurrent fetches
- **Data Volume:** Export size depends on user activity (typically < 1MB)
- **Rate Limiting:** Consider implementing rate limits for large-scale exports

### Testing

Comprehensive test coverage includes:

- Authentication validation
- Complete data export verification
- Individual table inclusion checks
- Download header validation
- Error handling for database failures
- Edge cases (no streaks, empty tables)
- Privacy enforcement (user isolation)

Run tests:
```bash
npm test -- app/api/export/__tests__/export.test.ts
```

## Related Requirements

This endpoint implements the following requirements from the FocusLock specification:

- **Requirement 22.1:** Users can export all their data in JSON format
- **Requirement 22.2:** Export includes all tables (lock_rules, override_logs, usage_sessions, streaks, badges, buddies, pomodoro_sessions, weekly_challenges)
- **Requirement 22.3:** Export is downloadable as a file
- **Requirement 22.4:** Export respects user privacy (only their own data)
- **Requirement 22.5:** Export includes metadata (export date, user info)

## Future Enhancements

Potential improvements for future versions:

1. **Format Options:** Support CSV, XML, or other export formats
2. **Selective Export:** Allow users to choose which tables to export
3. **Date Range Filtering:** Export data for specific time periods
4. **Compression:** Gzip compression for large exports
5. **Scheduled Exports:** Automatic weekly/monthly exports
6. **Email Delivery:** Send export to user's email address
7. **Incremental Exports:** Export only data changed since last export

## Support

For issues or questions about the Data Export API:

- Check server logs for detailed error messages
- Verify authentication token is valid
- Ensure user has data to export
- Contact support with export_date from metadata for troubleshooting
