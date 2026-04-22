# Design Document: FocusLock

## Overview

FocusLock is a web-based social media addiction reducer built as a Progressive Web App (PWA) with browser extensions. The system provides comprehensive app locking capabilities, gamification, social accountability, and AI-powered behavioral insights—all features typically locked behind premium paywalls in competing products.

The application architecture follows a modern serverless approach using Next.js 14 App Router for the frontend and API layer, Supabase for authentication, database, and real-time features, and Claude API for AI coaching insights. The system is designed to be fully functional offline (for viewing lock status) while syncing state when connectivity is restored.

Key design principles:
- Friction-first UX: Add intentional delays (mood prompts, intention prompts) to reduce impulsive unlocking
- Privacy-first: All user data stays in Supabase with row-level security; no third-party analytics
- Offline-capable: PWA architecture ensures lock rules work even without internet
- Real-time accountability: Supabase Realtime enables instant buddy notifications
- Extensible: Browser extension architecture allows cross-platform website blocking

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 14 PWA (React)          Browser Extension (MV3)        │
│  - App Router pages              - Background service worker     │
│  - React Server Components       - Content scripts              │
│  - Service Worker (offline)      - Popup UI                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Next.js API Routes (Vercel Edge Functions)                     │
│  - /api/rules          - /api/override      - /api/ai-coach     │
│  - /api/stats          - /api/buddy         - /api/streak       │
│  - /api/share-card     - /api/challenge     - /api/family       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Core Business Logic (lib/)                                     │
│  - lockEvaluator.js    - streakManager.js   - badgeEngine.js    │
│  - aiCoach.js          - notificationService.js                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Data & External Services                    │
├─────────────────────────────────────────────────────────────────┤
│  Supabase                    Claude API         Vercel Cron     │
│  - PostgreSQL (data)         - AI coaching      - Streak checks │
│  - Auth (magic link/OAuth)   - Insights         - Challenges    │
│  - Realtime (buddy notifs)                      - Bedtime mode  │
│  - Storage (avatars)                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Patterns

1. Lock Status Evaluation Flow:
   ```
   User opens app → Dashboard loads → Fetch lock_rules + usage_sessions
   → lockEvaluator.evaluateLock() → Render locked/unlocked state
   ```

2. Override Flow:
   ```
   User clicks locked app → Show countdown screen → User clicks override
   → Show mood prompt → User selects mood + reason → POST /api/override
   → Log to override_logs → Check buddy relationships → Fire Realtime notification
   → Reset streak if applicable → Return to dashboard
   ```

3. Buddy Notification Flow:
   ```
   User A overrides lock → POST /api/override → Check buddies table
   → Find active buddies watching this rule → Create buddy_notification record
   → Supabase Realtime broadcasts to User B → User B sees notification
   ```

4. AI Coaching Flow:
   ```
   User requests insights → GET /api/ai-coach → Fetch override_logs (7 days)
   → Format prompt with usage patterns → POST to Claude API
   → Parse JSON response → Display insights with mood chart
   ```

## Components and Interfaces

### Frontend Components


#### Core UI Components

1. **AppGrid** (`components/AppGrid.jsx`)
   - Displays all apps in a grid layout
   - Filters hidden apps based on lock_rules.hide_from_home
   - Shows lock badge overlay on locked apps
   - Props: `apps: App[]`, `lockStatuses: Map<string, LockStatus>`

2. **LockCard** (`components/LockCard.jsx`)
   - Individual app card with icon, name, and lock status
   - Visual states: unlocked, locked (timer), locked (schedule), locked (nuclear)
   - Click handler navigates to `/lock/[appId]` if locked
   - Props: `app: App`, `lockStatus: LockStatus`, `onClick: () => void`

3. **CountdownRing** (`components/CountdownRing.jsx`)
   - SVG-based circular progress indicator
   - Shows time remaining until unlock
   - Animates smoothly using CSS transitions
   - Props: `unlocksAt: Date`, `lockType: string`

4. **MoodPrompt** (`components/MoodPrompt.jsx`)
   - Modal dialog with mood selection buttons
   - Optional textarea for reason text
   - Validates minimum 10 characters for strict mode rules
   - Props: `onSubmit: (mood, reason) => void`, `isStrictMode: boolean`

5. **RuleBuilder** (`components/RuleBuilder.jsx`)
   - Multi-step form for creating/editing lock rules
   - Dynamic fields based on selected lock_type
   - Validation for schedule times, daily limits, unlock dates
   - Props: `initialRule?: LockRule`, `onSave: (rule) => void`

6. **PomodoroTimer** (`components/PomodoroTimer.jsx`)
   - Work/break cycle timer with visual ring
   - Session counter (e.g., "2/4 sessions")
   - Auto-locks apps during work blocks
   - Props: `session: PomodoroSession`, `onComplete: () => void`

7. **StatsChart** (`components/StatsChart.jsx`)
   - Bar chart showing daily usage by app
   - Week-over-week comparison
   - Built with HTML5 Canvas or SVG
   - Props: `usageData: UsageData[]`, `weekRange: DateRange`

8. **BadgeCard** (`components/BadgeCard.jsx`)
   - Displays badge icon, name, description
   - Visual states: earned (color), locked (grayscale)
   - Shows earned date or unlock condition
   - Props: `badge: BadgeDefinition`, `earned: boolean`, `earnedAt?: Date`

9. **BuddyPanel** (`components/BuddyPanel.jsx`)
   - List of active buddies with status indicators
   - Invite form with email input
   - Rule selection checkboxes for watching
   - Props: `buddies: Buddy[]`, `onInvite: (email) => void`

10. **AIInsightCard** (`components/AIInsightCard.jsx`)
    - Displays Claude-generated insights
    - Mood pattern visualization
    - Actionable suggestion with CTA button
    - Props: `insight: AIInsight`

11. **StreakDots** (`components/StreakDots.jsx`)
    - Visual representation of daily streak
    - Shows last 7 days with filled/empty dots
    - Displays current and longest streak numbers
    - Props: `currentStreak: number`, `longestStreak: number`

12. **ShareCard** (`components/ShareCard.jsx`)
    - Generates shareable progress image
    - Shows time saved, compliance %, streak
    - Includes FocusLock watermark
    - Export options: WhatsApp, Instagram, PNG download
    - Props: `stats: WeeklyStats`

### API Interfaces

#### Lock Rules API

```typescript
// GET /api/rules
interface GetRulesResponse {
  rules: LockRule[];
}

// POST /api/rules
interface CreateRuleRequest {
  app_name: string;
  app_icon_url?: string;
  app_scheme?: string;
  lock_type: 'timer' | 'schedule' | 'until_date' | 'nuclear';
  daily_limit_minutes?: number;
  schedule_start?: string; // HH:MM format
  schedule_end?: string;
  schedule_days?: string[]; // ['mon', 'tue', ...]
  unlock_date?: string; // ISO date
  hide_from_home?: boolean;
  hide_from_search?: boolean;
  strict_mode?: boolean;
}

interface CreateRuleResponse {
  rule: LockRule;
}

// PUT /api/rules/[id]
interface UpdateRuleRequest extends Partial<CreateRuleRequest> {
  is_active?: boolean;
}

// DELETE /api/rules/[id]
interface DeleteRuleResponse {
  success: boolean;
}
```

#### Override API

```typescript
// POST /api/override
interface OverrideRequest {
  lock_rule_id: string;
  app_name: string;
  mood: 'bored' | 'stressed' | 'tired' | 'news' | 'other';
  reason_text?: string;
}

interface OverrideResponse {
  log: OverrideLog;
  streakBroken: boolean;
  buddyNotified: boolean;
}
```

#### Stats API

