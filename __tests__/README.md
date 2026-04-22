# FocusLock Property-Based Tests

This directory contains property-based tests for the FocusLock application using [fast-check](https://github.com/dubzzz/fast-check).

## Overview

Property-based testing validates universal properties that should hold true across all valid inputs, rather than testing specific examples. This approach provides stronger correctness guarantees for core business logic.

## Test Structure

### Database Tests (`database/`)
- `lock-rules-schema.test.ts` - Property 3: Lock Rule Validation by Type
  - Validates database schema constraints for different lock types
  - Tests Requirements 2.1, 2.3, 2.4, 2.5, 2.6

## Prerequisites

Before running tests, you need:

1. **Supabase Project**: Create a Supabase project at https://app.supabase.com
2. **Database Schema**: Apply all migrations from `supabase/migrations/`
3. **Environment Variables**: Configure `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- lock-rules-schema.test.ts
```

## Test Configuration

- **Test Runner**: Jest with ts-jest preset
- **Property Testing**: fast-check with @fast-check/jest
- **Test Timeout**: 30 seconds (for database operations)
- **Minimum Iterations**: 20-50 runs per property (configurable via `numRuns`)

## Writing New Property Tests

When adding new property tests:

1. **Tag with Property Number**: Include the property number and description in the test file header
2. **Link to Requirements**: Document which requirements the property validates
3. **Use Appropriate Arbitraries**: Create custom arbitraries for domain-specific data
4. **Clean Up Test Data**: Always clean up database records in `afterEach` or `afterAll`
5. **Set Appropriate Iterations**: Use 20-50 runs for database tests, 100+ for pure logic tests

Example:

```typescript
/**
 * Property X: Description
 * Validates: Requirements X.Y, X.Z
 */
describe('Property X: Description', () => {
  it('should validate the property', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(), // arbitrary for input
        async (input) => {
          // Test logic
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 50 }
    );
  });
});
```

## Troubleshooting

### Tests Fail with "Environment variables not set"
- Ensure `.env.local` has valid Supabase credentials
- Check that the credentials are not placeholder values

### Tests Fail with "Connection refused"
- Verify your Supabase project is running
- Check that the `NEXT_PUBLIC_SUPABASE_URL` is correct

### Tests Timeout
- Increase the timeout in `jest.config.js` or individual tests
- Check your network connection to Supabase

### Database Constraint Errors
- Ensure all migrations have been applied to your Supabase database
- Verify the schema matches the expected structure

## Resources

- [fast-check Documentation](https://github.com/dubzzz/fast-check/tree/main/documentation)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
