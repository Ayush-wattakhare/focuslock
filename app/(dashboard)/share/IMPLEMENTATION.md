# Share Page Implementation

## Overview

The share page (`/share`) allows users to view and share their weekly progress statistics. It fetches data from the `/api/share-card` endpoint and renders a shareable card with export options.

## Requirements Implemented

- **14.1**: Generate shareable stats card with time saved and compliance %
- **14.2**: Include current streak in share card
- **14.3**: Add FocusLock watermark to share card
- **14.4**: Support export to WhatsApp, Instagram, PNG download

## File Structure

```
app/(dashboard)/share/
├── page.tsx           # Server component with auth check
├── ShareClient.tsx    # Client component with data fetching
└── IMPLEMENTATION.md  # This file
```

## Components

### page.tsx (Server Component)

- Checks user authentication using Supabase
- Redirects to `/login` if not authenticated
- Passes authenticated user to ShareClient

### ShareClient.tsx (Client Component)

- Fetches weekly stats from `/api/share-card` endpoint
- Handles loading and error states
- Renders ShareCard component with fetched data
- Provides user-friendly error messages and retry functionality

## Data Flow

1. User navigates to `/share`
2. Server component checks authentication
3. If authenticated, renders ShareClient
4. ShareClient fetches stats from `/api/share-card`
5. API returns:
   - `timeSaved`: Minutes saved this week
   - `compliancePercentage`: Percentage of days without overrides
   - `currentStreak`: Current streak in days
   - `watermark`: "focuslock.app"
6. ShareCard component renders with stats
7. User can export via WhatsApp, Instagram, or PNG download

## API Integration

### Endpoint: GET /api/share-card

**Response:**
```json
{
  "timeSaved": 180,
  "compliancePercentage": 85.7,
  "currentStreak": 12,
  "watermark": "focuslock.app"
}
```

**Error Response:**
```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required"
  }
}
```

## States

### Loading State
- Displays spinner with "Loading your progress..." message
- Shown while fetching data from API

### Error State
- Displays error icon and message
- Provides "Try Again" button to reload page
- Shows specific error message from API

### Success State
- Displays page header with title and subtitle
- Renders ShareCard component with stats
- Provides export options (WhatsApp, Instagram, PNG)

## Styling

- Gradient background (light gray)
- Centered layout with max-width 800px
- Responsive design for mobile/tablet/desktop
- Consistent with other dashboard pages

## Dependencies

- `@supabase/supabase-js`: User authentication
- `@/components/features/ShareCard`: Shareable card component
- `@/lib/supabase/server`: Server-side Supabase client

## Authentication

- Requires authenticated user
- Redirects to `/login` if not authenticated
- Uses Supabase auth session

## Error Handling

- Network errors: Shows error message with retry button
- API errors: Displays specific error message from response
- Authentication errors: Redirects to login page

## Responsive Design

- Desktop: Full-width card with 3-column stats grid
- Tablet (< 640px): Single column stats grid
- Mobile (< 480px): Optimized spacing and font sizes

## Future Enhancements

- Add refresh button to fetch latest stats
- Show last updated timestamp
- Add animation when stats load
- Cache stats for better performance
- Add social media preview meta tags

## Testing Considerations

- Test authentication redirect
- Test API error handling
- Test loading state
- Test successful data fetch and render
- Test responsive layout on different screen sizes
- Test export functionality (WhatsApp, Instagram, PNG)

## Related Files

- `/api/share-card/route.ts`: API endpoint for fetching stats
- `/components/features/ShareCard.tsx`: Shareable card component
- `/components/features/ShareCard.README.md`: ShareCard documentation
