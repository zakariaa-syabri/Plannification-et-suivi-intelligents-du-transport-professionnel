-- Migration : Tables pour Map Builder Interactif
-- Système générique pour ajouter n'importe quel type d'entité sur la carte

-- ============================================
-- 1. TABLE VEHICLES (Véhicules génériques)
-- ============================================
-- Renommer/Créer table vehicles générique
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,

  -- Informations de base
  name VARCHAR(255) NOT NULL,
  identifier VARCHAR(100), -- Immatriculation, numéro, etc.

  -- Type et icône personnalisables
  vehicle_type VARCHAR(100) NOT NULL, -- 'bus', 'truck', 'van', 'train', 'bike', etc.
  icon VARCHAR(50) DEFAULT 'truck', -- Nom de l'icône Lucide
  color VARCHAR(50) DEFAULT '#3b82f6', -- Couleur HEX

  -- Capacité et caractéristiques
  capacity INTEGER DEFAULT 0,
  attributes JSONB DEFAULT '{}'::jsonb, -- Attributs personnalisés

  -- Statut
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),

  -- Position actuelle (pour tracking)
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  last_position_update TIMESTAMPTZ,

  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. TABLE SITES (Sites/Locations)
-- ============================================
-- Sites de l'organisation (dépôts, écoles, entrepôts, stations, etc.)
CREATE TABLE IF NOT EXISTS public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,

  -- Informations de base
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Type de site personnalisable
  site_type VARCHAR(100) NOT NULL, -- 'depot', 'school', 'warehouse', 'station', 'hospital', etc.
  icon VARCHAR(50) DEFAULT 'map-pin', -- Nom de l'icône Lucide
  color VARCHAR(50) DEFAULT '#10b981', -- Couleur HEX

  -- Localisation (REQUIS)
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'France',

  -- Informations de contact
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),

  -- Horaires et contraintes
  opening_hours JSONB, -- {"monday": {"open": "08:00", "close": "18:00"}, ...}
  constraints JSONB DEFAULT '{}'::jsonb, -- Contraintes spécifiques

  -- Attributs personnalisés
  attributes JSONB DEFAULT '{}'::jsonb,

  -- Statut
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'temporary')),

  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. TABLE ITEMS (Cargos/Passagers/Produits)
-- ============================================
-- Ce qui est transporté (générique)
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,

  -- Informations de base
  name VARCHAR(255) NOT NULL,
  identifier VARCHAR(100), -- Référence, matricule, numéro
  description TEXT,

  -- Type d'item personnalisable
  item_type VARCHAR(100) NOT NULL, -- 'passenger', 'parcel', 'student', 'patient', 'product', etc.
  icon VARCHAR(50) DEFAULT 'package', -- Nom de l'icône Lucide
  color VARCHAR(50) DEFAULT '#f59e0b', -- Couleur HEX

  -- Localisation de l'item
  pickup_site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  dropoff_site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  current_location_latitude DECIMAL(10, 8),
  current_location_longitude DECIMAL(11, 8),

  -- Contact (pour passagers)
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),

  -- Attributs physiques (pour colis/produits)
  weight_kg DECIMAL(10, 2),
  volume_m3 DECIMAL(10, 3),
  dimensions JSONB, -- {"length": 100, "width": 50, "height": 30}

  -- Besoins spéciaux
  special_requirements JSONB DEFAULT '[]'::jsonb, -- ["fragile", "refrigerated", "handicap_accessible"]

  -- Priorité
  priority VARCHAR(50) DEFAULT 'standard' CHECK (priority IN ('urgent', 'high', 'standard', 'low')),

  -- Attributs personnalisés (TRÈS FLEXIBLE)
  attributes JSONB DEFAULT '{}'::jsonb,

  -- Statut
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled')),

  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. TABLE ROUTES (Missions/Tournées génériques)
-- ============================================
CREATE TABLE IF NOT EXISTS public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,

  -- Informations de base
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Véhicule assigné
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,

  -- Type de route
  route_type VARCHAR(100) DEFAULT 'delivery', -- 'delivery', 'pickup', 'round_trip', 'scheduled_line'

  -- Planning
  planned_date DATE NOT NULL,
  planned_start_time TIME,
  planned_end_time TIME,

  -- Temps réel
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,

  -- Statistiques
  total_distance_km DECIMAL(10, 2),
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,

  -- Séquence des arrêts (ordre)
  stops_sequence JSONB DEFAULT '[]'::jsonb, -- [{"site_id": "uuid", "order": 1, "type": "pickup"}, ...]

  -- Items assignés
  assigned_items_ids UUID[], -- Array d'IDs des items

  -- Statut
  status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled', 'paused')),

  -- Optimisation
  is_optimized BOOLEAN DEFAULT false,
  optimization_score DECIMAL(5, 2), -- Score d'optimisation (0-100)

  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. TABLE ROUTE_STOPS (Arrêts de route)
