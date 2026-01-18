-- Migration: Fix owner creation with approved status
-- Date: 2025-12-17
-- Purpose: Ensure organization owner is created with approved=true

-- ===========================================
-- Update the trigger function to set approved=true for owner
-- ===========================================
CREATE OR REPLACE FUNCTION create_organization_owner_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    joined_at,
    approved,
    approved_at,
    approved_by,
    user_type
  )
  VALUES (
    NEW.id,
    NEW.owner_id,
    'owner',
    now(),
    true,  -- Owner is automatically approved
    now(),
    NEW.owner_id,  -- Self-approved
    'admin'  -- Owner has admin user type by default
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- The trigger 'on_organization_created' already exists, no need to recreate it
-- It will use the updated function

COMMENT ON FUNCTION create_organization_owner_member IS
  'Creates organization owner as member with approved=true automatically';
