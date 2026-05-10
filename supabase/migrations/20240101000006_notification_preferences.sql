-- ============================================================================
-- NOTIFICATION PREFERENCES MIGRATION
-- ============================================================================
-- Add notification preference columns to profiles table
-- Requirements: 21.5

ALTER TABLE profiles
ADD COLUMN notify_unlock BOOLEAN DEFAULT false,
ADD COLUMN notify_buddy_override BOOLEAN DEFAULT false,
ADD COLUMN notify_streak_broken BOOLEAN DEFAULT false,
ADD COLUMN notify_badge_earned BOOLEAN DEFAULT true;

COMMENT ON COLUMN profiles.notify_unlock IS 'Send notification when app is about to unlock';
COMMENT ON COLUMN profiles.notify_buddy_override IS 'Send notification when buddy overrides watched rule';
COMMENT ON COLUMN profiles.notify_streak_broken IS 'Send notification to buddy when user breaks streak';
COMMENT ON COLUMN profiles.notify_badge_earned IS 'Send notification when user earns new badge';
