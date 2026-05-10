# Property Tests 13-15: Usage Sessions Summary

## Overview

This document summarizes the property-based tests implemented for Task 4.6 of the FocusLock spec, which validates usage session tracking functionality.

## Properties Implemented

### Property 13: Usage Session Start Recording
**Validates: Requirements 5.1**

Tests that when a usage session begins, the system records all required fields:
- `user_id` - The authenticated user
- `app_name` - The application being used
- `session_start` - Timestamp when session started
- `date` - Date of the session (YYYY-MM-DD format)

**Test Coverage:**
- Records all required fields correctly
- Records user_id for all sessions
- Records app_name for all sessions
- Records session_start timestamp correctly
- Records date correctly for all sessions

**Property Runs:** 100 iterations per test

### Property 14: Usage Session Duration Calculation
**Validates: Requirements 5.2**

Tests that when a usage session ends, the system:
- Records the `session_end` timestamp
- Calculates `minutes_used` as the difference between end and start times

**Test Coverage:**
- Calculates minutes_used correctly as difference between end and start
- Handles short sessions (< 1 minute) correctly with proper rounding
- Handles long sessions (> 1 hour) correctly
- Records session_end timestamp when session ends

**Property Runs:** 100 iterations for main test, 50 for edge cases

### Property 15: Daily Usage Aggregation
**Validates: Requirements 5.3**

Tests that the system correctly aggregates daily usage minutes per app for lock evaluation:
- Sums all session minutes for the same app and date
- Aggregates separately for different apps
- Excludes incomplete sessions (without minutes_used)
- Aggregates separately for different dates

**Test Coverage:**
- Aggregates daily usage correctly for a single app
- Aggregates daily usage correctly for multiple apps
- Aggregates only completed sessions (with minutes_used)
- Aggregates usage separately for different dates

**Property Runs:** 100 iterations for single app, 50 for multi-app scenarios

## Test Structure

### File Location
`__tests__/api/usage.property.test.ts`

### Testing Framework
- **fast-check**: Property-based testing library
- **Jest**: Test runner
- **Supabase**: Database client for integration testing

### Custom Arbitraries

```typescript
// App name generator (1-50 characters)
const appNameArbitrary = fc.string({ minLength: 1, maxLength: 50 });

// Date string generator (YYYY-MM-DD format)
const dateStringArbitrary = fc.date({ 
  min: new Date('2024-01-01'), 
  max: new Date('2024-12-31') 
}).map(d => d.toISOString().split('T')[0]);

// Timestamp generator
const timestampArbitrary = fc.date({ 
  min: new Date('2024-01-01'), 
  max: new Date('2024-12-31') 
}).map(d => d.toISOString());

// Duration generator (1-480 minutes = 8 hours max)
const durationMinutesArbitrary = fc.integer({ min: 1, max: 480 });
```

## Running the Tests

### Prerequisites

1. **Start Local Supabase:**
   ```bash
   supabase start
   ```

2. **Verify Environment Variables:**
   Ensure `.env.local` contains:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-local-service-role-key>
   ```

### Run Tests

```bash
# Run all usage property tests
npm test -- __tests__/api/usage.property.test.ts

# Run with coverage
npm test -- __tests__/api/usage.property.test.ts --coverage

# Run specific property
npm test -- __tests__/api/usage.property.test.ts -t "Property 13"
```

## Test Data Management

### Setup
- Creates a test user before all tests in each describe block
- Uses Supabase service role key to bypass RLS for testing

### Cleanup
- Deletes all usage sessions after each test
- Deletes test user profile after all tests complete
- Ensures no test data pollution between runs

## Expected Behavior

### When Tests Pass
All properties should pass with 100% success rate across all iterations, confirming:
- Session start records all required fields
- Duration calculation is accurate
- Daily aggregation sums correctly

### When Tests Fail
Property-based tests will provide:
- The specific input that caused the failure
- The expected vs actual values
- A reproducible test case for debugging

## Integration with Spec

These tests directly validate the correctness properties defined in the design document:

- **Design Document:** `.kiro/specs/focuslock-app/design.md` (lines 1586-1603)
- **Requirements:** `.kiro/specs/focuslock-app/requirements.md` (Requirements 5.1-5.3)
- **Task:** `.kiro/specs/focuslock-app/tasks.md` (Task 4.6)

## Next Steps

After these tests pass:
1. Proceed to Task 4.7: Implement streak API
2. Continue with remaining API implementation tasks
3. Run full test suite to ensure no regressions

## Notes

- Tests use direct database access via Supabase client for integration testing
- Tests validate both the database schema constraints and business logic
- Property-based testing provides higher confidence than example-based tests by testing across many input combinations
- All tests follow the same pattern as existing property tests (e.g., `rules.property.test.ts`, `override.property.test.ts`)
