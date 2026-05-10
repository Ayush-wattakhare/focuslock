# StreakDots Component

## Overview

The `StreakDots` component provides a visual representation of the user's daily streak, showing the last 7 days with filled/empty dots and displaying both current and longest streak numbers.

## Features

- **Visual Streak Representation**: Shows last 7 days with filled dots for compliant days
- **Streak Statistics**: Displays current streak and longest streak numbers prominently
- **Responsive Design**: Adapts to different screen sizes (desktop, tablet, mobile)
- **Accessible**: Includes ARIA labels and semantic HTML for screen readers
- **Animated**: Smooth hover effects and transitions

## Requirements Mapping

This component implements Requirements 6.1-6.7:

- **6.1**: Initialize streak record with current streak 0, longest streak 0
- **6.2**: Increment current streak by 1 for compliant days
- **6.3**: Update longest streak when current exceeds it
- **6.4**: Reset current streak to 0 on override
- **6.5**: Update last active date when streak is incremented
- **6.6**: Daily cron job to check and update streaks
- **6.7**: Row-level security for streak data

## Props

```typescript
interface StreakDotsProps {
  currentStreak: number;  // Current consecutive days without override
  longestStreak: number;  // Longest streak ever achieved
}
```

### Prop Details

- **currentStreak** (required): The number of consecutive days the user has maintained compliance without overrides. Used to determine which dots are filled.
- **longestStreak** (required): The highest streak the user has ever achieved. Displayed as a motivational metric.

## Usage

```tsx
import StreakDots from '@/components/features/StreakDots';

// Basic usage
<StreakDots currentStreak={5} longestStreak={12} />

// With zero streak (new user)
<StreakDots currentStreak={0} longestStreak={0} />

// With perfect 7-day streak
<StreakDots currentStreak={7} longestStreak={7} />

// With long streak (shows last 7 days)
<StreakDots currentStreak={25} longestStreak={30} />
```

## Visual States

### Dots Visualization

The component displays 7 dots representing the last 7 days:

- **Filled Dot**: White filled circle - represents a compliant day (within current streak)
- **Empty Dot**: Outlined circle - represents a non-compliant day or day before streak started

### Streak Logic

The dots are filled based on the `currentStreak` value:
- If `currentStreak` is 0: All dots are empty
- If `currentStreak` is 3: Last 3 dots are filled
- If `currentStreak` is 7+: All 7 dots are filled

## Styling

The component uses:
- **Gradient Background**: Purple gradient (667eea to 764ba2)
- **Glass Morphism**: Semi-transparent white overlays with backdrop blur
- **Responsive Typography**: Font sizes adjust for mobile devices
- **Smooth Animations**: Hover effects with scale transforms

## Accessibility

- **ARIA Labels**: Component includes descriptive labels for screen readers
- **Semantic HTML**: Uses proper role attributes (region, list, listitem)
- **Keyboard Navigation**: Fully accessible via keyboard
- **Color Contrast**: High contrast white text on purple background

## Integration Points

### Data Source

Fetch streak data from the `/api/streak` endpoint:

```typescript
const response = await fetch('/api/streak');
const data = await response.json();
// data: { current_streak: number, longest_streak: number, last_active_date: string }
```

### Used In

- `/app/(dashboard)/dashboard/page.tsx` - Dashboard overview
- `/app/(dashboard)/badges/page.tsx` - Badges page (as specified in tasks)
- `/app/(dashboard)/stats/page.tsx` - Statistics page

## Design Decisions

### Why Last 7 Days?

The 7-day window provides:
- **Immediate Feedback**: Users can see their recent progress at a glance
- **Manageable Goal**: 7 days is achievable and motivating
- **Weekly Rhythm**: Aligns with natural weekly planning cycles

### Why Two Streak Numbers?

- **Current Streak**: Shows active progress, resets on override (motivates daily compliance)
- **Longest Streak**: Shows peak achievement, never decreases (provides long-term motivation)

### Visual Design Choices

- **Purple Gradient**: Matches app's premium feel and stands out on dashboard
- **Filled vs Empty**: Clear visual distinction between compliant and non-compliant days
- **Glass Morphism**: Modern design trend that adds depth without overwhelming

## Related Components

- **BadgeCard**: Component showing earned badges (streak-related badges)
- **StatsChart**: Component showing usage statistics
- **DashboardClient**: Main dashboard that displays StreakDots

## Testing Considerations

When testing this component:

1. **Zero Streak**: Verify all dots are empty when currentStreak is 0
2. **Partial Streak**: Verify correct number of dots filled for streaks 1-6
3. **Full Streak**: Verify all 7 dots filled when currentStreak >= 7
4. **Longest Streak Display**: Verify longestStreak displays correctly
5. **Responsive Behavior**: Test on mobile, tablet, and desktop viewports
6. **Accessibility**: Test with screen readers and keyboard navigation

## Example Scenarios

### New User
```tsx
<StreakDots currentStreak={0} longestStreak={0} />
// Shows: 0 current, 0 longest, all dots empty
```

### Building Streak
```tsx
<StreakDots currentStreak={3} longestStreak={5} />
// Shows: 3 current, 5 longest, last 3 dots filled
```

### Perfect Week
```tsx
<StreakDots currentStreak={7} longestStreak={7} />
// Shows: 7 current, 7 longest, all 7 dots filled
```

### Long-term User
```tsx
<StreakDots currentStreak={25} longestStreak={30} />
// Shows: 25 current, 30 longest, all 7 dots filled
```

### After Breaking Streak
```tsx
<StreakDots currentStreak={0} longestStreak={30} />
// Shows: 0 current, 30 longest (preserved), all dots empty
```

## Performance Notes

- Component is lightweight with no external dependencies
- Uses CSS-in-JS (styled-jsx) for scoped styling
- No heavy computations or API calls within component
- Renders efficiently with simple array mapping

## Future Enhancements

Potential improvements for future iterations:

1. **Hover Tooltips**: Show date for each dot on hover
2. **Animation on Mount**: Animate dots filling in sequence
3. **Click to View Details**: Navigate to detailed streak history
4. **Streak Milestones**: Highlight special milestones (7, 30, 100 days)
5. **Customizable Colors**: Allow theme customization
6. **Extended History**: Option to view more than 7 days
