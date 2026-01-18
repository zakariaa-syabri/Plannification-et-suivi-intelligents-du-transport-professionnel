-- Migration : Ajout des capacités et consommation énergétique pour les véhicules
-- Date: 2025-11-20
-- Description: Ajoute les champs pour la capacité en poids, volume et consommation énergétique

-- ============================================
-- Ajouter les colonnes de capacité
-- ============================================

-- Capacité en poids (kg)
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS capacity_weight_kg DECIMAL(10, 2) DEFAULT 0
CHECK (capacity_weight_kg >= 0);

-- Capacité en volume (m³)
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS capacity_volume_m3 DECIMAL(10, 3) DEFAULT 0
CHECK (capacity_volume_m3 >= 0);

-- ============================================
-- Ajouter les colonnes de consommation énergétique
-- ============================================

-- Type de carburant/énergie
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(50) DEFAULT 'diesel'
CHECK (fuel_type IN ('diesel', 'gasoline', 'electric', 'hybrid', 'hydrogen', 'cng', 'lpg', 'other'));

-- Consommation énergétique
-- Pour diesel/essence: litres/100km
-- Pour électrique: kWh/100km
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS fuel_consumption DECIMAL(8, 2) DEFAULT 0
CHECK (fuel_consumption >= 0);

-- Unité de consommation (pour clarté)
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS consumption_unit VARCHAR(20) DEFAULT 'L/100km'
CHECK (consumption_unit IN ('L/100km', 'kWh/100km', 'km/kg', 'm³/100km'));

-- Capacité du réservoir/batterie
-- Pour diesel/essence: litres
-- Pour électrique: kWh
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS tank_capacity DECIMAL(10, 2)
CHECK (tank_capacity >= 0 OR tank_capacity IS NULL);

-- Autonomie (km) - optionnel, peut être calculé
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS range_km DECIMAL(10, 2)
CHECK (range_km >= 0 OR range_km IS NULL);

-- ============================================
-- Commentaires pour documentation
-- ============================================

COMMENT ON COLUMN public.vehicles.capacity_weight_kg IS 'Capacité de charge maximale en kilogrammes';
COMMENT ON COLUMN public.vehicles.capacity_volume_m3 IS 'Capacité de charge maximale en mètres cubes';
COMMENT ON COLUMN public.vehicles.fuel_type IS 'Type de carburant ou d''énergie (diesel, electric, etc.)';
COMMENT ON COLUMN public.vehicles.fuel_consumption IS 'Consommation moyenne (L/100km pour carburant, kWh/100km pour électrique)';
COMMENT ON COLUMN public.vehicles.consumption_unit IS 'Unité de mesure de la consommation';
COMMENT ON COLUMN public.vehicles.tank_capacity IS 'Capacité du réservoir (L) ou batterie (kWh)';
COMMENT ON COLUMN public.vehicles.range_km IS 'Autonomie maximale en kilomètres';

-- ============================================
-- Index pour améliorer les performances de recherche
-- ============================================

-- Index sur le type de carburant pour filtrer rapidement par type d'énergie
CREATE INDEX IF NOT EXISTS idx_vehicles_fuel_type ON public.vehicles(fuel_type);

-- Index sur les capacités pour l'optimisation de routes
CREATE INDEX IF NOT EXISTS idx_vehicles_capacity ON public.vehicles(capacity_weight_kg, capacity_volume_m3);
