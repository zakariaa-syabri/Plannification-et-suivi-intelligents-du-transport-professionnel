'use client';

/**
 * Contexte des rôles utilisateur
 * Gère le type d'utilisateur et l'interface associée
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useUser } from '@kit/supabase/hooks/use-user';

// Types d'utilisateurs disponibles
export type UserType =
  | 'admin'       // Administrateur système
  | 'dispatcher'  // Dispatcheur/Planificateur
  | 'driver'      // Chauffeur
  | 'client'      // Client/Passager/Destinataire
  | 'staff'       // Personnel général
  | 'supervisor'; // Superviseur

// Rôles dans l'organisation
export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'member';

export interface UserProfile {
  id: string;
  user_id: string;
  organization_id: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  user_type: UserType;
  is_active: boolean;
  license_number?: string | null;
  license_expiry?: string | null;
  vehicle_assigned_id?: string | null;
  notification_preferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  language: string;
  timezone: string;
}

interface UserRoleContextType {
  // Profil utilisateur
  profile: UserProfile | null;

  // Type d'utilisateur (détermine l'interface)
  userType: UserType;

  // Rôle dans l'organisation
  organizationRole: OrganizationRole | null;

  // État
  isLoading: boolean;
  error: Error | null;

  // Vérifications de permissions
  isAdmin: boolean;
  isDispatcher: boolean;
  isDriver: boolean;
  isClient: boolean;
  isSupervisor: boolean;

  // Permissions combinées
  canManageUsers: boolean;
  canCreateMissions: boolean;
  canAssignMissions: boolean;
  canViewAllMissions: boolean;
  canUpdateMissionStatus: boolean;

  // Actions
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
}

const UserRoleContext = createContext<UserRoleContextType | null>(null);

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const user = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organizationRole, setOrganizationRole] = useState<OrganizationRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProfile = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔄 [CONTEXT] Chargement du profil utilisateur...');
      const supabase = getSupabaseBrowserClient();

      // Récupérer le membership de l'utilisateur (pour le user_type et le rôle)
      console.log('🔍 [CONTEXT] Requête organization_members pour user_id:', user.id);
      const { data: membershipData, error: membershipError } = await supabase
        .from('organization_members')
        .select('role, user_type, organization_id')
        .eq('user_id', user.id)
        .eq('approved', true)
        .maybeSingle();

      if (membershipError && membershipError.code !== 'PGRST116') {
        console.warn('⚠️ [CONTEXT] Erreur chargement membership:', membershipError);
      }

      if (membershipData) {
        console.log('✅ [CONTEXT] Membership trouvé:', {
          user_type: membershipData.user_type,
          role: membershipData.role,
          organization_id: membershipData.organization_id,
        });
      } else {
        console.warn('⚠️ [CONTEXT] Aucun membership trouvé');
      }

      // Récupérer le profil utilisateur complet si disponible
      console.log('🔍 [CONTEXT] Requête user_profiles pour user_id:', user.id);
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('⚠️ [CONTEXT] Erreur chargement profil:', profileError);
      }

      if (profileData) {
        console.log('✅ [CONTEXT] Profil trouvé:', {
          user_type: profileData.user_type,
          display_name: profileData.display_name,
          organization_id: profileData.organization_id,
        });
      } else {
        console.warn('⚠️ [CONTEXT] Aucun profil trouvé');
      }

      // Construire le profil avec les données disponibles
      // IMPORTANT: Lire user_type depuis user_profiles EN PREMIER (source de vérité)
      // car organization_members.user_type peut ne pas exister dans les anciennes migrations
      // Priorité: profile > membership > default
      const detectedUserType = (profileData?.user_type || membershipData?.user_type || 'staff') as UserType;
      console.log('👤 [CONTEXT] User type détecté:', detectedUserType);

      const profile: Partial<UserProfile> = {
        user_id: user.id,
        id: profileData?.id || user.id,
        display_name: profileData?.display_name || user.email?.split('@')[0] || 'Utilisateur',
        organization_id: membershipData?.organization_id || profileData?.organization_id || null,
        user_type: detectedUserType,
        is_active: profileData?.is_active ?? true,
        notification_preferences: profileData?.notification_preferences || {
          email: true,
          push: true,
          sms: false,
        },
        language: profileData?.language || 'fr',
        timezone: profileData?.timezone || 'Europe/Paris',
        first_name: profileData?.first_name || null,
        last_name: profileData?.last_name || null,
        avatar_url: profileData?.avatar_url || null,
        phone: profileData?.phone || null,
      };

      console.log('✅ [CONTEXT] Profil construit:', {
        user_type: profile.user_type,
        organization_id: profile.organization_id,
      });

      setProfile(profile as UserProfile);

      if (membershipData) {
        setOrganizationRole(membershipData.role as OrganizationRole);
      }
    } catch (err) {
      console.error('❌ [CONTEXT] Erreur chargement profil:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
      console.log('✅ [CONTEXT] Chargement du profil terminé');
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!user?.id || !profile) return false;

    try {
      const supabase = getSupabaseBrowserClient();

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (err) {
      console.error('Erreur mise à jour profil:', err);
      return false;
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user?.id]);

  // IMPORTANT: Si l'utilisateur est owner ou admin de l'organisation,
  // son userType effectif est 'admin' même si user_profiles.user_type dit autre chose
  const rawUserType = profile?.user_type || 'staff';
  const isOrgOwnerOrAdmin = organizationRole === 'owner' || organizationRole === 'admin';
  const userType: UserType = isOrgOwnerOrAdmin ? 'admin' : rawUserType;

  console.log('👤 [CONTEXT] UserType calculé:', {
    rawUserType,
    organizationRole,
    isOrgOwnerOrAdmin,
    effectiveUserType: userType,
  });

  // Calcul des permissions
  const isAdmin = userType === 'admin';
  const isDispatcher = userType === 'dispatcher' || isAdmin;
  const isDriver = userType === 'driver';
  const isClient = userType === 'client';
  const isSupervisor = userType === 'supervisor' || isAdmin;

  const canManageUsers = isAdmin;
  const canCreateMissions = isDispatcher || isAdmin;
  const canAssignMissions = isDispatcher || isAdmin;
  const canViewAllMissions = isDispatcher || isAdmin || isSupervisor;
  const canUpdateMissionStatus = isDriver || isDispatcher || isAdmin;

  const value: UserRoleContextType = {
    profile,
    userType,
    organizationRole,
    isLoading,
    error,
    isAdmin,
    isDispatcher,
    isDriver,
    isClient,
    isSupervisor,
    canManageUsers,
    canCreateMissions,
    canAssignMissions,
    canViewAllMissions,
    canUpdateMissionStatus,
    refreshProfile: loadProfile,
    updateProfile,
  };

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}

// Hook pour vérifier une permission spécifique
export function usePermission(permission: keyof Pick<
  UserRoleContextType,
  'canManageUsers' | 'canCreateMissions' | 'canAssignMissions' | 'canViewAllMissions' | 'canUpdateMissionStatus'
>) {
  const { [permission]: hasPermission, isLoading } = useUserRole();
  return { hasPermission, isLoading };
}
