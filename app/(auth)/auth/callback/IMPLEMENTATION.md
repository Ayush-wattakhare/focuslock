# Auth Callback Route Implementation

## Overview
The auth callback route handles Supabase authentication callbacks for both magic link email and Google OAuth authentication flows.

## Location
`app/(auth)/auth/callback/route.ts`

## Requirements Implemented

### Requirement 1.3: Profile Creation
✅ **WHEN a user completes authentication, THE FocusLock_System SHALL create a profile record with user ID, full name, avatar URL, timezone, and creation timestamp**

The route checks if a profile exists for the authenticated user. If not, it creates a new profile with:
- `id`: User ID from Supabase auth
- `full_name`: Extracted from `user_metadata.full_name` or `user_metadata.name` (Google OAuth)
- `avatar_url`: Extracted from `user_metadata.avatar_url` or `user_metadata.picture` (Google OAuth)
- `timezone`: Defaults to 'Asia/Kolkata'
- `created_at`: Automatically set by database

### Requirement 1.4: Default Timezone
✅ **THE FocusLock_System SHALL default the timezone to 'Asia/Kolkata' for new profiles**

All new profiles are created with `timezone: 'Asia/Kolkata'` as specified.

### Requirement 6.1: Streak Initialization
✅ **WHEN a user account is created, THE FocusLock_System SHALL initialize a streak record with current streak 0, longest streak 0, and no last active date**

For new users, the route initializes a streak record with:
- `user_id`: User ID
- `current_streak`: 0
- `longest_streak`: 0
- `last_active_date`: null

### Requirement 20.1: Onboarding Redirect
✅ **WHEN a new user completes authentication, THE FocusLock_System SHALL display a 3-step onboarding wizard**

New users are redirected to `/onboarding` while existing users are redirected to `/dashboard`.

## Implementation Details

### Flow
1. Extract `code` and optional `next` parameters from URL
2. Exchange authorization code for session using Supabase
3. Get authenticated user details
4. Check if profile exists in database
5. If new user:
   - Create profile record with user metadata
   - Initialize streak record
   - Set `isNewUser` flag to true
6. Determine redirect URL:
   - If `next` parameter provided, use it
   - If new user, redirect to `/onboarding`
   - Otherwise, redirect to `/dashboard`
7. If any error occurs, redirect to `/auth/auth-error`

### Type Safety
The implementation uses proper TypeScript types:
- `Database['public']['Tables']['profiles']['Insert']` for profile creation
- No `any` type casting required
- Full type inference from Supabase client

### OAuth Provider Support
The route handles metadata from different OAuth providers:
- **Magic Link**: Uses `full_name` and `avatar_url`
- **Google OAuth**: Uses `name` and `picture` (fallback mapping)

## Testing
Comprehensive unit tests cover:
- ✅ Missing code parameter handling
- ✅ Invalid code handling
- ✅ New user profile creation
- ✅ New user streak initialization
- ✅ Existing user redirect
- ✅ Custom `next` parameter handling
- ✅ Google OAuth metadata mapping

All tests pass successfully.

## Error Handling
- Missing or invalid authorization code → Redirect to `/auth/auth-error`
- Session exchange failure → Redirect to `/auth/auth-error`
- Database errors → Redirect to `/auth/auth-error`

## Security
- Uses Supabase server client with cookie-based session management
- Row-level security policies enforce user data isolation
- No sensitive data exposed in redirects