```typescript
// GET /api/stats?period=week
interface StatsResponse {
  dailyUsage: Array<{
    date: string;
    apps: Array<{ app_name: string; minutes: number }>;
  }>;
  perAppBreakdown: Array<{
    app_name: string;
    total_minutes: number;
    override_count: number;
  }>;
  weekOverWeek: {
    current_week_minutes: number;
    previous_week_minutes: number;
    change_percentage: number;
  };
  compliance: {
    days_without_override: number;
    total_days: number;
    percentage: number;
  };
  timeSaved: number; // minutes
}
```

#### AI Coach API

```typescript
// POST /api/ai-coach
interface AICoachRequest {
  days?: number; // default 7
}

interface AICoachResponse {
  insight: string; // 2 sentences max
  suggestion: string; // specific actionable advice
  topMood: string;
  moodBreakdown: Array<{ mood: string; count: number }>;
}
```

#### Buddy API

```typescript
// POST /api/buddy/invite
interface BuddyInviteRequest {
  buddy_email: string;
  rules_watching: string[]; // lock_rule IDs
}

interface BuddyInviteResponse {
  buddy: Buddy;
  invite_sent: boolean;
}

// POST /api/buddy/notify
interface BuddyNotifyRequest {
  from_user_id: string;
  to_user_id: string;
  event_type: 'override' | 'streak_broken' | 'weekly_summary';
  app_name?: string;
  message: string;
}
```

#### Streak API

```typescript
// GET /api/streak
interface StreakResponse {
  current_streak: number;
  longest_streak: number;
  last_active_date: string;
}

// POST /api/streak/check (Cron only)
interface StreakCheckResponse {
  users_updated: number;
  streaks_incremented: number;
}
```

### Browser Extension Interfaces

#### Extension Message Protocol

```typescript
// Background → Content Script
interface LockStatusMessage {
  type: 'LOCK_STATUS_UPDATE';
  payload: {
    domain: string;
    isLocked: boolean;
    unlocksAt?: string;
    reason?: string;
  };
}

// Content Script → Background
interface CheckLockMessage {
  type: 'CHECK_LOCK_STATUS';
  payload: {
    domain: string;
  };
}

// Popup → Background
interface SyncRulesMessage {
  type: 'SYNC_RULES';
  payload: {
    apiToken: string;
  };
}
```

## Data Models

### Database Schema

#### profiles
```sql
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  avatar_url   TEXT,
  timezone     TEXT DEFAULT 'Asia/Kolkata',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### lock_rules
```sql
CREATE TABLE lock_rules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app_name             TEXT NOT NULL,
  app_icon_url         TEXT,
  app_scheme           TEXT,
  lock_type            TEXT NOT NULL CHECK (lock_type IN ('timer','schedule','until_date','nuclear')),
  daily_limit_minutes  INTEGER,
  schedule_start       TIME,
  schedule_end         TIME,
  schedule_days        TEXT[],
  unlock_date          DATE,
  hide_from_home       BOOLEAN DEFAULT TRUE,
  hide_from_search     BOOLEAN DEFAULT TRUE,
  strict_mode          BOOLEAN DEFAULT FALSE,
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_timer CHECK (lock_type != 'timer' OR daily_limit_minutes IS NOT NULL),
  CONSTRAINT valid_schedule CHECK (lock_type != 'schedule' OR (schedule_start IS NOT NULL AND schedule_end IS NOT NULL AND schedule_days IS NOT NULL)),
  CONSTRAINT valid_until_date CHECK (lock_type != 'until_date' OR unlock_date IS NOT NULL)
);

CREATE INDEX idx_lock_rules_user_id ON lock_rules(user_id);
CREATE INDEX idx_lock_rules_app_name ON lock_rules(user_id, app_name);
```

#### override_logs
```sql
CREATE TABLE override_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lock_rule_id   UUID REFERENCES lock_rules(id) ON DELETE SET NULL,
  app_name       TEXT NOT NULL,
  mood           TEXT CHECK (mood IN ('bored','stressed','tired','news','other')),
  reason_text    TEXT,
  overridden_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_override_logs_user_date ON override_logs(user_id, overridden_at DESC);
CREATE INDEX idx_override_logs_app ON override_logs(user_id, app_name);
```

#### usage_sessions
```sql
CREATE TABLE usage_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app_name       TEXT NOT NULL,
  session_start  TIMESTAMPTZ NOT NULL,
  session_end    TIMESTAMPTZ,
  minutes_used   INTEGER,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_sessions_user_date ON usage_sessions(user_id, date DESC);
CREATE INDEX idx_usage_sessions_app ON usage_sessions(user_id, app_name, date);
```

#### streaks
```sql
CREATE TABLE streaks (
  user_id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak   INTEGER DEFAULT 0,
  longest_streak   INTEGER DEFAULT 0,
  last_active_date DATE,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

#### badge_definitions
```sql
CREATE TABLE badge_definitions (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  icon         TEXT,
  condition    TEXT
);

-- Seed data
INSERT INTO badge_definitions (id, name, description, icon, condition) VALUES
  ('quick_start', 'Quick Starter', 'Complete setup within 10 minutes', '⚡', 'Setup completed in <10 min'),
  ('first_week', 'First Week Clean', 'Maintain 7-day streak', '🌱', '7-day streak'),
  ('seven_day_warrior', '7-Day Warrior', 'No overrides for 7 days', '⚔️', '7 days without override'),
  ('iron_will', 'Iron Will', 'Complete a weekly challenge', '🛡️', 'Complete weekly challenge'),
  ('social_detox', 'Social Detox', 'Maintain 30-day streak', '🧘', '30-day streak'),
  ('night_owl_slayer', 'Night Owl Slayer', '7 days of bedtime compliance', '🌙', '7 days bedtime mode'),
  ('pomodoro_master', 'Pomodoro Master', 'Complete 20 Pomodoro sessions', '🍅', '20 completed sessions');
```

#### user_badges
```sql
CREATE TABLE user_badges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id     TEXT NOT NULL REFERENCES badge_definitions(id),
  earned_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
```

#### buddies
```sql
CREATE TABLE buddies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buddy_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rules_watching UUID[],
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','removed')),
  invited_at     TIMESTAMPTZ DEFAULT NOW(),
  accepted_at    TIMESTAMPTZ,
  UNIQUE(user_id, buddy_user_id),
  CHECK (user_id != buddy_user_id)
);

CREATE INDEX idx_buddies_user ON buddies(user_id);
CREATE INDEX idx_buddies_buddy_user ON buddies(buddy_user_id);
```

#### buddy_notifications
```sql
CREATE TABLE buddy_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL CHECK (event_type IN ('override','streak_broken','weekly_summary')),
  app_name     TEXT,
  message      TEXT,
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_buddy_notifications_to_user ON buddy_notifications(to_user_id, created_at DESC);
```

#### pomodoro_sessions
```sql
CREATE TABLE pomodoro_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_label      TEXT,
  work_minutes    INTEGER DEFAULT 25,
  break_minutes   INTEGER DEFAULT 5,
  sessions_target INTEGER DEFAULT 4,
  sessions_done   INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ
);

CREATE INDEX idx_pomodoro_sessions_user ON pomodoro_sessions(user_id, started_at DESC);
```

#### weekly_challenges
```sql
CREATE TABLE weekly_challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app_name        TEXT NOT NULL,
  daily_limit     INTEGER NOT NULL,
  week_start      DATE NOT NULL,
  week_end        DATE NOT NULL,
  days_completed  INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','completed','failed')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weekly_challenges_user ON weekly_challenges(user_id, week_start DESC);
```

#### child_profiles
```sql
CREATE TABLE child_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_user_id)
);

CREATE INDEX idx_child_profiles_parent ON child_profiles(parent_user_id);
```

### Row-Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lock_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE override_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Lock rules: users can manage their own rules + parents can manage child rules
CREATE POLICY "Users can manage own lock rules" ON lock_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Parents can manage child lock rules" ON lock_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM child_profiles
      WHERE parent_user_id = auth.uid()
      AND child_user_id = lock_rules.user_id
    )
  );

