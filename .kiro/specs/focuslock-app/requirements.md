# Requirements Document

## Introduction

FocusLock is a free, full-featured social media addiction reducer built as a web application (Next.js PWA) with browser extensions. The system enables users to hide and lock social media apps using various lock types (timer, schedule, date-based, nuclear), track usage patterns, build focus habits through gamification, receive AI-powered behavioral insights, and maintain accountability through buddy partnerships. The application addresses the problem that existing app blockers charge ₹500–₹1500/month for basic features while lacking key capabilities like app visibility hiding, social accountability, and AI coaching.

## Glossary

- **FocusLock_System**: The complete web application including frontend, backend APIs, database, and browser extensions
- **User**: A person who creates an account and manages their own app lock rules
- **Lock_Rule**: A configuration that defines when and how a specific app should be locked
- **App**: A social media or entertainment application that can be locked (e.g., Instagram, YouTube, TikTok)
- **Override**: The act of bypassing a lock rule before its scheduled unlock time
- **Buddy**: An accountability partner who monitors another user's lock rule compliance
- **Streak**: A count of consecutive days where a user maintains all lock rules without overrides
- **Badge**: A gamification reward earned by achieving specific milestones
- **Pomodoro_Session**: A focus work session using the Pomodoro Technique (25 min work / 5 min break cycles)
- **Nuclear_Mode**: A strict lock mode that completely disables the emergency override option
- **Mood_Prompt**: A friction layer that requires users to select their emotional state before overriding a lock
- **AI_Coach**: The Claude API-powered system that analyzes usage patterns and provides behavioral insights
- **Bedtime_Mode**: An automated lock mode that activates at a configured bedtime
- **Weekly_Challenge**: An auto-generated goal based on the user's worst-performing app from the previous week
- **Parent**: A user who manages lock rules for linked child accounts
- **Child_Profile**: A restricted account managed by a parent user
- **Browser_Extension**: Chrome/Firefox extension that syncs with FocusLock and blocks websites
- **Share_Card**: A visual progress report that can be shared on social media

## Requirements

### Requirement 1: User Authentication and Profile Management

**User Story:** As a new user, I want to create an account and manage my profile, so that I can securely access FocusLock across devices.

#### Acceptance Criteria

1. THE FocusLock_System SHALL provide authentication via magic link email
2. THE FocusLock_System SHALL provide authentication via Google OAuth
3. WHEN a user completes authentication, THE FocusLock_System SHALL create a profile record with user ID, full name, avatar URL, timezone, and creation timestamp
4. THE FocusLock_System SHALL default the timezone to 'Asia/Kolkata' for new profiles
5. WHEN a user updates their profile, THE FocusLock_System SHALL persist changes to full name, avatar URL, and timezone
6. THE FocusLock_System SHALL enforce row-level security so users can only access their own profile data

### Requirement 2: Lock Rule Creation and Management

**User Story:** As a user, I want to create and manage lock rules for specific apps, so that I can control when and how I access distracting applications.

#### Acceptance Criteria

1. WHEN a user creates a lock rule, THE FocusLock_System SHALL require app name and lock type
2. THE FocusLock_System SHALL support four lock types: 'timer', 'schedule', 'until_date', and 'nuclear'
3. WHEN lock type is 'timer', THE FocusLock_System SHALL require a daily limit in minutes
4. WHEN lock type is 'schedule', THE FocusLock_System SHALL require schedule start time, schedule end time, and selected days of the week
5. WHEN lock type is 'until_date', THE FocusLock_System SHALL require an unlock date
6. WHEN lock type is 'nuclear', THE FocusLock_System SHALL disable all override capabilities for that rule
7. THE FocusLock_System SHALL allow users to configure whether locked apps are hidden from the home grid
8. THE FocusLock_System SHALL allow users to configure whether locked apps are hidden from search
9. THE FocusLock_System SHALL allow users to enable strict mode on individual lock rules
10. WHEN a user updates a lock rule, THE FocusLock_System SHALL persist all changes with an updated timestamp
11. WHEN a user deletes a lock rule, THE FocusLock_System SHALL remove the rule and set associated override logs' lock_rule_id to NULL
12. THE FocusLock_System SHALL enforce row-level security so users can only access their own lock rules

