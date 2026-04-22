# Core Business Logic Modules

This directory contains the core business logic modules for FocusLock. These modules implement the key algorithms and rules that power the application's functionality.

## Modules

### lockEvaluator.ts

Determines whether an app is currently locked based on rule configuration and current context.

**Key Functions:**
- `evaluateLock(rule, now, todayUsageMinutes, userTimezone)` - Main evaluation function
- `toTimezone(date, timezone)` - Timezone conversion utility

**Supported Lock Types:**
- `timer` - Locks when daily usage exceeds limit
- `schedule` - Locks during configured time windows
- `until_date` - Locks until a specific date
- `nuclear` - Always locked, no override possible

**Usage Example:**
```typescript
import { evaluateLock } from '@/lib/core/lockEvaluator';

const rule = {
  lock_type: 'timer',
  daily_limit_minutes: 30,
  is_active: true
};

const status = evaluateLock(rule, new Date(), 25, 'Asia/Kolkata');
// { isLocked: false, unlocksAt: null, reason: null }
```

### streakManager.ts

Manages user streak calculation and updates. Runs daily via Vercel Cron to check if users maintained their lock rules without overrides.

**Key Functions:**
- `checkAndUpdateStreaks()` - Main cron function, checks all users
- `incrementStreak(userId, date)` - Increments user streak for compliant day
- `resetStreak(userId)` - Resets streak to 0 on override

**Features:**
- Checks for overrides on previous day
- Increments streak for compliant days
- Resets streak to 0 on override
- Updates longest streak when current exceeds it
- Awards streak-related badges (7-day, 30-day)
- Notifies buddies when streaks are broken

**Usage Example:**
```typescript
import { checkAndUpdateStreaks, incrementStreak, resetStreak } from '@/lib/core/streakManager';

// Called by Vercel Cron at midnight UTC
const result = await checkAndUpdateStreaks();
// { streaksIncremented: 150, streaksBroken: 12, errors: [] }

// Manually increment a user's streak
const newStreak = await incrementStreak('user-id', new Date());
// Returns: 6 (new current streak)

// Reset a user's streak (called on override)
await resetStreak('user-id');
```

**Cron Integration:**
This module is designed to be called by Vercel Cron. Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/streak-check",
    "schedule": "0 0 * * *"
  }]
}
```

**Badge Awards:**
The module automatically checks and awards these badges:
- `first_week` - 7-day streak
- `seven_day_warrior` - 7-day streak
- `social_detox` - 30-day streak

**Buddy Notifications:**
When a streak is broken, all active buddies receive a notification via the `buddy_notifications` table, which triggers Supabase Realtime events.

## Testing

All modules have comprehensive unit tests and property-based tests:

```bash
# Run all core module tests
npm test -- __tests__/core/

# Run specific module tests
npm test -- __tests__/core/lockEvaluator.test.ts
npm test -- __tests__/core/streakManager.test.ts
```

## Design Principles

1. **Pure Functions**: Core logic functions are pure and testable
2. **Timezone Aware**: All date/time calculations respect user timezones
3. **Error Handling**: Graceful error handling with detailed error messages
4. **Database Agnostic**: Uses Supabase client but logic is independent
5. **Testability**: All functions accept injected dependencies for testing

## Requirements Validation

- **lockEvaluator**: Validates Requirements 3.1-3.8
- **streakManager**: Validates Requirements 6.1-6.7

See `design.md` for detailed algorithm specifications and correctness properties.


### badgeEngine.ts

Awards badges based on user achievements and milestones. Checks if users qualify for badges and awards them with duplicate prevention.

**Key Functions:**
- `checkAndAwardBadges(userId, eventType, context)` - Main function to check and award badges
- `evaluateBadgeCondition(userId, badge, eventType, context)` - Evaluates if user qualifies for a badge
- `awardBadge(userId, badgeId)` - Awards a badge with duplicate prevention

**Supported Badge Types:**
- `quick_start` - Complete setup within 10 minutes
- `first_week` - Maintain 7-day streak
- `seven_day_warrior` - No overrides for 7 days
- `iron_will` - Complete a weekly challenge
- `social_detox` - Maintain 30-day streak
- `night_owl_slayer` - 7 days of bedtime compliance
- `pomodoro_master` - Complete 20 Pomodoro sessions

**Event Types:**
Badge checks are triggered by specific events:
- `onboarding_complete` → quick_start
- `streak_updated` → first_week, seven_day_warrior, social_detox
- `challenge_completed` → iron_will
- `bedtime_check` → night_owl_slayer
- `pomodoro_completed` → pomodoro_master

**Usage Example:**
```typescript
import { checkAndAwardBadges } from '@/lib/core/badgeEngine';

// Check and award badges after a streak update
await checkAndAwardBadges('user-id', 'streak_updated', { currentStreak: 7 });

// Check and award badges after onboarding
await checkAndAwardBadges('user-id', 'onboarding_complete', {});

// Check and award badges after completing a Pomodoro session
await checkAndAwardBadges('user-id', 'pomodoro_completed', {});
```

**Duplicate Prevention:**
The `awardBadge` function uses Supabase's `upsert` with `onConflict` to prevent duplicate badge awards. The database has a unique constraint on `(user_id, badge_id)`.

**Requirements Validation:**
- Validates Requirements 7.1-7.6
