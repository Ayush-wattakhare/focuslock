-- Bedtime Settings Table
-- Stores user bedtime mode configuration

CREATE TABLE bedtime_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT FALSE,
  
  -- Weekday schedule (Monday-Friday)
  weekday_bedtime TIME NOT NULL DEFAULT '22:00:00',
  weekday_waketime TIME NOT NULL DEFAULT '07:00:00',
  
  -- Weekend schedule (Saturday-Sunday)
  weekend_bedtime TIME NOT NULL DEFAULT '23:00:00',
  weekend_waketime TIME NOT NULL DEFAULT '08:00:00',
  
  -- Compliance tracking
  compliance_streak INTEGER DEFAULT 0,
  last_compliance_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX idx_bedtime_settings_enabled ON bedtime_settings(user_id) WHERE is_enabled = TRUE;

-- RLS Policies
ALTER TABLE bedtime_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bedtime settings" ON bedtime_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bedtime settings" ON bedtime_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bedtime settings" ON bedtime_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bedtime settings" ON bedtime_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_bedtime_settings_updated_at
  BEFORE UPDATE ON bedtime_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to get bedtime compliance for badge checking
CREATE OR REPLACE FUNCTION get_bedtime_compliance(p_user_id UUID, p_days INTEGER)
RETURNS TABLE (
  consecutive_days INTEGER,
  total_compliant_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(bs.compliance_streak, 0) as consecutive_days,
    COALESCE(bs.compliance_streak, 0) as total_compliant_days
  FROM bedtime_settings bs
  WHERE bs.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
