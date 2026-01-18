-- Script de vérification de la base de données
-- Exécuter dans le SQL Editor de Supabase Dashboard

-- 1. Vérifier les organisations
SELECT
  'organizations' as table_name,
  id,
  name,
  slug,
  owner_id,
  created_at
FROM public.organizations
ORDER BY created_at DESC
LIMIT 5;

-- 2. Vérifier les memberships
SELECT
  'organization_members' as table_name,
  id,
  organization_id,
  user_id,
  role,
  approved,
  joined_at,
  created_at
FROM public.organization_members
ORDER BY created_at DESC
LIMIT 10;

-- 3. Vérifier la fonction du trigger
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'create_organization_owner_member';

-- 4. Vérifier le trigger lui-même
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_organization_created';

-- 5. Test: Compter les membres approuvés vs non approuvés
SELECT
  COUNT(*) FILTER (WHERE approved = true) as approved_count,
  COUNT(*) FILTER (WHERE approved = false) as pending_count,
  COUNT(*) as total_count
FROM public.organization_members;
