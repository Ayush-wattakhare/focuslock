# AI Coach API

## Overview

The AI Coach API provides AI-powered behavioral insights based on user override patterns. It integrates with the Claude API to analyze usage data and deliver compassionate, actionable coaching suggestions.

## Endpoint

```
POST /api/ai-coach
```

## Authentication

Requires valid Supabase authentication. The API checks for a valid user session and returns 401 if not authenticated.

## Rate Limiting

**1 request per hour per user**

The API implements strict rate limiting to:
- Control Claude API costs
- Encourage thoughtful reflection on insights
- Prevent abuse

### Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 1
X-RateLimit-Remaining: 0 (after first request)
X-RateLimit-Reset: <ISO timestamp>
```

When rate limited (429 response):

```
Retry-After: <seconds until reset>
```

## Request

### Body Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `days` | number | No | 7 | Number of days to analyze (1-30) |

### Example Request

```json
POST /api/ai-coach
Content-Type: application/json

{
  "days": 7
}
```

## Response

### Success Response (200)

```json
{
  "insight": "You tend to override locks in the evening, especially around 8-9 PM.",
  "suggestion": "Try scheduling a 10-minute walk at 8 PM to break the pattern.",
  "topMood": "stressed",
  "moodBreakdown": [
    { "mood": "stressed", "count": 5 },
    { "mood": "bored", "count": 3 },
    { "mood": "tired", "count": 1 }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `insight` | string | AI-generated observation about patterns (max 2 sentences) |
| `suggestion` | string | Specific, actionable advice for improvement |
| `topMood` | string \| null | Most common mood trigger, or null if no overrides |
| `moodBreakdown` | array | List of moods with occurrence counts, sorted by frequency |

## Error Responses

### 401 Unauthorized

User is not authenticated.

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required"
  }
}
```

### 429 Rate Limit Exceeded

User has already requested insights within the past hour.

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. You can request new insights in 45 minutes.",
    "retryAfter": 2700000
  }
}
```

### 500 Database Error

Failed to fetch override logs from the database.

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to fetch override logs",
    "details": "..."
  }
}
```

### 503 AI Service Error

Claude API failed to generate insights.

```json
{
  "error": {
    "code": "AI_SERVICE_ERROR",
    "message": "Failed to generate insights. Please try again later.",
    "details": "..."
  }
}
```

## Implementation Details

### Data Flow

1. **Authentication Check**: Verify user session via Supabase
2. **Rate Limit Check**: Ensure user hasn't requested insights in the past hour
3. **Fetch Override Logs**: Query `override_logs` table for the specified time period
4. **Generate Insights**: Call `aiCoach.generateInsights()` with override data
5. **Return Response**: Send insights with rate limit headers

### Integration with aiCoach Module

The API delegates insight generation to `lib/core/aiCoach.ts`, which:
- Formats override data for Claude API
- Calculates mood breakdown
- Builds coaching prompt with pattern analysis
- Calls Claude API with retry logic
- Caches insights for 24 hours
- Falls back to encouraging messages on API failure

### Caching

The `aiCoach` module implements 24-hour caching of insights:
- Cache key: `${userId}-${days}`
- Reduces Claude API calls
- Improves response time for repeated requests
- Cache is in-memory (consider Redis for production)

### Rate Limiting Implementation

The API uses an in-memory Map to track request timestamps:
- Key: `userId`
- Value: `timestamp` of last request
- Window: 1 hour (3,600,000 ms)

**Production Considerations:**
- Current implementation uses in-memory storage
- For distributed systems, use Redis or similar
- Consider implementing sliding window algorithm
- Add monitoring for rate limit violations

## Requirements Validation

This API satisfies the following requirements:

**Requirement 10.1-10.8: AI Coaching and Behavioral Insights**

- ✅ 10.1: Retrieves override logs from past 7 days (configurable)
- ✅ 10.2: Sends data to Claude API with coaching prompt
- ✅ 10.3: Analyzes time-of-day, mood, and app patterns
- ✅ 10.4: Returns key insight (max 2 sentences)
- ✅ 10.5: Returns specific actionable suggestion
- ✅ 10.6: Identifies most common mood trigger
- ✅ 10.7: Parses JSON response from Claude
- ✅ 10.8: Displays insights with warm, non-judgmental tone

**Rate Limiting:**
- ✅ 1 request per hour per user
- ✅ Retry-After header in 429 responses
- ✅ Rate limit headers in all responses

## Usage Example

```typescript
// Client-side usage
async function getAIInsights(days: number = 7) {
  try {
    const response = await fetch('/api/ai-coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ days }),
    });

    if (response.status === 429) {
      const error = await response.json();
      const retryMinutes = Math.ceil(error.error.retryAfter / 60000);
      alert(`Please wait ${retryMinutes} minutes before requesting new insights.`);
      return null;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch insights');
    }

    const insights = await response.json();
    return insights;
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    return null;
  }
}
```

## Testing

Unit tests are located in `__tests__/api/ai-coach.test.ts` and cover:

- ✅ Authentication validation
- ✅ Rate limiting (first request allowed, second blocked)
- ✅ Rate limit headers
- ✅ Override logs fetching (default 7 days, custom days)
- ✅ AI insights generation
- ✅ Error handling (database errors, AI service errors)
- ✅ Edge cases (empty body, invalid days parameter)

Run tests:

```bash
npm test -- __tests__/api/ai-coach.test.ts
```

## Related Files

- **API Route**: `app/api/ai-coach/route.ts`
- **Core Module**: `lib/core/aiCoach.ts`
- **Config**: `config/ai.ts`
- **Tests**: `__tests__/api/ai-coach.test.ts`
- **Types**: `types/database.ts`

## Future Enhancements

1. **Distributed Rate Limiting**: Migrate to Redis for multi-instance deployments
2. **Personalized Insights**: Track user preferences and tailor coaching style
3. **Trend Analysis**: Compare current week to previous weeks
4. **Buddy Integration**: Include buddy accountability data in insights
5. **Export Insights**: Allow users to download or share insights
6. **Insight History**: Store past insights for progress tracking
