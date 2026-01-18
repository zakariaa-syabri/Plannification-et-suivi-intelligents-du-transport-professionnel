-- Migration : Création de la table organizations pour multi-tenant et multi-domaine
-- Date : 2025-01-29

-- Table des organisations (multi-tenant)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lien avec l'utilisateur qui a créé l'organisation
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Informations de base
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,

  -- Type de domaine choisi
  domain_type VARCHAR(50) NOT NULL CHECK (domain_type IN (
    'school_transport',
    'logistics',
    'urban_transit',
    'medical_transport',
    'waste_collection',
    'custom'
  )),

  -- Configuration complète du domaine (labels, champs, contraintes)
  domain_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Informations complémentaires
  description TEXT,
  logo_url TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),

  -- Adresse
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'France',

  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Statut et abonnement
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  subscription_plan VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'active',

  -- Dates
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_domain_type ON public.organizations(domain_type);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_config ON public.organizations USING GIN(domain_config);

-- Table de liaison : membres d'une organisation
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Rôle dans l'organisation
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member')),

  -- Permissions spécifiques
  permissions JSONB DEFAULT '[]'::jsonb,

  -- Dates
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Un utilisateur ne peut être membre qu'une seule fois par organisation
  UNIQUE(organization_id, user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.organization_members(role);

-- Trigger pour updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Policies pour organizations
-- Les utilisateurs peuvent voir les organisations dont ils sont membres
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Les propriétaires peuvent mettre à jour leur organisation
CREATE POLICY "Owners can update their organizations" ON public.organizations
  FOR UPDATE
  USING (owner_id = auth.uid());

-- Les utilisateurs authentifiés peuvent créer une organisation
CREATE POLICY "Authenticated users can create organizations" ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- Policies pour organization_members
-- Les membres peuvent voir les autres membres de leur organisation
CREATE POLICY "Members can view organization members" ON public.organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Les admins et owners peuvent ajouter des membres
CREATE POLICY "Admins can add members" ON public.organization_members
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Les admins et owners peuvent modifier les membres
CREATE POLICY "Admins can update members" ON public.organization_members
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Fonction pour créer automatiquement le membre owner lors de la création d'une organisation
CREATE OR REPLACE FUNCTION create_organization_owner_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement le membre owner
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_organization_owner_member();

-- Commentaires finaux
COMMENT ON TABLE public.organizations IS 'Organisations multi-tenant avec configuration de domaine';
COMMENT ON TABLE public.organization_members IS 'Membres des organisations avec leurs rôles';
COMMENT ON COLUMN public.organizations.domain_type IS 'Type de domaine: school_transport, logistics, urban_transit, etc.';
COMMENT ON COLUMN public.organizations.domain_config IS 'Configuration JSONB complète du domaine (labels, champs, contraintes, KPIs)';

-- Plus besoin de templates - L'utilisateur construit directement via Map Builder