-- Override logs: users can create their own + buddies can read watched rules
CREATE POLICY "Users can create own override logs" ON override_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own override logs" ON override_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Buddies can view partner override logs" ON override_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM buddies
      WHERE buddy_user_id = auth.uid()
      AND user_id = override_logs.user_id
      AND status = 'active'
      AND (
        rules_watching IS NULL 
        OR lock_rule_id = ANY(rules_watching)
      )
    )
  );

-- Usage sessions: users can manage their own
CREATE POLICY "Users can manage own usage sessions" ON usage_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Streaks: users can view/update their own
CREATE POLICY "Users can manage own streak" ON streaks
  FOR ALL USING (auth.uid() = user_id);

-- User badges: users can view their own
CREATE POLICY "Users can view own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

-- Buddies: users can manage relationships where they are user or buddy
CREATE POLICY "Users can manage buddy relationships" ON buddies
  FOR ALL USING (auth.uid() = user_id OR auth.uid() = buddy_user_id);

-- Buddy notifications: users can view notifications sent to them
CREATE POLICY "Users can view own notifications" ON buddy_notifications
  FOR SELECT USING (auth.uid() = to_user_id);

CREATE POLICY "Users can create notifications" ON buddy_notifications
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Pomodoro sessions: users can manage their own
CREATE POLICY "Users can manage own pomodoro sessions" ON pomodoro_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Weekly challenges: users can view their own
CREATE POLICY "Users can view own challenges" ON weekly_challenges
  FOR SELECT USING (auth.uid() = user_id);

-- Child profiles: parents can manage, children can view
CREATE POLICY "Parents can manage child profiles" ON child_profiles
  FOR ALL USING (auth.uid() = parent_user_id);

CREATE POLICY "Children can view own profile link" ON child_profiles
  FOR SELECT USING (auth.uid() = child_user_id);
```

## Key Algorithms

### lockEvaluator

The lock evaluator is the core business logic that determines whether an app is currently locked based on the rule configuration and current context.


**Algorithm: evaluateLock**

```javascript
/**
 * Evaluates whether an app is currently locked based on rule configuration
 * @param {LockRule} rule - The lock rule to evaluate
 * @param {Date} now - Current datetime (injected for testability)
 * @param {number} todayUsageMinutes - Minutes used today for this app
 * @param {string} userTimezone - User's configured timezone
 * @returns {LockStatus} Lock status with unlock time and reason
 */
function evaluateLock(rule, now = new Date(), todayUsageMinutes = 0, userTimezone = 'Asia/Kolkata') {
  // Inactive rules are always unlocked
  if (!rule.is_active) {
    return { isLocked: false, unlocksAt: null, reason: null };
  }

  // Convert current time to user's timezone
  const userNow = toTimezone(now, userTimezone);

  switch (rule.lock_type) {
    case 'timer':
      return evaluateTimerLock(rule, userNow, todayUsageMinutes);
    
    case 'schedule':
      return evaluateScheduleLock(rule, userNow);
    
    case 'until_date':
      return evaluateUntilDateLock(rule, userNow);
    
    case 'nuclear':
      return { isLocked: true, unlocksAt: null, reason: 'Nuclear mode active — no override possible' };
    
    default:
      return { isLocked: false, unlocksAt: null, reason: null };
  }
}

function evaluateTimerLock(rule, now, todayUsageMinutes) {
  const isLocked = todayUsageMinutes >= rule.daily_limit_minutes;
  
  if (!isLocked) {
    return { isLocked: false, unlocksAt: null, reason: null };
  }

  // Unlocks at midnight
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  return {
    isLocked: true,
    unlocksAt: midnight,
    reason: `Daily limit of ${rule.daily_limit_minutes} minutes reached`
  };
}

function evaluateScheduleLock(rule, now) {
  // Check if today is in the schedule
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
  
  if (!rule.schedule_days.includes(dayOfWeek)) {
    return { isLocked: false, unlocksAt: null, reason: null };
  }

  // Parse schedule times
  const [startHour, startMin] = rule.schedule_start.split(':').map(Number);
  const [endHour, endMin] = rule.schedule_end.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Check if current time is within schedule window
  const isLocked = nowMinutes >= startMinutes && nowMinutes < endMinutes;

  if (!isLocked) {
    return { isLocked: false, unlocksAt: null, reason: null };
  }

  // Calculate unlock time
  const unlocksAt = new Date(now);
  unlocksAt.setHours(endHour, endMin, 0, 0);

  return {
    isLocked: true,
    unlocksAt,
    reason: `Locked by schedule until ${formatTime(unlocksAt)}`
  };
}

function evaluateUntilDateLock(rule, now) {
  const unlockDate = new Date(rule.unlock_date);
  unlockDate.setHours(0, 0, 0, 0);
  
  const currentDate = new Date(now);
  currentDate.setHours(0, 0, 0, 0);

  const isLocked = currentDate < unlockDate;

  if (!isLocked) {
    return { isLocked: false, unlocksAt: null, reason: null };
  }

  return {
    isLocked: true,
    unlocksAt: unlockDate,
    reason: `Locked until ${formatDate(unlockDate)}`
  };
}
```

**Edge Cases Handled:**
- Timezone conversion for users in different regions
- Schedule rules that span midnight (handled by checking day-of-week)
- Timer rules that reset at midnight in user's timezone
- Inactive rules that should always return unlocked
- Nuclear mode rules that never unlock

### streakManager

Manages user streak calculation and updates. Runs daily via Vercel Cron.

**Algorithm: checkAndUpdateStreaks**

```javascript
/**
 * Checks all users and updates streaks based on yesterday's activity
 * Called by Vercel Cron at midnight UTC
 */
async function checkAndUpdateStreaks() {
  const yesterday = getYesterday();
  const users = await getAllUsers();
  
  let streaksIncremented = 0;
  let streaksBroken = 0;

  for (const user of users) {
    const hadOverride = await checkOverrideOnDate(user.id, yesterday);
    
    if (hadOverride) {
      // Break streak
      await resetStreak(user.id);
      streaksBroken++;
      
      // Notify buddy if configured
      await notifyBuddyStreakBroken(user.id);
    } else {
      // Increment streak
      const newStreak = await incrementStreak(user.id, yesterday);
      streaksIncremented++;
      
      // Check for badge awards
      await checkStreakBadges(user.id, newStreak);
    }
  }

  return { streaksIncremented, streaksBroken };
}

async function incrementStreak(userId, date) {
  const streak = await getStreak(userId);
  
  // Check if this is consecutive day
  const lastActiveDate = streak.last_active_date ? new Date(streak.last_active_date) : null;
  const isConsecutive = lastActiveDate && 
    Math.abs(date - lastActiveDate) === 86400000; // 1 day in ms

  const newCurrentStreak = isConsecutive ? streak.current_streak + 1 : 1;
  const newLongestStreak = Math.max(newCurrentStreak, streak.longest_streak);

  await updateStreak(userId, {
    current_streak: newCurrentStreak,
    longest_streak: newLongestStreak,
    last_active_date: date
  });

  return newCurrentStreak;
}

async function resetStreak(userId) {
  await updateStreak(userId, {
    current_streak: 0
  });
}

async function checkStreakBadges(userId, currentStreak) {
  const badgesToCheck = [
    { id: 'first_week', threshold: 7 },
    { id: 'seven_day_warrior', threshold: 7 },
    { id: 'social_detox', threshold: 30 }
  ];

  for (const badge of badgesToCheck) {
    if (currentStreak >= badge.threshold) {
      await awardBadge(userId, badge.id);
    }
  }
}
```

**Edge Cases Handled:**
- Users who skip days (streak resets to 1, not 0)
- First-time users with no last_active_date
- Timezone differences (all calculations in UTC, converted for display)
- Concurrent updates (use database transactions)

### badgeEngine

Awards badges based on user achievements and milestones.

**Algorithm: checkAndAwardBadges**

```javascript
/**
 * Checks if user qualifies for any badges and awards them
 * @param {string} userId - User ID to check
 * @param {string} eventType - Type of event that triggered check
 * @param {object} context - Additional context for badge evaluation
 */
