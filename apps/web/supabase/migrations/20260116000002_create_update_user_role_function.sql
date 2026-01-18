-- Migration: Create update_user_role function with SECURITY DEFINER
-- Date: 2026-01-16
-- Purpose: Allow updating user_type in both user_profiles and organization_members
-- This function bypasses RLS to ensure the update always succeeds

-- ==========================================
-- 1. Create function to update user role
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_user_role(
  p_user_id UUID,
  p_user_type VARCHAR(50),
  p_organization_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_updated_at TIMESTAMPTZ := NOW();
  v_profiles_updated INTEGER := 0;
  v_members_updated INTEGER := 0;
BEGIN
  -- Update user_profiles
  UPDATE public.user_profiles
  SET
    user_type = p_user_type,
    updated_at = v_updated_at
  WHERE user_id = p_user_id;

  GET DIAGNOSTICS v_profiles_updated = ROW_COUNT;

  -- Update organization_members if organization_id is provided
  IF p_organization_id IS NOT NULL THEN
    UPDATE public.organization_members
    SET
      user_type = p_user_type,
      updated_at = v_updated_at
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id;

    GET DIAGNOSTICS v_members_updated = ROW_COUNT;
  END IF;

  -- Return result with counts
  v_result := json_build_object(
    'success', true,
    'updated_at', v_updated_at,
    'user_type', p_user_type,
    'profiles_updated', v_profiles_updated,
    'members_updated', v_members_updated
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  v_result := json_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public';

-- ==========================================
-- 2. Grant execute permission to authenticated users
-- ==========================================
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, VARCHAR, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, VARCHAR, UUID) TO anon;

-- ==========================================
-- 3. Add UPDATE policy to organization_members for users updating their own records
-- ==========================================
DROP POLICY IF EXISTS "Users can update their own membership" ON public.organization_members;

CREATE POLICY "Users can update their own membership"
  ON public.organization_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ==========================================
-- 4. Comments
-- ==========================================
COMMENT ON FUNCTION public.update_user_role IS
  'Updates user_type in both user_profiles and organization_members tables. Uses SECURITY DEFINER to bypass RLS checks.';

COMMENT ON POLICY "Users can update their own membership" ON public.organization_members IS
  'Allows users to update their own membership records (e.g., user_type field).';
