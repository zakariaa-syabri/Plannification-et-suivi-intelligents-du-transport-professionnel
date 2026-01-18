-- Migration: Ajouter le champ current_loaded_items aux véhicules
-- Ce champ contient les IDs des items actuellement transportés par le véhicule

-- Ajouter la colonne current_loaded_items (tableau d'UUIDs)
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS current_loaded_items UUID[] DEFAULT '{}';

-- Commentaire pour documenter
COMMENT ON COLUMN public.vehicles.current_loaded_items IS
'IDs des items actuellement chargés dans le véhicule. Mis à jour lors du pickup/dropoff.';

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_vehicles_current_loaded_items
ON public.vehicles USING GIN (current_loaded_items);
