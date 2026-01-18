-- Migration : Correction COMPLÈTE des policies RLS pour organization_members
-- Date : 2025-01-29
-- Problème : Les policies créent une boucle récursive - SOLUTION RADICALE

-- Supprimer TOUTES les anciennes policies
DROP POLICY IF EXISTS "Members can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.organization_members;

-- SOLUTION SIMPLE : Policy qui permet aux utilisateurs de voir SEULEMENT leurs propres memberships
-- AUCUNE sous-requête sur organization_members pour éviter la récursion
CREATE POLICY "Users can view their own memberships" ON public.organization_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Pour INSERT : Le trigger utilise SECURITY DEFINER donc bypass RLS
-- Pas besoin de policy INSERT

-- Pour UPDATE : Les users ne peuvent PAS update directement (sauf admin via trigger/function plus tard)
-- Pas de policy UPDATE pour l'instant

-- Pour DELETE : Les users ne peuvent PAS delete directement
-- Pas de policy DELETE pour l'instant

-- Supprimer les fonctions problématiques
DROP FUNCTION IF EXISTS public.user_is_member_of_org(UUID);
DROP FUNCTION IF EXISTS public.user_is_admin_of_org(UUID);
