-- Migration: Simplification du système de création d'organisation
-- Date: 2025-01-15
-- Purpose: Retirer le système de "rejoindre une organisation" et garantir approved=true pour tous les owners

-- ===========================================
-- 1. Mettre à jour tous les membres existants pour être approuvés
-- ===========================================
UPDATE public.organization_members
SET
  approved = true,
  approved_at = COALESCE(approved_at, joined_at, created_at),
  approved_by = COALESCE(approved_by, user_id)
WHERE approved = false OR approved IS NULL;

-- ===========================================
-- 2. Modifier la fonction du trigger pour TOUJOURS créer avec approved=true
-- ===========================================
CREATE OR REPLACE FUNCTION create_organization_owner_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer le membre owner avec approved=true automatiquement
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
    NOW(),
    true,           -- ✅ TOUJOURS approuvé
    NOW(),
    NEW.owner_id,
    'admin'
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE SET
    approved = true,
    approved_at = NOW(),
    approved_by = EXCLUDED.approved_by,
    joined_at = NOW(),
    user_type = 'admin';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ===========================================
-- 3. Ajouter une contrainte pour garantir que les owners sont toujours approuvés
-- ===========================================
-- Note: On ne peut pas faire ça avec une contrainte CHECK car ça bloquerait les updates
-- On utilise plutôt un trigger de validation

CREATE OR REPLACE FUNCTION validate_owner_approved()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le rôle est 'owner', forcer approved=true et user_type='admin'
  IF NEW.role = 'owner' THEN
    NEW.approved = true;
    NEW.approved_at = COALESCE(NEW.approved_at, NOW());
    NEW.approved_by = COALESCE(NEW.approved_by, NEW.user_id);
    NEW.user_type = 'admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS ensure_owner_approved ON public.organization_members;

-- Créer le trigger pour INSERT et UPDATE
CREATE TRIGGER ensure_owner_approved
  BEFORE INSERT OR UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION validate_owner_approved();

-- ===========================================
-- 4. Supprimer les policies liées au système de "rejoindre"
-- ===========================================

-- Supprimer l'ancienne policy de demande de jonction si elle existe
DROP POLICY IF EXISTS "Users can request to join organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.organization_members;

-- ===========================================
-- 5. Commentaires
-- ===========================================
COMMENT ON FUNCTION create_organization_owner_member IS
  'Crée automatiquement le membre owner avec approved=true lors de la création d''une organisation';

COMMENT ON FUNCTION validate_owner_approved IS
  'Garantit que tous les owners sont toujours approuvés (approved=true)';

COMMENT ON TRIGGER ensure_owner_approved ON public.organization_members IS
  'Force approved=true pour tous les membres avec role=owner';
