# FocusLock — Product Requirements Document

> A free, full-featured social media addiction reducer built with Next.js + Supabase.  
> Hide apps, set timers, build focus habits — everything competitors charge ₹500–₹1500/month for, free.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Database Schema](#4-database-schema)
5. [Core Features](#5-core-features)
6. [New Features (Formerly VIP Elsewhere)](#6-new-features-formerly-vip-elsewhere)
7. [Screen Inventory](#7-screen-inventory)
8. [API Routes](#8-api-routes)
9. [Key Logic — lockEvaluator](#9-key-logic--lockevaluator)
10. [Competitive Advantage](#10-competitive-advantage)
11. [Build Order / Roadmap](#11-build-order--roadmap)

---

## 1. Project Overview

**App name:** FocusLock  
**Tagline:** _Hide apps. Build focus. Free forever._  
**Target users:** Students, working professionals, parents  
**Platform:** Web app (Next.js PWA) + Chrome/Firefox browser extension  
**Database:** Supabase (PostgreSQL + Auth + Realtime + Storage)

### Problem Statement

Social media apps are engineered for addiction. Existing blockers either:

- Charge ₹500–₹1500/month for basic features
- Lack app visibility hiding (just block, not hide)
- Have no social accountability layer
- Provide no AI-powered behavioral insights

FocusLock solves all of this — completely free.

---

## 2. Tech Stack

| Layer             | Technology                                              |
| ----------------- | ------------------------------------------------------- |
| Frontend          | Next.js 14 (App Router)                                 |
| Styling           | Regular CSS (external `.css` files, `className` in JSX) |
| Auth              | Supabase Auth (magic link + Google OAuth)               |
| Database          | Supabase (PostgreSQL)                                   |
| Realtime          | Supabase Realtime (buddy notifications)                 |
| ORM               | Supabase JS client (`@supabase/supabase-js`)            |
| AI Coaching       | Anthropic Claude API (`claude-sonnet-4-6`)              |
| Cron Jobs         | Vercel Cron (daily streak checks, weekly reports)       |
| PWA               | Next.js PWA (service worker, offline support)           |
| Browser Extension | Chrome Extension Manifest V3 + Firefox WebExtension     |
| Deployment        | Vercel                                                  |

---

## 3. Folder Structure

```
focuslock/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.jsx
│   │   └── callback/
│   │       └── route.js
│   ├── dashboard/
│   │   └── page.jsx                  ← home screen, app grid
│   ├── lock/
│   │   └── [appId]/
│   │       └── page.jsx              ← countdown + mood prompt
│   ├── rules/
│   │   ├── new/
│   │   │   └── page.jsx              ← add lock rule
│   │   └── [id]/
│   │       └── page.jsx              ← edit lock rule
│   ├── focus/
│   │   └── page.jsx                  ← pomodoro session screen
│   ├── stats/
│   │   └── page.jsx                  ← analytics dashboard
│   ├── badges/
│   │   └── page.jsx                  ← streaks & gamification
│   ├── buddy/
│   │   └── page.jsx                  ← accountability buddy
│   ├── share/
│   │   └── page.jsx                  ← shareable progress card
│   ├── family/
│   │   └── page.jsx                  ← parental controls
│   ├── ai-coach/
│   │   └── page.jsx                  ← AI coaching insights
│   ├── bedtime/
│   │   └── page.jsx                  ← bedtime mode settings
│   └── api/
│       ├── rules/
│       │   └── route.js              ← GET / POST lock rules
│       ├── rules/[id]/
│       │   └── route.js              ← PUT / DELETE
│       ├── override/
│       │   └── route.js              ← POST override log
│       ├── stats/
│       │   └── route.js              ← GET aggregated stats
│       ├── buddy/
│       │   └── route.js              ← invite / notify buddy
│       ├── ai-coach/
│       │   └── route.js              ← Claude API insights
│       ├── streak/
│       │   └── route.js              ← GET / update streak
│       └── share-card/
│           └── route.js              ← generate shareable image
├── components/
│   ├── AppGrid.jsx
│   ├── LockCard.jsx
│   ├── CountdownRing.jsx
│   ├── RuleBuilder.jsx
│   ├── MoodPrompt.jsx
│   ├── PomodoroTimer.jsx
│   ├── StatsChart.jsx
│   ├── BadgeCard.jsx
│   ├── BuddyPanel.jsx
│   ├── ShareCard.jsx
│   ├── AIInsightCard.jsx
│   ├── StreakDots.jsx
│   └── BedtimeToggle.jsx
├── lib/
│   ├── supabase.js                   ← Supabase client
│   ├── lockEvaluator.js              ← core lock/unlock logic
│   ├── streakManager.js              ← streak calculation
│   ├── badgeEngine.js                ← badge award logic
│   └── aiCoach.js                    ← Claude API wrapper
├── styles/
│   ├── globals.css
│   ├── dashboard.css
│   ├── lock.css
│   ├── stats.css
│   ├── focus.css
│   └── family.css
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   └── popup/
│       ├── popup.html
│       └── popup.js
├── supabase/
│   └── migrations/
│       ├── 001_init_tables.sql
│       ├── 002_rls_policies.sql
│       └── 003_functions.sql
├── public/
│   ├── manifest.json                 ← PWA manifest
│   └── icons/
└── middleware.js                     ← auth protection
```

---

## 4. Database Schema

### `profiles`

Extends Supabase auth.users.

```sql
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  avatar_url   TEXT,
  timezone     TEXT DEFAULT 'Asia/Kolkata',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `lock_rules`

One row per locked app per user.

```sql
CREATE TABLE lock_rules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app_name             TEXT NOT NULL,
  app_icon_url         TEXT,
  app_scheme           TEXT,            -- e.g. instagram://, youtube://
  lock_type            TEXT NOT NULL    -- 'timer' | 'schedule' | 'until_date' | 'nuclear'
    CHECK (lock_type IN ('timer','schedule','until_date','nuclear')),
  daily_limit_minutes  INTEGER,         -- for timer type
  schedule_start       TIME,            -- for schedule type (e.g. 09:00)
  schedule_end         TIME,            -- for schedule type (e.g. 18:00)
  schedule_days        TEXT[],          -- ['mon','tue','wed','thu','fri']
  unlock_date          DATE,            -- for until_date type
  hide_from_home       BOOLEAN DEFAULT TRUE,
  hide_from_search     BOOLEAN DEFAULT TRUE,
  strict_mode          BOOLEAN DEFAULT FALSE,  -- nuclear mode
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `override_logs`

Logged every time user breaks a lock early.

```sql
CREATE TABLE override_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lock_rule_id   UUID REFERENCES lock_rules(id) ON DELETE SET NULL,
  app_name       TEXT NOT NULL,
  mood           TEXT,                  -- 'bored' | 'stressed' | 'tired' | 'news' | 'other'
  reason_text    TEXT,
  overridden_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `usage_sessions`

Tracks actual time spent (manual log or PWA detection).

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
```

---

### `streaks`

One row per user.

```sql
CREATE TABLE streaks (
  user_id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak   INTEGER DEFAULT 0,
  longest_streak   INTEGER DEFAULT 0,
  last_active_date DATE,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `badges`

Master badge list + user awards.

```sql
CREATE TABLE badge_definitions (
  id           TEXT PRIMARY KEY,       -- e.g. 'seven_day_warrior'
  name         TEXT NOT NULL,
  description  TEXT,
  icon         TEXT,
  condition    TEXT                    -- human-readable condition
);

CREATE TABLE user_badges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id     TEXT NOT NULL REFERENCES badge_definitions(id),
  earned_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);
```

---

### `buddies`

Accountability partner relationships.

```sql
CREATE TABLE buddies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buddy_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rules_watching UUID[],               -- lock_rule ids being watched
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','removed')),
  invited_at     TIMESTAMPTZ DEFAULT NOW(),
  accepted_at    TIMESTAMPTZ,
  UNIQUE(user_id, buddy_user_id)
);
```

---

### `buddy_notifications`

Log of all buddy alert events.

```sql
CREATE TABLE buddy_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id),
  to_user_id   UUID NOT NULL REFERENCES profiles(id),
  event_type   TEXT,                   -- 'override', 'streak_broken', 'weekly_summary'
  app_name     TEXT,
  message      TEXT,
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `pomodoro_sessions`

Focus session logs.

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
```

---

### Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE lock_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE override_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "own_data" ON lock_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_data" ON override_logs
  FOR ALL USING (auth.uid() = user_id);

-- Buddies can read partner's override logs for watched rules
CREATE POLICY "buddy_read" ON override_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM buddies
      WHERE buddy_user_id = auth.uid()
      AND user_id = override_logs.user_id
      AND status = 'active'
    )
  );
```

---

## 5. Core Features

### 5.1 App Hide & Lock

- Users add apps by name / icon
- Three lock types:
  - **Timer** — max N minutes per day (e.g. 30 min/day)
  - **Schedule** — blocked between time A and time B on selected days
  - **Until date** — locked until a specific calendar date (exam mode)
- Hidden apps disappear from the FocusLock home grid
- Visiting `/lock/[appId]` shows countdown to unlock

### 5.2 Emergency Override

- User can bypass any non-nuclear lock
- Before override: **Mood Prompt** is shown (Bored / Stressed / Tired / News)
- Override is logged to `override_logs` with mood + timestamp
- Buddy notification fired via Supabase Realtime if buddy is watching that rule

### 5.3 Countdown Screen (`/lock/[appId]`)

- Large ring timer showing time remaining
- Lock type badge (schedule / timer / date)
- Mood prompt before override
- "Set reminder" button (browser notification when app unlocks)

---

## 6. New Features (Formerly VIP Elsewhere)

### 6.1 Pomodoro Focus Sessions

- 25 min work / 5 min break cycles (configurable)
- All locked apps stay locked during work blocks
- Breaks auto-unlock apps temporarily
- Session saved to `pomodoro_sessions`
- XP earned per completed session

**Route:** `/focus`  
**API:** `POST /api/pomodoro`

---

### 6.2 Streak & Gamification System

- Daily streak incremented if user stays within all limits
- Streak broken if any rule is overridden
- Streak saved in `streaks` table, checked via Vercel Cron at midnight
- Badges awarded by `badgeEngine.js` based on milestones

**Badge list:**

| Badge ID            | Name             | Condition                         |
| ------------------- | ---------------- | --------------------------------- |
| `quick_start`       | Quick starter    | Complete setup within 10 min      |
| `first_week`        | First week clean | 7-day streak                      |
| `seven_day_warrior` | 7-day warrior    | 7 days without any override       |
| `iron_will`         | Iron Will        | Complete a weekly challenge       |
| `social_detox`      | Social detox     | 30-day streak                     |
| `night_owl_slayer`  | Night owl slayer | 7 days of bedtime mode compliance |
| `pomodoro_master`   | Pomodoro master  | 20 completed Pomodoro sessions    |

---

### 6.3 Accountability Buddy System

- User invites a friend via email/link
- Buddy selects which rules to "watch"
- On override: Supabase Realtime fires a notification to buddy's device
- Buddy can send a reaction (encouragement or gentle nudge)
- Buddy cannot modify the user's rules — read-only

**Route:** `/buddy`  
**API:** `POST /api/buddy/invite`, `POST /api/buddy/notify`

---

### 6.4 AI Coaching (Claude API)

Weekly analysis of:

- Override patterns (time of day, mood, app)
- Worst performing days
- Suggested rule adjustments

**Prompt sent to Claude:**

```
You are a digital wellbeing coach. The user has the following override log
from the past 7 days: [JSON data]. Analyze patterns and give:
1. One key insight (2 sentences max)
2. One specific actionable suggestion
3. Most common mood trigger
Keep it warm and non-judgmental. Response in JSON:
{ insight: string, suggestion: string, topMood: string }
```

**Route:** `/ai-coach`  
**API:** `POST /api/ai-coach` → calls `claude-sonnet-4-6`

---

### 6.5 Mood Journal (Friction Layer)

- Before any emergency override, user must pick a mood
- Moods: Bored / Stressed / Tired / Need news / Other
- Optionally type a reason (textarea, optional)
- This 5-second pause reduces impulsive unlocking by ~60% (based on One Sec research)
- Mood data shown in AI coaching screen as a bar chart

---

### 6.6 Bedtime / Wind-Down Mode

- User sets a bedtime (e.g. 10:00 PM)
- All entertainment apps auto-lock at bedtime
- Lock screen shows moon animation + "unlocks at 7:00 AM"
- Configurable days (weekday vs weekend)
- Vercel Cron triggers bedtime check at configured time

**Route:** `/bedtime`

---

### 6.7 Weekly Challenge Mode

- Every Monday: auto-generated challenge based on worst app from last week
- Example: "Stay under 30 min/day on YouTube for 5 days"
- Progress tracked daily, shown with day-dot row (M T W T F)
- Completion → awards a badge + share prompt
- Leaderboard (optional): compare with buddies

**Route:** `/challenge`  
**API:** `POST /api/challenge/generate` (Vercel Cron, every Monday 6 AM)

---

### 6.8 Nuclear / Strict Mode

- Activated on per-rule basis
- When active: emergency override button is **disabled** entirely
- 48-hour cooldown before nuclear mode can be turned off
- Confirmation dialog with typing "I COMMIT" to activate
- Ideal for exam season, deep work weeks

---

### 6.9 Shareable Progress Card

- Auto-generated weekly card showing:
  - Time saved this week
  - Compliance percentage
  - Current streak
  - App watermark: `focuslock.app`
- Generated as a styled HTML page → screenshot via `html2canvas`
- Share to WhatsApp, Instagram Stories, or download as PNG

**Route:** `/share`  
**API:** `GET /api/share-card?week=current`

---

### 6.10 Website Blocker (Browser Extension)

- Chrome Extension (Manifest V3) + Firefox WebExtension
- Syncs to user's FocusLock account via API token
- Blocks locked apps' websites during locked hours
  - `instagram.com` blocked if Instagram rule is active
  - `youtube.com` blocked if YouTube rule is active
- Extension shows same countdown UI as the app
- Freedom charges $7/month for this — FocusLock gives it free

**Extension folder:** `/extension/`

---

### 6.11 Family / Parental Mode

- Parent creates a "child profile" linked to their account
- Parent manages lock rules for child remotely
- Child can see but not modify rules
- Parent receives notification when child attempts override
- Child's compliance stats visible on parent dashboard

**Route:** `/family`  
**API:** `POST /api/family/add-child`, `POST /api/family/rules`

---

### 6.12 Intention Prompt (Friction Layer)

For nuclear mode and strict rules, before any unlock:

- Show a text input: _"Why do you want to open this app right now?"_
- User must type at least 10 characters
- Reason is saved to `override_logs.reason_text`
- AI coach references recurring reasons in weekly insight

---

## 7. Screen Inventory

| Screen           | Route           | Description                                     |
| ---------------- | --------------- | ----------------------------------------------- |
| Login            | `/login`        | Magic link + Google OAuth                       |
| Home / App grid  | `/dashboard`    | Shows unlocked + locked (hidden) apps           |
| Lock screen      | `/lock/[appId]` | Countdown ring + mood prompt + override         |
| Add lock rule    | `/rules/new`    | Lock type selector + visibility toggles         |
| Edit lock rule   | `/rules/[id]`   | Modify existing rule                            |
| Pomodoro         | `/focus`        | Work/break timer with auto-lock                 |
| Stats dashboard  | `/stats`        | Bar chart, per-app breakdown, week-over-week    |
| Badges           | `/badges`       | Streak dots, earned badges, locked badges       |
| AI coach         | `/ai-coach`     | Weekly insight + mood pattern chart             |
| Buddy system     | `/buddy`        | Invite buddy, manage watchers, notification log |
| Share card       | `/share`        | Weekly progress card + share buttons            |
| Weekly challenge | `/challenge`    | Active challenge progress, leaderboard          |
| Bedtime mode     | `/bedtime`      | Bedtime schedule settings                       |
| Family mode      | `/family`       | Child profile, rules, override alerts           |
| Settings         | `/settings`     | Profile, timezone, notification prefs           |

---

## 8. API Routes

| Method | Route                      | Description                                       |
| ------ | -------------------------- | ------------------------------------------------- |
| GET    | `/api/rules`               | Get all lock rules for current user               |
| POST   | `/api/rules`               | Create a new lock rule                            |
| PUT    | `/api/rules/[id]`          | Update a lock rule                                |
| DELETE | `/api/rules/[id]`          | Delete a lock rule                                |
| POST   | `/api/override`            | Log an override attempt (with mood)               |
| GET    | `/api/stats`               | Get weekly aggregated stats                       |
| GET    | `/api/streak`              | Get current streak                                |
| POST   | `/api/streak/check`        | Cron: check if streak is maintained               |
| POST   | `/api/ai-coach`            | Get Claude-powered weekly insight                 |
| POST   | `/api/buddy/invite`        | Send buddy invite                                 |
| POST   | `/api/buddy/notify`        | Fire override notification to buddy               |
| GET    | `/api/share-card`          | Generate shareable stats card data                |
| POST   | `/api/challenge/generate`  | Cron: generate Monday challenge                   |
| POST   | `/api/family/add-child`    | Link child account to parent                      |
| GET    | `/api/lock-status/[appId]` | Is this app locked right now? (used by extension) |

---

## 9. Key Logic — lockEvaluator

`/lib/lockEvaluator.js`

```javascript
/**
 * Given a lock rule and current datetime, returns lock status.
 * @param {Object} rule - lock_rules row from Supabase
 * @param {Date} now - current datetime
 * @param {number} todayUsageMinutes - minutes used today for this app
 * @returns {{ isLocked: boolean, unlocksAt: Date|null, reason: string }}
 */
export function evaluateLock(rule, now = new Date(), todayUsageMinutes = 0) {
  if (!rule.is_active)
    return { isLocked: false, unlocksAt: null, reason: null };

  if (rule.lock_type === 'timer') {
    const isLocked = todayUsageMinutes >= rule.daily_limit_minutes;
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return {
      isLocked,
      unlocksAt: isLocked ? midnight : null,
      reason: `Daily limit of ${rule.daily_limit_minutes} min reached`,
    };
  }

  if (rule.lock_type === 'schedule') {
    const day = now
      .toLocaleDateString('en-US', { weekday: 'short' })
      .toLowerCase();
    if (!rule.schedule_days.includes(day))
      return { isLocked: false, unlocksAt: null, reason: null };

    const [sh, sm] = rule.schedule_start.split(':').map(Number);
    const [eh, em] = rule.schedule_end.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const isLocked = nowMins >= startMins && nowMins < endMins;

    const unlocksAt = new Date(now);
    unlocksAt.setHours(eh, em, 0, 0);
    return {
      isLocked,
      unlocksAt: isLocked ? unlocksAt : null,
      reason: 'Locked by daily schedule',
    };
  }

  if (rule.lock_type === 'until_date') {
    const unlockDate = new Date(rule.unlock_date);
    unlockDate.setHours(0, 0, 0, 0);
    const isLocked = now < unlockDate;
    return {
      isLocked,
      unlocksAt: isLocked ? unlockDate : null,
      reason: 'Exam / focus mode active',
    };
  }

  if (rule.lock_type === 'nuclear') {
    return {
      isLocked: true,
      unlocksAt: null,
      reason: 'Nuclear mode — no override possible',
    };
  }

  return { isLocked: false, unlocksAt: null, reason: null };
}
```

---

## 10. Competitive Advantage

| Feature                 | Freedom ($7/mo) | AppBlock ($5/mo) | One Sec ($3/mo) | FocusLock (Free) |
| ----------------------- | --------------- | ---------------- | --------------- | ---------------- |
| App hide from home      | ✗               | Partial          | ✗               | ✓                |
| Countdown screen        | ✗               | ✓                | ✗               | ✓                |
| Mood journal            | ✗               | ✗                | ✗               | ✓                |
| Pomodoro sessions       | ✓ paid          | ✗                | ✗               | ✓                |
| Gamification + streaks  | ✗               | ✗                | ✗               | ✓                |
| Accountability buddy    | ✗               | ✗                | ✗               | ✓                |
| AI coaching             | ✗               | ✗                | ✗               | ✓                |
| Weekly challenge mode   | ✗               | ✗                | ✗               | ✓                |
| Nuclear mode            | ✓ paid          | ✓ paid           | ✗               | ✓                |
| Shareable progress card | ✗               | ✗                | ✗               | ✓                |
| Browser extension sync  | ✓ paid          | ✗                | ✗               | ✓                |
| Family / parental mode  | ✗               | ✗                | ✗               | ✓                |
| Bedtime mode            | Partial         | ✗                | ✗               | ✓                |
| Price                   | $6.99/mo        | $4.99/mo         | $2.99/mo        | **Free**         |

---

## 11. Build Order / Roadmap

### Phase 1 — Core (Week 1–2)

- [ ] Supabase project setup + schema migrations
- [ ] Next.js app with Supabase Auth (magic link + Google)
- [ ] `lock_rules` CRUD API
- [ ] Dashboard — app grid with locked/unlocked sections
- [ ] `/lock/[appId]` countdown screen
- [ ] `lockEvaluator.js` core logic
- [ ] Middleware auth protection

### Phase 2 — Engagement (Week 3–4)

- [ ] Mood prompt on override + `override_logs`
- [ ] Streak system + `streaks` table
- [ ] Badge engine (`badgeEngine.js`) + first 3 badges
- [ ] Stats dashboard with bar chart
- [ ] Pomodoro focus session screen

### Phase 3 — Social & AI (Week 5–6)

- [ ] Buddy invite + Supabase Realtime notifications
- [ ] AI coaching screen — Claude API integration
- [ ] Weekly challenge mode + Vercel Cron
- [ ] Shareable progress card (html2canvas)

### Phase 4 — Power Features (Week 7–8)

- [ ] Nuclear / strict mode with cooldown
- [ ] Bedtime mode + Vercel Cron
- [ ] Family / parental mode
- [ ] Browser extension (Chrome first, Firefox later)
- [ ] PWA manifest + service worker

### Phase 5 — Polish (Week 9–10)

- [ ] Intention prompt text input for strict rules
- [ ] Weekly AI insight email (Supabase Edge Functions)
- [ ] Onboarding flow (3-step wizard)
- [ ] Dark mode support
- [ ] Performance audit + Lighthouse score ≥ 90

---

_Generated for FocusLock — Next.js + Supabase social media addiction reducer_  
_Build date: April 2026_
