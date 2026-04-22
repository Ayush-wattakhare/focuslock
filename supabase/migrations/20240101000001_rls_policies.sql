-- FocusLock Row-Level Security Policies
-- This migration enables RLS and creates security policies for all tables

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lock_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE override_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;

-- Note: badge_definitions is a public reference table, no RLS needed

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- LOCK RULES POLICIES
-- ============================================================================
CREATE POLICY "Users can manage own lock rules" ON lock_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Parents can manage child lock rules" ON lock_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM child_profiles
      WHERE parent_user_id = auth.uid()
      AND child_user_id = lock_rules.user_id
    )
  );

-- ============================================================================
-- OVERRIDE LOGS POLICIES
-- ============================================================================
CREATE POLICY "Users can create own override logs" ON override_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own override logs" ON override_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Buddies can view partner override logs" ON override_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM buddies
      WHERE buddy_user_id = auth.uid()
      AND user_id = override_logs.user_id
      AND status = 'active'
      AND (
        rules_watching IS NULL 
        OR lock_rule_id = ANY(rules_watching)
      )
    )
  );

CREATE POLICY "Parents can view child override logs" ON override_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM child_profiles
      WHERE parent_user_id = auth.uid()
      AND child_user_id = override_logs.user_id
    )
  );

-- ============================================================================
-- USAGE SESSIONS POLICIES
-- ============================================================================
CREATE POLICY "Users can manage own usage sessions" ON usage_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Parents can view child usage sessions" ON usage_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM child_profiles
      WHERE parent_user_id = auth.uid()
      AND child_user_id = usage_sessions.user_id
    )
  );

-- ============================================================================
-- STREAKS POLICIES
-- ============================================================================
CREATE POLICY "Users can manage own streak" ON streaks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Buddies can view partner streaks" ON streaks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM buddies
      WHERE buddy_user_id = auth.uid()
      AND user_id = streaks.user_id
      AND status = 'active'
    )
  );

-- ============================================================================
-- USER BADGES POLICIES
-- ============================================================================
CREATE POLICY "Users can view own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert badges" ON user_badges
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- BUDDIES POLICIES
-- ============================================================================
CREATE POLICY "Users can manage buddy relationships" ON buddies
  FOR ALL USING (auth.uid() = user_id OR auth.uid() = buddy_user_id);

-- ============================================================================
-- BUDDY NOTIFICATIONS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own notifications" ON buddy_notifications
  FOR SELECT USING (auth.uid() = to_user_id);

CREATE POLICY "Users can create notifications" ON buddy_notifications
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update own notifications" ON buddy_notifications
  FOR UPDATE USING (auth.uid() = to_user_id);

-- ============================================================================
-- POMODORO SESSIONS POLICIES
-- ============================================================================
CREATE POLICY "Users can manage own pomodoro sessions" ON pomodoro_sessions
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- WEEKLY CHALLENGES POLICIES
-- ============================================================================
CREATE POLICY "Users can view own challenges" ON weekly_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage challenges" ON weekly_challenges
  FOR ALL USING (true);

-- ============================================================================
-- CHILD PROFILES POLICIES
-- ============================================================================
CREATE POLICY "Parents can manage child profiles" ON child_profiles
  FOR ALL USING (auth.uid() = parent_user_id);

CREATE POLICY "Children can view own profile link" ON child_profiles
  FOR SELECT USING (auth.uid() = child_user_id);
