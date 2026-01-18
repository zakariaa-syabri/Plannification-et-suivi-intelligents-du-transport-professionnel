-- Migration: Add member approval system
-- Date: 2025-12-17
-- Purpose: Allow users to request to join organizations and admins to approve/reject

-- ===========================================
-- 1. Add approval status to organization_members
-- ===========================================
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update existing members to be approved (backward compatibility)
UPDATE public.organization_members
SET approved = true, approved_at = joined_at
WHERE approved IS NULL OR approved = false;

-- ===========================================
-- 2. Create index for pending requests
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_org_members_pending
  ON public.organization_members(organization_id, approved)
  WHERE approved = false;

-- ===========================================
-- 3. Create organization_join_requests view for easier querying
-- ===========================================
CREATE OR REPLACE VIEW public.organization_join_requests AS
SELECT
  om.id,
  om.organization_id,
  om.user_id,
  om.role,
  om.permissions,
  om.user_type,
  om.requested_at,
  om.approved,
  om.approved_at,
  om.approved_by,
  up.first_name,
  up.last_name,
  up.display_name,
  up.avatar_url,
  up.phone,
  au.email as user_email,
  o.name as organization_name
FROM public.organization_members om
JOIN public.user_profiles up ON om.user_id = up.user_id
JOIN auth.users au ON om.user_id = au.id
JOIN public.organizations o ON om.organization_id = o.id
WHERE om.approved = false
ORDER BY om.requested_at DESC;

-- Grant access to the view
GRANT SELECT ON public.organization_join_requests TO authenticated;

-- ===========================================
-- 4. Add RLS policy for join requests
-- ===========================================
-- Allow users to create join requests
CREATE POLICY "Users can request to join organizations"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    approved = false
  );

-- Allow users to view their own requests
CREATE POLICY "Users can view their own requests"
  ON public.organization_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND approved = true
    )
  );

-- ===========================================
-- 5. Function to approve member request
-- ===========================================
CREATE OR REPLACE FUNCTION public.approve_member_request(
  p_member_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_user_id UUID;
BEGIN
  -- Check if current user is admin of the organization
  SELECT EXISTS(
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = p_organization_id
      AND role IN ('owner', 'admin')
      AND approved = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve requests';
  END IF;

  -- Get the user_id of the member being approved
  SELECT user_id INTO v_user_id
  FROM public.organization_members
  WHERE id = p_member_id AND organization_id = p_organization_id;

  -- Approve the request
  UPDATE public.organization_members
  SET
    approved = true,
    approved_at = NOW(),
    approved_by = auth.uid(),
    joined_at = NOW()
  WHERE id = p_member_id
    AND organization_id = p_organization_id
    AND approved = false;

  -- Update user profile with organization
  UPDATE public.user_profiles
  SET organization_id = p_organization_id
  WHERE user_id = v_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.approve_member_request(UUID, UUID) TO authenticated;

-- ===========================================
-- 6. Function to reject member request
-- ===========================================
CREATE OR REPLACE FUNCTION public.reject_member_request(
  p_member_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin of the organization
  SELECT EXISTS(
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = p_organization_id
      AND role IN ('owner', 'admin')
      AND approved = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reject requests';
  END IF;

  -- Delete the request
  DELETE FROM public.organization_members
  WHERE id = p_member_id
    AND organization_id = p_organization_id
    AND approved = false;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.reject_member_request(UUID, UUID) TO authenticated;

-- ===========================================
-- 7. Comments
-- ===========================================
COMMENT ON COLUMN public.organization_members.approved IS
  'Whether the member has been approved to join the organization';
COMMENT ON COLUMN public.organization_members.requested_at IS
  'When the user requested to join the organization';
COMMENT ON COLUMN public.organization_members.approved_at IS
  'When the request was approved';
COMMENT ON COLUMN public.organization_members.approved_by IS
  'Admin who approved the request';
COMMENT ON FUNCTION public.approve_member_request IS
  'Approve a pending member request and add them to the organization';
COMMENT ON FUNCTION public.reject_member_request IS
  'Reject a pending member request';
