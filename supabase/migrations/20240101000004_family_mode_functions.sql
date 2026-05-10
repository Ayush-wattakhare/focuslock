-- Family Mode Helper Functions
-- This migration adds helper functions for family mode functionality

-- ============================================================================
-- FUNCTION: get_user_id_by_email
-- ============================================================================
-- This function allows looking up a user ID by email address
-- Used by the family/add-child API to find child accounts

CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Query auth.users table to find user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;
  
  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION get_user_id_by_email IS 'Looks up user ID by email address for family mode linking';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_id_by_email TO authenticated;
