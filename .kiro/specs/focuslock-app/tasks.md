# Implementation Plan: FocusLock

## Overview

This implementation plan breaks down the FocusLock application into discrete coding tasks following the 10-week build roadmap. The plan covers all 22 requirements and implements the complete architecture including Next.js frontend, Supabase backend, browser extensions, PWA configuration, and comprehensive testing with 34 property-based tests.

The implementation follows a phased approach:
- Phase 1: Core features (auth, lock rules, countdown)
- Phase 2: Engagement (mood prompt, streaks, badges, stats, Pomodoro)
- Phase 3: Social & AI (buddy system, AI coaching, challenges, share cards)
- Phase 4: Power features (nuclear mode, bedtime, family mode, browser extension)
- Phase 5: Polish (intention prompt, onboarding, dark mode, performance)

## Tasks

- [ ] 1. Project setup and infrastructure
  - [x] 1.1 Initialize Next.js 14 project with App Router
    - Create Next.js project with TypeScript
    - Configure app directory structure
    - Set up ESLint and Prettier
    - _Requirements: All_

  - [x] 1.2 Set up Supabase project and database schema
    - Create Supabase project
    - Write and apply database migrations (profiles, lock_rules, override_logs, usage_sessions, streaks, badges, buddies, pomodoro_sessions, weekly_challenges, child_profiles)
    - Configure row-level security policies
    - Seed badge_definitions table
    - _Requirements: 1.1-1.6, 2.1-2.12, 4.1-4.6, 5.1-5.4, 6.1-6.7, 7.1-7.6, 8.1-8.7, 9.1-9.9, 11.1-11.7, 16.1-16.6_

  - [x] 1.3 Configure Supabase authentication
    - Set up magic link email authentication
    - Configure Google OAuth provider
    - Create auth callback route
    - Implement middleware for route protection
    - _Requirements: 1.1, 1.2_

  - [x] 1.4 Set up environment variables and configuration
    - Create .env.local template
    - Configure Supabase client
    - Set up Anthropic API key for Claude
    - Configure Vercel deployment settings
    - _Requirements: All_

  - [x] 1.5 Write property tests for database schema constraints
    - **Property 3: Lock Rule Validation by Type**
    - **Validates: Requirements 2.1, 2.3, 2.4, 2.5, 2.6**

- [ ] 2. Core business logic implementation
  - [x] 2.1 Implement lockEvaluator module
    - Write evaluateLock function with support for all lock types (timer, schedule, until_date, nuclear)
    - Implement timezone conversion utilities
    - Handle edge cases (inactive rules, midnight rollover, DST transitions)
    - _Requirements: 3.1-3.8_

  - [x] 2.2 Write property tests for lockEvaluator
    - **Property 7: Timer Lock Evaluation**
    - **Validates: Requirements 3.2**
    - **Property 8: Schedule Lock Evaluation**
    - **Validates: Requirements 3.3, 3.4**
    - **Property 9: Until-Date Lock Evaluation**
    - **Validates: Requirements 3.5**
    - **Property 10: Lock Evaluation Timezone Consistency**
    - **Validates: Requirements 3.7**
    - **Property 11: Lock Status Reason Presence**
    - **Validates: Requirements 3.8**

  - [x] 2.3 Implement streakManager module
    - Write checkAndUpdateStreaks function for daily cron
    - Implement incrementStreak and resetStreak functions
    - Add streak badge checking logic
    - _Requirements: 6.1-6.7_

  - [x] 2.4 Write property tests for streakManager
    - **Property 16: Streak Increment Without Override**
    - **Validates: Requirements 6.2**
    - **Property 17: Longest Streak Invariant**
    - **Validates: Requirements 6.3**
    - **Property 18: Streak Reset on Override**
    - **Validates: Requirements 6.4**
    - **Property 19: Streak Last Active Date Update**
    - **Validates: Requirements 6.5**

  - [x] 2.5 Implement badgeEngine module
    - Write checkAndAwardBadges function
    - Implement evaluateBadgeCondition for all 7 badge types
    - Add awardBadge function with duplicate prevention
    - _Requirements: 7.1-7.6_

  - [x] 2.6 Write property tests for badgeEngine
    - **Property 20: Badge Award Idempotence**
    - **Validates: Requirements 7.4**
    - **Property 21: Badge Award on Condition Met**
    - **Validates: Requirements 7.3**

  - [x] 2.7 Implement aiCoach module
    - Write generateInsights function
    - Implement buildCoachingPrompt with pattern analysis
    - Add callClaudeAPI with error handling and rate limiting
    - Implement caching for insights (24-hour TTL)
    - _Requirements: 10.1-10.8_