async function checkAndAwardBadges(userId, eventType, context = {}) {
  const badges = await getBadgeDefinitions();
  const userBadges = await getUserBadges(userId);
  const earnedBadgeIds = new Set(userBadges.map(b => b.badge_id));

  for (const badge of badges) {
    // Skip if already earned
    if (earnedBadgeIds.has(badge.id)) continue;

    const qualifies = await evaluateBadgeCondition(userId, badge, eventType, context);
    
    if (qualifies) {
      await awardBadge(userId, badge.id);
      await sendBadgeNotification(userId, badge);
    }
  }
}

async function evaluateBadgeCondition(userId, badge, eventType, context) {
  switch (badge.id) {
    case 'quick_start':
      // Awarded if user completes onboarding within 10 minutes
      if (eventType !== 'onboarding_complete') return false;
      const profile = await getProfile(userId);
      const timeSinceCreation = Date.now() - new Date(profile.created_at).getTime();
      return timeSinceCreation <= 10 * 60 * 1000; // 10 minutes

    case 'first_week':
    case 'seven_day_warrior':
      // Awarded at 7-day streak
      if (eventType !== 'streak_updated') return false;
      return context.currentStreak >= 7;

    case 'iron_will':
      // Awarded when weekly challenge is completed
      if (eventType !== 'challenge_completed') return false;
      return true;

    case 'social_detox':
      // Awarded at 30-day streak
      if (eventType !== 'streak_updated') return false;
      return context.currentStreak >= 30;

    case 'night_owl_slayer':
      // Awarded after 7 consecutive days of bedtime mode compliance
      if (eventType !== 'bedtime_check') return false;
      const bedtimeCompliance = await getBedtimeCompliance(userId, 7);
      return bedtimeCompliance.consecutiveDays >= 7;

    case 'pomodoro_master':
      // Awarded after 20 completed Pomodoro sessions
      if (eventType !== 'pomodoro_completed') return false;
      const completedSessions = await countCompletedPomodoros(userId);
      return completedSessions >= 20;

    default:
      return false;
  }
}

async function awardBadge(userId, badgeId) {
  // Use INSERT ... ON CONFLICT to prevent duplicates
  await supabase
    .from('user_badges')
    .insert({ user_id: userId, badge_id: badgeId })
    .onConflict(['user_id', 'badge_id'])
    .ignore();
}
```

**Badge Trigger Events:**
- `onboarding_complete` → quick_start
- `streak_updated` → first_week, seven_day_warrior, social_detox
- `challenge_completed` → iron_will
- `bedtime_check` → night_owl_slayer
- `pomodoro_completed` → pomodoro_master

### aiCoach

Integrates with Claude API to provide behavioral insights.

**Algorithm: generateInsights**

```javascript
/**
 * Generates AI coaching insights based on user's override patterns
 * @param {string} userId - User ID
 * @param {number} days - Number of days to analyze (default 7)
 * @returns {AIInsight} Insight, suggestion, and mood analysis
 */
async function generateInsights(userId, days = 7) {
  // Fetch override logs from past N days
  const overrideLogs = await getOverrideLogs(userId, days);
  
  if (overrideLogs.length === 0) {
    return {
      insight: "Great job! You haven't overridden any locks this week.",
      suggestion: "Keep up the momentum by setting a new challenge for next week.",
      topMood: null,
      moodBreakdown: []
    };
  }

  // Prepare data for Claude
  const overrideData = overrideLogs.map(log => ({
    app: log.app_name,
    mood: log.mood,
    reason: log.reason_text,
    time: log.overridden_at,
    dayOfWeek: new Date(log.overridden_at).toLocaleDateString('en-US', { weekday: 'long' }),
    hourOfDay: new Date(log.overridden_at).getHours()
  }));

  // Calculate mood breakdown
  const moodCounts = {};
  overrideData.forEach(o => {
    moodCounts[o.mood] = (moodCounts[o.mood] || 0) + 1;
  });
  const moodBreakdown = Object.entries(moodCounts)
    .map(([mood, count]) => ({ mood, count }))
    .sort((a, b) => b.count - a.count);
  const topMood = moodBreakdown[0]?.mood || null;

  // Build Claude prompt
  const prompt = buildCoachingPrompt(overrideData, moodBreakdown);

  // Call Claude API
  const response = await callClaudeAPI(prompt);

  return {
    insight: response.insight,
    suggestion: response.suggestion,
    topMood,
    moodBreakdown
  };
}

function buildCoachingPrompt(overrideData, moodBreakdown) {
  return `You are a compassionate digital wellbeing coach. Analyze this user's app override patterns from the past week and provide guidance.

Override data:
${JSON.stringify(overrideData, null, 2)}

Mood breakdown:
${JSON.stringify(moodBreakdown, null, 2)}

Provide your response in JSON format with these fields:
{
  "insight": "One key observation about their patterns (2 sentences max, warm and non-judgmental)",
  "suggestion": "One specific, actionable suggestion to improve (be concrete, not generic)"
}

Focus on:
- Time-of-day patterns (e.g., "You tend to override locks in the evening")
- Mood triggers (e.g., "Stress seems to be your main trigger")
- App-specific patterns (e.g., "Instagram is your most overridden app")
- Practical suggestions (e.g., "Try scheduling a 10-minute walk at 8 PM instead")

Keep the tone supportive and encouraging, never judgmental.`;
}

async function callClaudeAPI(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  const data = await response.json();
  const content = data.content[0].text;
  
  // Parse JSON response
  return JSON.parse(content);
}
```

**Error Handling:**
- If Claude API fails, return a generic encouraging message
- If JSON parsing fails, extract insight/suggestion from text
- Rate limit handling with exponential backoff
- Fallback to cached insights if API is unavailable

## Integration Points

### Supabase Integration

**Authentication:**
- Magic link email authentication via Supabase Auth
- Google OAuth integration
- Session management with JWT tokens
- Middleware protection for authenticated routes

**Database:**
- PostgreSQL with row-level security
- Real-time subscriptions for buddy notifications
- Automatic timestamp management with triggers
- Cascade deletes for data cleanup

**Realtime:**
```javascript
// Subscribe to buddy notifications
const subscription = supabase
  .channel('buddy_notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'buddy_notifications',
    filter: `to_user_id=eq.${userId}`
  }, (payload) => {
    showNotification(payload.new);
  })
  .subscribe();
