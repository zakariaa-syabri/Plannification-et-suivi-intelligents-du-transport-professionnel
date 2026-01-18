-- ===========================================
-- Module Transport : Schéma Unifié Multi-Tenant
-- Version 2.0 - Compatible avec MakerKit/Supabase
-- ===========================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- 1. TABLE: vehicles (Véhicules)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,

    -- Identification
    name VARCHAR(255) NOT NULL,
    vehicle_type VARCHAR(50) DEFAULT 'other',
    registration VARCHAR(50),

    -- Capacité
    capacity INTEGER,
    capacity_unit VARCHAR(20) DEFAULT 'passengers',

    -- État
    status VARCHAR(20) DEFAULT 'available',
    is_active BOOLEAN DEFAULT true,

    -- Localisation GPS
    current_latitude DOUBLE PRECISION,
    current_longitude DOUBLE PRECISION,
    last_position_update TIMESTAMPTZ,

    -- Caractéristiques
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),

    -- Métadonnées flexibles
    equipment JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT vehicles_registration_unique UNIQUE (registration),
    CONSTRAINT vehicles_capacity_positive CHECK (capacity IS NULL OR capacity > 0),
    CONSTRAINT vehicles_year_valid CHECK (year IS NULL OR (year >= 1900 AND year <= 2100)),
    CONSTRAINT vehicles_status_valid CHECK (status IN ('available', 'in_service', 'maintenance', 'out_of_service'))
);

-- Index
CREATE INDEX IF NOT EXISTS idx_vehicles_organization ON public.vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON public.vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON public.vehicles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON public.vehicles(current_latitude, current_longitude)
    WHERE current_latitude IS NOT NULL;


-- ===========================================
-- 2. TABLE: sites (Sites/Locations)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,

    -- Identification
    name VARCHAR(255) NOT NULL,
    site_type VARCHAR(50) DEFAULT 'other',
    code VARCHAR(50),

    -- Adresse
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'France',

    -- Coordonnées GPS (obligatoires)
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,

    -- État
    is_active BOOLEAN DEFAULT true,
    is_depot BOOLEAN DEFAULT false,

    -- Contraintes temporelles
    opening_time VARCHAR(10),
    closing_time VARCHAR(10),
    service_time_minutes DOUBLE PRECISION DEFAULT 5.0,

    -- Contact
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),

    -- Métadonnées
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT sites_code_org_unique UNIQUE (organization_id, code),
    CONSTRAINT sites_latitude_valid CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT sites_longitude_valid CHECK (longitude >= -180 AND longitude <= 180),
    CONSTRAINT sites_service_time_positive CHECK (service_time_minutes >= 0)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_sites_organization ON public.sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_sites_type ON public.sites(site_type);
CREATE INDEX IF NOT EXISTS idx_sites_depot ON public.sites(is_depot) WHERE is_depot = true;
CREATE INDEX IF NOT EXISTS idx_sites_location ON public.sites(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_sites_active ON public.sites(is_active) WHERE is_active = true;


-- ===========================================
-- 3. TABLE: items (Éléments à transporter)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,

    -- Identification
    name VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) DEFAULT 'default',
    reference VARCHAR(100),

    -- Caractéristiques
    description TEXT,
    priority VARCHAR(20) DEFAULT 'normal',
    weight DOUBLE PRECISION,
    volume DOUBLE PRECISION,

    -- Sites de pickup/delivery
    pickup_site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    delivery_site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,

    -- État
    status VARCHAR(20) DEFAULT 'pending',

    -- Métadonnées
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT items_priority_valid CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    CONSTRAINT items_status_valid CHECK (status IN ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled'))
);

-- Index
CREATE INDEX IF NOT EXISTS idx_items_organization ON public.items(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON public.items(status);
CREATE INDEX IF NOT EXISTS idx_items_priority ON public.items(priority);
CREATE INDEX IF NOT EXISTS idx_items_pickup ON public.items(pickup_site_id);
CREATE INDEX IF NOT EXISTS idx_items_delivery ON public.items(delivery_site_id);


-- ===========================================
-- 4. TABLE: routes (Missions/Tournées)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,

    -- Identification
    name VARCHAR(255) NOT NULL,
    route_type VARCHAR(50) DEFAULT 'delivery',

    -- Véhicule assigné
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,

    -- Planning
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,

    -- État
    status VARCHAR(20) DEFAULT 'planned',

    -- Statistiques
    total_distance_km DOUBLE PRECISION,
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    total_stops INTEGER DEFAULT 0,

    -- Métadonnées
    optimization_result JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT routes_status_valid CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled'))
);

-- Index
CREATE INDEX IF NOT EXISTS idx_routes_organization ON public.routes(organization_id);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle ON public.routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_routes_date ON public.routes(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_routes_status ON public.routes(status);


-- ===========================================
-- 5. TABLE: route_stops (Arrêts de route)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,

    -- Séquence
    sequence_order INTEGER NOT NULL,
    stop_type VARCHAR(20) DEFAULT 'stop',

    -- Planning
    planned_arrival_time TIME,
    planned_departure_time TIME,

    -- Réalisation
    actual_arrival_time TIMESTAMPTZ,
    actual_departure_time TIMESTAMPTZ,

    -- État
    status VARCHAR(20) DEFAULT 'pending',

    -- Métadonnées
    notes TEXT,
    signature_data JSONB,
    photo_urls JSONB DEFAULT '[]'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT route_stops_sequence_unique UNIQUE (route_id, sequence_order),
    CONSTRAINT route_stops_status_valid CHECK (status IN ('pending', 'arrived', 'completed', 'skipped')),
    CONSTRAINT route_stops_type_valid CHECK (stop_type IN ('start', 'pickup', 'delivery', 'stop', 'end'))
);