- [x] 3. Checkpoint - Core logic validation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. API routes implementation
  - [x] 4.1 Implement lock rules API
    - Create GET /api/rules (fetch all user rules)
    - Create POST /api/rules (create new rule with validation)
    - Create PUT /api/rules/[id] (update rule)
    - Create DELETE /api/rules/[id] (delete with cascade)
    - Add Zod schema validation
    - _Requirements: 2.1-2.12_

  - [ ] 4.2 Write property tests for lock rules API
    - **Property 4: Lock Rule Configuration Persistence**
    - **Validates: Requirements 2.7, 2.8, 2.9**
    - **Property 5: Lock Rule Update Round-Trip**
    - **Validates: Requirements 2.10**
    - **Property 6: Lock Rule Deletion Cascade**
    - **Validates: Requirements 2.11**

  - [ ] 4.3 Implement override API
    - Create POST /api/override (log override with mood)
    - Integrate with streakManager to reset streak
    - Trigger buddy notifications via Supabase Realtime
    - _Requirements: 4.1-4.6_

  - [ ] 4.4 Write property tests for override API
    - **Property 12: Override Log Completeness**
    - **Validates: Requirements 4.4**

  - [ ] 4.5 Implement usage sessions API
    - Create POST /api/usage/start (start session)
    - Create POST /api/usage/end (end session and calculate duration)
    - Create GET /api/usage/daily (aggregate daily usage)
    - _Requirements: 5.1-5.4_

  - [ ] 4.6 Write property tests for usage sessions
    - **Property 13: Usage Session Start Recording**
    - **Validates: Requirements 5.1**
    - **Property 14: Usage Session Duration Calculation**
    - **Validates: Requirements 5.2**
    - **Property 15: Daily Usage Aggregation**
    - **Validates: Requirements 5.3**

  - [ ] 4.7 Implement streak API
    - Create GET /api/streak (fetch user streak)
    - Create POST /api/streak/check (cron endpoint for daily checks)
    - Add authentication check for cron secret
    - _Requirements: 6.1-6.7_

  - [ ] 4.8 Implement stats API
    - Create GET /api/stats (weekly aggregated statistics)
    - Calculate daily usage by app, per-app breakdown, week-over-week comparison, compliance percentage, time saved
    - _Requirements: 18.1-18.5_

  - [ ] 4.9 Write property tests for stats calculations
    - **Property 33: Statistics Calculation Accuracy**
    - **Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5**

  - [ ] 4.10 Implement AI coach API
    - Create POST /api/ai-coach (generate insights)
    - Integrate with aiCoach module
    - Add rate limiting (1 request/hour per user)
    - _Requirements: 10.1-10.8_

  - [ ] 4.11 Implement buddy API
    - Create POST /api/buddy/invite (send invitation)
    - Create POST /api/buddy/accept (accept invitation)
    - Create POST /api/buddy/notify (fire notifications)
    - Create GET /api/buddy/notifications (fetch notifications)
    - _Requirements: 9.1-9.9_

  - [ ] 4.12 Write property tests for buddy system
    - **Property 25: Buddy Relationship Initial State**
    - **Validates: Requirements 9.1**
    - **Property 26: Buddy Relationship State Transition**
    - **Validates: Requirements 9.2**
    - **Property 27: Buddy Rules Watching Persistence**
    - **Validates: Requirements 9.3**
    - **Property 28: Buddy Notification Creation**
    - **Validates: Requirements 9.4**

  - [ ] 4.13 Implement Pomodoro API
    - Create POST /api/pomodoro/start (start session)
    - Create POST /api/pomodoro/complete-block (increment sessions_done)
    - Create POST /api/pomodoro/end (mark completed or abandoned)
    - _Requirements: 8.1-8.7_

  - [ ] 4.14 Write property tests for Pomodoro sessions
    - **Property 22: Pomodoro Session Recording**
    - **Validates: Requirements 8.1**
    - **Property 23: Pomodoro Session Counter Increment**
    - **Validates: Requirements 8.5**
    - **Property 24: Pomodoro Session Completion**
    - **Validates: Requirements 8.6**

  - [ ] 4.15 Implement weekly challenge API
    - Create POST /api/challenge/generate (cron endpoint)
    - Create GET /api/challenge/current (fetch active challenge)
    - Create POST /api/challenge/update-progress (daily progress tracking)
    - _Requirements: 11.1-11.7_

  - [ ] 4.16 Write property tests for weekly challenges
    - **Property 29: Worst App Identification**
    - **Validates: Requirements 11.2**
    - **Property 30: Weekly Challenge Structure**
    - **Validates: Requirements 11.3**
    - **Property 31: Challenge Progress Tracking**
    - **Validates: Requirements 11.4**
    - **Property 32: Challenge Completion Status**
    - **Validates: Requirements 11.5**

  - [ ] 4.17 Implement share card API
    - Create GET /api/share-card (generate shareable stats card)
    - Return JSON with time saved, compliance %, streak, watermark
    - _Requirements: 14.1-14.4_

  - [ ] 4.18 Implement family mode API
    - Create POST /api/family/add-child (link child account)
    - Create GET /api/family/children (list child accounts)
    - Create GET /api/family/child-stats (child compliance stats)
    - _Requirements: 16.1-16.6_

  - [ ] 4.19 Implement data export API
    - Create GET /api/export (generate JSON export of all user data)
    - Include lock_rules, override_logs, usage_sessions, streaks, badges, buddies, pomodoro_sessions
    - _Requirements: 22.1-22.5_

  - [ ] 4.20 Write property tests for data export
    - **Property 34: Data Export Completeness**
    - **Validates: Requirements 22.1**

