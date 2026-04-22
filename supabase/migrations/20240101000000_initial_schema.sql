-- FocusLock Initial Database Schema
-- This migration creates all core tables for the FocusLock application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  avatar_url   TEXT,
  timezone     TEXT DEFAULT 'Asia/Kolkata',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'User profile information linked to Supabase auth';
COMMENT ON COLUMN profiles.timezone IS 'User timezone for lock schedule calculations';

-- ============================================================================
-- LOCK RULES TABLE
-- ============================================================================
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

COMMENT ON TABLE lock_rules IS 'User-defined rules for locking apps';
COMMENT ON COLUMN lock_rules.lock_type IS 'Type of lock: timer (daily limit), schedule (time-based), until_date (date-based), nuclear (no override)';
COMMENT ON COLUMN lock_rules.strict_mode IS 'Requires intention prompt with minimum 10 characters before override';

CREATE INDEX idx_lock_rules_user_id ON lock_rules(user_id);
CREATE INDEX idx_lock_rules_app_name ON lock_rules(user_id, app_name);

-- ============================================================================
-- OVERRIDE LOGS TABLE
-- ============================================================================
CREATE TABLE override_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lock_rule_id   UUID REFERENCES lock_rules(id) ON DELETE SET NULL,
  app_name       TEXT NOT NULL,
  mood           TEXT CHECK (mood IN ('bored','stressed','tired','news','other')),
  reason_text    TEXT,
  overridden_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE override_logs IS 'Logs of emergency overrides with mood tracking';
COMMENT ON COLUMN override_logs.mood IS 'User emotional state at time of override';

CREATE INDEX idx_override_logs_user_date ON override_logs(user_id, overridden_at DESC);
CREATE INDEX idx_override_logs_app ON override_logs(user_id, app_name);

-- ============================================================================
-- USAGE SESSIONS TABLE
-- ============================================================================
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

COMMENT ON TABLE usage_sessions IS 'Tracks app usage time for timer-based locks';
COMMENT ON COLUMN usage_sessions.minutes_used IS 'Calculated duration in minutes when session ends';

CREATE INDEX idx_usage_sessions_user_date ON usage_sessions(user_id, date DESC);
CREATE INDEX idx_usage_sessions_app ON usage_sessions(user_id, app_name, date);

-- ============================================================================
-- STREAKS TABLE
-- ============================================================================
CREATE TABLE streaks (
  user_id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak   INTEGER DEFAULT 0,
  longest_streak   INTEGER DEFAULT 0,
  last_active_date DATE,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE streaks IS 'Tracks consecutive days without overrides';
COMMENT ON COLUMN streaks.current_streak IS 'Current consecutive days without override';
COMMENT ON COLUMN streaks.longest_streak IS 'All-time best streak';

-- ============================================================================
-- BADGE DEFINITIONS TABLE
-- ============================================================================
CREATE TABLE badge_definitions (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  icon         TEXT,
  condition    TEXT
);

COMMENT ON TABLE badge_definitions IS 'Master list of available badges';

-- ============================================================================
-- USER BADGES TABLE
-- ============================================================================
CREATE TABLE user_badges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id     TEXT NOT NULL REFERENCES badge_definitions(id),
  earned_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

COMMENT ON TABLE user_badges IS 'Badges earned by users';

CREATE INDEX idx_user_badges_user ON user_badges(user_id);

-- ============================================================================
-- BUDDIES TABLE
-- ============================================================================
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

COMMENT ON TABLE buddies IS 'Accountability buddy relationships';
COMMENT ON COLUMN buddies.rules_watching IS 'Array of lock_rule IDs the buddy monitors';

CREATE INDEX idx_buddies_user ON buddies(user_id);
CREATE INDEX idx_buddies_buddy_user ON buddies(buddy_user_id);

-- ============================================================================
-- BUDDY NOTIFICATIONS TABLE
-- ============================================================================
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

COMMENT ON TABLE buddy_notifications IS 'Real-time notifications sent between buddies';

CREATE INDEX idx_buddy_notifications_to_user ON buddy_notifications(to_user_id, created_at DESC);

-- ============================================================================
-- POMODORO SESSIONS TABLE
-- ============================================================================
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

COMMENT ON TABLE pomodoro_sessions IS 'Focus work sessions using Pomodoro Technique';

CREATE INDEX idx_pomodoro_sessions_user ON pomodoro_sessions(user_id, started_at DESC);

-- ============================================================================
-- WEEKLY CHALLENGES TABLE
-- ============================================================================
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

COMMENT ON TABLE weekly_challenges IS 'Auto-generated weekly goals based on worst-performing app';

CREATE INDEX idx_weekly_challenges_user ON weekly_challenges(user_id, week_start DESC);

-- ============================================================================
-- CHILD PROFILES TABLE
-- ============================================================================
CREATE TABLE child_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_user_id)
);

COMMENT ON TABLE child_profiles IS 'Parent-child account relationships for parental controls';

CREATE INDEX idx_child_profiles_parent ON child_profiles(parent_user_id);