-- Index
CREATE INDEX IF NOT EXISTS idx_route_stops_route ON public.route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_site ON public.route_stops(site_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_sequence ON public.route_stops(route_id, sequence_order);


-- ===========================================
-- 6. TABLE: gps_positions (Positions GPS temps réel)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.gps_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,

    -- Position
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION,

    -- Mouvement
    speed_kmh DOUBLE PRECISION,
    heading INTEGER,
    accuracy_meters DOUBLE PRECISION,

    -- Timestamp GPS
    recorded_at TIMESTAMPTZ NOT NULL,

    -- Timestamp système
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT gps_positions_latitude_valid CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT gps_positions_longitude_valid CHECK (longitude >= -180 AND longitude <= 180),
    CONSTRAINT gps_positions_heading_valid CHECK (heading IS NULL OR (heading >= 0 AND heading <= 360))
);

-- Index pour requêtes temporelles (très important pour le temps réel)
CREATE INDEX IF NOT EXISTS idx_gps_positions_vehicle_time ON public.gps_positions(vehicle_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_positions_route ON public.gps_positions(route_id, recorded_at DESC) WHERE route_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gps_positions_recent ON public.gps_positions(recorded_at DESC);


-- ===========================================
-- 7. TABLE: events (Événements/Notifications)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,

    -- Type
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',

    -- Relations optionnelles
    route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,

    -- Contenu
    title VARCHAR(255) NOT NULL,
    message TEXT,

    -- État
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Métadonnées
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT events_severity_valid CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

-- Index
CREATE INDEX IF NOT EXISTS idx_events_organization ON public.events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_unread ON public.events(organization_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_events_created ON public.events(created_at DESC);


-- ===========================================
-- 8. TABLE: organization_config (Configuration par organisation)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.organization_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL UNIQUE,

    -- Type de domaine
    domain_type VARCHAR(50) DEFAULT 'custom',

    -- Labels personnalisés
    labels JSONB DEFAULT '{
        "vehicle": "Véhicule",
        "vehiclePlural": "Véhicules",
        "site": "Site",
        "sitePlural": "Sites",
        "item": "Élément",
        "itemPlural": "Éléments",
        "mission": "Mission",
        "missionPlural": "Missions"
    }'::jsonb,

    -- Types d'éléments personnalisés
    vehicle_types JSONB DEFAULT '[]'::jsonb,
    site_types JSONB DEFAULT '[]'::jsonb,
    item_types JSONB DEFAULT '[]'::jsonb,

    -- Paramètres
    settings JSONB DEFAULT '{
        "defaultMapCenter": [48.8566, 2.3522],
        "defaultZoom": 13,
        "distanceUnit": "km",
        "currency": "EUR",
        "timezone": "Europe/Paris",
        "language": "fr"
    }'::jsonb,

    -- Contraintes d'optimisation
    optimization_constraints JSONB DEFAULT '{
        "maxRouteDistance": 100,
        "maxRouteDuration": 180,
        "defaultVehicleCapacity": 50,
        "defaultServiceTime": 5
    }'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_org_config_organization ON public.organization_config(organization_id);


-- ===========================================
-- TRIGGERS: Mise à jour automatique de updated_at
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger à toutes les tables avec updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I;
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON public.%I
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$;


-- ===========================================
-- ROW LEVEL SECURITY (RLS) - Multi-tenant
-- ===========================================

-- Activer RLS sur toutes les tables avec organization_id
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_config ENABLE ROW LEVEL SECURITY;

-- Politique pour les utilisateurs authentifiés (via Supabase)
-- Ces politiques utilisent auth.uid() et une table de membership

-- Exemple de politique (à adapter selon votre structure d'auth):
/*
CREATE POLICY vehicles_org_access ON public.vehicles
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );
*/

-- ===========================================
-- DONNÉES INITIALES
-- ===========================================

-- Configuration par défaut pour les types de véhicules
-- (Sera utilisée par l'application pour proposer des templates)

COMMENT ON TABLE public.vehicles IS 'Véhicules de transport (bus, camions, etc.)';
COMMENT ON TABLE public.sites IS 'Points géographiques (dépôts, arrêts, clients)';
COMMENT ON TABLE public.items IS 'Éléments à transporter (colis, passagers, etc.)';
COMMENT ON TABLE public.routes IS 'Missions/tournées de transport';
COMMENT ON TABLE public.route_stops IS 'Arrêts individuels sur une route';
COMMENT ON TABLE public.gps_positions IS 'Historique des positions GPS des véhicules';
COMMENT ON TABLE public.events IS 'Événements et notifications';
COMMENT ON TABLE public.organization_config IS 'Configuration personnalisée par organisation';

-- Afficher un résumé
SELECT 'Migration Unified v2.0 terminée avec succès!' as message;