### Requirement 3: Lock Status Evaluation

**User Story:** As a user, I want the system to accurately determine if an app is currently locked, so that I know when I can access it.

#### Acceptance Criteria

1. WHEN a lock rule is inactive, THE FocusLock_System SHALL return unlocked status
2. WHEN lock type is 'timer' and daily usage exceeds the daily limit, THE FocusLock_System SHALL return locked status with unlock time at midnight
3. WHEN lock type is 'schedule' and current time falls within the schedule window on a scheduled day, THE FocusLock_System SHALL return locked status with unlock time at schedule end
4. WHEN lock type is 'schedule' and current day is not in the schedule days list, THE FocusLock_System SHALL return unlocked status
5. WHEN lock type is 'until_date' and current date is before the unlock date, THE FocusLock_System SHALL return locked status with unlock time at the specified date
6. WHEN lock type is 'nuclear', THE FocusLock_System SHALL return locked status with no unlock time
7. THE FocusLock_System SHALL calculate lock status using the user's configured timezone
8. THE FocusLock_System SHALL provide a reason string explaining why an app is locked

### Requirement 4: Emergency Override with Mood Tracking

**User Story:** As a user, I want to override a lock in emergencies while recording my emotional state, so that I maintain awareness of my usage patterns.

#### Acceptance Criteria

1. WHEN a user attempts to override a non-nuclear lock, THE FocusLock_System SHALL display a mood prompt before allowing access
2. THE FocusLock_System SHALL provide mood options: 'bored', 'stressed', 'tired', 'news', and 'other'
3. THE FocusLock_System SHALL allow users to optionally provide a text reason for the override
4. WHEN a user completes the mood prompt, THE FocusLock_System SHALL log the override with user ID, lock rule ID, app name, mood, reason text, and timestamp
5. WHEN a user attempts to override a nuclear mode lock, THE FocusLock_System SHALL deny the override request
6. THE FocusLock_System SHALL enforce row-level security so users can only create override logs for their own account

### Requirement 5: Usage Session Tracking

**User Story:** As a user, I want the system to track how much time I spend on each app, so that I can see my actual usage patterns.

#### Acceptance Criteria

1. WHEN a usage session begins, THE FocusLock_System SHALL record user ID, app name, session start timestamp, and date
2. WHEN a usage session ends, THE FocusLock_System SHALL record session end timestamp and calculate minutes used
3. THE FocusLock_System SHALL aggregate daily usage minutes per app for lock evaluation
4. THE FocusLock_System SHALL enforce row-level security so users can only access their own usage sessions

### Requirement 6: Streak Tracking and Maintenance

**User Story:** As a user, I want to build and maintain a streak of compliant days, so that I stay motivated to follow my lock rules.

#### Acceptance Criteria

1. WHEN a user account is created, THE FocusLock_System SHALL initialize a streak record with current streak 0, longest streak 0, and no last active date
2. WHEN a user completes a day without any overrides, THE FocusLock_System SHALL increment the current streak by 1
3. WHEN current streak exceeds longest streak, THE FocusLock_System SHALL update longest streak to match current streak
4. WHEN a user logs an override, THE FocusLock_System SHALL reset current streak to 0
5. THE FocusLock_System SHALL update the last active date to the current date when streak is incremented
6. THE FocusLock_System SHALL run a daily cron job at midnight to check and update streaks for all users
7. THE FocusLock_System SHALL enforce row-level security so users can only access their own streak data

### Requirement 7: Badge System and Gamification

**User Story:** As a user, I want to earn badges for achieving milestones, so that I feel rewarded for maintaining good habits.

#### Acceptance Criteria

1. THE FocusLock_System SHALL maintain a master list of badge definitions with ID, name, description, icon, and condition
2. THE FocusLock_System SHALL include these badge definitions: 'quick_start', 'first_week', 'seven_day_warrior', 'iron_will', 'social_detox', 'night_owl_slayer', 'pomodoro_master'
3. WHEN a user achieves a badge condition, THE FocusLock_System SHALL award the badge by creating a user badge record with earned timestamp
4. THE FocusLock_System SHALL prevent duplicate badge awards for the same user and badge combination
5. WHEN a user views their badges, THE FocusLock_System SHALL display earned badges with earned date and locked badges with unlock conditions
6. THE FocusLock_System SHALL enforce row-level security so users can only access their own badge awards

