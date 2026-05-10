# BuddyPanel Component

## Overview

The BuddyPanel component provides a comprehensive interface for managing accountability buddy relationships in the FocusLock application. It displays active and pending buddies, allows users to invite new buddies, and configure which lock rules each buddy can watch.

## Features

- **Active Buddies List**: Displays all active accountability partners with status indicators
- **Pending Invitations**: Shows pending buddy invitations awaiting acceptance
- **Invite Form**: Email-based invitation system with rule selection
- **Rule Selection**: Checkboxes to choose which lock rules a buddy can monitor
- **Status Indicators**: Visual badges showing buddy relationship status (active, pending, removed)
- **Responsive Design**: Optimized for mobile, tablet, and desktop screens
- **Accessible**: Full keyboard navigation and ARIA labels

## Requirements Coverage

This component implements Requirements 9.1-9.9:

- **9.1**: Create buddy relationship with status 'pending'
- **9.2**: Update relationship status to 'active' on acceptance
- **9.3**: Allow buddies to select which lock rules they want to watch
- **9.4**: Create buddy notification when user overrides watched rule
- **9.5**: Send buddy notifications via Supabase Realtime
- **9.6**: Allow buddies to view override logs for watched rules only
- **9.7**: Update status to 'removed' when relationship is removed
- **9.8**: Prevent users from modifying buddy's lock rules
- **9.9**: Enforce row-level security for buddy relationships

## Props

```typescript
interface BuddyPanelProps {
  buddies: Buddy[];           // Array of buddy relationships
  lockRules: LockRule[];      // Array of user's lock rules
  onInvite: (email: string, rulesWatching: string[]) => Promise<void>;  // Invite handler
  onRemove?: (buddyId: string) => Promise<void>;  // Optional remove handler
}
```

### Buddy Type

```typescript
interface Buddy {
  id: string;
  user_id: string;
  buddy_user_id: string;
  rules_watching: string[] | null;  // Array of lock_rule IDs or null for all rules
  status: 'pending' | 'active' | 'removed';
  invited_at: string;
  accepted_at: string | null;
}
```

### LockRule Type

```typescript
interface LockRule {
  id: string;
  user_id: string;
  app_name: string;
  lock_type: 'timer' | 'schedule' | 'until_date' | 'nuclear';
  // ... other fields
}
```

## Usage Example

```tsx
import BuddyPanel from '@/components/features/BuddyPanel';
import { useState, useEffect } from 'react';

function BuddyPage() {
  const [buddies, setBuddies] = useState([]);
  const [lockRules, setLockRules] = useState([]);

  useEffect(() => {
    // Fetch buddies and lock rules
    fetchBuddies();
    fetchLockRules();
  }, []);

  const handleInvite = async (email: string, rulesWatching: string[]) => {
    const response = await fetch('/api/buddy/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        buddy_email: email, 
        rules_watching: rulesWatching.length > 0 ? rulesWatching : null 
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    // Refresh buddies list
    await fetchBuddies();
  };

  const handleRemove = async (buddyId: string) => {
    const response = await fetch(`/api/buddy/${buddyId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to remove buddy');
    }

    // Refresh buddies list
    await fetchBuddies();
  };

  return (
    <BuddyPanel
      buddies={buddies}
      lockRules={lockRules}
      onInvite={handleInvite}
      onRemove={handleRemove}
    />
  );
}
```

## Component Sections

### 1. Active Buddies Section

Displays all buddies with `status: 'active'`:
- Buddy avatar (initials from user ID)
- Status indicator (green dot)
- Watched rules list
- Acceptance date
- Remove button

### 2. Pending Invitations Section

Shows buddies with `status: 'pending'`:
- Buddy avatar (initials from user ID)
- Status indicator (orange dot)
- Rules that will be watched
- Invitation date
- Cancel button

### 3. Invite Form Section

Email-based invitation form:
- Email input field with validation
- Rule selection checkboxes (optional)
- Submit button
- Success/error messages

## Rule Selection Behavior

- **No rules selected**: Buddy watches ALL lock rules (default behavior)
- **Specific rules selected**: Buddy only watches the selected rules
- **Rules displayed**: Shows app name and lock type badge

## Status Colors

- **Active**: Green (#4caf50)
- **Pending**: Orange (#ff9800)
- **Removed**: Gray (#9e9e9e)

## Validation

### Email Validation
- Required field
- Must match email regex pattern: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Cannot invite yourself
- User must exist in the system

### Rule Selection
- Optional (empty selection = watch all rules)
- Only user's own lock rules can be selected
- Rules are validated server-side

## Error Handling

The component handles various error scenarios:
- Invalid email format
- User not found
- Self-invitation attempt
- Network errors
- Server errors

Errors are displayed inline below the email input field.

## Accessibility

- Semantic HTML with proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- Focus management
- Error announcements via `role="alert"`
- Status updates via `role="status"`

## Responsive Breakpoints

- **Desktop**: Full layout with all features
- **Tablet** (≤768px): Adjusted spacing and font sizes
- **Mobile** (≤480px): Compact layout, stacked elements

## Styling

The component uses scoped CSS-in-JS (styled-jsx) with:
- Gradient backgrounds for visual appeal
- Smooth transitions and hover effects
- Card-based layout for buddies
- Form styling with focus states
- Status indicators with color coding

## Integration with API

### Invite Buddy
```typescript
POST /api/buddy/invite
Body: {
  buddy_email: string;
  rules_watching?: string[];  // Optional, null = watch all
}
```

### Remove Buddy
```typescript
DELETE /api/buddy/{buddyId}
```

### Accept Invitation (for invited user)
```typescript
POST /api/buddy/accept
Body: {
  buddy_id: string;
}
```

## Future Enhancements

Potential improvements for future iterations:
- Real-time buddy status updates via Supabase Realtime
- Buddy profile pictures from avatar_url
- Buddy nicknames/display names
- Notification count badges
- Filter/search for buddies
- Bulk rule selection
- Buddy activity feed
- Chat/messaging between buddies

## Testing

Key test scenarios:
1. Display active and pending buddies correctly
2. Email validation works properly
3. Rule selection toggles correctly
4. Invite submission calls onInvite with correct data
5. Remove button calls onRemove with buddy ID
6. Error messages display correctly
7. Success messages display after invitation
8. Form resets after successful submission
9. Disabled state during submission
10. Responsive layout on different screen sizes

## Related Components

- **BuddyNotificationList**: Displays notifications from buddies
- **OverrideLog**: Shows override history for watched rules
- **LockCard**: Displays individual lock rules

## Related API Routes

- `/api/buddy/invite` - Send buddy invitation
- `/api/buddy/accept` - Accept buddy invitation
- `/api/buddy/notify` - Send notification to buddy
- `/api/buddy/notifications` - Fetch buddy notifications
- `/api/rules` - Fetch user's lock rules
