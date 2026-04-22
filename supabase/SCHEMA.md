# FocusLock Database Schema Documentation

## Overview

The FocusLock database is built on PostgreSQL via Supabase and consists of 11 main tables organized into four functional areas:

1. **Core User & Lock Management**: profiles, lock_rules, override_logs, usage_sessions
2. **Gamification**: streaks, badge_definitions, user_badges, pomodoro_sessions, weekly_challenges
3. **Social Features**: buddies, buddy_notifications
4. **Parental Controls**: child_profiles

All tables implement Row-Level Security (RLS) to ensure data privacy and proper access control.

---

## Table Schemas

### profiles

Stores user profile information linked to Supabase Auth.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, FK to auth.users | User ID from Supabase Auth |
| full_name | TEXT | | User's display name |
| avatar_url | TEXT | | URL to user's avatar image |
| timezone | TEXT | DEFAULT 'Asia/Kolkata' | User's timezone for lock calculations |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Account creation timestamp |

**Indexes**: None (primary key only)

**RLS Policies**:
- Users can view their own profile
- Users can update their own profile
- Users can insert their own profile

**Triggers**:
- `create_streak_on_profile`: Automatically creates a streak record when profile is created

---

### lock_rules

Defines app locking rules configured by users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique rule identifier |
| user_id | UUID | NOT NULL, FK to profiles | Owner of this rule |
| app_name | TEXT | NOT NULL | Name of the app to lock |
| app_icon_url | TEXT | | URL to app icon |
| app_scheme | TEXT | | URL scheme for deep linking |
| lock_type | TEXT | NOT NULL, CHECK | Type: 'timer', 'schedule', 'until_date', 'nuclear' |
| daily_limit_minutes | INTEGER | | Daily usage limit (required for timer) |
| schedule_start | TIME | | Lock start time (required for schedule) |
| schedule_end | TIME | | Lock end time (required for schedule) |
| schedule_days | TEXT[] | | Days of week (required for schedule) |
| unlock_date | DATE | | Date when lock expires (required for until_date) |
| hide_from_home | BOOLEAN | DEFAULT TRUE | Hide app from home grid |
| hide_from_search | BOOLEAN | DEFAULT TRUE | Hide app from search |
| strict_mode | BOOLEAN | DEFAULT FALSE | Require intention prompt (10+ chars) |
| is_active | BOOLEAN | DEFAULT TRUE | Whether rule is currently active |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Rule creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Constraints**:
- `valid_timer`: If lock_type is 'timer', daily_limit_minutes must be set
- `valid_schedule`: If lock_type is 'schedule', schedule_start, schedule_end, and schedule_days must be set
- `valid_until_date`: If lock_type is 'until_date', unlock_date must be set

**Indexes**:
- `idx_lock_rules_user_id` on (user_id)
- `idx_lock_rules_app_name` on (user_id, app_name)

**RLS Policies**:
- Users can manage their own lock rules
- Parents can manage child lock rules

**Triggers**:
- `update_lock_rules_updated_at`: Auto-updates updated_at on changes

---

### override_logs

Tracks emergency overrides with mood and reason data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique log identifier |
| user_id | UUID | NOT NULL, FK to profiles | User who overrode |
| lock_rule_id | UUID | FK to lock_rules, ON DELETE SET NULL | Associated rule (nullable) |
| app_name | TEXT | NOT NULL | App that was overridden |
| mood | TEXT | CHECK | User mood: 'bored', 'stressed', 'tired', 'news', 'other' |
| reason_text | TEXT | | Optional text explanation |
| overridden_at | TIMESTAMPTZ | DEFAULT NOW() | When override occurred |

**Indexes**:
- `idx_override_logs_user_date` on (user_id, overridden_at DESC)
- `idx_override_logs_app` on (user_id, app_name)

**RLS Policies**:
- Users can create their own override logs
- Users can view their own override logs
- Buddies can view partner override logs (for watched rules only)
- Parents can view child override logs

**Triggers**:
- `reset_streak_after_override`: Resets user's current streak to 0
- `notify_buddies_after_override`: Creates buddy notifications for active buddies

---

### usage_sessions

Tracks app usage time for timer-based locks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique session identifier |
| user_id | UUID | NOT NULL, FK to profiles | User who used the app |
| app_name | TEXT | NOT NULL | App that was used |
| session_start | TIMESTAMPTZ | NOT NULL | Session start time |
| session_end | TIMESTAMPTZ | | Session end time (null if ongoing) |
| minutes_used | INTEGER | | Calculated duration in minutes |
| date | DATE | NOT NULL, DEFAULT CURRENT_DATE | Date of usage |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |

**Indexes**:
- `idx_usage_sessions_user_date` on (user_id, date DESC)
- `idx_usage_sessions_app` on (user_id, app_name, date)

**RLS Policies**:
- Users can manage their own usage sessions
- Parents can view child usage sessions

**Triggers**:
- `calculate_usage_session_duration`: Auto-calculates minutes_used when session_end is set

