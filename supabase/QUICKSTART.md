# Supabase Quick Start Guide

Get your FocusLock database up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Docker Desktop running (for local Supabase)

## Local Development (Recommended)

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Run Setup Script

**On macOS/Linux:**
```bash
chmod +x scripts/setup-supabase.sh
./scripts/setup-supabase.sh
```

**On Windows (PowerShell):**
```powershell
.\scripts\setup-supabase.ps1
```

This script will:
- Initialize Supabase
- Start local Supabase instance
- Apply all migrations
- Generate API keys
- Create `.env.local` file

### 3. Verify Setup

Open http://localhost:54323 to access Supabase Studio.

You should see all tables created:
- profiles
- lock_rules
- override_logs
- usage_sessions
- streaks
- badge_definitions
- user_badges
- buddies
- buddy_notifications
- pomodoro_sessions
- weekly_challenges
- child_profiles

### 4. Start Development

```bash
npm run dev
```

Visit http://localhost:3000

## Manual Setup (Alternative)

If the script doesn't work, follow these steps:

### 1. Start Supabase

```bash
supabase start
```

### 2. Get API Keys

```bash
supabase status
```

Copy the `anon key` and `service_role key`.

### 3. Create .env.local

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here
```

### 4. Apply Migrations

Migrations are automatically applied when you start Supabase. To manually reset:

```bash
supabase db reset
```

## Production Setup

### 1. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose a name, password, and region
4. Wait for provisioning (~2 minutes)

### 2. Get Production Keys

In your Supabase project dashboard:
1. Go to Settings > API
2. Copy `Project URL` and `anon public` key

### 3. Link Local to Remote

```bash
supabase link --project-ref your-project-ref
```

Find your project ref in the Supabase dashboard URL:
`https://supabase.com/dashboard/project/[project-ref]`

### 4. Push Migrations

```bash
supabase db push
```

### 5. Configure Auth Providers

In Supabase Dashboard:

**Email Auth:**
1. Go to Authentication > Providers
2. Enable Email provider
3. Disable email confirmations (or configure SMTP)

**Google OAuth:**
1. Create OAuth credentials in Google Cloud Console
2. Add to Supabase: Authentication > Providers > Google
3. Set redirect URL: `https://[your-project].supabase.co/auth/v1/callback`

### 6. Update Environment Variables

In Vercel (or your hosting platform):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## Common Commands

```bash
# Start Supabase
supabase start

# Stop Supabase
supabase stop

# Check status
supabase status

# Reset database (reapply all migrations)
supabase db reset

# Create new migration
supabase migration new my_migration_name

# View logs
supabase logs

# Open Studio UI
supabase studio
```

## Testing the Database

### Create a Test User

1. Open http://localhost:54323
2. Go to Authentication > Users
3. Click "Add user"
4. Enter email and password
5. Click "Create user"

### Run Test Queries

In Studio SQL Editor:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check badge definitions
SELECT * FROM badge_definitions;

-- Create a test profile (replace with your user ID)
INSERT INTO profiles (id, full_name, timezone)
VALUES ('your-user-id', 'Test User', 'America/New_York');

-- Check if streak was auto-created
SELECT * FROM streaks WHERE user_id = 'your-user-id';

-- Create a test lock rule
INSERT INTO lock_rules (user_id, app_name, lock_type, daily_limit_minutes)
VALUES ('your-user-id', 'Instagram', 'timer', 30);

-- Check daily usage function
SELECT get_daily_usage('your-user-id', 'Instagram', CURRENT_DATE);
```

## Troubleshooting

### Docker not running

**Error:** `Cannot connect to the Docker daemon`

**Solution:** Start Docker Desktop

### Port already in use

**Error:** `Port 54321 is already allocated`

**Solution:** 
```bash
supabase stop
supabase start
```

### Migrations not applying

**Error:** Migration files not found

**Solution:**
```bash
# Ensure you're in project root
cd /path/to/focuslock

# Reset database
supabase db reset --debug
```

### RLS blocking queries

**Error:** `new row violates row-level security policy`

**Solution:** Ensure you're authenticated with a valid user ID. In local development, you can temporarily disable RLS:

```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

**⚠️ Never disable RLS in production!**

### Can't connect to database

**Error:** `Connection refused`

**Solution:**
```bash
# Check if Supabase is running
supabase status

# If not running, start it
supabase start
```

## Next Steps

1. ✅ Database is set up
2. 📝 Review schema: `supabase/SCHEMA.md`
3. 🔧 Implement API routes: `app/api/`
4. 🎨 Build UI components: `components/`
5. 🧪 Write tests

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [FocusLock Schema Reference](./SCHEMA.md)
- [FocusLock Design Document](../.kiro/specs/focuslock-app/design.md)

## Need Help?

- Check `supabase/README.md` for detailed documentation
- Review `supabase/SCHEMA.md` for schema details
- Run `supabase --help` for CLI commands
