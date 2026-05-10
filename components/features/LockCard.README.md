# LockCard Component

## Overview

The `LockCard` component is an individual app card that displays an app's icon, name, and current lock status. It provides visual feedback for different lock types and handles user interactions to navigate to the countdown screen when an app is locked.

## Features

- **Visual States**: Different visual styles for each lock type (timer, schedule, until_date, nuclear)
- **Lock Status Display**: Shows time remaining until unlock or "No Override" for nuclear locks
- **Interactive**: Click handler navigates to `/lock/[appId]` when locked
- **Accessible**: Keyboard navigation support with Enter and Space keys
- **Responsive**: Adapts to different screen sizes (desktop, tablet, mobile)
- **Icon Support**: Displays app icon or generates a placeholder with the first letter

## Requirements Validation

This component validates the following requirements from the design document:

- **3.1**: Display app icon and name
- **3.2**: Show lock status visually
- **3.3**: Different visual states for lock types (unlocked, timer, schedule, nuclear)
- **3.4**: Timer lock shows time remaining
- **3.5**: Schedule lock shows unlock time
- **3.6**: Nuclear lock shows "No Override" message
- **3.7**: Click handler navigates to `/lock/[appId]` if locked
- **3.8**: Unlocked apps show normal state

## Props

```typescript
interface LockCardProps {
  app: LockRule;           // The lock rule containing app information
  lockStatus: LockStatus;  // Current lock status (isLocked, unlocksAt, reason)
  onClick?: () => void;    // Optional custom click handler
}
```

### `app: LockRule`

The lock rule object containing:
- `id`: Unique identifier for the rule
- `app_name`: Name of the app
- `app_icon_url`: URL to the app icon (optional)
- `lock_type`: Type of lock ('timer', 'schedule', 'until_date', 'nuclear')
- Other lock rule properties

### `lockStatus: LockStatus`

The current lock status object containing:
- `isLocked`: Boolean indicating if the app is currently locked
- `unlocksAt`: Date when the app will unlock (null for nuclear locks)
- `reason`: String explaining why the app is locked

### `onClick?: () => void`

Optional custom click handler. If not provided, the component will navigate to `/lock/[appId]` when the app is locked.

## Usage Examples

### Basic Usage

```tsx
import LockCard from '@/components/features/LockCard';
import { evaluateLock } from '@/lib/core/lockEvaluator';

function Dashboard() {
  const rule = {
    id: '123',
    app_name: 'Instagram',
    app_icon_url: '/icons/instagram.png',
    lock_type: 'timer',
    daily_limit_minutes: 30,
    // ... other properties
  };

  const lockStatus = evaluateLock(rule, new Date(), 25, 'Asia/Kolkata');

  return <LockCard app={rule} lockStatus={lockStatus} />;
}
```

### With Custom Click Handler

```tsx
function Dashboard() {
  const handleAppClick = () => {
    console.log('App clicked!');
    // Custom logic here
  };

  return (
    <LockCard 
      app={rule} 
      lockStatus={lockStatus} 
      onClick={handleAppClick}
    />
  );
}
```

### In a Grid Layout

```tsx
function AppGrid({ rules, usageData }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '20px' }}>
      {rules.map(rule => {
        const todayUsage = usageData.get(rule.app_name) || 0;
        const lockStatus = evaluateLock(rule, new Date(), todayUsage, 'Asia/Kolkata');
        
        return (
          <LockCard 
            key={rule.id}
            app={rule} 
            lockStatus={lockStatus}
          />
        );
      })}
    </div>
  );
}
```

## Visual States

### Unlocked State
- White background
- Gray border (#e0e0e0)
- No lock badge
- No status text

### Timer Lock State
- Light orange background (#fff8f0)
- Orange border (#ffa726)
- Orange clock icon badge
- Shows time remaining (e.g., "2h 15m")

### Schedule Lock State
- Light green background (#f1f8f4)
- Green border (#66bb6a)
- Green calendar icon badge
- Shows time remaining until schedule end

### Until Date Lock State
- Light blue background (#f0f7ff)
- Blue border (#42a5f5)
- Blue lock icon badge
- Shows days/hours remaining

### Nuclear Lock State
- Light red background (#fff5f5)
- Red border (#ef5350)
- Red radiation icon badge
- Shows "NO OVERRIDE" text

## Accessibility

- **Keyboard Navigation**: Supports Enter and Space keys for activation
- **ARIA Labels**: Includes descriptive labels for screen readers
- **Focus Indicators**: Clear focus outline when navigating with keyboard
- **Semantic HTML**: Uses proper button role and tabindex

## Responsive Design

The component adapts to different screen sizes:

- **Desktop (>768px)**: 140px min height, 64px icon, 14px text
- **Tablet (≤768px)**: 120px min height, 56px icon, 13px text
- **Mobile (≤480px)**: 100px min height, 48px icon, 12px text

## Styling

The component uses scoped CSS-in-JS (styled-jsx) for styling. All styles are contained within the component and don't leak to other parts of the application.

## Dependencies

- `next/navigation`: For router navigation
- `@/types`: For TypeScript type definitions (LockRule, LockStatus)

## Testing Considerations

When testing this component, consider:

1. **Visual States**: Test that each lock type renders with the correct colors and icons
2. **Click Behavior**: Verify navigation to `/lock/[appId]` when locked
3. **Keyboard Navigation**: Test Enter and Space key interactions
4. **Time Formatting**: Test the `formatUnlockTime` function with various time differences
5. **Icon Rendering**: Test with and without `app_icon_url`
6. **Responsive Behavior**: Test on different screen sizes

## Related Components

- **AppGrid**: Container component that displays multiple LockCards
- **CountdownRing**: Component shown on the `/lock/[appId]` page
- **MoodPrompt**: Modal shown when user attempts to override a lock

## Future Enhancements

Potential improvements for future iterations:

- Animated transitions between lock states
- Haptic feedback on mobile devices
- Customizable color themes
- Badge animations for newly locked apps
- Progress ring showing time used vs. limit for timer locks
