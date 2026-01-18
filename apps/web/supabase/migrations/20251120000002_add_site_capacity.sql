-- Migration : Ajout des capacités pour les sites
-- Date: 2025-11-20
-- Description: Ajoute les champs pour la capacité de stockage des sites (poids, volume, nombre d'items)

-- ============================================
-- Ajouter les colonnes de capacité aux sites
-- ============================================

-- Capacité en poids (kg)
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS capacity_weight_kg DECIMAL(10, 2) DEFAULT NULL
CHECK (capacity_weight_kg >= 0 OR capacity_weight_kg IS NULL);

-- Capacité en volume (m³)
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS capacity_volume_m3 DECIMAL(10, 3) DEFAULT NULL
CHECK (capacity_volume_m3 >= 0 OR capacity_volume_m3 IS NULL);

-- Capacité en nombre d'items
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS capacity_items_count INTEGER DEFAULT NULL
CHECK (capacity_items_count >= 0 OR capacity_items_count IS NULL);

-- ============================================
-- Commentaires pour documentation
-- ============================================

COMMENT ON COLUMN public.sites.capacity_weight_kg IS 'Capacité de stockage maximale en kilogrammes';
COMMENT ON COLUMN public.sites.capacity_volume_m3 IS 'Capacité de stockage maximale en mètres cubes';
COMMENT ON COLUMN public.sites.capacity_items_count IS 'Nombre maximum d''items que le site peut contenir';

-- ============================================
-- Vue pour calculer l'utilisation actuelle des sites
-- ============================================

-- Cette vue calcule l'occupation actuelle de chaque site
CREATE OR REPLACE VIEW public.site_occupancy AS
SELECT
    s.id as site_id,
    s.name as site_name,
    s.organization_id,
    s.capacity_weight_kg,
    s.capacity_volume_m3,
    s.capacity_items_count,

    -- Items actuellement au site (pickup ou dropoff avec status delivered/pending)
    COUNT(DISTINCT i.id) as current_items_count,
    COALESCE(SUM(i.weight_kg), 0) as current_weight_kg,
    COALESCE(SUM(i.volume_m3), 0) as current_volume_m3,

    -- Pourcentages d'occupation
    CASE
        WHEN s.capacity_items_count IS NOT NULL AND s.capacity_items_count > 0
        THEN ROUND((COUNT(DISTINCT i.id)::DECIMAL / s.capacity_items_count * 100), 2)
        ELSE NULL
    END as items_occupancy_percent,

    CASE
        WHEN s.capacity_weight_kg IS NOT NULL AND s.capacity_weight_kg > 0
        THEN ROUND((COALESCE(SUM(i.weight_kg), 0) / s.capacity_weight_kg * 100), 2)
        ELSE NULL
    END as weight_occupancy_percent,

    CASE
        WHEN s.capacity_volume_m3 IS NOT NULL AND s.capacity_volume_m3 > 0
        THEN ROUND((COALESCE(SUM(i.volume_m3), 0) / s.capacity_volume_m3 * 100), 2)
        ELSE NULL
    END as volume_occupancy_percent,

    -- Indicateur si le site est plein (au moins une capacité dépassée)
    CASE
        WHEN (s.capacity_items_count IS NOT NULL AND COUNT(DISTINCT i.id) >= s.capacity_items_count)
            OR (s.capacity_weight_kg IS NOT NULL AND COALESCE(SUM(i.weight_kg), 0) >= s.capacity_weight_kg)
            OR (s.capacity_volume_m3 IS NOT NULL AND COALESCE(SUM(i.volume_m3), 0) >= s.capacity_volume_m3)
        THEN true
        ELSE false
    END as is_full

FROM public.sites s
LEFT JOIN public.items i ON (
    (i.pickup_site_id = s.id OR i.dropoff_site_id = s.id)
    AND i.status IN ('pending', 'delivered', 'assigned')
)
GROUP BY s.id, s.name, s.organization_id, s.capacity_weight_kg, s.capacity_volume_m3, s.capacity_items_count;

-- ============================================
-- Commentaires pour la vue
-- ============================================

COMMENT ON VIEW public.site_occupancy IS 'Vue qui calcule l''occupation actuelle de chaque site et détermine si le site est plein';

-- ============================================
-- Permissions RLS pour la vue
-- ============================================

-- Les utilisateurs peuvent voir l'occupation des sites de leur organisation
CREATE POLICY "Users can view site occupancy in their org" ON public.sites
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Index pour améliorer les performances
-- ============================================

-- Index sur les foreign keys pour accélérer les jointures
CREATE INDEX IF NOT EXISTS idx_items_pickup_site ON public.items(pickup_site_id) WHERE pickup_site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_dropoff_site ON public.items(dropoff_site_id) WHERE dropoff_site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_status ON public.items(status);

-- Index composite pour les requêtes de capacité
CREATE INDEX IF NOT EXISTS idx_items_site_status ON public.items(pickup_site_id, dropoff_site_id, status);
