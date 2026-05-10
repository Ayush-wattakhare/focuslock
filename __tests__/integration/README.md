# Integration Tests for FocusLock API Routes

This directory contains comprehensive integration tests for all FocusLock API routes, validating database interactions, Row-Level Security (RLS) policies, authentication flows, and Supabase Realtime subscriptions.

## Test Coverage

### 1. Lock Rules API (`rules.integration.test.ts`)
- ✅ Create lock rules (timer, schedule, until_date, nuclear)
- ✅ Fetch user lock rules
- ✅ Update lock rules
- ✅ Delete lock rules with cascade behavior
- ✅ RLS policy enforcement (users can only access their own rules)

### 2. Override API (`override.integration.test.ts`)
- ✅ Log overrides with mood tracking
- ✅ Streak reset on override
- ✅ Buddy notifications creation
- ✅ Nuclear mode prevention
- ✅ RLS policies for override logs
- ✅ Buddy access to watched rule overrides
- ✅ Realtime subscription for buddy notifications

### 3. Authentication (`auth.integration.test.ts`)
- ✅ User registration and profile creation
- ✅ Default timezone configuration
- ✅ Sign in with email/password
- ✅ Session management
- ✅ Profile RLS policies
- ✅ Profile update operations
- ✅ Account deletion cascade

### 4. Buddy System (`buddy.integration.test.ts`)
- ✅ Buddy invitation creation
- ✅ Buddy acceptance flow
- ✅ Rules watching configuration
- ✅ Buddy relationship management
- ✅ Buddy notifications
- ✅ RLS policies for buddy relationships
- ✅ Realtime notifications

### 5. Stats and Usage Tracking (`stats-usage.integration.test.ts`)
- ✅ Usage session tracking
- ✅ Daily usage aggregation
- ✅ Per-app breakdown with override counts
- ✅ Week-over-week comparison
- ✅ Compliance percentage calculation
- ✅ RLS policies for usage sessions

## Prerequisites

### 1. Environment Variables

Create a `.env.local` file in the project root with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**⚠️ Important:** These tests use the **service role key** to create and delete test users. Never commit this key to version control or use it in client-side code.

### 2. Database Setup

Ensure your Supabase database has all required tables and RLS policies configured:

- `profiles`
- `lock_rules`
- `override_logs`
- `usage_sessions`
- `streaks`
- `buddies`
- `buddy_notifications`
- `badge_definitions`
- `user_badges`
- `pomodoro_sessions`
- `weekly_challenges`
- `child_profiles`

Run the database migrations from `.kiro/specs/focuslock-app/` if not already applied.

### 3. Supabase Realtime

Ensure Realtime is enabled for the `buddy_notifications` table in your Supabase project settings.

## Running the Tests

### Run All Integration Tests

```bash
npm test -- __tests__/integration
```

### Run Specific Test Suite

```bash
# Lock Rules API tests
npm test -- __tests__/integration/api/rules.integration.test.ts

# Override API tests
npm test -- __tests__/integration/api/override.integration.test.ts

# Authentication tests
npm test -- __tests__/integration/api/auth.integration.test.ts

# Buddy System tests
npm test -- __tests__/integration/api/buddy.integration.test.ts

# Stats and Usage tests
npm test -- __tests__/integration/api/stats-usage.integration.test.ts
```

### Run with Coverage

```bash
npm test -- __tests__/integration --coverage
```

### Watch Mode

```bash
npm test -- __tests__/integration --watch
```

## Test Structure

Each test file follows this structure:

```typescript
describe('Feature Integration Tests', () => {
  // Setup: Create test users and authenticate
  beforeAll(async () => {
    // Create test users with service role client
    // Create profiles
    // Authenticate clients
  });

  // Cleanup: Delete test data and users
  afterAll(async () => {
    // Delete created records
    // Delete test users
  });

  describe('Specific Feature', () => {
    it('should perform expected behavior', async () => {
      // Test implementation
    });
  });
});
```

## Key Testing Patterns

### 1. Test User Management

Tests create unique test users with timestamped emails to avoid conflicts:

```typescript
const testEmail = `test-user-${Date.now()}@focuslock.test`;
```

All test users are deleted in `afterAll()` hooks.

### 2. RLS Policy Testing

Tests verify that Row-Level Security policies are enforced:

```typescript
// User1 should NOT be able to access User2's data
const { data, error } = await user1Client
  .from('lock_rules')
  .select('*')
  .eq('id', user2RuleId)
  .single();

expect(error || !data).toBeTruthy();
```

### 3. Realtime Subscription Testing

Tests verify Supabase Realtime notifications:

```typescript
const subscription = userClient
  .channel('test_channel')
  .on('postgres_changes', { ... }, (payload) => {
    expect(payload.new).toBeDefined();
    done();
  })
  .subscribe();
```

### 4. Cleanup Tracking

Tests track created records for cleanup:

```typescript
let createdRuleIds: string[] = [];

// After creating a record
if (data?.id) {
  createdRuleIds.push(data.id);
}

// In afterAll
if (createdRuleIds.length > 0) {
  await supabaseAdmin.from('lock_rules').delete().in('id', createdRuleIds);
}
```

## Troubleshooting

### Tests Fail with "Authentication Required"

- Verify your `.env.local` file has correct Supabase credentials
- Ensure the service role key is set correctly
- Check that test users are being created successfully

### Tests Fail with "RLS Policy Violation"

- Verify RLS policies are configured correctly in Supabase
- Check that the policies match the design document specifications
- Ensure test users are authenticated before making requests

### Realtime Tests Timeout

- Verify Realtime is enabled in Supabase project settings
- Check that the `buddy_notifications` table has Realtime enabled
- Increase test timeout if needed (default is 10 seconds for Realtime tests)

### Database Cleanup Issues

- If tests fail mid-execution, orphaned test data may remain
- Manually clean up test users with emails matching `test-*@focuslock.test`
- Run: `DELETE FROM auth.users WHERE email LIKE 'test-%@focuslock.test';`

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data in `afterAll()` hooks
3. **Unique Data**: Use timestamps or UUIDs to create unique test data
4. **RLS Testing**: Always test both positive and negative RLS scenarios
5. **Error Handling**: Test both success and error cases
6. **Timeouts**: Set appropriate timeouts for async operations (especially Realtime)

## CI/CD Integration

To run these tests in CI/CD pipelines:

1. Set up Supabase environment variables as secrets
2. Use a dedicated test Supabase project (not production)
3. Run tests with: `npm test -- __tests__/integration --ci`
4. Consider running tests in parallel for faster execution

## Additional Resources

- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
