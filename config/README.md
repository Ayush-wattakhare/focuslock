# Configuration Files

This directory contains configuration files for various aspects of the FocusLock application.

## Files

### `auth.ts`
Authentication configuration for Supabase Auth:
- Magic link settings
- OAuth provider configuration
- Session management settings

### `constants.ts`
Application-wide constants:
- App metadata (name, description, version)
- Default values (timezone, limits)
- Feature flags

### `ai.ts`
AI coaching configuration for Claude API:
- Model selection and parameters
- Rate limiting settings
- Prompt templates
- API endpoint configuration

## Environment Variables

All sensitive configuration values should be stored in environment variables, not in these files.

See the root `.env.local` file for required environment variables.

## Usage

Import configuration values in your code:

```typescript
import { AI_CONFIG } from '@/config/ai';
import { AUTH_CONFIG } from '@/config/auth';
import { APP_CONSTANTS } from '@/config/constants';
```

## Security Notes

- Never commit API keys or secrets to these files
- Use environment variables for all sensitive data
- Configuration files should only contain non-sensitive settings
- Review configuration before deploying to production
