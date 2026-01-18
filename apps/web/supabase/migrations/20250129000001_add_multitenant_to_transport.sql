-- Migration : Ajout des colonnes multi-tenant aux tables transport
-- Date : 2025-01-29
-- Cette migration ajoute organization_id et domain_type à toutes les tables transport

-- Ajouter organization_id et domain_type à la table passagers
ALTER TABLE public.passagers
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS domain_type VARCHAR(50) DEFAULT 'school_transport';

-- Ajouter organization_id et domain_type à la table bus
ALTER TABLE public.bus
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS domain_type VARCHAR(50) DEFAULT 'school_transport';

-- Ajouter organization_id et domain_type à la table tournees
ALTER TABLE public.tournees
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS domain_type VARCHAR(50) DEFAULT 'school_transport';

-- Ajouter organization_id à la table arrets (hérite du domaine via tournee)
ALTER TABLE public.arrets
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Ajouter organization_id à la table inscriptions
ALTER TABLE public.inscriptions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Ajouter organization_id à la table positions_gps
ALTER TABLE public.positions_gps
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Ajouter organization_id à la table evenements
ALTER TABLE public.evenements
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Ajouter organization_id à la table contraintes_optimisation
ALTER TABLE public.contraintes_optimisation
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Créer des index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_passagers_org ON public.passagers(organization_id);
CREATE INDEX IF NOT EXISTS idx_passagers_domain ON public.passagers(domain_type);

CREATE INDEX IF NOT EXISTS idx_bus_org ON public.bus(organization_id);
CREATE INDEX IF NOT EXISTS idx_bus_domain ON public.bus(domain_type);

CREATE INDEX IF NOT EXISTS idx_tournees_org ON public.tournees(organization_id);
CREATE INDEX IF NOT EXISTS idx_tournees_domain ON public.tournees(domain_type);

CREATE INDEX IF NOT EXISTS idx_arrets_org ON public.arrets(organization_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_org ON public.inscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_positions_gps_org ON public.positions_gps(organization_id);
CREATE INDEX IF NOT EXISTS idx_evenements_org ON public.evenements(organization_id);
CREATE INDEX IF NOT EXISTS idx_contraintes_org ON public.contraintes_optimisation(organization_id);

-- Row Level Security (RLS) pour l'isolation multi-tenant
-- Les utilisateurs ne peuvent voir que les données de leurs organisations

-- RLS pour passagers
ALTER TABLE public.passagers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view passagers in their org" ON public.passagers;
CREATE POLICY "Users can view passagers in their org" ON public.passagers
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert passagers in their org" ON public.passagers;
CREATE POLICY "Users can insert passagers in their org" ON public.passagers
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update passagers in their org" ON public.passagers;
CREATE POLICY "Users can update passagers in their org" ON public.passagers
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete passagers in their org" ON public.passagers;
CREATE POLICY "Users can delete passagers in their org" ON public.passagers
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS pour bus
ALTER TABLE public.bus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view bus in their org" ON public.bus;
CREATE POLICY "Users can view bus in their org" ON public.bus
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert bus in their org" ON public.bus;
CREATE POLICY "Users can insert bus in their org" ON public.bus
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update bus in their org" ON public.bus;
CREATE POLICY "Users can update bus in their org" ON public.bus
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete bus in their org" ON public.bus;
CREATE POLICY "Users can delete bus in their org" ON public.bus
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS pour tournees
ALTER TABLE public.tournees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tournees in their org" ON public.tournees;
CREATE POLICY "Users can view tournees in their org" ON public.tournees
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert tournees in their org" ON public.tournees;
CREATE POLICY "Users can insert tournees in their org" ON public.tournees
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update tournees in their org" ON public.tournees;
CREATE POLICY "Users can update tournees in their org" ON public.tournees
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete tournees in their org" ON public.tournees;
CREATE POLICY "Users can delete tournees in their org" ON public.tournees
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS pour arrets (hérite de la tournee)
ALTER TABLE public.arrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view arrets in their org" ON public.arrets;
CREATE POLICY "Users can view arrets in their org" ON public.arrets
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage arrets in their org" ON public.arrets;
CREATE POLICY "Users can manage arrets in their org" ON public.arrets
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS pour inscriptions
ALTER TABLE public.inscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view inscriptions in their org" ON public.inscriptions;
CREATE POLICY "Users can view inscriptions in their org" ON public.inscriptions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage inscriptions in their org" ON public.inscriptions;
CREATE POLICY "Users can manage inscriptions in their org" ON public.inscriptions
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS pour positions_gps
ALTER TABLE public.positions_gps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view positions_gps in their org" ON public.positions_gps;
CREATE POLICY "Users can view positions_gps in their org" ON public.positions_gps
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert positions_gps in their org" ON public.positions_gps;
CREATE POLICY "Users can insert positions_gps in their org" ON public.positions_gps
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS pour evenements
ALTER TABLE public.evenements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view evenements in their org" ON public.evenements;
CREATE POLICY "Users can view evenements in their org" ON public.evenements
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage evenements in their org" ON public.evenements;
CREATE POLICY "Users can manage evenements in their org" ON public.evenements
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS pour contraintes_optimisation
ALTER TABLE public.contraintes_optimisation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view contraintes in their org" ON public.contraintes_optimisation;
CREATE POLICY "Users can view contraintes in their org" ON public.contraintes_optimisation
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage contraintes in their org" ON public.contraintes_optimisation;
CREATE POLICY "Users can manage contraintes in their org" ON public.contraintes_optimisation
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Commentaires
COMMENT ON COLUMN public.passagers.organization_id IS 'ID de l organisation propriétaire';
COMMENT ON COLUMN public.passagers.domain_type IS 'Type de domaine de l organisation';
COMMENT ON COLUMN public.bus.organization_id IS 'ID de l organisation propriétaire';
COMMENT ON COLUMN public.bus.domain_type IS 'Type de domaine de l organisation';
COMMENT ON COLUMN public.tournees.organization_id IS 'ID de l organisation propriétaire';
COMMENT ON COLUMN public.tournees.domain_type IS 'Type de domaine de l organisation';