- [ ] 5. Checkpoint - API layer validation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Frontend components implementation
  - [ ] 6.1 Create AppGrid component
    - Display apps in grid layout
    - Filter hidden apps based on lock rules
    - Show lock badge overlay on locked apps
    - _Requirements: 2.7, 2.8_

  - [ ] 6.2 Create LockCard component
    - Display app icon, name, and lock status
    - Visual states for different lock types
    - Click handler to navigate to countdown screen
    - _Requirements: 3.1-3.8_

  - [ ] 6.3 Create CountdownRing component
    - SVG-based circular progress indicator
    - Animate countdown to unlock time
    - Display time remaining in human-readable format
    - _Requirements: 3.1-3.8_

  - [ ] 6.4 Create MoodPrompt component
    - Modal dialog with mood selection buttons (bored, stressed, tired, news, other)
    - Optional textarea for reason text
    - Validation for strict mode (minimum 10 characters)
    - _Requirements: 4.1-4.6, 17.1-17.4_

  - [ ] 6.5 Create RuleBuilder component
    - Multi-step form for creating/editing lock rules
    - Dynamic fields based on selected lock_type
    - Validation for schedule times, daily limits, unlock dates
    - Visibility and strict mode toggles
    - _Requirements: 2.1-2.12_

  - [ ] 6.6 Create PomodoroTimer component
    - Work/break cycle timer with visual ring
    - Session counter display
    - Start, pause, abandon controls
    - _Requirements: 8.1-8.7_

  - [ ] 6.7 Create StatsChart component
    - Bar chart showing daily usage by app
    - Week-over-week comparison
    - Per-app breakdown table
    - _Requirements: 18.1-18.5_

  - [ ] 6.8 Create BadgeCard component
    - Display badge icon, name, description
    - Visual states: earned (color), locked (grayscale)
    - Show earned date or unlock condition
    - _Requirements: 7.1-7.6_

  - [ ] 6.9 Create StreakDots component
    - Visual representation of last 7 days
    - Display current and longest streak numbers
    - _Requirements: 6.1-6.7_

  - [ ] 6.10 Create BuddyPanel component
    - List of active buddies with status indicators
    - Invite form with email input
    - Rule selection checkboxes for watching
    - _Requirements: 9.1-9.9_

  - [ ] 6.11 Create AIInsightCard component
    - Display Claude-generated insights
    - Mood pattern visualization (bar chart)
    - Actionable suggestion with CTA button
    - _Requirements: 10.1-10.8_

  - [ ] 6.12 Create ShareCard component
    - Generate shareable progress image
    - Show time saved, compliance %, streak
    - Include FocusLock watermark
    - Export options: WhatsApp, Instagram, PNG download
    - _Requirements: 14.1-14.4_