---

### streaks

Tracks consecutive days without overrides.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | PRIMARY KEY, FK to profiles | User identifier |
| current_streak | INTEGER | DEFAULT 0 | Current consecutive days |
| longest_streak | INTEGER | DEFAULT 0 | All-time best streak |
| last_active_date | DATE | | Last date streak was incremented |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes**: None (primary key only)

**RLS Policies**:
- Users can manage their own streak
- Buddies can view partner streaks

**Triggers**:
- `update_streaks_updated_at`: Auto-updates updated_at on changes

---

### badge_definitions

Master list of available badges (reference table).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Badge identifier |
| name | TEXT | NOT NULL | Display name |
| description | TEXT | | Badge description |
| icon | TEXT | | Emoji or icon |
| condition | TEXT | | Human-readable unlock condition |

**Indexes**: None (primary key only)

**RLS**: Not enabled (public reference data)

**Seeded Badges**:
- `quick_start`: Complete setup within 10 minutes (⚡)
- `first_week`: Maintain 7-day streak (🌱)
- `seven_day_warrior`: No overrides for 7 days (⚔️)
- `iron_will`: Complete a weekly challenge (🛡️)
- `social_detox`: Maintain 30-day streak (🧘)
- `night_owl_slayer`: 7 days of bedtime compliance (🌙)
- `pomodoro_master`: Complete 20 Pomodoro sessions (🍅)

---

### user_badges

Tracks badges earned by users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique record identifier |
| user_id | UUID | NOT NULL, FK to profiles | User who earned badge |
| badge_id | TEXT | NOT NULL, FK to badge_definitions | Badge earned |
| earned_at | TIMESTAMPTZ | DEFAULT NOW() | When badge was earned |

**Constraints**:
- UNIQUE(user_id, badge_id): Prevents duplicate badge awards

**Indexes**:
- `idx_user_badges_user` on (user_id)

**RLS Policies**:
- Users can view their own badges
- System can insert badges (for automated awards)

---

### buddies

Accountability buddy relationships.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique relationship identifier |
| user_id | UUID | NOT NULL, FK to profiles | User who sent invite |
| buddy_user_id | UUID | NOT NULL, FK to profiles | User who received invite |
| rules_watching | UUID[] | | Array of lock_rule IDs to monitor |
| status | TEXT | DEFAULT 'pending', CHECK | Status: 'pending', 'active', 'removed' |
| invited_at | TIMESTAMPTZ | DEFAULT NOW() | When invite was sent |
| accepted_at | TIMESTAMPTZ | | When invite was accepted |

**Constraints**:
- UNIQUE(user_id, buddy_user_id): One relationship per pair
- CHECK(user_id != buddy_user_id): Cannot buddy yourself

**Indexes**:
- `idx_buddies_user` on (user_id)
- `idx_buddies_buddy_user` on (buddy_user_id)

**RLS Policies**:
- Users can manage relationships where they are user or buddy

---

### buddy_notifications

Real-time notifications between buddies.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique notification identifier |
| from_user_id | UUID | NOT NULL, FK to profiles | User who triggered event |
| to_user_id | UUID | NOT NULL, FK to profiles | User receiving notification |
| event_type | TEXT | NOT NULL, CHECK | Type: 'override', 'streak_broken', 'weekly_summary' |
| app_name | TEXT | | App related to event (if applicable) |
| message | TEXT | | Notification message |
| is_read | BOOLEAN | DEFAULT FALSE | Whether notification was read |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | When notification was created |

**Indexes**:
- `idx_buddy_notifications_to_user` on (to_user_id, created_at DESC)

**RLS Policies**:
- Users can view notifications sent to them
- Users can create notifications (as from_user)
- Users can update their own notifications (mark as read)

---

### pomodoro_sessions

Focus work sessions using Pomodoro Technique.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique session identifier |
| user_id | UUID | NOT NULL, FK to profiles | User running session |
| task_label | TEXT | | Optional task description |
| work_minutes | INTEGER | DEFAULT 25 | Work block duration |
| break_minutes | INTEGER | DEFAULT 5 | Break block duration |
| sessions_target | INTEGER | DEFAULT 4 | Target number of sessions |
| sessions_done | INTEGER | DEFAULT 0 | Completed sessions |
| status | TEXT | DEFAULT 'active', CHECK | Status: 'active', 'completed', 'abandoned' |
| started_at | TIMESTAMPTZ | DEFAULT NOW() | Session start time |
| ended_at | TIMESTAMPTZ | | Session end time |

**Indexes**:
- `idx_pomodoro_sessions_user` on (user_id, started_at DESC)

**RLS Policies**:
- Users can manage their own pomodoro sessions

---

### weekly_challenges

