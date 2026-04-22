-- FocusLock Development Seed Data
-- This file contains sample data for local development and testing
-- DO NOT run this in production!

-- Note: This assumes you have test users created via Supabase Auth
-- Replace these UUIDs with actual user IDs from your auth.users table

-- Sample user IDs (replace with actual IDs from your local Supabase)
-- User 1: test-user-1
-- User 2: test-user-2

-- ============================================================================
-- SAMPLE PROFILES
-- ============================================================================
-- Profiles are automatically created via auth trigger, but we can update them

-- UPDATE profiles SET 
--   full_name = 'Test User One',
--   timezone = 'America/New_York'
-- WHERE id = 'test-user-1-uuid';

-- UPDATE profiles SET 
--   full_name = 'Test User Two',
--   timezone = 'Asia/Kolkata'
-- WHERE id = 'test-user-2-uuid';

-- ============================================================================
-- SAMPLE LOCK RULES
-- ============================================================================
-- Uncomment and replace UUIDs to add sample lock rules

-- Timer lock: Instagram with 30 min daily limit
-- INSERT INTO lock_rules (user_id, app_name, app_icon_url, lock_type, daily_limit_minutes, hide_from_home, strict_mode)
-- VALUES (
--   'test-user-1-uuid',
--   'Instagram',
--   'https://example.com/instagram-icon.png',
--   'timer',
--   30,
--   true,
--   false
-- );

-- Schedule lock: YouTube blocked 9 AM - 5 PM on weekdays
-- INSERT INTO lock_rules (user_id, app_name, lock_type, schedule_start, schedule_end, schedule_days, hide_from_home)
-- VALUES (
--   'test-user-1-uuid',
--   'YouTube',
--   'schedule',
--   '09:00',
--   '17:00',
--   ARRAY['mon', 'tue', 'wed', 'thu', 'fri'],
--   true
-- );

-- Until date lock: TikTok locked until next week
-- INSERT INTO lock_rules (user_id, app_name, lock_type, unlock_date, hide_from_home, strict_mode)
-- VALUES (
--   'test-user-1-uuid',
--   'TikTok',
--   'until_date',
--   CURRENT_DATE + INTERVAL '7 days',
--   true,
--   true
-- );

-- Nuclear lock: Twitter completely locked
-- INSERT INTO lock_rules (user_id, app_name, lock_type, hide_from_home)
-- VALUES (
--   'test-user-1-uuid',
--   'Twitter',
--   'nuclear',
--   true
-- );

-- ============================================================================
-- SAMPLE OVERRIDE LOGS
-- ============================================================================
-- Sample overrides for testing AI coaching and stats

-- INSERT INTO override_logs (user_id, app_name, mood, reason_text, overridden_at)
-- VALUES 
--   ('test-user-1-uuid', 'Instagram', 'bored', 'Waiting for meeting to start', NOW() - INTERVAL '2 days'),
--   ('test-user-1-uuid', 'Instagram', 'stressed', 'Need a break from work', NOW() - INTERVAL '1 day'),
--   ('test-user-1-uuid', 'YouTube', 'tired', 'Too tired to focus on work', NOW() - INTERVAL '3 hours');

-- ============================================================================
-- SAMPLE USAGE SESSIONS
-- ============================================================================
-- Sample usage data for stats dashboard

-- INSERT INTO usage_sessions (user_id, app_name, session_start, session_end, date)
-- VALUES 
--   ('test-user-1-uuid', 'Instagram', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 45 minutes', CURRENT_DATE),
--   ('test-user-1-uuid', 'YouTube', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours 30 minutes', CURRENT_DATE),
--   ('test-user-1-uuid', 'Instagram', NOW() - INTERVAL '1 day 3 hours', NOW() - INTERVAL '1 day 2 hours', CURRENT_DATE - 1);

-- ============================================================================
-- SAMPLE BUDDY RELATIONSHIP
-- ============================================================================
-- Create an active buddy relationship

-- INSERT INTO buddies (user_id, buddy_user_id, status, accepted_at)
-- VALUES (
--   'test-user-1-uuid',
--   'test-user-2-uuid',
--   'active',
--   NOW() - INTERVAL '7 days'
-- );

-- ============================================================================
-- SAMPLE POMODORO SESSION
-- ============================================================================
-- Completed Pomodoro session

-- INSERT INTO pomodoro_sessions (user_id, task_label, work_minutes, break_minutes, sessions_target, sessions_done, status, started_at, ended_at)
-- VALUES (
--   'test-user-1-uuid',
--   'Write project documentation',
--   25,
--   5,
--   4,
--   4,
--   'completed',
--   NOW() - INTERVAL '2 hours',
--   NOW() - INTERVAL '30 minutes'
-- );

-- ============================================================================
-- SAMPLE WEEKLY CHALLENGE
-- ============================================================================
-- Active weekly challenge

-- INSERT INTO weekly_challenges (user_id, app_name, daily_limit, week_start, week_end, days_completed, status)
-- VALUES (
--   'test-user-1-uuid',
--   'Instagram',
--   20,
--   DATE_TRUNC('week', CURRENT_DATE),
--   DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days',
--   2,
--   'active'
-- );

-- ============================================================================
-- AWARD SAMPLE BADGES
-- ============================================================================
-- Award some badges to test user

-- SELECT award_badge('test-user-1-uuid', 'quick_start');
-- SELECT award_badge('test-user-1-uuid', 'first_week');

-- ============================================================================
-- NOTES
-- ============================================================================
-- To use this seed file:
-- 1. Create test users via Supabase Auth UI or API
-- 2. Get their UUIDs from auth.users table
-- 3. Replace 'test-user-1-uuid' and 'test-user-2-uuid' with actual UUIDs
-- 4. Uncomment the sections you want to seed
-- 5. Run: psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed.sql
