# Test Setup Instructions

## Important: Database Configuration Required

The property-based tests for database schema constraints require a **live Supabase database** with the FocusLock schema applied.

### Setup Steps

1. **Create or Use Existing Supabase Project**
   - Go to https://app.supabase.com
   - Create a new project or use an existing one
   - Wait for the project to finish provisioning

2. **Apply Database Migrations**
   - Ensure all migrations from `supabase/migrations/` are applied
   - You can apply them using the Supabase CLI or SQL Editor:
   
   ```bash
   # Using Supabase CLI (recommended)
   cd supabase
   supabase db push
   
   # Or manually in SQL Editor
   # Copy and paste each migration file in order
   ```

3. **Configure Environment Variables**
   - Update `.env.local` with your Supabase credentials:
   
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
   
   - Get these values from: Project Settings → API → Project URL and API Keys

4. **Verify Setup**
   - Run a simple test to verify connection:
   
   ```bash
   npm test
   ```

### Test Behavior

- **Test User Creation**: Tests automatically create temporary test users
- **Data Cleanup**: All test data is cleaned up after each test
- **Isolation**: Tests use unique user IDs to avoid conflicts
- **Service Role**: Tests use the service role key to bypass RLS for testing

### Troubleshooting

**Error: "Environment variables not set"**
- Check that `.env.local` exists and has valid credentials
- Ensure values don't start with "your_" (placeholder values)

**Error: "relation does not exist"**
- Database migrations haven't been applied
- Apply all migrations from `supabase/migrations/`

**Error: "Connection timeout"**
- Check your internet connection
- Verify the Supabase project URL is correct
- Ensure the Supabase project is running (not paused)

**Error: "Invalid API key"**
- Verify you're using the correct service role key
- Check for extra spaces or newlines in the key
- Regenerate the key if necessary

### Running Tests Without Database

If you don't have a Supabase database set up yet, you can:

1. **Skip database tests**: Comment out the test file temporarily
2. **Use Supabase Local**: Set up local Supabase with Docker
3. **Mock the database**: Create mock implementations (not recommended for schema tests)

### Next Steps

Once setup is complete, you can:

- Run all tests: `npm test`
- Run in watch mode: `npm run test:watch`
- Generate coverage: `npm run test:coverage`
- Run specific test: `npm test -- lock-rules-schema.test.ts`
