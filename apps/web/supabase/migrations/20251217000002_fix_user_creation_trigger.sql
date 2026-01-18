-- Migration: Fix user creation trigger
-- Date: 2025-12-17
-- Purpose: Fix the missing trigger for user profile creation and ensure proper user signup

-- ===========================================
-- 1. Ensure user_profiles.organization_id is nullable
-- ===========================================
-- This is important because new users don't have an organization yet
ALTER TABLE public.user_profiles
  ALTER COLUMN organization_id DROP NOT NULL;

-- ===========================================
-- 2. Create or replace the trigger function for user profile creation
-- ===========================================
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_display_name TEXT;
BEGIN
  -- Extract display name from metadata or email
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Insert user profile
  INSERT INTO public.user_profiles (
    user_id,
    display_name,
    first_name,
    last_name,
    avatar_url,
    user_type,
    is_active
  )
  VALUES (
    NEW.id,
    v_display_name,
    NEW.raw_user_meta_data->>'given_name',
    NEW.raw_user_meta_data->>'family_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'staff', -- Default user type
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ===========================================
-- 3. Drop existing trigger if it exists and create new one
-- ===========================================
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();

-- ===========================================
-- 4. Add trigger for updated_at on user_profiles
-- ===========================================
-- First, create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;

-- Create trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 5. Grant necessary permissions
-- ===========================================
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

-- ===========================================
-- 6. Add policy for authenticated users to create their own profile
-- ===========================================
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ===========================================
-- 7. Comments
-- ===========================================
-- Note: Cannot add comment on auth.users trigger due to permission restrictions
-- The trigger 'on_auth_user_created_profile' automatically creates a user profile when a new user signs up