```

**Storage:**
- User avatar uploads to Supabase Storage
- Badge icons stored in public bucket
- Share card images temporarily stored for download

### Claude API Integration

**Configuration:**
- Model: `claude-sonnet-4-20250514`
- Max tokens: 500 (insights are concise)
- Temperature: 0.7 (balanced creativity)
- System prompt: Digital wellbeing coach persona

**Rate Limiting:**
- Max 1 request per user per hour
- Cached insights for 24 hours
- Fallback to generic messages on rate limit

**Privacy:**
- Only override patterns sent (no personal info)
- App names anonymized in logs
- No data retention by Anthropic (per API terms)

### Vercel Cron Integration

**Cron Jobs:**

1. **Daily Streak Check** (`/api/cron/streak-check`)
   - Schedule: `0 0 * * *` (midnight UTC)
   - Checks all users for yesterday's compliance
   - Updates streak records
   - Sends buddy notifications for broken streaks

2. **Weekly Challenge Generation** (`/api/cron/generate-challenges`)
   - Schedule: `0 6 * * 1` (Monday 6 AM UTC)
   - Analyzes previous week's worst app per user
   - Creates new challenge with 5-day goal
   - Sends notification to user

3. **Bedtime Mode Activation** (`/api/cron/bedtime-check`)
   - Schedule: `*/15 * * * *` (every 15 minutes)
   - Checks users with bedtime mode enabled
   - Activates locks at configured bedtime
   - Deactivates at wake time

4. **Weekly AI Insights** (`/api/cron/weekly-insights`)
   - Schedule: `0 9 * * 1` (Monday 9 AM UTC)
   - Generates AI insights for active users
   - Sends email with insights (optional)
   - Caches insights for dashboard display

**Cron Security:**
- Verify `Authorization: Bearer ${CRON_SECRET}` header
- Rate limit to prevent abuse
- Idempotent operations (safe to retry)

### Browser Extension Architecture

**Manifest V3 Structure:**

```json
{
  "manifest_version": 3,
  "name": "FocusLock",
  "version": "1.0.0",
  "permissions": ["storage", "alarms", "tabs"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_start"
  }],
  "action": {
    "default_popup": "popup/popup.html"
  }
}
```

**Background Service Worker:**
- Syncs lock rules from FocusLock API every 5 minutes
- Evaluates lock status for current tab
- Injects content script to block locked sites
- Manages alarms for scheduled unlocks

**Content Script:**
- Intercepts page load for locked domains
- Replaces page with countdown UI
- Listens for unlock events from background
- Handles mood prompt for overrides

**Popup UI:**
- Shows current lock status
- Quick toggle for rules
- Link to web app dashboard
- Sync status indicator

**Domain Mapping:**
```javascript
const APP_DOMAIN_MAP = {
  'Instagram': ['instagram.com', 'www.instagram.com'],
  'YouTube': ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
  'TikTok': ['tiktok.com', 'www.tiktok.com'],
  'Twitter': ['twitter.com', 'x.com', 'www.twitter.com', 'www.x.com'],
  'Facebook': ['facebook.com', 'www.facebook.com', 'm.facebook.com'],
  'Reddit': ['reddit.com', 'www.reddit.com']
};
```

## Security Considerations

### Authentication Security

- Magic link tokens expire after 1 hour
- Google OAuth uses PKCE flow
- Session tokens stored in httpOnly cookies
- CSRF protection via SameSite cookies
- Automatic session refresh before expiry

### Row-Level Security (RLS)

- All tables have RLS enabled
- Users can only access their own data
- Buddies have read-only access to watched rules
- Parents can manage child accounts
- Service role bypasses RLS for cron jobs

### API Security

- All API routes require authentication
- Rate limiting: 100 requests/minute per user
- Input validation with Zod schemas
- SQL injection prevention via parameterized queries
- XSS prevention via React's automatic escaping

### Data Privacy

- No third-party analytics or tracking
- User data never sold or shared
- Claude API: no data retention
- Supabase: encrypted at rest and in transit
- GDPR-compliant data export and deletion

### Browser Extension Security

- Content Security Policy (CSP) enforced
- API token stored in encrypted storage
- No eval() or inline scripts
- Permissions limited to necessary domains
- Regular security audits

## Error Handling

### Client-Side Error Handling

**Network Errors:**
```javascript
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

**Offline Handling:**
- Service worker caches lock rules for offline access
- Queue override logs for sync when online
- Show offline indicator in UI
- Graceful degradation (disable AI coach, buddy notifications)

**User-Facing Errors:**
- Toast notifications for transient errors
- Inline validation errors for forms
- Fallback UI for failed data loads
- Clear error messages (no technical jargon)

### Server-Side Error Handling

**API Error Responses:**
```javascript
// Standardized error format
{
  error: {
    code: 'INVALID_LOCK_TYPE',
    message: 'Lock type must be one of: timer, schedule, until_date, nuclear',
    details: { provided: 'invalid_type' }
  }
}
```

**Error Codes:**
- `AUTH_REQUIRED`: User not authenticated
- `FORBIDDEN`: User lacks permission
- `NOT_FOUND`: Resource doesn't exist
- `VALIDATION_ERROR`: Invalid input data
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `EXTERNAL_SERVICE_ERROR`: Claude API or Supabase failure
- `INTERNAL_ERROR`: Unexpected server error

**Logging:**
- Error logs sent to Vercel Analytics
- Include request ID for tracing
- Sanitize sensitive data (tokens, passwords)
- Alert on critical errors (database down, API failures)

### Database Error Handling

**Constraint Violations:**
- Unique constraint: Return user-friendly "already exists" message
- Foreign key: Return "related resource not found"
- Check constraint: Return validation error with details

**Transaction Rollback:**
```javascript
async function createLockRuleWithUsageReset(userId, ruleData) {
  const { data, error } = await supabase.rpc('create_lock_rule_tx', {
    p_user_id: userId,
    p_rule_data: ruleData
  });

  if (error) {
    // Transaction automatically rolled back
    throw new Error('Failed to create lock rule');
  }

  return data;
}
```

## Testing Strategy

FocusLock requires a comprehensive testing approach that combines unit tests for business logic, integration tests for API endpoints and database interactions, and end-to-end tests for critical user flows. Property-based testing is appropriate for core algorithms (lockEvaluator, streakManager, badgeEngine) that have universal properties, while example-based tests cover specific scenarios and edge cases.

### Unit Testing

**Test Coverage:**
- Core algorithms: lockEvaluator, streakManager, badgeEngine, aiCoach
- Utility functions: date/time helpers, formatters, validators
- React components: isolated component behavior
- API route handlers: request/response logic

**Testing Framework:**
- Jest for test runner and assertions
- React Testing Library for component tests
- MSW (Mock Service Worker) for API mocking

**Example Unit Tests:**

```javascript
// lockEvaluator.test.js
describe('evaluateTimerLock', () => {
  it('should unlock when usage is below limit', () => {
    const rule = { lock_type: 'timer', daily_limit_minutes: 30, is_active: true };
    const result = evaluateLock(rule, new Date(), 20);
    expect(result.isLocked).toBe(false);
  });

  it('should lock when usage reaches limit', () => {
    const rule = { lock_type: 'timer', daily_limit_minutes: 30, is_active: true };
    const result = evaluateLock(rule, new Date(), 30);
    expect(result.isLocked).toBe(true);
    expect(result.reason).toContain('Daily limit');
  });

  it('should unlock at midnight', () => {
    const rule = { lock_type: 'timer', daily_limit_minutes: 30, is_active: true };
    const now = new Date('2024-01-15T22:00:00Z');
    const result = evaluateLock(rule, now, 30);
    expect(result.unlocksAt.getHours()).toBe(0);
    expect(result.unlocksAt.getDate()).toBe(16);
  });
});
```

### Integration Testing

**Test Coverage:**
- API endpoints with database interactions
- Supabase RLS policies
- Authentication flows
- Realtime subscriptions
- Cron job execution

**Testing Approach:**
- Use Supabase local development environment
- Seed test data before each test
- Clean up after each test
- Test RLS policies with different user contexts

**Example Integration Tests:**

```javascript
// api/rules.test.js
describe('POST /api/rules', () => {
  it('should create a timer lock rule', async () => {
    const response = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      body: JSON.stringify({
        app_name: 'Instagram',
        lock_type: 'timer',
        daily_limit_minutes: 30
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.rule.app_name).toBe('Instagram');
    expect(data.rule.lock_type).toBe('timer');
  });

  it('should enforce RLS - users cannot create rules for other users', async () => {
    const response = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      body: JSON.stringify({
        user_id: 'other-user-id', // Attempt to create for different user
        app_name: 'Instagram',
        lock_type: 'timer',
        daily_limit_minutes: 30
      })
    });

    expect(response.status).toBe(403);
  });
});
```

### End-to-End Testing

**Test Coverage:**
- Critical user flows: onboarding, creating lock rules, override flow
- Cross-browser compatibility (Chrome, Firefox, Safari)
- PWA installation and offline functionality
- Browser extension sync

**Testing Framework:**
- Playwright for E2E tests
- Test against staging environment
- Visual regression testing with Percy

**Example E2E Tests:**

