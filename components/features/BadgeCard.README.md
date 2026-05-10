# BadgeCard Component

## Overview

The `BadgeCard` component displays a badge with its icon, name, description, and status. It provides distinct visual states for earned badges (shown in color) and locked badges (shown in grayscale), along with relevant information such as earned date or unlock conditions.

## Features

- **Visual States**: Distinct styles for earned (color) and locked (grayscale) badges
- **Badge Information**: Displays icon, name, and description
- **Status Display**: Shows earned date for earned badges or unlock condition for locked badges
- **Earned Indicator**: Visual checkmark badge for earned achievements
- **Accessible**: Semantic HTML with ARIA labels for screen readers
- **Responsive**: Adapts to different screen sizes (desktop, tablet, mobile)

## Requirements Validation

This component validates the following requirements from the design document:

- **7.1**: Display badge icon, name, description
- **7.2**: Visual state for earned badges (color)
- **7.3**: Visual state for locked badges (grayscale)
- **7.4**: Show earned date for earned badges
- **7.5**: Show unlock condition for locked badges
- **7.6**: Accessible and responsive design

## Props

```typescript
interface BadgeCardProps {
  badge: BadgeDefinition;  // Badge definition with id, name, description, icon, condition
  earned: boolean;         // Whether the user has earned this badge
  earnedAt?: Date;        // Date when the badge was earned (optional, for earned badges)
}
```

### `badge: BadgeDefinition`

The badge definition object containing:
- `id`: Unique identifier for the badge (e.g., 'quick_start', 'first_week')
- `name`: Display name of the badge (e.g., 'Quick Starter')
- `description`: Description of what the badge represents (optional)
- `icon`: Emoji or icon character for the badge (optional)
- `condition`: Text describing how to unlock the badge (optional)

### `earned: boolean`

Boolean indicating whether the user has earned this badge. Determines the visual state:
- `true`: Badge shown in color with earned indicator
- `false`: Badge shown in grayscale (locked state)

### `earnedAt?: Date`

Optional date when the badge was earned. Only relevant when `earned` is `true`. If provided, displays the formatted earned date.

## Usage Examples

### Basic Usage - Earned Badge

```tsx
import BadgeCard from '@/components/features/BadgeCard';

function BadgesPage() {
  const badge = {
    id: 'quick_start',
    name: 'Quick Starter',
    description: 'Complete setup within 10 minutes',
    icon: '⚡',
    condition: 'Setup completed in <10 min'
  };

  return (
    <BadgeCard 
      badge={badge} 
      earned={true} 
      earnedAt={new Date('2024-01-15')}
    />
  );
}
```

### Basic Usage - Locked Badge

```tsx
function BadgesPage() {
  const badge = {
    id: 'social_detox',
    name: 'Social Detox',
    description: 'Maintain 30-day streak',
    icon: '🧘',
    condition: '30-day streak'
  };

  return (
    <BadgeCard 
      badge={badge} 
      earned={false}
    />
  );
}
```

### In a Grid Layout

```tsx
function BadgesGrid({ badges, userBadges }) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
      gap: '20px' 
    }}>
      {badges.map(badge => {
        const userBadge = userBadges.find(ub => ub.badge_id === badge.id);
        const earned = !!userBadge;
        const earnedAt = userBadge ? new Date(userBadge.earned_at) : undefined;
        
        return (
          <BadgeCard 
            key={badge.id}
            badge={badge} 
            earned={earned}
            earnedAt={earnedAt}
          />
        );
      })}
    </div>
  );
}
```

### With API Data

```tsx
'use client';

import { useEffect, useState } from 'react';
import BadgeCard from '@/components/features/BadgeCard';

function BadgesPage() {
  const [badges, setBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);

  useEffect(() => {
    async function fetchBadges() {
      // Fetch badge definitions
      const badgesRes = await fetch('/api/badges');
      const badgesData = await badgesRes.json();
      setBadges(badgesData.badges);

      // Fetch user's earned badges
      const userBadgesRes = await fetch('/api/badges/user');
      const userBadgesData = await userBadgesRes.json();
      setUserBadges(userBadgesData.userBadges);
    }

    fetchBadges();
  }, []);

  return (
    <div className="badges-grid">
      {badges.map(badge => {
        const userBadge = userBadges.find(ub => ub.badge_id === badge.id);
        return (
          <BadgeCard
            key={badge.id}
            badge={badge}
            earned={!!userBadge}
            earnedAt={userBadge ? new Date(userBadge.earned_at) : undefined}
          />
        );
      })}
    </div>
  );
}
```

