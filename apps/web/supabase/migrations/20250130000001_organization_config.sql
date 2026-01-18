-- Migration: Configuration personnalisable par organisation
-- Permet aux clients de définir leurs propres types d'éléments

-- Table de configuration de l'organisation
CREATE TABLE IF NOT EXISTS public.organization_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Labels personnalisés (stockés en JSON)
  labels JSONB NOT NULL DEFAULT '{
    "vehicle": "Véhicule",
    "vehiclePlural": "Véhicules",
    "site": "Site",
    "sitePlural": "Sites",
    "item": "Élément",
    "itemPlural": "Éléments",
    "mission": "Mission",
    "missionPlural": "Missions"
  }'::jsonb,

  -- Types d'éléments définis par l'utilisateur
  vehicle_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  site_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  item_types JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Paramètres généraux
  settings JSONB NOT NULL DEFAULT '{
    "defaultMapCenter": [48.8566, 2.3522],
    "defaultZoom": 13,
    "distanceUnit": "km",
    "currency": "EUR",
    "timezone": "Europe/Paris",
    "language": "fr"
  }'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_org_config UNIQUE (organization_id)
);

-- Index pour la recherche
CREATE INDEX IF NOT EXISTS idx_organization_configs_org_id ON public.organization_configs(organization_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_organization_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_organization_config_timestamp ON public.organization_configs;
CREATE TRIGGER trigger_update_organization_config_timestamp
  BEFORE UPDATE ON public.organization_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_config_timestamp();

-- RLS Policies
ALTER TABLE public.organization_configs ENABLE ROW LEVEL SECURITY;

-- Politique de lecture: membres de l'organisation peuvent lire
CREATE POLICY "Organization members can read config"
  ON public.organization_configs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Politique de création: membres peuvent créer pour leur organisation
CREATE POLICY "Organization members can create config"
  ON public.organization_configs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Politique de mise à jour: admins et owners peuvent modifier
CREATE POLICY "Organization admins can update config"
  ON public.organization_configs
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Politique de suppression: seulement les owners
CREATE POLICY "Organization owners can delete config"
  ON public.organization_configs
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Ajouter une colonne element_type_id aux tables existantes pour lier aux types personnalisés
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS element_type_id VARCHAR(100) DEFAULT 'default_vehicle';
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS element_type_id VARCHAR(100) DEFAULT 'default_depot';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS element_type_id VARCHAR(100) DEFAULT 'default_item';

-- Commentaires
COMMENT ON TABLE public.organization_configs IS 'Configuration personnalisable par organisation - types d''éléments, labels, paramètres';
COMMENT ON COLUMN public.organization_configs.labels IS 'Labels personnalisés pour l''interface utilisateur';
COMMENT ON COLUMN public.organization_configs.vehicle_types IS 'Types de véhicules définis par l''utilisateur';
COMMENT ON COLUMN public.organization_configs.site_types IS 'Types de sites définis par l''utilisateur';
COMMENT ON COLUMN public.organization_configs.item_types IS 'Types d''items définis par l''utilisateur';
