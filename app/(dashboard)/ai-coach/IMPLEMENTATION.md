# AI Coach Page Implementation

## Overview

The AI Coach page (`/ai-coach`) displays Claude-generated AI coaching insights with mood pattern visualization. It helps users understand their app usage patterns and provides actionable suggestions for improvement.

## Requirements Mapping

**Task 7.11**: Create AI coach page (/ai-coach)
- ✅ Render AIInsightCard component
- ✅ Display mood pattern chart
- ✅ Show actionable suggestions
- ✅ Add "Generate New Insights" button (rate limited)
- ✅ Requirements: 10.1-10.8

### Detailed Requirements

- **10.1**: Retrieve override logs from the past 7 days ✅
- **10.2**: Send override data to Claude API with coaching prompt ✅
- **10.3**: Request analysis of override patterns (time, mood, app) ✅
- **10.4**: Request one key insight (2 sentences max) ✅
- **10.5**: Request one specific actionable suggestion ✅
- **10.6**: Request identification of most common mood trigger ✅
- **10.7**: Parse JSON response from Claude API ✅
- **10.8**: Display insights with warm, non-judgmental tone ✅

## File Structure

```
app/(dashboard)/ai-coach/
├── page.tsx              # Server component (auth check)
├── AICoachClient.tsx     # Client component (main UI)
└── IMPLEMENTATION.md     # This file
```

## Components

### page.tsx (Server Component)

- Checks user authentication using Supabase
- Redirects to `/login` if not authenticated
- Renders `AICoachClient` with user data

### AICoachClient.tsx (Client Component)

Main features:
- **Welcome Screen**: Initial state with "Generate New Insights" button
- **Loading State**: Spinner with "Analyzing your patterns..." message
- **Error State**: Error message with retry button
- **Rate Limit State**: Friendly message when rate limit is exceeded
- **Insights Display**: Shows AIInsightCard with mood patterns
- **Regenerate Button**: Allows generating new insights (rate limited)

## API Integration

### Endpoint: POST /api/ai-coach

**Request:**
```json
{
  "days": 7
}
```

**Response (Success):**
```json
{
  "insight": "string (2 sentences max)",
  "suggestion": "string",
  "topMood": "string | null",
  "moodBreakdown": [
    { "mood": "string", "count": number }
  ]
}
```

**Response (Rate Limited - 429):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. You can request new insights in X minutes.",
    "retryAfter": number
  }
}
```

**Response (Error):**
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "string"
  }
}
```

## Rate Limiting

- **Limit**: 1 request per hour per user
- **Implementation**: In-memory store in API route
- **User Feedback**: Clear message with time remaining
- **Headers**: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

## User Flow

1. User navigates to `/ai-coach`
2. Server checks authentication (redirect if not logged in)
3. Client shows welcome screen with "Generate New Insights" button
4. User clicks button → Loading state appears
5. API fetches override logs and generates insights via Claude
6. Insights displayed in AIInsightCard component
7. User can click "Take Action" to navigate to `/rules/new`
8. User can click "Generate New Insights" to refresh (rate limited)

## Error Handling

### Authentication Error
- Redirect to `/login` page

### API Error
- Display error message with retry button
- Log error to console for debugging

### Rate Limit Error
- Display friendly message with time remaining
- Show info about 1 request/hour limit
- No retry button (user must wait)

### Network Error
- Display generic error message
- Provide retry button

## Styling

- **Layout**: Centered container (max-width: 800px)
- **Colors**: Purple gradient theme matching AIInsightCard
- **Responsive**: Mobile-first design with breakpoints at 768px and 480px
- **Animations**: Smooth transitions, spinner animation
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation

## Testing Considerations

### Unit Tests
- [ ] Test welcome screen rendering
- [ ] Test loading state display
- [ ] Test error state with retry functionality
- [ ] Test rate limit message display
- [ ] Test insights rendering with AIInsightCard

### Integration Tests
- [ ] Test API call to /api/ai-coach
- [ ] Test rate limiting behavior
- [ ] Test navigation to /rules/new on action click
- [ ] Test regenerate insights functionality

### E2E Tests
- [ ] Test full user flow from welcome to insights
- [ ] Test authentication redirect
- [ ] Test rate limit enforcement
- [ ] Test error recovery

## Accessibility

- **Semantic HTML**: Proper heading hierarchy (h1, h2)
- **ARIA Labels**: Descriptive labels for interactive elements
- **Keyboard Navigation**: All buttons are keyboard accessible
- **Focus Indicators**: Visible focus states on interactive elements
- **Screen Readers**: Meaningful text for all UI elements
- **Color Contrast**: WCAG AA compliant color combinations

## Performance

- **Lazy Loading**: Client component only loads when needed
- **Optimized Rendering**: Minimal re-renders with proper state management
- **API Caching**: Rate limiting prevents excessive API calls
- **Lightweight**: No external dependencies beyond core libraries

## Future Enhancements

- [ ] Add historical insights comparison
- [ ] Export insights as PDF/image
- [ ] Add insights sharing functionality
- [ ] Show insights generation history
- [ ] Add customizable analysis period (7, 14, 30 days)
- [ ] Add insights notifications
- [ ] Add dark mode support

## Dependencies

- `@supabase/supabase-js`: Authentication
- `next/navigation`: Routing and redirects
- `@/components/features/AIInsightCard`: Insights display component
- `@/lib/supabase/server`: Server-side Supabase client

## Related Files

- `/app/api/ai-coach/route.ts`: API endpoint for generating insights
- `/components/features/AIInsightCard.tsx`: Insights display component
- `/lib/core/aiCoach.ts`: AI insights generation logic
- `.kiro/specs/focuslock-app/requirements.md`: Requirements document
- `.kiro/specs/focuslock-app/design.md`: Design document
- `.kiro/specs/focuslock-app/tasks.md`: Task list

## Notes

- The page requires authentication (redirects to /login if not authenticated)
- Rate limiting is enforced at the API level (1 request/hour)
- The AIInsightCard component handles all mood visualization
- The "Take Action" button navigates to /rules/new for creating rules
- All insights are generated by Claude API via the aiCoach module