- [ ] 7. Frontend pages implementation
  - [ ] 7.1 Create login page (/login)
    - Magic link email form
    - Google OAuth button
    - Redirect to dashboard after auth
    - _Requirements: 1.1, 1.2_

  - [ ] 7.2 Create auth callback route (/callback)
    - Handle Supabase auth callback
    - Create profile record if new user
    - Redirect to onboarding or dashboard
    - _Requirements: 1.3, 1.4_

  - [ ] 7.3 Write property tests for profile creation
    - **Property 1: Profile Creation Completeness**
    - **Validates: Requirements 1.3**
    - **Property 2: Profile Update Round-Trip**
    - **Validates: Requirements 1.5**

  - [ ] 7.4 Create dashboard page (/dashboard)
    - Display AppGrid with locked/unlocked apps
    - Show current streak and badges summary
    - Quick actions: add rule, start Pomodoro
    - _Requirements: 2.1-2.12, 3.1-3.8, 6.1-6.7, 7.1-7.6_

  - [ ] 7.5 Create lock screen page (/lock/[appId])
    - Display CountdownRing with time remaining
    - Show lock type badge and reason
    - Emergency override button (if not nuclear mode)
    - Set reminder button for unlock notification
    - _Requirements: 3.1-3.8, 4.1-4.6, 13.1-13.6_

  - [ ] 7.6 Create add lock rule page (/rules/new)
    - Render RuleBuilder component
    - Handle form submission to POST /api/rules
    - Redirect to dashboard on success
    - _Requirements: 2.1-2.12_

  - [ ] 7.7 Create edit lock rule page (/rules/[id])
    - Fetch existing rule data
    - Render RuleBuilder with initial values
    - Handle form submission to PUT /api/rules/[id]
    - Add delete button with confirmation
    - _Requirements: 2.1-2.12_

  - [ ] 7.8 Create Pomodoro page (/focus)
    - Render PomodoroTimer component
    - Display task label input
    - Show active session progress
    - Lock all apps during work blocks
    - _Requirements: 8.1-8.7_

  - [ ] 7.9 Create stats dashboard page (/stats)
    - Render StatsChart component
    - Display per-app breakdown table
    - Show week-over-week comparison
    - Display compliance percentage and time saved
    - _Requirements: 18.1-18.5_

  - [ ] 7.10 Create badges page (/badges)
    - Display StreakDots component
    - Render grid of BadgeCard components (earned and locked)
    - Show badge descriptions and unlock conditions
    - _Requirements: 6.1-6.7, 7.1-7.6_

  - [ ] 7.11 Create AI coach page (/ai-coach)
    - Render AIInsightCard component
    - Display mood pattern chart
    - Show actionable suggestions
    - Add "Generate New Insights" button (rate limited)
    - _Requirements: 10.1-10.8_

  - [ ] 7.12 Create buddy page (/buddy)
    - Render BuddyPanel component
    - Display buddy notifications list
    - Show watched rules for each buddy
    - _Requirements: 9.1-9.9_

  - [ ] 7.13 Create share page (/share)
    - Render ShareCard component
    - Fetch weekly stats from API
    - Provide share buttons (WhatsApp, Instagram, download)
    - _Requirements: 14.1-14.4_

  - [ ] 7.14 Create weekly challenge page (/challenge)
    - Display active challenge progress
    - Show day-dot row (M T W T F) with completion status
    - Display challenge goal and current progress
    - _Requirements: 11.1-11.7_

  - [ ] 7.15 Create bedtime mode page (/bedtime)
    - Bedtime schedule configuration form
    - Separate settings for weekdays and weekends
    - Display bedtime compliance streak
    - _Requirements: 12.1-12.7_

  - [ ] 7.16 Create family mode page (/family)
    - Add child profile form
    - List child accounts with compliance stats
    - Display child override notifications
    - _Requirements: 16.1-16.6_

  - [ ] 7.17 Create settings page (/settings)
    - Profile update form (name, avatar, timezone)
    - Notification preferences
    - Data export button
    - Account deletion button with confirmation
    - _Requirements: 1.5, 21.1-21.5, 22.1-22.5_

