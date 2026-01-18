-- Migration: Faire du créateur de l'organisation un admin, pas un dispatcher
-- Le créateur peut ainsi accéder à Map Builder et Team

DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
DROP FUNCTION IF EXISTS create_organization_owner_member();

CREATE FUNCTION create_organization_owner_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    user_type,
    approved,
    joined_at
  )
  VALUES (
    NEW.id,
    NEW.owner_id,
    'admin',
    'admin',
    true,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_organization_owner_member();

COMMENT ON FUNCTION create_organization_owner_member() IS 'Créer automatiquement un member admin approuvé quand une organisation est créée';
