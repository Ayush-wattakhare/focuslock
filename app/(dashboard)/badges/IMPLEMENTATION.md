# Badges Page Implementation

## Overview

The badges page (`/badges`) displays the user's earned and locked badges along with their streak visualization. This page implements requirements 6.1-6.7 (streak tracking) and 7.1-7.6 (badge system).

## Architecture

### Server Component: `page.tsx`

**Purpose**: Fetch data from Supabase and pass to client component

**Data Fetched**:
1. User authentication status (redirects to login if not authenticated)
2. Streak data from `streaks` table
3. All badge definitions from `badge_definitions` table
4. User's earned badges from `user_badges` table

**Flow**:
```
User visits /badges
  → Check authentication (redirect if not logged in)
  → Fetch streak data
  → Fetch all badge definitions
  → Fetch user's earned badges
  → Pass data to BadgesClient
```

### Client Component: `BadgesClient.tsx`

**Purpose**: Render the badges UI with interactive elements

**Features**:
1. **Streak Visualization**: Uses `StreakDots` component to display current and longest streak
2. **Badge Grid**: Displays badges in a responsive grid layout
3. **Earned Badges Section**: Shows badges the user has earned with earned dates
4. **Locked Badges Section**: Shows badges the user hasn't earned yet with unlock conditions
5. **Empty State**: Displays message when no badges are available

**Data Processing**:
- Creates a map of earned badge IDs to earned dates for quick lookup
- Separates badges into earned and locked categories
- Passes appropriate props to `BadgeCard` components

## Components Used

### StreakDots Component
- **Location**: `components/features/StreakDots.tsx`
- **Props**: 
  - `currentStreak: number` - Current consecutive days streak
  - `longestStreak: number` - Longest streak ever achieved
- **Purpose**: Visual representation of user's streak progress

### BadgeCard Component
- **Location**: `components/features/BadgeCard.tsx`
- **Props**:
  - `badge: BadgeDefinition` - Badge definition with id, name, description, icon, condition
  - `earned: boolean` - Whether the badge is earned or locked
  - `earnedAt?: Date` - Date when badge was earned (for earned badges)
- **Purpose**: Display individual badge with appropriate visual state

## Database Schema

### Tables Used

1. **streaks**
   - `user_id`: UUID (FK to profiles)
   - `current_streak`: number
   - `longest_streak`: number
   - `last_active_date`: timestamp
   - `updated_at`: timestamp

2. **badge_definitions**
   - `id`: text (PK) - Badge identifier
   - `name`: text - Display name
   - `description`: text - Badge description
   - `icon`: text - Emoji or icon
   - `condition`: text - Unlock condition description

3. **user_badges**
   - `id`: UUID (PK)
   - `user_id`: UUID (FK to profiles)
   - `badge_id`: text (FK to badge_definitions)
   - `earned_at`: timestamp

## Requirements Mapping

### Streak Requirements (6.1-6.7)
- **6.1**: Streak data initialized with current_streak 0, longest_streak 0
- **6.2**: Current streak incremented by 1 for compliant days
- **6.3**: Longest streak updated when current exceeds it
- **6.4**: Current streak reset to 0 on override
- **6.5**: Last active date updated when streak is incremented
- **6.6**: Daily cron job checks and updates streaks
- **6.7**: Row-level security enforced on streaks table

### Badge Requirements (7.1-7.6)
- **7.1**: Badge definitions include ID, name, description, icon, and condition
- **7.2**: Seven badge types defined: quick_start, first_week, seven_day_warrior, iron_will, social_detox, night_owl_slayer, pomodoro_master
- **7.3**: Badges awarded when conditions are met (handled by badgeEngine)
- **7.4**: Duplicate badge awards prevented by UNIQUE constraint
- **7.5**: Earned badges show earned date, locked badges show unlock conditions
- **7.6**: Row-level security enforced on user_badges table

## Styling

The page uses:
- Gradient background for visual appeal
- Responsive grid layout for badges
- Separate sections for earned and locked badges
- Mobile-responsive design with breakpoints at 768px and 480px
- Consistent spacing and typography

## Authentication

- Page requires authentication
- Redirects to `/login` if user is not authenticated
- Uses Supabase server client for secure data fetching

## Future Enhancements

1. Real-time badge updates using Supabase Realtime
2. Badge unlock animations
3. Share badge achievements on social media
4. Badge progress indicators for locked badges
5. Filter/sort options for badges
6. Badge categories or collections