- [ ] 8. Checkpoint - Frontend integration validation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Vercel Cron jobs implementation
  - [ ] 9.1 Create daily streak check cron (/api/cron/streak-check)
    - Schedule: 0 0 * * * (midnight UTC)
    - Call streakManager.checkAndUpdateStreaks()
    - Send buddy notifications for broken streaks
    - Authenticate with CRON_SECRET
    - _Requirements: 6.6_

  - [ ] 9.2 Create weekly challenge generation cron (/api/cron/generate-challenges)
    - Schedule: 0 6 * * 1 (Monday 6 AM UTC)
    - Identify worst app from previous week
    - Create new challenge with 5-day goal
    - Send notification to user
    - _Requirements: 11.1-11.7_

  - [ ] 9.3 Create bedtime mode check cron (/api/cron/bedtime-check)
    - Schedule: */15 * * * * (every 15 minutes)
    - Check users with bedtime mode enabled
    - Activate/deactivate locks at configured times
    - _Requirements: 12.1-12.7_

  - [ ] 9.4 Create weekly AI insights cron (/api/cron/weekly-insights)
    - Schedule: 0 9 * * 1 (Monday 9 AM UTC)
    - Generate AI insights for active users
    - Cache insights for dashboard display
    - _Requirements: 10.1-10.8_

  - [ ] 9.5 Configure vercel.json with cron schedules
    - Add all 4 cron job configurations
    - Set up environment variables for CRON_SECRET
    - _Requirements: 6.6, 11.1, 12.1, 10.1_

