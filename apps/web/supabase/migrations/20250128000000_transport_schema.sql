-- Module Transport : Schéma de données pour PostgreSQL standard
-- Version compatible Docker Compose (sans Supabase)

-- 1. Table des passagers (étudiants, employés, etc.)
CREATE TABLE IF NOT EXISTS public.passagers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  prenom VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  telephone VARCHAR(50),
  adresse_complete TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  code_postal VARCHAR(20),
  ville VARCHAR(100),
  date_naissance DATE,
  type_passager VARCHAR(50) DEFAULT 'etudiant',
  besoins_specifiques TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table des bus
CREATE TABLE IF NOT EXISTS public.bus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_bus VARCHAR(50) UNIQUE NOT NULL,
  immatriculation VARCHAR(50) UNIQUE NOT NULL,
  capacite INTEGER NOT NULL CHECK (capacite > 0),
  type_bus VARCHAR(50) DEFAULT 'standard',
  statut VARCHAR(50) DEFAULT 'disponible',
  equipements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table des tournées
CREATE TABLE IF NOT EXISTS public.tournees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_tournee VARCHAR(255) NOT NULL,
  bus_id UUID REFERENCES public.bus(id) ON DELETE SET NULL,
  date_tournee DATE NOT NULL,
  heure_depart TIME NOT NULL,
  heure_arrivee_estimee TIME,
  duree_estimee_minutes INTEGER,
  distance_totale_km DECIMAL(10, 2),
  statut VARCHAR(50) DEFAULT 'planifiee',
  nombre_passagers INTEGER DEFAULT 0,
  sequence_arrets JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Table des arrêts (points de ramassage/dépose)
CREATE TABLE IF NOT EXISTS public.arrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournee_id UUID REFERENCES public.tournees(id) ON DELETE CASCADE,
  passager_id UUID REFERENCES public.passagers(id) ON DELETE CASCADE,
  ordre_sequence INTEGER NOT NULL,
  adresse TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  heure_prevue TIME NOT NULL,
  heure_reelle TIME,
  type_arret VARCHAR(50) DEFAULT 'ramassage',
  fenetre_temps_debut TIME,
  fenetre_temps_fin TIME,
  statut VARCHAR(50) DEFAULT 'planifie',
  distance_depuis_precedent_km DECIMAL(10, 2),
  duree_depuis_precedent_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Table des inscriptions (passagers → tournées)
CREATE TABLE IF NOT EXISTS public.inscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passager_id UUID REFERENCES public.passagers(id) ON DELETE CASCADE,
  tournee_id UUID REFERENCES public.tournees(id) ON DELETE CASCADE,
  date_inscription TIMESTAMPTZ DEFAULT now(),
  statut VARCHAR(50) DEFAULT 'confirmee',
  besoin_retour BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Table des positions GPS en temps réel
CREATE TABLE IF NOT EXISTS public.positions_gps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES public.bus(id) ON DELETE CASCADE,
  tournee_id UUID REFERENCES public.tournees(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  vitesse_kmh DECIMAL(5, 2),
  cap_degres INTEGER,
  precision_metres DECIMAL(10, 2),
  timestamp_gps TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Table des événements/notifications
CREATE TABLE IF NOT EXISTS public.evenements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournee_id UUID REFERENCES public.tournees(id) ON DELETE CASCADE,
  type_evenement VARCHAR(100) NOT NULL,
  titre VARCHAR(255) NOT NULL,
  message TEXT,
  niveau_priorite VARCHAR(50) DEFAULT 'info',
  destinataires JSONB DEFAULT '[]'::jsonb,
  lu BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Table des contraintes d'optimisation
CREATE TABLE IF NOT EXISTS public.contraintes_optimisation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_contrainte VARCHAR(255) NOT NULL,
  type_contrainte VARCHAR(100) NOT NULL,
  valeur JSONB NOT NULL,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_passagers_email ON public.passagers(email);
CREATE INDEX IF NOT EXISTS idx_passagers_geoloc ON public.passagers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_tournees_date ON public.tournees(date_tournee);
CREATE INDEX IF NOT EXISTS idx_tournees_statut ON public.tournees(statut);
CREATE INDEX IF NOT EXISTS idx_arrets_tournee ON public.arrets(tournee_id);
CREATE INDEX IF NOT EXISTS idx_arrets_ordre ON public.arrets(tournee_id, ordre_sequence);
CREATE INDEX IF NOT EXISTS idx_inscriptions_passager ON public.inscriptions(passager_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_tournee ON public.inscriptions(tournee_id);
CREATE INDEX IF NOT EXISTS idx_positions_gps_bus ON public.positions_gps(bus_id, timestamp_gps DESC);
CREATE INDEX IF NOT EXISTS idx_positions_gps_tournee ON public.positions_gps(tournee_id, timestamp_gps DESC);
CREATE INDEX IF NOT EXISTS idx_evenements_tournee ON public.evenements(tournee_id, created_at DESC);

-- Fonction de mise à jour automatique du timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_passagers_updated_at BEFORE UPDATE ON public.passagers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bus_updated_at BEFORE UPDATE ON public.bus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournees_updated_at BEFORE UPDATE ON public.tournees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_arrets_updated_at BEFORE UPDATE ON public.arrets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inscriptions_updated_at BEFORE UPDATE ON public.inscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contraintes_updated_at BEFORE UPDATE ON public.contraintes_optimisation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Données de test initiales
INSERT INTO public.contraintes_optimisation (nom_contrainte, type_contrainte, valeur) VALUES
  ('Capacité maximale bus', 'capacite', '{"max": 50}'::jsonb),
  ('Durée maximale tournée', 'duree_max', '{"max_minutes": 180}'::jsonb),
  ('Distance maximale', 'distance_max', '{"max_km": 100}'::jsonb)
ON CONFLICT DO NOTHING;

-- Créer quelques données de test
INSERT INTO public.bus (numero_bus, immatriculation, capacite, type_bus, statut) VALUES
  ('Bus #12', 'ABC-123-XY', 50, 'standard', 'en_service'),
  ('Bus #08', 'DEF-456-ZW', 45, 'climatise', 'en_service'),
  ('Bus #05', 'GHI-789-VU', 40, 'standard', 'disponible')
ON CONFLICT DO NOTHING;

INSERT INTO public.passagers (nom, prenom, email, telephone, adresse_complete, latitude, longitude, ville) VALUES
  ('Dupont', 'Jean', 'jean.dupont@example.com', '0601020304', '123 Rue de Paris, 75001 Paris', 48.8566, 2.3522, 'Paris'),
  ('Martin', 'Marie', 'marie.martin@example.com', '0605060708', '456 Avenue des Champs, 75008 Paris', 48.8738, 2.2950, 'Paris')
ON CONFLICT DO NOTHING;

-- Afficher un résumé
SELECT 'Migration terminée avec succès!' as message;
SELECT 'Tables créées:' as info;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('passagers', 'bus', 'tournees', 'arrets', 'inscriptions', 'positions_gps', 'evenements', 'contraintes_optimisation');
