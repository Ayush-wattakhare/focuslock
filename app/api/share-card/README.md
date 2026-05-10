# Share Card API

## Overview

The Share Card API generates shareable progress statistics for users to share on social media platforms. It aggregates weekly data including time saved, compliance percentage, current streak, and includes the FocusLock watermark.

## Endpoint

**GET** `/api/share-card`

## Authentication

Requires valid user authentication via Supabase Auth.

## Response Format

```typescript
interface ShareCardResponse {
  timeSaved: number;           // Minutes saved this week
  compliancePercentage: number; // Percentage of days without overrides (0-100)
  currentStreak: number;        // Current streak count
  watermark: string;            // "focuslock.app"
}
```

## Example Response

```json
{
  "timeSaved": 180,
  "compliancePercentage": 85.7,
  "currentStreak": 12,
  "watermark": "focuslock.app"
}
```

## Calculation Logic

### Time Saved
- Calculated as: `(days without override) × (average daily usage)`
- Based on current week's usage sessions (Monday to Sunday)
- Represents time that would have been wasted if locks were overridden

### Compliance Percentage
- Calculated as: `(days without override / total days) × 100`
- Based on current week (7 days)
- Rounded to 1 decimal place
- 100% means no overrides for the entire week

### Current Streak
- Fetched directly from the `streaks` table
- Represents consecutive days without any overrides
- Maintained by the streak check cron job

## Data Sources

1. **usage_sessions** - Weekly usage data for time saved calculation
2. **override_logs** - Override events for compliance calculation
3. **streaks** - Current streak data

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

### 500 Database Error
```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to fetch usage sessions",
    "details": "..."
  }
}
```

### 500 Internal Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## Usage Example

```typescript
// Fetch share card data
const response = await fetch('/api/share-card', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();

// Use data to generate shareable image
console.log(`Time Saved: ${data.timeSaved} minutes`);
console.log(`Compliance: ${data.compliancePercentage}%`);
console.log(`Streak: ${data.currentStreak} days`);
```

## Requirements Implemented

- **14.1**: Generate shareable stats card with time saved and compliance %
- **14.2**: Include current streak in share card
- **14.3**: Add FocusLock watermark to share card
- **14.4**: Support export to WhatsApp, Instagram, PNG download (data provided for frontend implementation)

## Related Components

- **ShareCard Component** (`components/ShareCard.jsx`) - Frontend component that renders the visual card
- **Stats API** (`/api/stats`) - Provides detailed weekly statistics
- **Streak API** (`/api/streak`) - Provides streak data

## Testing

Tests are located in `__tests__/api/share-card.test.ts` and cover:
- Authentication validation
- Data aggregation and calculation
- Error handling
- Default values for new users
- Watermark inclusion

Run tests with:
```bash
npm test -- __tests__/api/share-card.test.ts
```
