-- Migration : Correction des policies RLS pour les tables Map Builder
-- Date : 2025-01-29
-- Problème : Les policies créent une récursion sur organization_members

-- ============================================
-- Supprimer les anciennes policies récursives
-- ============================================

-- Vehicles
DROP POLICY IF EXISTS "Users can view vehicles in their org" ON public.vehicles;
DROP POLICY IF EXISTS "Users can manage vehicles in their org" ON public.vehicles;

-- Sites
DROP POLICY IF EXISTS "Users can view sites in their org" ON public.sites;
DROP POLICY IF EXISTS "Users can manage sites in their org" ON public.sites;

-- Items
DROP POLICY IF EXISTS "Users can view items in their org" ON public.items;
DROP POLICY IF EXISTS "Users can manage items in their org" ON public.items;

-- Routes
DROP POLICY IF EXISTS "Users can view routes in their org" ON public.routes;
DROP POLICY IF EXISTS "Users can manage routes in their org" ON public.routes;

-- Route Stops
DROP POLICY IF EXISTS "Users can view route_stops in their org" ON public.route_stops;
DROP POLICY IF EXISTS "Users can manage route_stops in their org" ON public.route_stops;

-- ============================================
-- Créer des policies simples SANS récursion
-- ============================================

-- VEHICLES: Users voient/gèrent véhicules de leur organisation
-- Utilise owner_id de la table organizations directement
CREATE POLICY "Users can view vehicles in their org" ON public.vehicles
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert vehicles in their org" ON public.vehicles
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update vehicles in their org" ON public.vehicles
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete vehicles in their org" ON public.vehicles
  FOR DELETE
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

-- SITES: Users voient/gèrent sites de leur organisation
CREATE POLICY "Users can view sites in their org" ON public.sites
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sites in their org" ON public.sites
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sites in their org" ON public.sites
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sites in their org" ON public.sites
  FOR DELETE
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

-- ITEMS: Users voient/gèrent items de leur organisation
CREATE POLICY "Users can view items in their org" ON public.items
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items in their org" ON public.items
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in their org" ON public.items
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items in their org" ON public.items
  FOR DELETE
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

-- ROUTES: Users voient/gèrent routes de leur organisation
CREATE POLICY "Users can view routes in their org" ON public.routes
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert routes in their org" ON public.routes
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update routes in their org" ON public.routes
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete routes in their org" ON public.routes
  FOR DELETE
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

-- ROUTE STOPS: Users voient/gèrent route_stops via les routes de leur org
CREATE POLICY "Users can view route_stops in their org" ON public.route_stops
  FOR SELECT
  USING (
    route_id IN (
      SELECT id FROM public.routes
      WHERE organization_id IN (
        SELECT id FROM public.organizations WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert route_stops in their org" ON public.route_stops
  FOR INSERT
  WITH CHECK (
    route_id IN (
      SELECT id FROM public.routes
      WHERE organization_id IN (
        SELECT id FROM public.organizations WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update route_stops in their org" ON public.route_stops
  FOR UPDATE
  USING (
    route_id IN (
      SELECT id FROM public.routes
      WHERE organization_id IN (
        SELECT id FROM public.organizations WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete route_stops in their org" ON public.route_stops
  FOR DELETE
  USING (
    route_id IN (
      SELECT id FROM public.routes
      WHERE organization_id IN (
        SELECT id FROM public.organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON POLICY "Users can view vehicles in their org" ON public.vehicles IS
  'Les utilisateurs voient uniquement les véhicules de leur organisation (via owner_id)';

COMMENT ON POLICY "Users can view sites in their org" ON public.sites IS
  'Les utilisateurs voient uniquement les sites de leur organisation (via owner_id)';

COMMENT ON POLICY "Users can view items in their org" ON public.items IS
  'Les utilisateurs voient uniquement les items de leur organisation (via owner_id)';
