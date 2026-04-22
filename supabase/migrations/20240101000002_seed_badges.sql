-- FocusLock Badge Definitions Seed Data
-- This migration populates the badge_definitions table with all available badges

INSERT INTO badge_definitions (id, name, description, icon, condition) VALUES
  ('quick_start', 'Quick Starter', 'Complete setup within 10 minutes', '⚡', 'Setup completed in <10 min'),
  ('first_week', 'First Week Clean', 'Maintain 7-day streak', '🌱', '7-day streak'),
  ('seven_day_warrior', '7-Day Warrior', 'No overrides for 7 days', '⚔️', '7 days without override'),
  ('iron_will', 'Iron Will', 'Complete a weekly challenge', '🛡️', 'Complete weekly challenge'),
  ('social_detox', 'Social Detox', 'Maintain 30-day streak', '🧘', '30-day streak'),
  ('night_owl_slayer', 'Night Owl Slayer', '7 days of bedtime compliance', '🌙', '7 days bedtime mode'),
  ('pomodoro_master', 'Pomodoro Master', 'Complete 20 Pomodoro sessions', '🍅', '20 completed sessions');