## Visual States

### Earned Badge State
- **Background**: White with subtle green gradient
- **Border**: Green (#4caf50)
- **Icon**: Golden gradient background
- **Text**: Full color (black/dark gray)
- **Indicator**: Green checkmark badge in top-right corner
- **Footer**: Shows earned date in green text
- **Filter**: No grayscale filter

### Locked Badge State
- **Background**: Light gray (#f5f5f5)
- **Border**: Gray (#e0e0e0)
- **Icon**: Gray gradient background
- **Text**: Muted gray colors
- **Indicator**: None
- **Footer**: Shows unlock condition in italic gray text
- **Filter**: 100% grayscale with 70% opacity

## Badge Definitions

The component supports all FocusLock badge types:

1. **Quick Starter** (⚡) - Complete setup within 10 minutes
2. **First Week Clean** (🌱) - Maintain 7-day streak
3. **7-Day Warrior** (⚔️) - No overrides for 7 days
4. **Iron Will** (🛡️) - Complete a weekly challenge
5. **Social Detox** (🧘) - Maintain 30-day streak
6. **Night Owl Slayer** (🌙) - 7 days of bedtime compliance
7. **Pomodoro Master** (🍅) - Complete 20 Pomodoro sessions

## Accessibility

- **Semantic HTML**: Uses `role="article"` for badge cards
- **ARIA Labels**: Includes descriptive labels indicating badge name and status
- **Icon Accessibility**: Emoji icons marked with `aria-hidden="true"` to avoid screen reader confusion
- **Color Independence**: Status is conveyed through multiple visual cues (not just color)
- **Keyboard Navigation**: Focusable and navigable with keyboard

## Responsive Design

The component adapts to different screen sizes:

- **Desktop (>768px)**: 200px min height, 80px icon, 18px title
- **Tablet (≤768px)**: 180px min height, 70px icon, 16px title
- **Mobile (≤480px)**: 160px min height, 60px icon, 15px title

## Styling

The component uses scoped CSS-in-JS (styled-jsx) for styling. All styles are contained within the component and don't leak to other parts of the application.

Key styling features:
- Smooth hover transitions
- Gradient backgrounds for icons
- Grayscale filter for locked badges
- Responsive font sizes and spacing
- Shadow effects for depth

## Dependencies

- `@/types`: For TypeScript type definitions (BadgeDefinition)
- React: For component functionality

## Testing Considerations

When testing this component, consider:

1. **Visual States**: Test that earned and locked badges render with correct styles
2. **Date Formatting**: Test the `formatEarnedDate` function with various dates
3. **Icon Rendering**: Test with and without badge icons
4. **Conditional Rendering**: Test with and without descriptions, conditions, and earned dates
5. **Responsive Behavior**: Test on different screen sizes
6. **Accessibility**: Test with screen readers and keyboard navigation

## Related Components

- **StreakDots**: Component showing daily streak visualization
- **StatsChart**: Component showing usage statistics
- **BadgesPage**: Page component that displays a grid of BadgeCards

## Integration Points

### Database Schema

The component expects data from these tables:
- `badge_definitions`: Master list of all available badges
- `user_badges`: Records of badges earned by users

### API Endpoints

Typically used with:
- `GET /api/badges`: Fetch all badge definitions
- `GET /api/badges/user`: Fetch user's earned badges

## Future Enhancements

Potential improvements for future iterations:

- Animated unlock transitions when a badge is earned
- Progress indicators for badges with incremental requirements
- Badge rarity levels (common, rare, legendary)
- Sharing functionality to post earned badges on social media
- Badge collections or categories
- Animated confetti effect when viewing newly earned badges
- Tooltip with detailed badge statistics on hover

