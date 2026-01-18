-- Migration: Fix user_profiles RLS policies
-- Date: 2026-01-16
-- Purpose: Fix UPDATE policy to allow users to update their own user_type and other profile fields
-- Issue: The previous UPDATE policy lacked WITH CHECK clause, preventing updates

-- ==========================================
-- 1. Drop existing problematic policies
-- ==========================================
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.user_profiles;

-- ==========================================
-- 2. Recreate UPDATE policy with WITH CHECK clause
-- ==========================================
-- This allows authenticated users to update their own profile
-- USING: Check that the row being updated is their own (user_id matches)
-- WITH CHECK: Ensure the updated row still has their user_id (it won't change)
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ==========================================
-- 3. Recreate policy for admin management
-- ==========================================
-- Admins (owner/admin role in organization_members) can manage profiles in their organization
-- USING: Check that the row belongs to an organization where they are admin
-- WITH CHECK: Ensure the updated row still belongs to that same organization
CREATE POLICY "Admins can manage profiles"
  ON public.user_profiles FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ==========================================
-- 4. Comments
-- ==========================================
COMMENT ON POLICY "Users can update own profile" ON public.user_profiles IS
  'Allows authenticated users to update their own profile, including user_type. WITH CHECK ensures user_id remains unchanged.';

COMMENT ON POLICY "Admins can manage profiles" ON public.user_profiles IS
  'Allows owners/admins to manage profiles within their organization. Both USING and WITH CHECK prevent cross-organization access.';
