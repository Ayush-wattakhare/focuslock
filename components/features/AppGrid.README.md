# AppGrid Component

## Overview

The `AppGrid` component displays all apps in a responsive grid layout on the dashboard. It filters hidden apps based on lock rules, shows lock badge overlays on locked apps, and integrates with the lock evaluation system.

## Features

- **Responsive Grid Layout**: Adapts to different screen sizes (desktop, tablet, mobile)
- **Hidden App Filtering**: Filters out apps where `hide_from_home` is `true` (Requirement 2.7)
- **Lock Badge Overlay**: Shows a lock icon on locked apps (Requirement 2.8)
- **Lock Status Integration**: Evaluates lock status using the `lockEvaluator` module
- **Loading & Empty States**: Handles loading and empty states gracefully
- **Accessibility**: Keyboard navigation support (Enter/Space keys)
- **Timezone Support**: Respects user timezone for lock evaluation

## Usage

### Basic Usage

```tsx
import AppGrid from '@/components/features/AppGrid';
import { LockRule } from '@/types';

function Dashboard() {
  const rules: LockRule[] = [
    // ... your lock rules
  ];

  return <AppGrid rules={rules} />;
}
```

### With Usage Data

```tsx
import AppGrid from '@/components/features/AppGrid';

function Dashboard() {
  const rules = [...]; // Lock rules from API
  const usageData = new Map([
    ['Instagram', 35], // 35 minutes used today
    ['YouTube', 20],   // 20 minutes used today
  ]);

  return (
    <AppGrid 
      rules={rules} 
      usageData={usageData}
    />
  );
}
```

### With Click Handler

```tsx
import AppGrid from '@/components/features/AppGrid';
import { LockRule, LockStatus } from '@/types';

function Dashboard() {
  const handleAppClick = (rule: LockRule, lockStatus: LockStatus) => {
    if (lockStatus.isLocked) {
      // Show override prompt or countdown screen
      console.log('App is locked:', rule.app_name);
    } else {
      // Open app or show details
      console.log('App is unlocked:', rule.app_name);
    }
  };

  return (
    <AppGrid 
      rules={rules}
      onAppClick={handleAppClick}
    />
  );
}
```

### With Custom Timezone

```tsx
import AppGrid from '@/components/features/AppGrid';

function Dashboard() {
  return (
    <AppGrid 
      rules={rules}
      userTimezone="America/New_York"
    />
  );
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `rules` | `LockRule[]` | Yes | - | Array of lock rules to display |
| `usageData` | `Map<string, number>` | No | `new Map()` | Map of app names to minutes used today |
| `userTimezone` | `string` | No | `'Asia/Kolkata'` | IANA timezone string for lock evaluation |
| `onAppClick` | `(rule: LockRule, lockStatus: LockStatus) => void` | No | - | Callback when an app is clicked |

## Lock Rule Filtering

The component filters apps based on the `hide_from_home` property:

- **`hide_from_home: false`**: App is displayed in the grid
- **`hide_from_home: true`**: App is hidden from the grid (but lock still enforced)

This implements **Requirement 2.7**: Lock rules can be marked as visible or hidden on dashboard.

## Lock Badge Display

The component shows a lock badge overlay on apps that are currently locked:

- **Locked apps**: Display a red lock icon badge in the top-right corner
- **Unlocked apps**: No badge displayed

This implements **Requirement 2.8**: Hidden rules still enforce locks but don't show lock badge (since hidden apps are filtered out).

## Lock Status Evaluation

The component uses the `evaluateLock` function from `@/lib/core/lockEvaluator` to determine lock status:

1. **Timer locks**: Locked when daily usage >= limit
2. **Schedule locks**: Locked during configured time windows
3. **Until-date locks**: Locked until specified date
4. **Nuclear locks**: Always locked (no override)

## Responsive Design

The grid adapts to different screen sizes:

- **Desktop (>768px)**: 120px minimum column width
- **Tablet (480-768px)**: 100px minimum column width
- **Mobile (<480px)**: 80px minimum column width

## Accessibility

- **Keyboard Navigation**: Apps can be focused and activated with Enter/Space keys
- **ARIA Labels**: Lock badge has `aria-label="Locked"` for screen readers
- **Focus Indicators**: Visible focus outline on keyboard navigation

## Testing

The component includes comprehensive unit tests:

```bash
npm test -- components/features/__tests__/AppGrid.test.ts
```

### Test Coverage

- ✅ Filters hidden apps (Requirement 2.7)
- ✅ Shows lock badge on locked apps (Requirement 2.8)
- ✅ Evaluates lock status correctly
- ✅ Handles empty states
- ✅ Handles loading states
- ✅ Calls onAppClick handler
- ✅ Supports keyboard navigation
- ✅ Uses provided timezone
- ✅ Re-evaluates on prop changes

## Exported Functions

### `prepareAppsForDisplay`

Filters and evaluates lock status for apps. Exported for testing purposes.

```typescript
function prepareAppsForDisplay(
  rules: LockRule[],
  usageData: Map<string, number>,
  userTimezone: string
): AppWithStatus[]
```

### `formatUnlockTime`

Formats unlock time for display. Exported for testing purposes.

```typescript
function formatUnlockTime(date: Date): string
```

**Examples:**
- `2d 3h` - 2 days 3 hours
- `3h 45m` - 3 hours 45 minutes
- `30m` - 30 minutes
- `Soon` - Less than 1 minute

## Integration Example

See `app/(dashboard)/dashboard/DashboardClient.tsx` for a complete integration example that:

1. Fetches lock rules from Supabase
2. Fetches today's usage data from `/api/usage/daily`
3. Displays apps using AppGrid
4. Handles app clicks (locked vs unlocked)

## Requirements Implemented

- ✅ **Requirement 2.7**: Lock rules can be marked as visible or hidden on dashboard
- ✅ **Requirement 2.8**: Hidden rules still enforce locks but don't show lock badge

## Future Enhancements

- [ ] Add drag-and-drop reordering
- [ ] Add search/filter functionality
- [ ] Add app categories/grouping
- [ ] Add usage statistics overlay
- [ ] Add animations for lock state changes
- [ ] Add pull-to-refresh for mobile