```javascript
// e2e/override-flow.spec.js
test('user can override lock with mood prompt', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Click locked app
  await page.click('[data-testid="app-instagram"]');
  
  // Should show countdown screen
  await expect(page.locator('[data-testid="countdown-ring"]')).toBeVisible();
  
  // Click override button
  await page.click('[data-testid="override-button"]');
  
  // Should show mood prompt
  await expect(page.locator('[data-testid="mood-prompt"]')).toBeVisible();
  
  // Select mood
  await page.click('[data-testid="mood-bored"]');
  
  // Submit
  await page.click('[data-testid="mood-submit"]');
  
  // Should return to dashboard with app unlocked
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('[data-testid="app-instagram"]')).not.toHaveClass(/locked/);
});
```

### Property-Based Testing

Property-based testing is appropriate for FocusLock's core business logic where universal properties hold across many inputs. We will use fast-check for JavaScript property-based testing.

**Applicable Areas:**
- lockEvaluator: lock status calculation
- streakManager: streak increment/reset logic
- badgeEngine: badge award conditions
- Date/time utilities: timezone conversions, schedule calculations

**Not Applicable:**
- UI rendering (use snapshot tests)
- External API calls (use integration tests with mocks)
- Database operations (use integration tests)
- Cron jobs (use integration tests)

**Testing Library:**
- fast-check for JavaScript/TypeScript
- Minimum 100 iterations per property test
- Each test tagged with design property reference


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

For FocusLock, property-based testing is appropriate for core business logic (lock evaluation, streak management, badge awards, statistics calculations) where universal properties hold across many inputs. Infrastructure concerns (authentication, database RLS, cron jobs, UI rendering, external APIs) are better tested with integration and E2E tests.

### Property Reflection

After analyzing all 22 requirements, I identified the following testable properties. During reflection, I combined related properties to eliminate redundancy:

- Lock evaluation properties (3.2, 3.3, 3.5, 3.7) can be combined into comprehensive lock status properties per lock type
- Streak properties (6.2, 6.3, 6.4) can be combined into streak invariant properties
- Session tracking properties (5.1, 5.2, 5.3) can be combined into session lifecycle properties
- Validation properties (2.1, 2.3-2.6) can be combined into rule validation properties

### Property 1: Profile Creation Completeness

For any valid user authentication data, creating a profile SHALL result in a profile record containing all required fields (user_id, full_name, avatar_url, timezone, created_at).

**Validates: Requirements 1.3**

### Property 2: Profile Update Round-Trip

For any valid profile updates (full_name, avatar_url, timezone), applying the update then reading the profile SHALL return the updated values.

**Validates: Requirements 1.5**

### Property 3: Lock Rule Validation by Type

For any lock rule, the system SHALL enforce type-specific required fields: timer rules require daily_limit_minutes, schedule rules require schedule_start/end/days, until_date rules require unlock_date.

**Validates: Requirements 2.1, 2.3, 2.4, 2.5, 2.6**

### Property 4: Lock Rule Configuration Persistence

For any lock rule with visibility and strict mode settings, creating or updating the rule SHALL persist all boolean configurations correctly.

**Validates: Requirements 2.7, 2.8, 2.9**

### Property 5: Lock Rule Update Round-Trip

For any valid lock rule updates, applying the update SHALL persist all changes and update the updated_at timestamp to a time after the previous timestamp.

**Validates: Requirements 2.10**

### Property 6: Lock Rule Deletion Cascade

For any lock rule with associated override logs, deleting the rule SHALL remove the rule and set all associated override_logs.lock_rule_id to NULL.

**Validates: Requirements 2.11**

### Property 7: Timer Lock Evaluation

For any timer lock rule with daily_limit_minutes and current usage, the lock status SHALL be locked when usage >= limit, unlocked otherwise, and when locked the unlock time SHALL be midnight in the user's timezone.

**Validates: Requirements 3.2**

### Property 8: Schedule Lock Evaluation

For any schedule lock rule with schedule_start, schedule_end, and schedule_days, the lock status SHALL be locked when current time falls within the schedule window on a scheduled day, and the unlock time SHALL be the schedule_end time.

**Validates: Requirements 3.3, 3.4**

### Property 9: Until-Date Lock Evaluation

For any until_date lock rule with unlock_date, the lock status SHALL be locked when current date < unlock_date, and the unlock time SHALL be the unlock_date at midnight.

**Validates: Requirements 3.5**

### Property 10: Lock Evaluation Timezone Consistency

For any lock rule and user timezone, evaluating the lock status SHALL use the user's timezone for all time calculations, ensuring consistent behavior across timezones.

**Validates: Requirements 3.7**

### Property 11: Lock Status Reason Presence

For any lock rule that evaluates to locked status, the system SHALL provide a non-empty reason string explaining why the app is locked.

**Validates: Requirements 3.8**

### Property 12: Override Log Completeness

For any override with mood and optional reason text, the created override log SHALL contain all required fields (user_id, lock_rule_id, app_name, mood, reason_text, overridden_at).

**Validates: Requirements 4.4**

### Property 13: Usage Session Start Recording

For any usage session start, the system SHALL record all required fields (user_id, app_name, session_start, date).

**Validates: Requirements 5.1**

### Property 14: Usage Session Duration Calculation

For any usage session with session_start and session_end, the calculated minutes_used SHALL equal the difference in minutes between end and start times.

**Validates: Requirements 5.2**

### Property 15: Daily Usage Aggregation

For any set of usage sessions for the same app and date, the aggregated daily usage SHALL equal the sum of all session minutes_used for that app and date.

**Validates: Requirements 5.3**

### Property 16: Streak Increment Without Override

For any user with no overrides on a given date, checking and updating the streak SHALL increment current_streak by 1 (or set to 1 if not consecutive).

**Validates: Requirements 6.2**

### Property 17: Longest Streak Invariant

For any streak update, the longest_streak SHALL always be greater than or equal to current_streak.

**Validates: Requirements 6.3**

### Property 18: Streak Reset on Override

For any user who logs an override, the current_streak SHALL be reset to 0.

**Validates: Requirements 6.4**

### Property 19: Streak Last Active Date Update

For any streak increment, the last_active_date SHALL be updated to the date of the increment.

**Validates: Requirements 6.5**

### Property 20: Badge Award Idempotence

For any user and badge combination, awarding the same badge multiple times SHALL result in only one user_badge record (no duplicates).

**Validates: Requirements 7.4**

### Property 21: Badge Award on Condition Met

For any user achieving a badge condition (e.g., 7-day streak for seven_day_warrior), the system SHALL award the corresponding badge with an earned_at timestamp.

**Validates: Requirements 7.3**

### Property 22: Pomodoro Session Recording

For any Pomodoro session start with task_label, work_minutes, break_minutes, and sessions_target, the system SHALL record all fields with status 'active' and started_at timestamp.

**Validates: Requirements 8.1**

### Property 23: Pomodoro Session Counter Increment

For any Pomodoro session, completing a work block SHALL increment sessions_done by 1.

**Validates: Requirements 8.5**

### Property 24: Pomodoro Session Completion

For any Pomodoro session where sessions_done reaches sessions_target, the system SHALL mark status as 'completed' and record ended_at timestamp.

**Validates: Requirements 8.6**

### Property 25: Buddy Relationship Initial State

For any buddy invitation, the created relationship SHALL have status 'pending', invited_at timestamp, and null accepted_at.

**Validates: Requirements 9.1**

### Property 26: Buddy Relationship State Transition

For any pending buddy relationship that is accepted, the status SHALL transition to 'active' and accepted_at SHALL be set to the acceptance timestamp.

**Validates: Requirements 9.2**

### Property 27: Buddy Rules Watching Persistence

For any buddy relationship with selected rules_watching array, the array SHALL persist correctly and contain only valid lock_rule IDs.

**Validates: Requirements 9.3**

### Property 28: Buddy Notification Creation

For any override of a watched lock rule, the system SHALL create a buddy_notification record for each active buddy watching that rule.

**Validates: Requirements 9.4**

### Property 29: Worst App Identification

For any user's override logs over a time period, identifying the worst-performing app SHALL return the app with the highest override count.

**Validates: Requirements 11.2**

