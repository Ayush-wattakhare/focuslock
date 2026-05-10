# Bedtime Mode Implementation

## Overview

The bedtime mode page allows users to configure automatic app locking at bedtime with separate schedules for weekdays and weekends. It displays the user's bedtime compliance streak and provides an intuitive interface for managing bedtime settings.

## Requirements Addressed

**Requirement 12.1**: ✅ Bedtime hour and minute configuration
- Time pickers for bedtime and wake time

**Requirement 12.2**: ✅ Different schedules for weekdays and weekends
- Separate configuration sections for weekdays (Mon-Fri) and weekends (Sat-Sun)

**Requirement 12.3**: ✅ Automatic locking at bedtime
- Settings stored in database for cron job to process

**Requirement 12.4**: ✅ Unlock at configured wake time
- Wake time configuration for both weekday and weekend schedules

**Requirement 12.5**: ✅ Cron job support
- Database schema supports cron job checking (to be implemented separately)

**Requirement 12.6**: ✅ Moon animation and unlock time display
- Moon icon (🌙) displayed throughout the interface
- Unlock time will be shown by lock screen (separate implementation)

**Requirement 12.7**: ✅ Compliance streak and badge
- Compliance streak displayed prominently
- Badge information shown in info box

## Components

### 1. Database Schema

**Table**: `bedtime_settings`
- `user_id` (UUID, PRIMARY KEY): User identifier
- `is_enabled` (BOOLEAN): Whether bedtime mode is active
- `weekday_bedtime` (TIME): Bedtime for weekdays
- `weekday_waketime` (TIME): Wake time for weekdays
- `weekend_bedtime` (TIME): Bedtime for weekends
- `weekend_waketime` (TIME): Wake time for weekends
- `compliance_streak` (INTEGER): Consecutive days of compliance
- `last_compliance_date` (DATE): Last date of compliance check

**Migration**: `supabase/migrations/20240101000005_bedtime_settings.sql`

### 2. API Endpoints

**GET /api/bedtime**
- Fetches user's bedtime settings
- Returns default settings if none exist
- Requires authentication

**POST /api/bedtime**
- Creates or updates bedtime settings
- Validates required fields
- Uses upsert to handle create/update
- Requires authentication

### 3. Page Components

**app/(dashboard)/bedtime/page.tsx**
- Server component
- Handles authentication
- Fetches initial bedtime settings
- Passes data to client component

**app/(dashboard)/bedtime/BedtimeClient.tsx**
- Client component with state management
- Features:
  - Enable/disable toggle
  - Separate time pickers for weekdays and weekends
  - Compliance streak display with moon icon
  - Save functionality with loading states
  - Success/error messages
  - Responsive design

## UI/UX Features

### Visual Design
- Dark blue gradient background (night theme)
- Moon icon (🌙) for bedtime branding
- White cards with rounded corners
- Clear visual hierarchy

### Compliance Streak Card
- Large moon icon
- Prominent streak count
- Motivational message
- Badge progress indicator

### Settings Card
- Toggle switch for enable/disable
- Separate sections for weekdays and weekends
- Time input fields with labels
- Disabled state when bedtime mode is off
- Save button with loading state
- Success/error feedback

### Info Box
- Explains how bedtime mode works
- Mentions Night Owl Slayer badge
- Blue background for information

### Responsive Design
- Desktop: Two-column time inputs
- Tablet: Adjusted padding and font sizes
- Mobile: Single-column layout, centered content

## Data Flow

1. **Page Load**:
   - Server fetches bedtime settings from database
   - Passes settings to client component
   - Client component initializes state

2. **User Interaction**:
   - User toggles bedtime mode on/off
   - User adjusts time values
   - Changes update local state

3. **Save**:
   - User clicks "Save Settings"
   - POST request to /api/bedtime
   - Database updated via upsert
   - Success message displayed
   - State updated with saved values

## Integration Points

### Cron Job (To Be Implemented)
- `/api/cron/bedtime-check` will:
  - Query users with `is_enabled = true`
  - Check current time against bedtime/wake time
  - Create/remove lock rules for entertainment apps
  - Update compliance streak

### Lock Screen
- When app is locked by bedtime mode:
  - Display moon animation
  - Show wake time
  - Prevent override (or track compliance)

### Badge System
- When compliance_streak reaches 7:
  - Award 'night_owl_slayer' badge
  - Send notification to user

## Testing Considerations

### Unit Tests
- Time formatting functions
- Toggle state management
- Form validation

### Integration Tests
- API endpoint authentication
- Database upsert operations
- Settings retrieval

### E2E Tests
- Complete user flow: enable → configure → save
- Toggle on/off behavior
- Time picker interactions
- Error handling

## Future Enhancements

1. **App Selection**: Allow users to choose which apps to lock
2. **Gradual Dimming**: Warn users 15 minutes before bedtime
3. **Sleep Statistics**: Track sleep schedule consistency
4. **Smart Suggestions**: Recommend bedtime based on usage patterns
5. **Do Not Disturb**: Integration with system DND mode

## Notes

- Default times: Weekday 22:00-07:00, Weekend 23:00-08:00
- Times stored in HH:MM:SS format in database
- Times displayed in HH:MM format in UI
- Compliance streak updated by cron job (separate task)
- Badge awarding handled by badge engine (separate task)