- [ ] 10. Browser extension implementation
  - [ ] 10.1 Create Chrome extension manifest (Manifest V3)
    - Define permissions: storage, alarms, tabs
    - Configure host_permissions for all URLs
    - Set up background service worker
    - Configure content scripts
    - _Requirements: 15.1-15.7_

  - [ ] 10.2 Implement background service worker
    - Sync lock rules from FocusLock API every 5 minutes
    - Evaluate lock status for current tab
    - Manage alarms for scheduled unlocks
    - Handle messages from content script and popup
    - _Requirements: 15.4, 15.5, 15.7_

  - [ ] 10.3 Implement content script
    - Intercept page load for locked domains
    - Replace page with countdown UI
    - Listen for unlock events from background
    - Handle mood prompt for overrides
    - _Requirements: 15.6, 15.7_

  - [ ] 10.4 Implement popup UI
    - Show current lock status
    - Quick toggle for rules
    - Link to web app dashboard
    - Sync status indicator
    - _Requirements: 15.1-15.7_

  - [ ] 10.5 Create Firefox WebExtension version
    - Adapt manifest for Firefox compatibility
    - Test cross-browser compatibility
    - _Requirements: 15.2_

  - [ ] 10.6 Implement extension authentication
    - API token generation and storage
    - Secure token storage in encrypted storage
    - Token refresh mechanism
    - _Requirements: 15.3_

- [ ] 11. PWA configuration
  - [ ] 11.1 Create PWA manifest (public/manifest.json)
    - Define app name, short_name, description
    - Configure icons (192x192, 512x512)
    - Set display mode to standalone
    - Set theme and background colors
    - _Requirements: 19.1_

  - [ ] 11.2 Implement service worker
    - Cache strategy: Network-first for API, Cache-first for static assets
    - Offline fallback for lock rules and countdown screens
    - Background sync for queued override logs
    - _Requirements: 19.2, 19.4, 19.5_

  - [ ] 11.3 Configure Next.js for PWA
    - Install next-pwa package
    - Configure next.config.js
    - Test PWA installation on mobile devices
    - _Requirements: 19.3_

- [ ] 12. Onboarding flow implementation
  - [ ] 12.1 Create onboarding wizard component
    - 3-step wizard: add first rule, explain mood prompt, introduce streaks/badges
    - Progress indicator
    - Skip button
    - _Requirements: 20.1-20.6_

  - [ ] 12.2 Integrate onboarding with auth callback
    - Show onboarding for new users
    - Track onboarding completion time
    - Award quick_start badge if completed within 10 minutes
    - _Requirements: 20.1, 20.5_

- [ ] 13. Notification system implementation
  - [ ] 13.1 Implement browser notifications
    - Request notification permission
    - Send notification when app is about to unlock
    - Send notification when buddy overrides watched rule
    - Send notification when user earns new badge
    - _Requirements: 21.1-21.5_

  - [ ] 13.2 Implement Supabase Realtime subscriptions
    - Subscribe to buddy_notifications table
    - Display real-time notifications in UI
    - Mark notifications as read
    - _Requirements: 9.5, 21.2, 21.3_

  - [ ] 13.3 Create notification preferences UI
    - Toggle for each notification type
    - Save preferences to user profile
    - _Requirements: 21.5_

- [ ] 14. Styling and UI polish
  - [ ] 14.1 Create global CSS styles
    - Define color palette and typography
    - Create utility classes
    - Set up CSS variables for theming
    - _Requirements: All_

  - [ ] 14.2 Implement dark mode support
    - Create dark mode color scheme
    - Add theme toggle in settings
    - Persist theme preference
    - _Requirements: All_

  - [ ] 14.3 Create component-specific CSS
    - dashboard.css, lock.css, stats.css, focus.css, family.css
    - Ensure responsive design for mobile, tablet, desktop
    - _Requirements: All_

  - [ ] 14.4 Add animations and transitions
    - Countdown ring animation
    - Badge unlock animation
    - Page transitions
    - _Requirements: All_

- [ ] 15. Checkpoint - Full feature validation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Integration testing
  - [ ] 16.1 Write integration tests for API routes
    - Test all API endpoints with database interactions
    - Test RLS policies with different user contexts
    - Test authentication flows
    - Test Realtime subscriptions

  - [ ] 16.2 Write integration tests for cron jobs
    - Test streak check cron with mock data
    - Test challenge generation cron
    - Test bedtime mode cron
    - Test AI insights cron