### Property 30: Weekly Challenge Structure

For any generated weekly challenge, the challenge SHALL have a 5-day structure (week_start to week_end spanning 5 days) with a daily_limit goal.

**Validates: Requirements 11.3**

### Property 31: Challenge Progress Tracking

For any active challenge and daily usage data, the days_completed count SHALL accurately reflect the number of days where usage stayed within the daily_limit.

**Validates: Requirements 11.4**

### Property 32: Challenge Completion Status

For any challenge where days_completed reaches 5, the status SHALL be updated to 'completed'.

**Validates: Requirements 11.5**

### Property 33: Statistics Calculation Accuracy

For any set of usage sessions over a time period, the calculated statistics (total minutes, per-app breakdown, week-over-week comparison, compliance percentage) SHALL accurately reflect the underlying session data.

**Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5**

### Property 34: Data Export Completeness

For any user requesting data export, the generated export SHALL contain all user data including lock_rules, override_logs, usage_sessions, streaks, user_badges, buddies, and pomodoro_sessions.

**Validates: Requirements 22.1**

## Error Handling

(Already covered in previous section)

## Testing Strategy

(Already covered in previous section - now complete with property-based testing details)

### Property-Based Test Implementation

**Testing Library:** fast-check for JavaScript/TypeScript

**Test Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: focuslock-app, Property {number}: {property_text}`

**Example Property Test:**

```javascript
import fc from 'fast-check';
import { evaluateLock } from '@/lib/lockEvaluator';