-- ============================================
CREATE TABLE IF NOT EXISTS public.route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE NOT NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,

  -- Ordre dans la séquence
  sequence_order INTEGER NOT NULL,

  -- Type d'arrêt
  stop_type VARCHAR(50) DEFAULT 'pickup' CHECK (stop_type IN ('pickup', 'dropoff', 'waypoint', 'depot')),

  -- Items concernés par cet arrêt
  item_ids UUID[], -- Items à récupérer/déposer

  -- Timing
  planned_arrival_time TIME,
  planned_departure_time TIME,
  time_window_start TIME, -- Fenêtre de temps min
  time_window_end TIME,   -- Fenêtre de temps max

  -- Temps réel
  actual_arrival_time TIMESTAMPTZ,
  actual_departure_time TIMESTAMPTZ,

  -- Distance depuis l'arrêt précédent
  distance_from_previous_km DECIMAL(10, 2),
  duration_from_previous_minutes INTEGER,

  -- Statut
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'in_progress', 'completed', 'skipped')),

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEX POUR PERFORMANCE
-- ============================================

-- Vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_org ON public.vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON public.vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_position ON public.vehicles(current_latitude, current_longitude);
CREATE INDEX IF NOT EXISTS idx_vehicles_attributes ON public.vehicles USING GIN(attributes);

-- Sites
CREATE INDEX IF NOT EXISTS idx_sites_org ON public.sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_sites_type ON public.sites(site_type);
CREATE INDEX IF NOT EXISTS idx_sites_location ON public.sites(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_sites_status ON public.sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_attributes ON public.sites USING GIN(attributes);

-- Items
CREATE INDEX IF NOT EXISTS idx_items_org ON public.items(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON public.items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_pickup ON public.items(pickup_site_id);
CREATE INDEX IF NOT EXISTS idx_items_dropoff ON public.items(dropoff_site_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON public.items(status);
CREATE INDEX IF NOT EXISTS idx_items_priority ON public.items(priority);
CREATE INDEX IF NOT EXISTS idx_items_attributes ON public.items USING GIN(attributes);

-- Routes
CREATE INDEX IF NOT EXISTS idx_routes_org ON public.routes(organization_id);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle ON public.routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_routes_date ON public.routes(planned_date);
CREATE INDEX IF NOT EXISTS idx_routes_status ON public.routes(status);

-- Route Stops
CREATE INDEX IF NOT EXISTS idx_route_stops_route ON public.route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_site ON public.route_stops(site_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_order ON public.route_stops(route_id, sequence_order);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_route_stops_updated_at BEFORE UPDATE ON public.route_stops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Vehicles
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vehicles in their org" ON public.vehicles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage vehicles in their org" ON public.vehicles
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- Sites
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sites in their org" ON public.sites
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage sites in their org" ON public.sites
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- Items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items in their org" ON public.items
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage items in their org" ON public.items
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- Routes
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view routes in their org" ON public.routes
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage routes in their org" ON public.routes
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- Route Stops
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view route_stops in their org" ON public.route_stops
  FOR SELECT USING (
    route_id IN (
      SELECT id FROM public.routes
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage route_stops in their org" ON public.route_stops
  FOR ALL USING (
    route_id IN (
      SELECT id FROM public.routes
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE public.vehicles IS 'Véhicules génériques (bus, camions, trains, etc.)';
COMMENT ON TABLE public.sites IS 'Sites/Locations sur la carte (dépôts, écoles, entrepôts, stations)';
COMMENT ON TABLE public.items IS 'Items transportés (passagers, colis, produits) - Générique';
COMMENT ON TABLE public.routes IS 'Routes/Missions/Tournées génériques';
COMMENT ON TABLE public.route_stops IS 'Arrêts dans une route avec séquence';

COMMENT ON COLUMN public.vehicles.attributes IS 'Attributs personnalisés JSON (immatriculation, équipements, etc.)';
COMMENT ON COLUMN public.sites.attributes IS 'Attributs personnalisés JSON (capacité, équipements, etc.)';
COMMENT ON COLUMN public.items.attributes IS 'Attributs personnalisés JSON (âge, classe pour élèves, température pour colis, etc.)';
