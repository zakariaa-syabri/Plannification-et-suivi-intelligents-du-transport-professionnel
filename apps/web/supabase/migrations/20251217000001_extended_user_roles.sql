-- Migration: Rôles utilisateurs étendus et interfaces par rôle
-- Date: 2025-12-17

-- ===========================================
-- 1. TABLE: user_profiles (Profils utilisateurs enrichis)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Informations personnelles
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  display_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(50),

  -- Type d'utilisateur (détermine l'interface)
  user_type VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (user_type IN (
    'admin',           -- Administrateur système
    'dispatcher',      -- Dispatcheur/Planificateur
    'driver',          -- Chauffeur
    'client',          -- Client/Passager/Destinataire
    'staff',           -- Personnel général
    'supervisor'       -- Superviseur
  )),

  -- Configuration spécifique au type
  type_config JSONB DEFAULT '{}'::jsonb,

  -- Pour les chauffeurs
  license_number VARCHAR(100),
  license_expiry DATE,
  vehicle_assigned_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,

  -- Pour les clients/passagers
  pickup_site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  delivery_site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,

  -- Préférences
  notification_preferences JSONB DEFAULT '{
    "email": true,
    "push": true,
    "sms": false
  }'::jsonb,
  language VARCHAR(10) DEFAULT 'fr',
  timezone VARCHAR(50) DEFAULT 'Europe/Paris',

  -- État
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON public.user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_type ON public.user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON public.user_profiles(is_active) WHERE is_active = true;

-- ===========================================
-- 2. TABLE: invitations (Invitations utilisateurs)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,

  -- Destinataire
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),

  -- Rôle proposé
  role VARCHAR(50) DEFAULT 'member',
  user_type VARCHAR(50) DEFAULT 'staff',

  -- Token unique pour l'invitation
  token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,

  -- État
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),

  -- Dates
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Qui a invité
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);

-- ===========================================
-- 3. TABLE: missions (Missions assignées)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,

  -- Identification
  reference VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Route associée
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,

  -- Chauffeur assigné
  driver_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,

  -- Planning
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  estimated_end_time TIME,

  -- État
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN (
    'draft',          -- Brouillon
    'planned',        -- Planifiée
    'assigned',       -- Assignée à un chauffeur
    'accepted',       -- Acceptée par le chauffeur
    'in_progress',    -- En cours
    'completed',      -- Terminée
    'cancelled'       -- Annulée
  )),

  -- Statistiques réelles
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  actual_distance_km DOUBLE PRECISION,

  -- Notes et feedback
  dispatcher_notes TEXT,
  driver_notes TEXT,
  completion_notes TEXT,

  -- Priorité
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),

  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_missions_org ON public.missions(organization_id);
CREATE INDEX IF NOT EXISTS idx_missions_driver ON public.missions(driver_id);
CREATE INDEX IF NOT EXISTS idx_missions_date ON public.missions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_missions_status ON public.missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_reference ON public.missions(organization_id, reference);

-- ===========================================
-- 4. TABLE: notifications (Notifications temps réel)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Type et contenu
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,

  -- Liens
  link_type VARCHAR(50), -- 'mission', 'route', 'vehicle', etc.
  link_id UUID,

  -- État
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- ===========================================
-- 5. RLS POLICIES
-- ===========================================

-- User Profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Org members can view profiles in their org"
  ON public.user_profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage profiles"
  ON public.user_profiles FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Missions
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view missions"
  ON public.missions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Dispatchers can manage missions"
  ON public.missions FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "Drivers can update assigned missions"
  ON public.missions FOR UPDATE
  USING (
    driver_id IN (
      SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  );

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ===========================================
-- 6. FUNCTIONS: Créer une notification
-- ===========================================
CREATE OR REPLACE FUNCTION notify_user(
  p_user_id UUID,
  p_org_id UUID,
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT DEFAULT NULL,
  p_link_type VARCHAR(50) DEFAULT NULL,
  p_link_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    organization_id, user_id, notification_type, title, message, link_type, link_id
  ) VALUES (
    p_org_id, p_user_id, p_type, p_title, p_message, p_link_type, p_link_id
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 7. TRIGGER: Notifier le chauffeur lors de l'assignation
-- ===========================================
CREATE OR REPLACE FUNCTION notify_driver_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_user_id UUID;
  v_mission_name VARCHAR(255);
BEGIN
  -- Seulement si le driver_id a changé et n'est pas NULL
  IF NEW.driver_id IS NOT NULL AND (OLD.driver_id IS NULL OR OLD.driver_id != NEW.driver_id) THEN
    -- Récupérer l'user_id du chauffeur
    SELECT user_id INTO v_driver_user_id
    FROM public.user_profiles
    WHERE id = NEW.driver_id;

    IF v_driver_user_id IS NOT NULL THEN
      PERFORM notify_user(
        v_driver_user_id,
        NEW.organization_id,
        'mission_assigned',
        'Nouvelle mission assignée',
        'La mission "' || NEW.name || '" vous a été assignée.',
        'mission',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_driver_on_assignment
  AFTER INSERT OR UPDATE OF driver_id ON public.missions
  FOR EACH ROW
  EXECUTE FUNCTION notify_driver_on_assignment();

-- ===========================================
-- 8. TRIGGER: Créer profil utilisateur automatiquement
-- ===========================================
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Ce trigger doit être créé sur auth.users, mais Supabase le gère via les hooks

-- ===========================================
-- 9. Mise à jour de organization_members pour le user_type
-- ===========================================
ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'staff';

-- Commentaires
COMMENT ON TABLE public.user_profiles IS 'Profils utilisateurs avec type (admin, driver, client, etc.)';
COMMENT ON TABLE public.missions IS 'Missions assignées aux chauffeurs';
COMMENT ON TABLE public.notifications IS 'Notifications temps réel pour les utilisateurs';
COMMENT ON COLUMN public.user_profiles.user_type IS 'Type d''utilisateur: admin, dispatcher, driver, client, staff, supervisor';
