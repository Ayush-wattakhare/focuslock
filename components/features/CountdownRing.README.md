# CountdownRing Component

## Overview

The `CountdownRing` component is an SVG-based circular progress indicator that displays the time remaining until an app unlocks. It provides a visual countdown with smooth animations and updates in real-time.

## Features

- **Circular Progress Ring**: Visual representation of time remaining
- **Real-time Updates**: Updates every second to show accurate countdown
- **Smooth Animations**: CSS transitions for progress changes
- **Lock Type Styling**: Different colors for different lock types
- **Human-readable Format**: Displays time in days, hours, minutes, and seconds
- **Responsive Design**: Adapts to different screen sizes
- **Accessible**: Includes ARIA labels for screen readers

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `unlocksAt` | `Date` | Yes | The date/time when the app will unlock |
| `lockType` | `'timer' \| 'schedule' \| 'until_date' \| 'nuclear'` | Yes | The type of lock rule |

## Usage

```tsx
import CountdownRing from '@/components/features/CountdownRing';

// Timer lock example
<CountdownRing 
  unlocksAt={new Date('2024-01-15T23:59:59')} 
  lockType="timer" 
/>

// Schedule lock example
<CountdownRing 
  unlocksAt={new Date('2024-01-15T18:00:00')} 
  lockType="schedule" 
/>

// Until date lock example
<CountdownRing 
  unlocksAt={new Date('2024-02-01T00:00:00')} 
  lockType="until_date" 
/>

// Nuclear lock example (no countdown)
<CountdownRing 
  unlocksAt={new Date('2025-01-01T00:00:00')} 
  lockType="nuclear" 
/>
```

## Lock Type Colors

- **Timer**: Orange (`#ffa726`) - Represents daily time limits
- **Schedule**: Green (`#66bb6a`) - Represents scheduled blocks
- **Until Date**: Blue (`#42a5f5`) - Represents date-based locks
- **Nuclear**: Red (`#ef5350`) - Represents permanent locks

## Time Format

The component displays time in the most appropriate format:

- **Days remaining**: `5d 12h`
- **Hours remaining**: `3h 45m`
- **Minutes remaining**: `15m 30s`
- **Seconds remaining**: `45s`
- **Unlocked**: `Unlocked`

## Progress Calculation

The progress ring fills based on elapsed time:

- **Timer locks**: Progress from start of day to midnight
- **Schedule locks**: Progress through the schedule window (estimated 8 hours)
- **Until date locks**: Progress from now to unlock date
- **Nuclear locks**: Minimal progress (very long duration)

## Accessibility

- Uses semantic SVG with `role="img"`
- Includes `aria-label` with current time remaining
- Text is readable by screen readers
- High contrast colors for visibility

## Responsive Behavior

- **Desktop**: 200px diameter, 28px font size
- **Tablet** (≤768px): Reduced padding, 24px font size
- **Mobile** (≤480px): Minimal padding, 20px font size

## Requirements Validation

This component validates the following requirements:

- **3.1**: Display countdown visually ✓
- **3.2**: Show time remaining in readable format ✓
- **3.3**: Animate smoothly using CSS transitions ✓
- **3.4**: Different colors for different lock types ✓
- **3.5**: Update in real-time ✓
- **3.6**: Handle nuclear mode (no countdown) ✓
- **3.7**: Accessible with ARIA labels ✓
- **3.8**: Responsive design ✓

## Testing

The component exports the `calculateTotalDuration` function for testing purposes:

```tsx
import { calculateTotalDuration } from '@/components/features/CountdownRing';

// Test timer lock duration
const timerDuration = calculateTotalDuration('timer', new Date('2024-01-15T23:59:59'));

// Test schedule lock duration
const scheduleDuration = calculateTotalDuration('schedule', new Date('2024-01-15T18:00:00'));
```

## Implementation Notes

1. **Real-time Updates**: Uses `setInterval` to update every second
2. **Memory Management**: Cleans up interval on component unmount
3. **Progress Calculation**: Calculates progress based on lock type
4. **SVG Optimization**: Uses `strokeDasharray` and `strokeDashoffset` for smooth animation
5. **CSS Transitions**: 0.5s ease transition for progress changes

## Related Components

- **LockCard**: Displays app cards with lock status
- **AppGrid**: Grid layout of app cards
- **MoodPrompt**: Modal for override mood selection

## Future Enhancements

- Add sound/vibration when countdown reaches zero
- Add milestone markers (e.g., halfway point)
- Add pause/resume functionality for Pomodoro integration
- Add customizable colors per user preference