### Requirement 8: Pomodoro Focus Sessions

**User Story:** As a user, I want to run Pomodoro focus sessions that automatically lock apps during work blocks, so that I can maintain deep focus.

#### Acceptance Criteria

1. WHEN a user starts a Pomodoro session, THE FocusLock_System SHALL record user ID, task label, work minutes, break minutes, sessions target, and start timestamp
2. THE FocusLock_System SHALL default to 25 minutes work and 5 minutes break
3. WHILE a work block is active, THE FocusLock_System SHALL keep all locked apps locked regardless of their normal schedule
4. WHILE a break block is active, THE FocusLock_System SHALL temporarily unlock apps
5. WHEN a work block completes, THE FocusLock_System SHALL increment sessions done counter
6. WHEN sessions done reaches sessions target, THE FocusLock_System SHALL mark the Pomodoro session as completed and record end timestamp
7. WHEN a user abandons a Pomodoro session, THE FocusLock_System SHALL mark the session status as abandoned
8. THE FocusLock_System SHALL enforce row-level security so users can only access their own Pomodoro sessions

### Requirement 9: Accountability Buddy System

**User Story:** As a user, I want to invite an accountability buddy who can monitor my lock rule compliance, so that I have social support for maintaining my goals.

#### Acceptance Criteria

1. WHEN a user invites a buddy, THE FocusLock_System SHALL create a buddy relationship with status 'pending' and invited timestamp
2. WHEN a buddy accepts an invitation, THE FocusLock_System SHALL update the relationship status to 'active' and record accepted timestamp
3. THE FocusLock_System SHALL allow buddies to select which lock rules they want to watch
4. WHEN a user overrides a watched lock rule, THE FocusLock_System SHALL create a buddy notification for the watching buddy
5. THE FocusLock_System SHALL send buddy notifications via Supabase Realtime
6. THE FocusLock_System SHALL allow buddies to view override logs for watched rules only
7. WHEN a buddy relationship is removed, THE FocusLock_System SHALL update status to 'removed'
8. THE FocusLock_System SHALL prevent users from modifying their buddy's lock rules
9. THE FocusLock_System SHALL enforce row-level security so buddies can only read override logs for active buddy relationships

### Requirement 10: AI Coaching and Behavioral Insights

**User Story:** As a user, I want to receive AI-powered insights about my usage patterns, so that I can understand and improve my behavior.

#### Acceptance Criteria

1. WHEN a user requests AI coaching, THE FocusLock_System SHALL retrieve override logs from the past 7 days
2. THE FocusLock_System SHALL send override data to Claude API with a coaching prompt
3. THE FocusLock_System SHALL request analysis of override patterns including time of day, mood, and app
4. THE FocusLock_System SHALL request one key insight limited to 2 sentences
5. THE FocusLock_System SHALL request one specific actionable suggestion
6. THE FocusLock_System SHALL request identification of the most common mood trigger
7. WHEN Claude API returns the analysis, THE FocusLock_System SHALL parse the JSON response containing insight, suggestion, and top mood
8. THE FocusLock_System SHALL display the AI coaching insights to the user with a warm, non-judgmental tone

### Requirement 11: Weekly Challenge Mode

**User Story:** As a user, I want to receive weekly challenges based on my worst-performing app, so that I have structured goals to improve my habits.

#### Acceptance Criteria

1. THE FocusLock_System SHALL run a cron job every Monday at 6:00 AM to generate weekly challenges
2. WHEN generating a challenge, THE FocusLock_System SHALL identify the user's worst-performing app from the previous week based on override count
3. THE FocusLock_System SHALL create a challenge with a specific daily limit goal for 5 days
4. THE FocusLock_System SHALL track daily progress for the active challenge
5. WHEN a user completes all 5 days of a challenge, THE FocusLock_System SHALL mark the challenge as completed
6. WHEN a challenge is completed, THE FocusLock_System SHALL award the 'iron_will' badge
7. THE FocusLock_System SHALL display challenge progress with day indicators for Monday through Friday