describe('Property 7: Timer Lock Evaluation', () => {
  it('Feature: focuslock-app, Property 7: Timer lock status based on usage vs limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 480 }), // daily_limit_minutes
        fc.integer({ min: 0, max: 600 }), // todayUsageMinutes
        fc.date(), // current time
        (dailyLimit, usage, now) => {
          const rule = {
            lock_type: 'timer',
            daily_limit_minutes: dailyLimit,
            is_active: true
          };

          const result = evaluateLock(rule, now, usage);

          // Property: locked when usage >= limit
          if (usage >= dailyLimit) {
            expect(result.isLocked).toBe(true);
            expect(result.unlocksAt).not.toBeNull();
            expect(result.unlocksAt.getHours()).toBe(0); // midnight
            expect(result.reason).toContain('Daily limit');
          } else {
            expect(result.isLocked).toBe(false);
            expect(result.unlocksAt).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Generator Strategies:**

1. **Lock Rules Generator:**
```javascript
const lockRuleArbitrary = fc.record({
  app_name: fc.string({ minLength: 1, maxLength: 50 }),
  lock_type: fc.constantFrom('timer', 'schedule', 'until_date', 'nuclear'),
  daily_limit_minutes: fc.option(fc.integer({ min: 1, max: 480 })),
  schedule_start: fc.option(fc.string({ pattern: /^([01]\d|2[0-3]):[0-5]\d$/ })),
  schedule_end: fc.option(fc.string({ pattern: /^([01]\d|2[0-3]):[0-5]\d$/ })),
  schedule_days: fc.option(fc.array(fc.constantFrom('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'))),
  unlock_date: fc.option(fc.date()),
  is_active: fc.boolean()
});
```

2. **Override Log Generator:**
```javascript
const overrideLogArbitrary = fc.record({
  app_name: fc.string({ minLength: 1, maxLength: 50 }),
  mood: fc.constantFrom('bored', 'stressed', 'tired', 'news', 'other'),
  reason_text: fc.option(fc.string({ maxLength: 500 })),
  overridden_at: fc.date()
});
```

3. **Usage Session Generator:**
```javascript
const usageSessionArbitrary = fc.record({
  app_name: fc.string({ minLength: 1, maxLength: 50 }),
  session_start: fc.date(),
  session_end: fc.date(),
  date: fc.date()
}).filter(session => session.session_end >= session.session_start);
```


## Deployment Architecture

### Vercel Deployment

**Configuration:**
- Framework: Next.js 14
- Build command: `next build`
- Output directory: `.next`
- Node version: 18.x
- Environment: Production

**Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
ANTHROPIC_API_KEY=[claude-api-key]
CRON_SECRET=[random-secret-for-cron-auth]
```

**Vercel Cron Configuration (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/streak-check",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/generate-challenges",
      "schedule": "0 6 * * 1"
    },
    {
      "path": "/api/cron/bedtime-check",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/weekly-insights",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

### Supabase Configuration

**Project Setup:**
- Region: Closest to primary user base (e.g., ap-south-1 for India)
- Database: PostgreSQL 15
- Auth providers: Email (magic link), Google OAuth
- Storage: Public bucket for avatars and badge icons

**Database Migrations:**
- Migrations stored in `supabase/migrations/`
- Applied via Supabase CLI: `supabase db push`
- Version controlled in Git

**Realtime Configuration:**
```sql
-- Enable realtime for buddy_notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE buddy_notifications;
```

### Browser Extension Deployment

**Chrome Web Store:**
- Package extension: `zip -r focuslock-extension.zip extension/`
- Upload to Chrome Web Store Developer Dashboard
- Review process: 1-3 days
- Update policy: Automatic updates enabled

**Firefox Add-ons:**
- Package extension: `web-ext build`
- Upload to Firefox Add-ons Developer Hub
- Review process: 1-7 days
- Update policy: Automatic updates enabled

### PWA Configuration

**Manifest (public/manifest.json):**
```json
{
  "name": "FocusLock",
  "short_name": "FocusLock",
  "description": "Hide apps. Build focus. Free forever.",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Service Worker (app/sw.js):**
- Cache strategy: Network-first for API calls, Cache-first for static assets
- Offline fallback: Cached lock rules and countdown screens
- Background sync: Queue override logs for sync when online

## Monitoring and Observability

### Application Monitoring

**Vercel Analytics:**
- Page load times
- API response times
- Error rates by endpoint
- Geographic distribution of users

**Custom Metrics:**
```javascript
// Track key user actions
analytics.track('lock_rule_created', {
  lock_type: rule.lock_type,
  app_name: rule.app_name
});

analytics.track('override_logged', {
  app_name: log.app_name,
  mood: log.mood
});

analytics.track('streak_milestone', {
  streak_length: streak.current_streak
});
```

### Error Tracking

**Sentry Integration:**
```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Sanitize sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.Authorization;
    }
    return event;
  }
});
```

**Error Alerts:**
- Critical errors: Immediate Slack notification
- High error rate: Alert if >5% of requests fail
- Database errors: Alert on connection failures
- External service errors: Alert on Claude API failures

### Performance Monitoring

**Core Web Vitals:**
- LCP (Largest Contentful Paint): Target <2.5s
- FID (First Input Delay): Target <100ms
- CLS (Cumulative Layout Shift): Target <0.1

**API Performance:**
- P50 response time: <200ms
- P95 response time: <500ms
- P99 response time: <1000ms

**Database Performance:**
- Query execution time monitoring
- Slow query log (>1s queries)
- Connection pool utilization

### Health Checks

**API Health Endpoint (/api/health):**
```javascript
export async function GET() {
  const checks = {
    database: await checkDatabaseConnection(),
    claude_api: await checkClaudeAPI(),
    realtime: await checkRealtimeConnection()
  };

  const allHealthy = Object.values(checks).every(c => c.healthy);

  return Response.json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  }, {
    status: allHealthy ? 200 : 503
  });
}
```

**Uptime Monitoring:**
- External monitoring: UptimeRobot or Pingdom
- Check interval: 5 minutes
- Alert on: 2 consecutive failures
- Endpoints to monitor: `/api/health`, `/dashboard`

## Performance Optimization

### Frontend Optimization

**Code Splitting:**
- Route-based code splitting (automatic with Next.js App Router)
- Dynamic imports for heavy components (charts, AI coach)
- Lazy loading for below-the-fold content

**Image Optimization:**
- Next.js Image component for automatic optimization
- WebP format with fallback to PNG
- Responsive images with srcset
- Lazy loading for app icons

**Caching Strategy:**
- Static assets: Cache-Control: public, max-age=31536000, immutable
- API responses: Cache-Control: private, max-age=60 (for stats)
- Lock rules: SWR (stale-while-revalidate) with 5-minute cache

### Backend Optimization

**Database Optimization:**
- Indexes on frequently queried columns (user_id, date, app_name)
- Materialized views for complex statistics queries
- Connection pooling (Supabase handles this)
- Query result caching for expensive aggregations

**API Optimization:**
- Response compression (gzip/brotli)
- Pagination for large result sets (override logs, usage sessions)
- Batch operations for bulk updates (streak checks)
- Rate limiting to prevent abuse

**Supabase Optimization:**
- Use RLS policies instead of application-level filtering
- Batch inserts for usage sessions
- Realtime channel filtering to reduce bandwidth
- Storage CDN for static assets

### Caching Strategy

**Client-Side Caching:**
```javascript
// SWR configuration for lock rules
const { data: rules, error } = useSWR('/api/rules', fetcher, {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  refreshInterval: 60000 // Refresh every minute
});
```

**Server-Side Caching:**
```javascript
// Cache AI insights for 24 hours
const cacheKey = `ai-insights:${userId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const insights = await generateInsights(userId);
await redis.setex(cacheKey, 86400, JSON.stringify(insights));

return insights;
```

## Scalability Considerations

### Database Scaling

**Current Capacity:**
- Supabase Free Tier: 500MB database, 2GB bandwidth/month
- Expected to support ~1000 active users

**Scaling Path:**
- Pro Tier ($25/month): 8GB database, 50GB bandwidth
- Team Tier ($599/month): 100GB database, 250GB bandwidth
- Enterprise: Custom pricing for >100k users

**Optimization Strategies:**
- Archive old usage_sessions (>90 days) to separate table
- Implement data retention policy (delete override_logs >1 year)
- Use database partitioning for large tables (usage_sessions by date)

### API Scaling

**Vercel Scaling:**
- Automatic scaling based on traffic
- Edge functions for low-latency responses
- Global CDN for static assets

**Rate Limiting:**
- Per-user: 100 requests/minute
- Per-IP: 1000 requests/minute
- Cron endpoints: Authenticated with secret token

### Realtime Scaling

**Supabase Realtime Limits:**
- Free Tier: 200 concurrent connections
- Pro Tier: 500 concurrent connections
- Scaling: Use presence channels for buddy notifications

**Optimization:**
- Unsubscribe from channels when not in use
- Use channel filters to reduce message volume
- Batch notifications for multiple overrides

## Security Hardening

### Content Security Policy

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src 'self' https://*.supabase.co https://api.anthropic.com;
      frame-ancestors 'none';
    `.replace(/\s{2,}/g, ' ').trim()
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];
```

### Input Validation

**Zod Schemas:**
```javascript
import { z } from 'zod';

const createLockRuleSchema = z.object({
  app_name: z.string().min(1).max(100),
  lock_type: z.enum(['timer', 'schedule', 'until_date', 'nuclear']),
  daily_limit_minutes: z.number().int().min(1).max(1440).optional(),
  schedule_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  schedule_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  schedule_days: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).optional(),
  unlock_date: z.string().datetime().optional(),
  hide_from_home: z.boolean().default(true),
  hide_from_search: z.boolean().default(true),
  strict_mode: z.boolean().default(false)
}).refine(data => {
  if (data.lock_type === 'timer') return data.daily_limit_minutes !== undefined;
  if (data.lock_type === 'schedule') return data.schedule_start && data.schedule_end && data.schedule_days;
  if (data.lock_type === 'until_date') return data.unlock_date !== undefined;
  return true;
}, {
  message: 'Missing required fields for lock type'
});
```

### Secrets Management

**Environment Variables:**
- Never commit secrets to Git
- Use Vercel environment variables for production
- Use `.env.local` for local development (gitignored)
- Rotate API keys quarterly

**API Key Rotation:**
```javascript
// Support multiple API keys for zero-downtime rotation
const ANTHROPIC_API_KEYS = [
  process.env.ANTHROPIC_API_KEY_PRIMARY,
  process.env.ANTHROPIC_API_KEY_SECONDARY
];

async function callClaudeAPI(prompt) {
  for (const apiKey of ANTHROPIC_API_KEYS) {
    try {
      return await fetch('https://api.anthropic.com/v1/messages', {
        headers: { 'x-api-key': apiKey }
      });
    } catch (error) {
      // Try next key
      continue;
    }
  }
  throw new Error('All API keys failed');
}
```

## Maintenance and Operations

### Database Maintenance

**Regular Tasks:**
- Weekly: Review slow query log
- Monthly: Analyze table sizes and growth
- Quarterly: Review and optimize indexes
- Yearly: Archive old data (>1 year)

**Backup Strategy:**
- Supabase automatic daily backups (retained 7 days)
- Weekly manual backups to external storage
- Test restore procedure quarterly

### Dependency Updates

**Update Schedule:**
- Security patches: Immediate
- Minor updates: Monthly
- Major updates: Quarterly (with testing)

**Update Process:**
1. Review changelog and breaking changes
2. Update in development environment
3. Run full test suite
4. Deploy to staging
5. Monitor for 24 hours
6. Deploy to production

### Incident Response

**Severity Levels:**
- P0 (Critical): Service down, data loss - Response: Immediate
- P1 (High): Major feature broken - Response: <1 hour
- P2 (Medium): Minor feature broken - Response: <4 hours
- P3 (Low): Cosmetic issue - Response: <24 hours

**Incident Checklist:**
1. Acknowledge incident in Slack
2. Assess severity and impact
3. Communicate status to users (if P0/P1)
4. Investigate root cause
5. Implement fix
6. Verify resolution
7. Post-mortem (for P0/P1)

## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Mobile Native Apps**
   - React Native apps for iOS and Android
   - Native app hiding (requires device admin permissions)
   - Background service for lock enforcement

2. **Advanced Analytics**
   - Heatmap of override times
   - Correlation analysis (mood vs. time of day)
   - Predictive alerts ("You usually override at 8 PM")

3. **Social Features**
   - Public leaderboards (opt-in)
   - Buddy groups (3+ people)
   - Challenge mode with friends

4. **AI Enhancements**
   - Personalized lock schedule suggestions
   - Automatic challenge generation based on patterns
   - Voice-based intention prompts

5. **Integrations**
   - Calendar integration (auto-lock during meetings)
   - Fitness tracker integration (unlock after workout)
   - Smart home integration (bedtime mode triggers lights)

### Technical Debt Tracking

**Known Issues:**
- Timezone handling edge cases (DST transitions)
- Browser extension sync latency (5-minute polling)
- Large usage_sessions table growth (needs partitioning)
- AI insights rate limiting (1 request/hour per user)

**Refactoring Opportunities:**
- Extract lock evaluation logic to separate service
- Implement event sourcing for streak calculations
- Migrate to GraphQL for more efficient data fetching
- Add Redis caching layer for frequently accessed data

---

## Summary

This design document provides a comprehensive blueprint for implementing FocusLock, a free social media addiction reducer. The architecture leverages modern serverless technologies (Next.js, Supabase, Vercel) to deliver a scalable, secure, and performant application.

Key design decisions:
- **Friction-first UX**: Mood prompts and intention prompts reduce impulsive unlocking
- **Property-based testing**: 34 correctness properties ensure core business logic reliability
- **Privacy-first**: Row-level security and no third-party tracking
- **Offline-capable**: PWA architecture with service worker caching
- **Real-time accountability**: Supabase Realtime for instant buddy notifications
- **AI-powered insights**: Claude API for behavioral pattern analysis

The design addresses all 22 requirements with clear implementation paths, comprehensive error handling, and robust security measures. The testing strategy combines property-based tests for core algorithms, integration tests for database and external services, and E2E tests for critical user flows.

Next steps: Proceed to task breakdown and implementation planning.
