# Family Mode Page Implementation

## Overview
This page implements the parent dashboard for managing child accounts in Family Mode.

## Requirements Addressed
- **16.1**: Parent can link child accounts
- **16.2**: Parents can create and modify lock rules for children (via API)
- **16.3**: Children can view but not modify parent-created rules (enforced by API)
- **16.4**: Child override attempts send notifications to parent
- **16.5**: Display child compliance statistics on parent dashboard
- **16.6**: Row-level security enforced at API level

## Components

### page.tsx
Server component that:
- Requires authentication (redirects to /login if not authenticated)
- Fetches user profile
- Fetches initial list of child accounts
- Passes data to FamilyClient

### FamilyClient.tsx
Client component that provides:

1. **Add Child Form**
   - Email input to add child by email
   - Calls POST /api/family/add-child
   - Displays error messages for invalid emails or already-linked accounts
   - Refreshes page on success

2. **Child Accounts List**
   - Displays all linked child accounts
   - Shows avatar, name, and linked date
   - Fetches and displays compliance stats for each child:
     - Compliance percentage
     - Current streak
     - Override count (this week)
   - Uses GET /api/family/child-stats endpoint

3. **Override Notifications**
   - Displays recent override notifications from all children
   - Shows child name, app name, mood, and time
   - Sorted by most recent first
   - Limited to 10 most recent notifications
   - Fetches from child-stats endpoint's recent_overrides

## API Integration

### POST /api/family/add-child
Request:
```json
{
  "child_email": "child@example.com"
}
```

Response:
```json
{
  "child_profile": {
    "id": "uuid",
    "parent_user_id": "uuid",
    "child_user_id": "uuid",
    "created_at": "timestamp"
  },
  "child_info": {
    "id": "uuid",
    "full_name": "Child Name",
    "avatar_url": "url"
  }
}
```

### GET /api/family/children
Response:
```json
{
  "children": [
    {
      "id": "uuid",
      "child_user_id": "uuid",
      "full_name": "Child Name",
      "avatar_url": "url",
      "timezone": "Asia/Kolkata",
      "created_at": "timestamp",
      "linked_at": "timestamp"
    }
  ]
}
```

### GET /api/family/child-stats?child_user_id=uuid
Response:
```json
{
  "child_info": {
    "id": "uuid",
    "full_name": "Child Name",
    "avatar_url": "url"
  },
  "lock_rules": [...],
  "recent_overrides": [
    {
      "id": "uuid",
      "app_name": "Instagram",
      "mood": "bored",
      "overridden_at": "timestamp"
    }
  ],
  "compliance": {
    "current_streak": 5,
    "longest_streak": 10,
    "total_overrides_this_week": 2,
    "total_overrides_all_time": 15,
    "compliance_percentage": 85.5
  }
}
```

## Styling
- Mobile-first responsive design
- Matches dashboard styling patterns
- Card-based layout for children
- Color-coded stats (green for compliance, blue for streak, orange for overrides)
- Warning-style notifications for overrides

## Security
- Authentication required (server-side redirect)
- All API endpoints enforce row-level security
- Parents can only view/manage their own linked children
- Child data privacy respected (no detailed override reasons shown)

## Future Enhancements
- Real-time notifications using Supabase Realtime
- Ability to create/modify child lock rules from this page
- Detailed child stats view (click to expand)
- Filter/search for specific children
- Export child compliance reports