Auto-generated weekly goals based on worst-performing app.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique challenge identifier |
| user_id | UUID | NOT NULL, FK to profiles | User assigned challenge |
| app_name | TEXT | NOT NULL | App to focus on |
| daily_limit | INTEGER | NOT NULL | Daily usage goal in minutes |
| week_start | DATE | NOT NULL | Challenge start date (Monday) |
| week_end | DATE | NOT NULL | Challenge end date (Friday) |
| days_completed | INTEGER | DEFAULT 0 | Days successfully completed |
| status | TEXT | DEFAULT 'active', CHECK | Status: 'active', 'completed', 'failed' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Challenge creation time |

**Indexes**:
- `idx_weekly_challenges_user` on (user_id, week_start DESC)

**RLS Policies**:
- Users can view their own challenges
- System can manage challenges (for cron jobs)

---

### child_profiles

Parent-child account relationships for parental controls.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique relationship identifier |
| parent_user_id | UUID | NOT NULL, FK to profiles | Parent account |
| child_user_id | UUID | NOT NULL, FK to profiles | Child account |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Link creation time |

**Constraints**:
- UNIQUE(child_user_id): A child can only have one parent

**Indexes**:
- `idx_child_profiles_parent` on (parent_user_id)

**RLS Policies**:
- Parents can manage child profiles
- Children can view their own profile link

---

## Helper Functions

### get_daily_usage(user_id, app_name, date)

Returns total minutes used for an app on a specific date.

```sql
SELECT get_daily_usage(
  'user-uuid',
  'Instagram',
  CURRENT_DATE
);
```

### has_active_lock(user_id, app_name)

Checks if user has any active lock rule for an app.

```sql
SELECT has_active_lock(
  'user-uuid',
  'Instagram'
);
```

### get_compliance_percentage(user_id, days)

Calculates compliance percentage over a period (default 7 days).

```sql
SELECT get_compliance_percentage(
  'user-uuid',
  7
);
```

### award_badge(user_id, badge_id)

Awards a badge to a user (idempotent - won't duplicate).

```sql
SELECT award_badge(
  'user-uuid',
  'first_week'
);
```

### get_worst_performing_app(user_id, start_date, end_date)

Returns the app with most overrides in a date range.

```sql
SELECT * FROM get_worst_performing_app(
  'user-uuid',
  CURRENT_DATE - 7,
  CURRENT_DATE
);
```

### check_streak_badges(user_id)

Checks and awards streak-based badges (7-day, 30-day).

```sql
SELECT check_streak_badges('user-uuid');
```

### check_pomodoro_badge(user_id)

Checks and awards Pomodoro Master badge (20 sessions).

```sql
SELECT check_pomodoro_badge('user-uuid');
```

---

## Automated Triggers

### update_updated_at_column()

Auto-updates `updated_at` timestamp on UPDATE.

**Applied to**: lock_rules, streaks

### initialize_user_streak()

Creates a streak record when a profile is created.

**Applied to**: profiles (AFTER INSERT)

### calculate_session_minutes()

Auto-calculates `minutes_used` when `session_end` is set.

**Applied to**: usage_sessions (BEFORE INSERT OR UPDATE)

### reset_streak_on_override()

Resets `current_streak` to 0 when an override is logged.

**Applied to**: override_logs (AFTER INSERT)

### notify_buddies_on_override()

Creates buddy notifications for active buddies watching the overridden rule.

**Applied to**: override_logs (AFTER INSERT)

---

## Security Model

### Row-Level Security (RLS)

All tables have RLS enabled with policies ensuring:

1. **Data Isolation**: Users can only access their own data
2. **Parental Access**: Parents can view/manage child account data
3. **Buddy Access**: Buddies can view partner data for watched rules only
4. **System Access**: Automated processes can manage challenges and badges

### Authentication

- Uses Supabase Auth with `auth.uid()` for user identification
- Supports magic link email and Google OAuth
- JWT tokens with 1-hour expiry and refresh token rotation

### Data Privacy

- No third-party analytics or tracking
- All user data stays within Supabase
- Cascade deletes ensure complete data removal on account deletion

---

## Performance Considerations

### Indexes

Strategic indexes are placed on:
- Foreign keys for join performance
- Date columns for time-range queries
- Composite indexes for common query patterns

### Query Optimization

- Use `get_daily_usage()` function instead of manual aggregation
- Leverage indexes for date-range queries on override_logs and usage_sessions
- Use `has_active_lock()` for quick lock status checks

### Scaling

- PostgreSQL connection pooling via Supabase
- Realtime subscriptions for buddy notifications (reduces polling)
- Cron jobs for batch operations (streak checks, challenge generation)

---

## Migration Strategy

Migrations are versioned and applied in order:

1. `20240101000000_initial_schema.sql` - Core tables and indexes
2. `20240101000001_rls_policies.sql` - Security policies
3. `20240101000002_seed_badges.sql` - Badge definitions
4. `20240101000003_functions_and_triggers.sql` - Helper functions

To add new migrations:

```bash
supabase migration new your_migration_name
```

Always test migrations locally before pushing to production:

```bash
supabase db reset  # Reset and reapply all migrations
```
