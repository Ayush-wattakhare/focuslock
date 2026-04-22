# Supabase Installation Guide for FocusLock

This guide will help you set up the complete Supabase database for FocusLock.

## 📋 What Was Created

### Database Structure
- ✅ 11 database tables with proper constraints and indexes
- ✅ Row-Level Security (RLS) policies for all tables
- ✅ 7 helper functions for common operations
- ✅ 5 automated triggers for data management
- ✅ 7 pre-seeded badges

### Code Integration
- ✅ TypeScript types matching database schema
- ✅ Supabase client utilities (browser, server, middleware)
- ✅ Next.js middleware for auth session management
- ✅ Updated package.json with Supabase dependencies

### Documentation
- ✅ Comprehensive setup guides
- ✅ Detailed schema documentation
- ✅ Quick start guide
- ✅ Setup automation scripts

## 🚀 Quick Installation (5 Minutes)

### Step 1: Install Dependencies

```bash
npm install
```

This will install:
- `@supabase/supabase-js` - Supabase JavaScript client
- `@supabase/ssr` - Server-side rendering support

### Step 2: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 3: Run Setup Script

**On macOS/Linux:**
```bash
chmod +x scripts/setup-supabase.sh
./scripts/setup-supabase.sh
```

**On Windows (PowerShell):**
```powershell
.\scripts\setup-supabase.ps1
```

The script will:
1. Initialize Supabase in your project
2. Start local Supabase instance (requires Docker)
3. Apply all database migrations
4. Create `.env.local` with API keys
5. Display access URLs

### Step 4: Verify Installation

1. Open Supabase Studio: http://localhost:54323
2. Check that all 11 tables exist
3. Verify badge_definitions has 7 rows
4. Test a query in SQL Editor:

```sql
SELECT * FROM badge_definitions;
```

### Step 5: Start Development

```bash
npm run dev
```

Visit http://localhost:3000

## 📁 File Structure

```
focuslock-app/
├── supabase/
│   ├── migrations/
│   │   ├── 20240101000000_initial_schema.sql
│   │   ├── 20240101000001_rls_policies.sql
│   │   ├── 20240101000002_seed_badges.sql
│   │   └── 20240101000003_functions_and_triggers.sql
│   ├── config.toml
│   ├── seed.sql
│   ├── README.md
│   ├── SCHEMA.md
│   ├── QUICKSTART.md
│   └── SETUP_SUMMARY.md
├── lib/
│   └── supabase/
│       ├── client.ts       # Browser client
│       ├── server.ts       # Server client
│       └── middleware.ts   # Middleware client
├── types/
│   └── database.ts         # TypeScript types
├── scripts/
│   ├── setup-supabase.sh   # macOS/Linux setup
│   └── setup-supabase.ps1  # Windows setup
├── middleware.ts           # Next.js middleware
└── .env.local             # Environment variables (auto-generated)
```

## 🔧 Manual Setup (If Script Fails)

### 1. Start Supabase

```bash
supabase start
```

Wait for all services to start (~2 minutes on first run).

### 2. Get API Keys

```bash
supabase status
```

Look for:
- `API URL`: Your local Supabase URL
- `anon key`: Public API key
- `service_role key`: Admin API key

### 3. Create .env.local

Create a file named `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here
```

### 4. Verify Migrations

Migrations are automatically applied. To manually reset:

```bash
supabase db reset
```

## 🌐 Production Setup

### 1. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - Name: `focuslock-prod`
   - Database Password: (generate strong password)
   - Region: Choose closest to your users
4. Wait for provisioning (~2 minutes)

### 2. Link Local to Remote

```bash
supabase link --project-ref your-project-ref
```

Find your project ref in the dashboard URL:
`https://supabase.com/dashboard/project/[project-ref]`

### 3. Push Migrations

```bash
supabase db push
```

This applies all migrations to production.

### 4. Configure Authentication

In Supabase Dashboard:

**Email Provider:**
1. Go to Authentication > Providers
2. Enable "Email"
3. Configure SMTP or disable email confirmations for testing

**Google OAuth:**
1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
2. Add to Supabase: Authentication > Providers > Google
3. Set redirect URL: `https://[your-project].supabase.co/auth/v1/callback`

### 5. Update Production Environment

In Vercel (or your hosting platform):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## 🧪 Testing the Setup

### Test Database Connection

Create a test file `test-db.ts`:

```typescript
import { createClient } from '@/lib/supabase/client'

async function testConnection() {
  const supabase = createClient()
  
  // Test query
  const { data, error } = await supabase
    .from('badge_definitions')
    .select('*')
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Badges:', data)
  }
}

testConnection()
```

Run with:
```bash
npx tsx test-db.ts
```

### Test Authentication

In your app, try signing up:

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123',
})
```

## 📚 Usage Examples

### Query Data

```typescript
import { createClient } from '@/lib/supabase/server'

export async function getLockRules(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('lock_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
  
  return data
}
```

### Insert Data

```typescript
const { data, error } = await supabase
  .from('lock_rules')
  .insert({
    user_id: userId,
    app_name: 'Instagram',
    lock_type: 'timer',
    daily_limit_minutes: 30,
  })
  .select()
  .single()
```

### Call Functions

```typescript
const { data, error } = await supabase
  .rpc('get_daily_usage', {
    p_user_id: userId,
    p_app_name: 'Instagram',
    p_date: new Date().toISOString().split('T')[0],
  })
```

## 🔍 Troubleshooting

### Docker Not Running

**Error:** `Cannot connect to the Docker daemon`

**Solution:** Start Docker Desktop

### Port Already in Use

**Error:** `Port 54321 is already allocated`

**Solution:**
```bash
supabase stop
supabase start
```

### Migrations Not Applying

**Error:** `Migration files not found`

**Solution:**
```bash
# Ensure you're in project root
cd /path/to/focuslock-app

# Reset database
supabase db reset --debug
```

### RLS Blocking Queries

**Error:** `new row violates row-level security policy`

**Solution:** Ensure you're authenticated. Check auth state:

```typescript
const { data: { user } } = await supabase.auth.getUser()
console.log('Current user:', user)
```

### Can't Connect to Database

**Error:** `Connection refused`

**Solution:**
```bash
# Check status
supabase status

# If not running
supabase start
```

## 📖 Next Steps

1. ✅ Database is set up
2. 📝 Review schema: `supabase/SCHEMA.md`
3. 🚀 Read quick start: `supabase/QUICKSTART.md`
4. 🔧 Implement API routes in `app/api/`
5. 🎨 Build UI components in `components/`
6. 🧪 Write tests

## 🆘 Need Help?

- **Full Documentation**: `supabase/README.md`
- **Schema Reference**: `supabase/SCHEMA.md`
- **Quick Start**: `supabase/QUICKSTART.md`
- **Supabase Docs**: https://supabase.com/docs
- **CLI Help**: `supabase --help`

## ✅ Verification Checklist

- [ ] Supabase CLI installed
- [ ] Docker Desktop running
- [ ] `supabase start` completed successfully
- [ ] All 11 tables visible in Studio
- [ ] 7 badges in badge_definitions table
- [ ] `.env.local` file created with API keys
- [ ] `npm install` completed
- [ ] `npm run dev` starts without errors
- [ ] Can access http://localhost:3000
- [ ] Can access http://localhost:54323 (Studio)

---

**Status**: Ready for development! 🎉

**Task**: 1.2 Set up Supabase project and database schema ✅
