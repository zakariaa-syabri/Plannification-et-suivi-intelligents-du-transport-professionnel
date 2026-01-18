-- Créer la table inscriptions avec la bonne syntaxe
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

-- Créer un index unique sur passager_id, tournee_id et la date (sans l'heure)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inscriptions_unique
ON public.inscriptions(passager_id, tournee_id, (date_inscription::date));

-- Créer les index standard
CREATE INDEX IF NOT EXISTS idx_inscriptions_passager ON public.inscriptions(passager_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_tournee ON public.inscriptions(tournee_id);

-- Créer le trigger pour updated_at
CREATE TRIGGER update_inscriptions_updated_at BEFORE UPDATE ON public.inscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vérifier que toutes les tables sont créées
SELECT 'Table inscriptions créée avec succès!' as message;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('passagers', 'bus', 'tournees', 'arrets', 'inscriptions', 'positions_gps', 'evenements', 'contraintes_optimisation')
ORDER BY table_name;
