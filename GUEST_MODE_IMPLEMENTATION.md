# Guest Mode Implementation - FocusLock

## Overview

FocusLock now supports **optional authentication**. Users can access all features without creating an account. Data is stored locally in the browser and can be synced to the cloud when they choose to sign in.

## Key Changes

### 1. Removed Mandatory Login ✅

**Before:** Users were forced to sign in before accessing any features.

**After:** Users can start using FocusLock immediately. Login is optional for syncing data across devices.

### 2. Updated Routes

**File:** `config/auth.ts`

- **Removed all protected routes** - Dashboard, stats, settings, rules, buddy, pomodoro, challenges, and badges are now accessible without login
- Users can explore and use all features as guests
- Login is only required for features that need cloud sync (buddy system, cross-device sync)

### 3. Updated Home Page

**File:** `app/page.tsx`

**Changes:**
- Primary CTA: "Start Using FocusLock" → Goes directly to dashboard
- Secondary CTA: "Sign in to Sync Data" → Optional login
- Added note: "All features work without an account. Sign in to sync across devices."

### 4. Local Storage System

**File:** `lib/storage/localStorage.ts`

**Features:**
- Stores lock rules locally when user is not logged in
- Tracks streaks, override logs, and usage sessions
- Data persists in browser localStorage
- Can be exported for sync when user signs in

**Available Functions:**
```typescript
// Lock Rules
getLockRules(): LocalLockRule[]
saveLockRule(rule: LocalLockRule): void
deleteLockRule(ruleId: string): void

// Streak
getStreak(): LocalStreak
saveStreak(streak: LocalStreak): void

// Override Logs
getOverrideLogs(): LocalOverrideLog[]
saveOverrideLog(log: LocalOverrideLog): void

// Usage Sessions
getUsageSessions(): LocalUsageSession[]
saveUsageSession(session: LocalUsageSession): void

// Utilities
clearAllLocalData(): void
hasLocalData(): boolean
exportLocalData(): object
```

### 5. Auth Hook

**File:** `hooks/useAuth.ts`

**Features:**
- Detects if user is logged in or guest
- Provides `isGuest` flag for conditional UI
- Handles auth state changes automatically

**Usage:**
```typescript
const { user, isGuest, isAuthenticated, loading } = useAuth();

if (isGuest) {
  // Show guest-specific UI
}
```

### 6. Guest Banner Component

**File:** `components/layout/GuestBanner.tsx`

**Features:**
- Subtle banner at bottom of screen for guests
- Shows: "You're using FocusLock as a guest. Sign in to sync across devices"
- Dismissible
- Only shows when user is not logged in

### 7. Updated Dashboard

**File:** `app/(dashboard)/dashboard/page.tsx`

**Changes:**
- Removed redirect for unauthenticated users
- Loads data from Supabase if logged in
- Loads data from localStorage if guest
- Seamless experience for both modes

## User Experience Flow

### Guest User Flow

1. **Landing Page** → User sees "Start Using FocusLock" button
2. **Click Button** → Goes directly to dashboard (no login required)
3. **Use Features** → Create lock rules, track streaks, view stats
4. **Data Storage** → All data stored in browser localStorage
5. **Optional Login** → See banner: "Sign in to sync across devices"
6. **Sign In** → Data can be synced to cloud (future feature)

### Logged-In User Flow

1. **Landing Page** → User sees both "Start Using" and "Sign in" buttons
2. **Sign In** → Authenticate with email or Google
3. **Dashboard** → Data loaded from Supabase
4. **Use Features** → All data synced to cloud automatically
5. **Cross-Device** → Access same data on any device

## Benefits

### For Users
- ✅ **No Friction** - Start using immediately, no signup required
- ✅ **Privacy** - Data stays local until they choose to sync
- ✅ **Try Before Commit** - Explore features before creating account
- ✅ **Flexible** - Can sign in later to sync data

### For Product
- ✅ **Higher Conversion** - More users will try the app
- ✅ **Better Onboarding** - Users experience value before signup
- ✅ **Reduced Friction** - No authentication barriers
- ✅ **Progressive Enhancement** - Login becomes a feature, not a requirement

## Technical Implementation

### Data Flow

```
Guest Mode:
User Action → localStorage → UI Update

Logged-In Mode:
User Action → Supabase API → Database → UI Update
```

### Storage Strategy

**Guest Mode:**
- Lock rules: `localStorage.focuslock_lock_rules`
- Streaks: `localStorage.focuslock_streak`
- Override logs: `localStorage.focuslock_override_logs`
- Usage sessions: `localStorage.focuslock_usage_sessions`

**Logged-In Mode:**
- All data in Supabase PostgreSQL database
- Real-time sync via Supabase Realtime
- Row-level security for data protection

## Future Enhancements

### Data Sync Feature (To Be Implemented)

When a guest user signs in, we should:

1. **Detect Local Data** - Check if user has data in localStorage
2. **Show Sync Dialog** - Ask: "You have local data. Would you like to sync it to your account?"
3. **Merge Data** - Upload local data to Supabase
4. **Clear Local Storage** - Remove local data after successful sync
5. **Confirmation** - Show success message

**Implementation File:** `lib/sync/syncLocalData.ts` (to be created)

```typescript
async function syncLocalDataToSupabase(userId: string) {
  const localData = exportLocalData();
  
  // Upload lock rules
  for (const rule of localData.lock_rules) {
    await supabase.from('lock_rules').insert({
      ...rule,
      user_id: userId,
    });
  }
  
  // Upload other data...
  
  // Clear local storage after successful sync
  clearAllLocalData();
}
```

## Testing Checklist

- [ ] Guest can access dashboard without login
- [ ] Guest can create lock rules (stored in localStorage)
- [ ] Guest can view stats and streaks
- [ ] Guest banner shows at bottom of screen
- [ ] Guest banner can be dismissed
- [ ] Login button redirects to login page
- [ ] Logged-in users see data from Supabase
- [ ] Logged-in users don't see guest banner
- [ ] Data persists in localStorage across page refreshes
- [ ] Home page shows both CTAs correctly

## Migration Notes

### For Existing Users

No changes needed. Existing authenticated users will continue to work as before with data in Supabase.

### For New Users

New users can now:
1. Use the app immediately without signup
2. Choose to sign in later for cloud sync
3. Keep using as guest indefinitely if they prefer

## Security Considerations

### Guest Mode
- Data stored in browser localStorage (client-side only)
- No server-side storage for guest data
- Data lost if browser cache is cleared
- No cross-device sync for guests

### Logged-In Mode
- Data stored in Supabase with row-level security
- Encrypted in transit (HTTPS)
- Encrypted at rest (Supabase default)
- Cross-device sync enabled

## Performance Impact

- **Minimal** - localStorage operations are synchronous and fast
- **No API calls** for guest users (faster initial load)
- **Reduced server load** - Fewer database queries for guest users
- **Better UX** - Instant access without authentication delay

## Conclusion

FocusLock now provides a **frictionless onboarding experience** while maintaining the option for users to sign in and sync their data. This approach:

- Removes barriers to entry
- Increases user adoption
- Maintains data privacy
- Provides flexibility for users

Users can start building better habits immediately, and sign in when they're ready to commit to the platform.
