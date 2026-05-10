# Settings Page Implementation

## Overview
The settings page provides user profile management, notification preferences, data export, and account deletion functionality.

## Requirements Addressed
- **Requirement 1.5**: Profile update form for name, avatar, and timezone
- **Requirement 21.1-21.5**: Notification preferences configuration
- **Requirement 22.1**: Data export button
- **Requirement 22.2-22.3**: Account deletion with cascade delete
- **Requirement 22.4**: Privacy policy display
- **Requirement 22.5**: Data sharing transparency

## Components

### `/app/(dashboard)/settings/page.tsx`
Server component that:
- Checks authentication and redirects to login if not authenticated
- Fetches user profile from Supabase
- Passes profile data to client component

### `/app/(dashboard)/settings/SettingsClient.tsx`
Client component that provides:
- Profile update form (name, avatar URL, timezone)
- Notification preferences toggles (stored in localStorage)
- Data export button (calls GET /api/export)
- Account deletion button with confirmation dialog
- Privacy policy information and link

## API Routes

### `PATCH /api/profile`
Updates user profile fields:
- `full_name`: User's full name (nullable)
- `avatar_url`: URL to user's avatar image (nullable)
- `timezone`: User's timezone (defaults to Asia/Kolkata)
- `notify_unlock`: Enable unlock reminder notifications (boolean)
- `notify_buddy_override`: Enable buddy override notifications (boolean)
- `notify_streak_broken`: Enable streak broken notifications (boolean)
- `notify_badge_earned`: Enable badge earned notifications (boolean)

### `DELETE /api/account`
Deletes user account and all associated data:
- Deletes profile record (cascade deletes all related data)
- Signs out the user
- Returns success response

### `GET /api/export`
Exports all user data as JSON (already implemented in task 7.15)

## Notification Preferences
Stored in the user's profile in the database with the following fields:
- `notify_unlock`: Browser notification when app is about to unlock (default: false)
- `notify_buddy_override`: Notification when buddy overrides a watched rule (default: false)
- `notify_streak_broken`: Notification to buddy when user breaks streak (default: false)
- `notify_badge_earned`: In-app notification when user earns a badge (default: true)

Preferences are synced to localStorage for client-side access by the notification service. The `syncNotificationPreferences()` function from `lib/core/notificationService.ts` is called:
- On component mount to sync profile preferences to localStorage
- After saving settings to keep localStorage in sync with database

### Database Schema
Added to `profiles` table via migration `20240101000006_notification_preferences.sql`:
```sql
ALTER TABLE profiles
ADD COLUMN notify_unlock BOOLEAN DEFAULT false,
ADD COLUMN notify_buddy_override BOOLEAN DEFAULT false,
ADD COLUMN notify_streak_broken BOOLEAN DEFAULT false,
ADD COLUMN notify_badge_earned BOOLEAN DEFAULT true;
```

## Timezone Options
Provides common timezone options:
- Asia/Kolkata (IST) - Default
- America/New_York (EST)
- America/Los_Angeles (PST)
- Europe/London (GMT)
- Europe/Paris (CET)
- Asia/Tokyo (JST)
- Australia/Sydney (AEST)

## Account Deletion Flow
1. User clicks "Delete Account" button
2. Confirmation dialog appears with warning message
3. User confirms deletion
4. API deletes profile record (cascade deletes all related data)
5. User is signed out and redirected to login page

## Database Cascade Deletes
When a profile is deleted, the following related records are automatically deleted:
- lock_rules
- override_logs
- usage_sessions
- streaks
- user_badges
- buddies
- pomodoro_sessions
- weekly_challenges
- child_profiles (if parent)

## Privacy Policy
Displays inline privacy information and links to full privacy policy page at `/privacy`.

## Styling
Uses Tailwind CSS with:
- Clean white cards on gray background
- Blue primary buttons for save actions
- Red danger zone styling for account deletion
- Success/error message banners
- Responsive layout with max-width container
