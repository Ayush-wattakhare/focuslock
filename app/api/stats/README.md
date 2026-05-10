# Stats API

## Overview

The Stats API provides weekly aggregated statistics for user app usage, compliance metrics, and behavioral insights. This endpoint supports the Statistics Dashboard feature (Requirements 18.1-18.5).

## Endpoint

### GET /api/stats

Retrieves weekly statistics including daily usage breakdown, per-app metrics, week-over-week comparison, compliance percentage, and estimated time saved.

**Authentication:** Required (JWT token via Supabase Auth)

**Query Parameters:**
- `period` (optional): Statistics period. Currently only supports `"week"` (default).

**Response Format:**

```typescript
interface StatsResponse {
  dailyUsage: Array<{
    date: string;              // YYYY-MM-DD format
    apps: Array<{
      app_name: string;
      minutes: number;
    }>;
  }>;
  perAppBreakdown: Array<{
    app_name: string;
    total_minutes: number;
    override_count: number;
  }>;
  weekOverWeek: {
    current_week_minutes: number;
    previous_week_minutes: number;
    change_percentage: number;  // Rounded to 1 decimal place
  };
  compliance: {
    days_without_override: number;
    total_days: number;
    percentage: number;         // Rounded to 1 decimal place
  };
  timeSaved: number;            // Estimated minutes saved
}
```

## Implementation Details

### Week Calculation

- **Current Week**: Monday to Sunday of the current week
- **Previous Week**: Monday to Sunday of the previous week
- Week starts on Monday (ISO 8601 standard)

### Daily Usage

- Aggregates all completed usage sessions (with `minutes_used` not null)
- Groups by date and app name
- Includes all 7 days of the week (even if no usage on some days)
- Sorted chronologically

### Per-App Breakdown

- Aggregates total minutes used per app for the current week
- Counts override events per app
- Sorted by total minutes (descending)

### Week-Over-Week Comparison

- Compares total usage minutes between current and previous week
- Calculates percentage change: `((current - previous) / previous) * 100`
- Positive percentage = increased usage
- Negative percentage = decreased usage

### Compliance Metrics

- **Days Without Override**: Count of days in the current week with no override logs
- **Total Days**: Always 7 (or 8 depending on date range calculation)
- **Percentage**: `(days_without_override / total_days) * 100`

### Time Saved Calculation

Estimates time saved by maintaining lock rules:
```
timeSaved = days_without_override * average_daily_usage
```

This represents the time that would have been used if all locks were overridden.

## Example Request

```bash
curl -X GET "https://focuslock.app/api/stats?period=week" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Example Response

```json
{
  "dailyUsage": [
    {
      "date": "2024-01-15",
      "apps": [
        { "app_name": "Instagram", "minutes": 30 },
        { "app_name": "YouTube", "minutes": 45 }
      ]
    },
    {
      "date": "2024-01-16",
      "apps": [
        { "app_name": "Instagram", "minutes": 20 }
      ]
    },
    {
      "date": "2024-01-17",
      "apps": []
    }
  ],
  "perAppBreakdown": [
    {
      "app_name": "YouTube",
      "total_minutes": 45,
      "override_count": 1
    },
    {
      "app_name": "Instagram",
      "total_minutes": 50,
      "override_count": 2
    }
  ],
  "weekOverWeek": {
    "current_week_minutes": 95,
    "previous_week_minutes": 120,
    "change_percentage": -20.8
  },
  "compliance": {
    "days_without_override": 5,
    "total_days": 7,
    "percentage": 71.4
  },
  "timeSaved": 68
}
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

### 400 Bad Request
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Only \"week\" period is currently supported"
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to fetch usage sessions",
    "details": "Connection timeout"
  }
}
```

## Database Queries

The endpoint performs three main queries:

1. **Current Week Usage Sessions**
   ```sql
   SELECT app_name, minutes_used, date
   FROM usage_sessions
   WHERE user_id = $1
     AND date >= $2  -- Monday of current week
     AND date <= $3  -- Sunday of current week
     AND minutes_used IS NOT NULL
   ```

2. **Previous Week Usage Sessions**
   ```sql
   SELECT minutes_used
   FROM usage_sessions
   WHERE user_id = $1
     AND date >= $2  -- Monday of previous week
     AND date <= $3  -- Sunday of previous week
     AND minutes_used IS NOT NULL
   ```

3. **Current Week Override Logs**
   ```sql
   SELECT app_name, overridden_at
   FROM override_logs
   WHERE user_id = $1
     AND overridden_at >= $2  -- Start of current week
     AND overridden_at <= $3  -- End of current week
   ```

## Performance Considerations

- All queries use indexed columns (`user_id`, `date`, `overridden_at`)
- Week range calculation is done in application code (no database date functions)
- Aggregation is performed in-memory for flexibility
- Response size is bounded by 7 days × number of apps

## Testing

Unit tests are located in `__tests__/api/stats.test.ts` and cover:
- Authentication validation
- Weekly stats calculation
- Per-app breakdown aggregation
- Week-over-week comparison
- Compliance metrics
- Error handling

Run tests:
```bash
npm test __tests__/api/stats.test.ts
```

## Requirements Validation

This implementation satisfies the following requirements:

- **18.1**: Daily usage bar chart data (via `dailyUsage` array)
- **18.2**: Per-app breakdown with total minutes and override count
- **18.3**: Week-over-week comparison with percentage change
- **18.4**: Compliance percentage calculation
- **18.5**: Time saved estimation

## Future Enhancements

Potential improvements for future iterations:

1. Support for custom date ranges (not just weekly)
2. Monthly and yearly aggregations
3. Trend analysis (moving averages)
4. Goal tracking integration
5. Export to CSV/PDF
6. Caching for frequently accessed stats
7. Real-time updates via Supabase Realtime
