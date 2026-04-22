// Jest setup file for global test configuration

// Set test timeout to 30 seconds for database operations
jest.setTimeout(30000);

// Load environment variables from .env.local for tests
require('dotenv').config({ path: '.env.local' });

// Verify required environment variables are set
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName] || process.env[varName].startsWith('your_')
);

if (missingEnvVars.length > 0) {
  console.warn(
    '\n⚠️  WARNING: The following environment variables are not set or have placeholder values:\n' +
    missingEnvVars.map(v => `   - ${v}`).join('\n') +
    '\n\nPlease update your .env.local file with actual Supabase credentials.\n' +
    'Tests will fail without valid credentials.\n'
  );
}
