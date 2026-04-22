# Authentication Setup

This directory contains authentication utilities for FocusLock.

## Overview

FocusLock uses Supabase Auth with two authentication methods:
1. **Magic Link** - Passwordless email authentication
2. **Google OAuth** - Social login with Google

## Files

- `helpers.ts` - Authentication helper functions for common operations

## Usage

### Magic Link Authentication

```typescript
import { signInWithMagicLink } from '@/lib/auth/helpers'

// Send magic link to user's email
const { data, error } = await signInWithMagicLink('user@example.com')
```

### Google OAuth Authentication

```typescript
import { signInWithGoogle } from '@/lib/auth/helpers'

// Redirect to Google OAuth flow
const { data, error } = await signInWithGoogle()
```

### Check Authentication Status

```typescript
import { isAuthenticated, getCurrentUser } from '@/lib/auth/helpers'

// Check if user is authenticated
const authenticated = await isAuthenticated()

// Get current user
const { user, error } = await getCurrentUser()
```

### Sign Out

```typescript
import { signOut } from '@/lib/auth/helpers'

// Sign out (server-side)
await signOut(true)

// Sign out (client-side)
await signOut(false)
```

## Protected Routes

Routes are protected using Next.js middleware. Configure protected routes in `config/auth.ts`:

```typescript
export const authConfig = {
  protectedRoutes: [
    '/dashboard',
    '/stats',
    '/settings',
    // ... add more routes
  ],
}
```

## Auth Callback Flow

1. User clicks "Sign in with Google" or receives magic link email
2. User is redirected to Supabase Auth
3. After authentication, Supabase redirects to `/auth/callback`
4. Callback route exchanges code for session
5. Profile is created if it doesn't exist
6. User is redirected to dashboard or specified `next` URL

## Environment Variables

Required environment variables (see `.env.example`):

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# For Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Supabase Configuration

Configure authentication providers in Supabase Dashboard:

1. Go to Authentication > Providers
2. Enable Email provider (for magic links)
3. Enable Google provider and add credentials
4. Set Site URL to your app URL
5. Add redirect URLs: `http://localhost:3000/auth/callback`

## Testing

To test authentication locally:

1. Start Supabase: `npx supabase start`
2. Run dev server: `npm run dev`
3. Navigate to `/login`
4. Try magic link or Google OAuth
5. Verify redirect to `/dashboard`

## Security

- All routes in `protectedRoutes` require authentication
- Middleware automatically refreshes sessions
- Row-level security (RLS) policies protect database access
- Service role key should never be exposed to client
