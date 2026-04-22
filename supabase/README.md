# FocusLock Supabase Database Setup

This directory contains all database migrations and configuration for the FocusLock application.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- Node.js 18+ installed
- A Supabase account (free tier works)

## Local Development Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Initialize Supabase (if not already done)

```bash
supabase init
```

### 3. Start Local Supabase

```bash
supabase start
```

This will start:
- PostgreSQL database on `localhost:54322`
- API server on `localhost:54321`
- Studio UI on `http://localhost:54323`

### 4. Apply Migrations

Migrations are automatically applied when you start Supabase. To manually apply:

```bash
supabase db reset
```

## Production Setup

### 1. Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - Name: `focuslock-prod`
   - Database Password: (generate strong password)
   - Region: Choose closest to your users
4. Wait for project to be provisioned

### 2. Link Local Project to Remote

```bash
supabase link --project-ref your-project-ref
```

### 3. Push Migrations to Production

```bash
supabase db push
```

### 4. Configure Authentication

In Supabase Dashboard:

1. Go to **Authentication > Providers**
2. Enable **Email** provider
3. Enable **Google** OAuth:
   - Add Google Client ID
   - Add Google Client Secret
   - Set redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### 5. Configure Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Database Schema Overview

### Core Tables

- **profiles**: User profile information
- **lock_rules**: App lock configurations
- **override_logs**: Emergency override tracking with mood data
- **usage_sessions**: App usage time tracking
- **streaks**: Consecutive days without overrides
- **badge_definitions**: Master badge list
- **user_badges**: Badges earned by users

### Social Features

- **buddies**: Accountability partner relationships
- **buddy_notifications**: Real-time notifications between buddies

### Gamification

- **pomodoro_sessions**: Focus work sessions
- **weekly_challenges**: Auto-generated weekly goals

### Parental Controls

- **child_profiles**: Parent-child account links

## Migrations

Migrations are located in `supabase/migrations/` and are applied in order:

1. `20240101000000_initial_schema.sql` - Creates all tables and indexes
2. `20240101000001_rls_policies.sql` - Enables RLS and creates security policies
3. `20240101000002_seed_badges.sql` - Seeds badge definitions
4. `20240101000003_functions_and_triggers.sql` - Adds helper functions and triggers

## Helper Functions

### `get_daily_usage(user_id, app_name, date)`
Returns total minutes used for an app on a specific date.

### `has_active_lock(user_id, app_name)`
Checks if user has any active lock rule for an app.

### `get_compliance_percentage(user_id, days)`
Calculates compliance percentage over a period.

### `award_badge(user_id, badge_id)`
Awards a badge to a user (idempotent).

### `get_worst_performing_app(user_id, start_date, end_date)`
Returns the app with most overrides in a date range.

### `check_streak_badges(user_id)`
Checks and awards streak-based badges.

### `check_pomodoro_badge(user_id)`
Checks and awards Pomodoro Master badge.

## Automated Triggers

- **update_updated_at**: Auto-updates `updated_at` timestamp on lock_rules and streaks
- **initialize_user_streak**: Creates streak record when profile is created
- **calculate_session_minutes**: Auto-calculates duration when usage session ends
- **reset_streak_on_override**: Resets current streak to 0 when override is logged
- **notify_buddies_on_override**: Creates buddy notifications when override occurs

## Row-Level Security (RLS)

All tables have RLS enabled with policies ensuring:

- Users can only access their own data
- Parents can manage child account data
- Buddies can view partner data for watched rules only
- System functions can manage challenges and badges

## Testing Migrations

To test migrations locally:

```bash
# Reset database and reapply all migrations
supabase db reset

# Check migration status
supabase migration list

# Create a new migration
supabase migration new your_migration_name
```

## Backup and Recovery

### Create Backup

```bash
supabase db dump -f backup.sql
```

### Restore Backup

```bash
psql -h localhost -p 54322 -U postgres -d postgres -f backup.sql
```

## Troubleshooting

### Migrations not applying

```bash
supabase db reset --debug
```

### RLS blocking queries

Check policies with:

```sql
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

### Connection issues

Verify Supabase is running:

```bash
supabase status
```

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