### Requirement 12: Bedtime Mode

**User Story:** As a user, I want to automatically lock entertainment apps at bedtime, so that I can maintain healthy sleep habits.

#### Acceptance Criteria

1. WHEN a user configures bedtime mode, THE FocusLock_System SHALL require a bedtime hour and minute
2. THE FocusLock_System SHALL allow users to configure different bedtime schedules for weekdays and weekends
3. WHEN the configured bedtime is reached, THE FocusLock_System SHALL automatically lock all entertainment apps
4. THE FocusLock_System SHALL unlock bedtime-locked apps at a configured wake time
5. THE FocusLock_System SHALL run a cron job to check and activate bedtime mode at configured times
6. WHEN a user views a bedtime-locked app, THE FocusLock_System SHALL display a moon animation and unlock time
7. WHEN a user maintains bedtime mode compliance for 7 consecutive days, THE FocusLock_System SHALL award the 'night_owl_slayer' badge

### Requirement 13: Nuclear Mode with Cooldown

**User Story:** As a user, I want to enable nuclear mode for critical focus periods, so that I cannot override my lock rules even in moments of weakness.

#### Acceptance Criteria

1. WHEN a user activates nuclear mode on a lock rule, THE FocusLock_System SHALL display a confirmation dialog
2. THE FocusLock_System SHALL require the user to type "I COMMIT" to confirm nuclear mode activation
3. WHEN nuclear mode is activated, THE FocusLock_System SHALL disable the emergency override button for that lock rule
4. WHEN a user attempts to deactivate nuclear mode, THE FocusLock_System SHALL enforce a 48-hour cooldown period
5. THE FocusLock_System SHALL display the remaining cooldown time when deactivation is attempted before cooldown expires
6. WHEN the 48-hour cooldown expires, THE FocusLock_System SHALL allow nuclear mode deactivation

### Requirement 14: Shareable Progress Card

**User Story:** As a user, I want to generate and share a visual progress card, so that I can celebrate my achievements on social media.

#### Acceptance Criteria

1. WHEN a user requests a progress card, THE FocusLock_System SHALL generate a card showing time saved this week, compliance percentage, current streak, and the FocusLock watermark
2. THE FocusLock_System SHALL render the progress card as a styled HTML page
3. THE FocusLock_System SHALL provide options to share the card to WhatsApp, Instagram Stories, or download as PNG
4. THE FocusLock_System SHALL include the app watermark 'focuslock.app' on all generated cards

### Requirement 15: Browser Extension Sync

**User Story:** As a user, I want a browser extension that syncs with my FocusLock account, so that I can block websites corresponding to my locked apps.

#### Acceptance Criteria

1. THE FocusLock_System SHALL provide a Chrome Extension using Manifest V3
2. THE FocusLock_System SHALL provide a Firefox WebExtension
3. WHEN a user installs the extension, THE FocusLock_System SHALL authenticate using an API token
4. THE Browser_Extension SHALL sync lock rules from the user's FocusLock account
5. WHEN an app is locked, THE Browser_Extension SHALL block the corresponding website domain
6. WHEN a user attempts to visit a blocked website, THE Browser_Extension SHALL display the same countdown UI as the web app
7. THE Browser_Extension SHALL update lock status in real-time based on schedule and timer rules

### Requirement 16: Family and Parental Controls

**User Story:** As a parent, I want to manage lock rules for my child's account, so that I can help them develop healthy digital habits.

#### Acceptance Criteria

1. WHEN a parent creates a child profile, THE FocusLock_System SHALL link the child account to the parent's account
2. THE FocusLock_System SHALL allow parents to create and modify lock rules for linked child accounts
3. THE FocusLock_System SHALL allow children to view but not modify parent-created lock rules
4. WHEN a child attempts to override a lock rule, THE FocusLock_System SHALL send a notification to the parent
5. THE FocusLock_System SHALL display child compliance statistics on the parent dashboard
6. THE FocusLock_System SHALL enforce row-level security so parents can only manage their own linked child accounts