- [ ] 17. End-to-end testing
  - [ ] 17.1 Write E2E tests for critical user flows
    - Test onboarding flow
    - Test creating lock rule
    - Test override flow with mood prompt
    - Test Pomodoro session
    - Test buddy invitation and notification
    - Test PWA installation

  - [ ] 17.2 Write E2E tests for browser extension
    - Test extension installation and authentication
    - Test website blocking for locked apps
    - Test countdown UI in extension
    - Test sync with web app

- [ ] 18. Security hardening
  - [ ] 18.1 Implement Content Security Policy
    - Configure CSP headers in next.config.js
    - Add X-Frame-Options, X-Content-Type-Options headers
    - _Requirements: All_

  - [ ] 18.2 Add input validation with Zod
    - Create Zod schemas for all API inputs
    - Validate all user inputs
    - _Requirements: All_

  - [ ] 18.3 Implement rate limiting
    - Add rate limiting middleware (100 req/min per user)
    - Add rate limiting for AI coach (1 req/hour per user)
    - _Requirements: 10.1-10.8_

  - [ ] 18.4 Audit and fix security vulnerabilities
    - Run npm audit and fix vulnerabilities
    - Review RLS policies for gaps
    - Test authentication edge cases
    - _Requirements: All_

- [ ] 19. Performance optimization
  - [ ] 19.1 Implement code splitting
    - Dynamic imports for heavy components (charts, AI coach)
    - Lazy loading for below-the-fold content
    - _Requirements: All_

  - [ ] 19.2 Optimize images
    - Use Next.js Image component
    - Convert images to WebP format
    - Implement lazy loading for app icons
    - _Requirements: All_

  - [ ] 19.3 Implement caching strategies
    - Configure SWR for lock rules (5-minute cache)
    - Cache AI insights (24-hour TTL)
    - Configure static asset caching headers
    - _Requirements: All_

  - [ ] 19.4 Optimize database queries
    - Add indexes on frequently queried columns
    - Review and optimize slow queries
    - Implement pagination for large result sets
    - _Requirements: All_

- [ ] 20. Deployment and monitoring
  - [ ] 20.1 Deploy to Vercel
    - Connect GitHub repository
    - Configure environment variables
    - Set up production domain
    - _Requirements: All_

  - [ ] 20.2 Configure monitoring and error tracking
    - Set up Vercel Analytics
    - Integrate Sentry for error tracking
    - Configure custom metrics tracking
    - _Requirements: All_

  - [ ] 20.3 Set up health checks and uptime monitoring
    - Create /api/health endpoint
    - Configure external uptime monitoring (UptimeRobot)
    - _Requirements: All_

  - [ ] 20.4 Deploy browser extensions
    - Package Chrome extension and upload to Chrome Web Store
    - Package Firefox extension and upload to Firefox Add-ons
    - _Requirements: 15.1, 15.2_

- [ ] 21. Documentation and final polish
  - [ ] 21.1 Write README with setup instructions
    - Document environment variables
    - Document database setup
    - Document deployment process
    - _Requirements: All_

  - [ ] 21.2 Create user documentation
    - Write help articles for key features
    - Create video tutorials for onboarding
    - _Requirements: All_

  - [ ] 21.3 Perform final QA testing
    - Test all features on production
    - Test cross-browser compatibility
    - Test mobile responsiveness
    - _Requirements: All_

  - [ ] 21.4 Performance audit
    - Run Lighthouse audit (target score ≥90)
    - Optimize Core Web Vitals (LCP <2.5s, FID <100ms, CLS <0.1)
    - _Requirements: All_

- [ ] 22. Final checkpoint - Production readiness
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Integration and E2E tests validate system behavior and critical user flows
- The implementation follows the 10-week roadmap from the PRD
- All 34 correctness properties from the design document are covered by property tests
- Browser extension and PWA features enable cross-platform usage
- Comprehensive monitoring and security hardening ensure production readiness

