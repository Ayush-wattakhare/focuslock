-- FocusLock Database Functions and Triggers
-- This migration adds helper functions and automated triggers

-- ============================================================================
-- FUNCTION: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to lock_rules table
CREATE TRIGGER update_lock_rules_updated_at
  BEFORE UPDATE ON lock_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to streaks table
CREATE TRIGGER update_streaks_updated_at
  BEFORE UPDATE ON streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Initialize streak record on profile creation
-- ============================================================================
CREATE OR REPLACE FUNCTION initialize_user_streak()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO streaks (user_id, current_streak, longest_streak, last_active_date)
  VALUES (NEW.id, 0, 0, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_streak_on_profile
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_streak();

-- ============================================================================
-- FUNCTION: Calculate session duration
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_session_minutes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_end IS NOT NULL AND NEW.session_start IS NOT NULL THEN
    NEW.minutes_used = EXTRACT(EPOCH FROM (NEW.session_end - NEW.session_start)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_usage_session_duration
  BEFORE INSERT OR UPDATE ON usage_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_minutes();

-- ============================================================================
-- FUNCTION: Get daily usage for an app
-- ============================================================================
CREATE OR REPLACE FUNCTION get_daily_usage(
  p_user_id UUID,
  p_app_name TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(minutes_used), 0)::INTEGER
  FROM usage_sessions
  WHERE user_id = p_user_id
    AND app_name = p_app_name
    AND date = p_date;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_daily_usage IS 'Returns total minutes used for an app on a specific date';

-- ============================================================================
-- FUNCTION: Check if user has active lock for app
-- ============================================================================
CREATE OR REPLACE FUNCTION has_active_lock(
  p_user_id UUID,
  p_app_name TEXT
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM lock_rules
    WHERE user_id = p_user_id
      AND app_name = p_app_name
      AND is_active = true
  );
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION has_active_lock IS 'Checks if user has any active lock rule for the specified app';

-- ============================================================================
-- FUNCTION: Get user compliance percentage
-- ============================================================================
CREATE OR REPLACE FUNCTION get_compliance_percentage(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS NUMERIC AS $$
DECLARE
  total_days INTEGER;
  days_with_override INTEGER;
  compliance_pct NUMERIC;
BEGIN
  total_days := p_days;
  
  SELECT COUNT(DISTINCT DATE(overridden_at))
  INTO days_with_override
  FROM override_logs
  WHERE user_id = p_user_id
    AND overridden_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  IF total_days = 0 THEN
    RETURN 100;
  END IF;
  
  compliance_pct := ((total_days - days_with_override)::NUMERIC / total_days) * 100;
  RETURN ROUND(compliance_pct, 2);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_compliance_percentage IS 'Calculates compliance percentage as days without overrides';

-- ============================================================================
-- FUNCTION: Award badge to user
-- ============================================================================
CREATE OR REPLACE FUNCTION award_badge(
  p_user_id UUID,
  p_badge_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_badges (user_id, badge_id)
  VALUES (p_user_id, p_badge_id)
  ON CONFLICT (user_id, badge_id) DO NOTHING;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION award_badge IS 'Awards a badge to a user, returns true if newly awarded';

-- ============================================================================
-- FUNCTION: Reset streak on override
-- ============================================================================
CREATE OR REPLACE FUNCTION reset_streak_on_override()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE streaks
  SET current_streak = 0,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reset_streak_after_override
  AFTER INSERT ON override_logs
  FOR EACH ROW
  EXECUTE FUNCTION reset_streak_on_override();

-- ============================================================================
-- FUNCTION: Notify buddies on override
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_buddies_on_override()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO buddy_notifications (from_user_id, to_user_id, event_type, app_name, message)
  SELECT 
    NEW.user_id,
    b.buddy_user_id,
    'override',
    NEW.app_name,
    'Your buddy overrode a lock on ' || NEW.app_name
  FROM buddies b
  WHERE b.user_id = NEW.user_id
    AND b.status = 'active'
    AND (
      b.rules_watching IS NULL 
      OR NEW.lock_rule_id = ANY(b.rules_watching)
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_buddies_after_override
  AFTER INSERT ON override_logs
  FOR EACH ROW
  EXECUTE FUNCTION notify_buddies_on_override();

-- ============================================================================
-- FUNCTION: Get worst performing app for weekly challenge
-- ============================================================================
CREATE OR REPLACE FUNCTION get_worst_performing_app(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(app_name TEXT, override_count BIGINT) AS $$
  SELECT 
    ol.app_name,
    COUNT(*) as override_count
  FROM override_logs ol
  WHERE ol.user_id = p_user_id
    AND DATE(ol.overridden_at) BETWEEN p_start_date AND p_end_date
  GROUP BY ol.app_name
  ORDER BY override_count DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_worst_performing_app IS 'Returns the app with most overrides in a date range';

-- ============================================================================
-- FUNCTION: Check and award streak badges
-- ============================================================================
CREATE OR REPLACE FUNCTION check_streak_badges(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_streak INTEGER;
BEGIN
  SELECT current_streak INTO v_current_streak
  FROM streaks
  WHERE user_id = p_user_id;
  
  -- Award 7-day streak badges
  IF v_current_streak >= 7 THEN
    PERFORM award_badge(p_user_id, 'first_week');
    PERFORM award_badge(p_user_id, 'seven_day_warrior');
  END IF;
  
  -- Award 30-day streak badge
  IF v_current_streak >= 30 THEN
    PERFORM award_badge(p_user_id, 'social_detox');
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_streak_badges IS 'Checks and awards streak-based badges';

-- ============================================================================
-- FUNCTION: Check and award pomodoro badge
-- ============================================================================
CREATE OR REPLACE FUNCTION check_pomodoro_badge(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_completed_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_completed_count
  FROM pomodoro_sessions
  WHERE user_id = p_user_id
    AND status = 'completed';
  
  IF v_completed_count >= 20 THEN
    PERFORM award_badge(p_user_id, 'pomodoro_master');
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_pomodoro_badge IS 'Checks and awards Pomodoro Master badge';
