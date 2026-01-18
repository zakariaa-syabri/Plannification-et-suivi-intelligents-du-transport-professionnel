-- Migration : Correction COMPLÈTE de toutes les policies RLS récursives
-- Date : 2025-01-29
-- Problème : Les policies sur organizations ET organization_members créent des boucles récursives

-- ==========================================
-- PARTIE 1 : Supprimer TOUTES les policies existantes
-- ==========================================

-- Policies sur organizations
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Policies sur organization_members (déjà supprimées dans migration précédente, mais on s'assure)
DROP POLICY IF EXISTS "Members can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.organization_members;

-- ==========================================
-- PARTIE 2 : NOUVELLES policies SANS récursion
-- ==========================================

-- ============ ORGANIZATIONS ============

-- SELECT : Les utilisateurs peuvent voir les organisations qu'ils possèdent
-- On évite la sous-requête sur organization_members pour éviter la récursion
CREATE POLICY "Owners can view their organizations" ON public.organizations
  FOR SELECT
  USING (owner_id = auth.uid());

-- INSERT : Les utilisateurs authentifiés peuvent créer des organisations
CREATE POLICY "Authenticated users can create organizations" ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- UPDATE : Les propriétaires peuvent mettre à jour leur organisation
CREATE POLICY "Owners can update their organizations" ON public.organizations
  FOR UPDATE
  USING (owner_id = auth.uid());

-- DELETE : Les propriétaires peuvent supprimer leur organisation
CREATE POLICY "Owners can delete their organizations" ON public.organizations
  FOR DELETE
  USING (owner_id = auth.uid());

-- ============ ORGANIZATION_MEMBERS ============

-- SELECT : Les utilisateurs peuvent voir UNIQUEMENT leurs propres memberships
-- AUCUNE sous-requête = AUCUNE récursion
CREATE POLICY "Users can view their own memberships" ON public.organization_members
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT : PAS de policy pour l'instant
-- Le trigger create_organization_owner_member() utilise SECURITY DEFINER donc bypass RLS
-- Pour ajouter des membres plus tard, on créera une fonction SECURITY DEFINER

-- UPDATE : PAS de policy pour l'instant
-- On créera des fonctions SECURITY DEFINER pour permettre aux admins de modifier les rôles

-- DELETE : PAS de policy pour l'instant
-- On créera des fonctions SECURITY DEFINER pour permettre aux admins de retirer des membres

-- ==========================================
-- COMMENTAIRES EXPLICATIFS
-- ==========================================

COMMENT ON POLICY "Owners can view their organizations" ON public.organizations IS
  'Les utilisateurs ne voient QUE les organisations qu''ils possèdent directement (pas de sous-requête)';

COMMENT ON POLICY "Users can view their own memberships" ON public.organization_members IS
  'Les utilisateurs ne voient QUE leurs propres memberships (pas de sous-requête sur organization_members)';