### Requirement 17: Intention Prompt for Strict Rules

**User Story:** As a user, I want to be prompted to explain my intention before unlocking strict rules, so that I make more conscious decisions about app usage.

#### Acceptance Criteria

1. WHEN a user attempts to override a strict mode lock rule, THE FocusLock_System SHALL display a text input prompt asking "Why do you want to open this app right now?"
2. THE FocusLock_System SHALL require at least 10 characters of text input before allowing the override
3. WHEN the user submits the intention prompt, THE FocusLock_System SHALL save the reason text to the override log
4. THE AI_Coach SHALL reference recurring intention reasons in weekly insights

### Requirement 18: Statistics Dashboard

**User Story:** As a user, I want to view detailed statistics about my app usage, so that I can understand my patterns and progress.

#### Acceptance Criteria

1. WHEN a user views the statistics dashboard, THE FocusLock_System SHALL display a bar chart of daily usage by app for the current week
2. THE FocusLock_System SHALL display per-app breakdown showing total minutes used and override count
3. THE FocusLock_System SHALL display week-over-week comparison showing percentage change in usage
4. THE FocusLock_System SHALL display compliance percentage calculated as days without overrides divided by total days
5. THE FocusLock_System SHALL display total time saved calculated as locked time minus override time

### Requirement 19: Progressive Web App Support

**User Story:** As a user, I want to install FocusLock as a PWA on my device, so that I can access it like a native app with offline support.

#### Acceptance Criteria

1. THE FocusLock_System SHALL provide a PWA manifest file with app name, icons, theme color, and display mode
2. THE FocusLock_System SHALL implement a service worker for offline support
3. WHEN a user installs the PWA, THE FocusLock_System SHALL be accessible from the device home screen
4. THE FocusLock_System SHALL cache critical assets for offline access
5. WHEN the user is offline, THE FocusLock_System SHALL display cached lock rules and countdown screens

### Requirement 20: Onboarding Flow

**User Story:** As a new user, I want a guided onboarding experience, so that I can quickly set up my first lock rules and understand key features.

#### Acceptance Criteria

1. WHEN a new user completes authentication, THE FocusLock_System SHALL display a 3-step onboarding wizard
2. THE FocusLock_System SHALL guide the user to add their first lock rule in step 1
3. THE FocusLock_System SHALL explain the mood prompt and override system in step 2
4. THE FocusLock_System SHALL introduce the streak and badge system in step 3
5. WHEN a user completes onboarding within 10 minutes, THE FocusLock_System SHALL award the 'quick_start' badge
6. THE FocusLock_System SHALL allow users to skip onboarding and access the dashboard directly

### Requirement 21: Notification System

**User Story:** As a user, I want to receive notifications about important events, so that I stay informed about my lock status and buddy activity.

#### Acceptance Criteria

1. WHEN an app is about to unlock, THE FocusLock_System SHALL send a browser notification if the user has set a reminder
2. WHEN a buddy overrides a watched rule, THE FocusLock_System SHALL send a real-time notification to the watching buddy
3. WHEN a user breaks their streak, THE FocusLock_System SHALL send a notification to their buddy if one is configured
4. WHEN a user earns a new badge, THE FocusLock_System SHALL display an in-app notification
5. THE FocusLock_System SHALL allow users to configure notification preferences in settings

### Requirement 22: Data Export and Privacy

**User Story:** As a user, I want to export my data and control my privacy, so that I maintain ownership of my information.

#### Acceptance Criteria

1. WHEN a user requests data export, THE FocusLock_System SHALL generate a JSON file containing all lock rules, override logs, usage sessions, streaks, and badges
2. THE FocusLock_System SHALL allow users to delete their account and all associated data
3. WHEN a user deletes their account, THE FocusLock_System SHALL cascade delete all related records including profiles, lock rules, override logs, usage sessions, streaks, badges, buddy relationships, and Pomodoro sessions
4. THE FocusLock_System SHALL display a privacy policy explaining data collection and usage
5. THE FocusLock_System SHALL not share user data with third parties except for essential service providers (Supabase, Anthropic)
