-- Migration: Permettre au propriétaire d'une organisation de créer son membership
-- Date: 2026-01-18
-- Purpose: Ajouter une policy INSERT pour permettre la création du membership owner

-- Ajouter une policy INSERT pour organization_members
-- Permet au owner d'une organisation de s'ajouter comme member
CREATE POLICY "Organization owners can insert their membership" ON public.organization_members
  FOR INSERT
  WITH CHECK (
    -- L'utilisateur doit être authentifié
    auth.uid() IS NOT NULL
    -- Et doit être le owner de l'organisation
    AND user_id = auth.uid()
    AND organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

COMMENT ON POLICY "Organization owners can insert their membership" ON public.organization_members IS
  'Permet au propriétaire d''une organisation de créer son propre membership lors de la création de l''organisation';
