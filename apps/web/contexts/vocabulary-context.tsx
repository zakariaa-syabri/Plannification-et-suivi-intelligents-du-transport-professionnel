'use client';

/**
 * Contexte de vocabulaire personnalisé
 * Fournit les labels et types d'éléments personnalisés pour l'organisation
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useUser } from '@kit/supabase/hooks/use-user';
import type { OrganizationConfig } from '~/config/element-types.config';
import { DEFAULT_ORGANIZATION_CONFIG } from '~/config/element-types.config';

interface VocabularyContextType {
  // Labels personnalisés
  labels: OrganizationConfig['labels'];

  // Configuration complète
  config: OrganizationConfig | null;

  // État de chargement
  isLoading: boolean;
  error: Error | null;

  // Organisation
  organizationId: string | null;
  organizationName: string | null;
  domainType: string | null;

  // Fonctions helper
  getLabel: (key: keyof OrganizationConfig['labels']) => string;
  getVehicleTypes: () => OrganizationConfig['vehicleTypes'];
  getSiteTypes: () => OrganizationConfig['siteTypes'];
  getItemTypes: () => OrganizationConfig['itemTypes'];

  // Recharger la configuration
  refresh: () => Promise<void>;
}

const VocabularyContext = createContext<VocabularyContextType | null>(null);

export function VocabularyProvider({ children }: { children: ReactNode }) {
  const user = useUser();
  const [config, setConfig] = useState<OrganizationConfig | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [domainType, setDomainType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadConfig = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();

      // Récupérer l'organisation de l'utilisateur
      const { data: membership, error: membershipError } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations (
            id,
            name,
            domain_type,
            domain_config
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (membershipError) {
        throw membershipError;
      }

      if (!membership) {
        setIsLoading(false);
        return;
      }

      const orgId = membership.organization_id;
      // @ts-ignore
      const org = membership.organizations;

      setOrganizationId(orgId);
      setOrganizationName(org?.name || null);
      setDomainType(org?.domain_type || null);

      // Récupérer la configuration de l'organisation
      const { data: configData, error: configError } = await supabase
        .from('organization_configs')
        .select('*')
        .eq('organization_id', orgId)
        .single();

      if (configError && configError.code !== 'PGRST116') {
        // PGRST116 = no rows found (configuration n'existe pas encore)
        throw configError;
      }

      if (configData) {
        // Construire la config à partir des données DB
        const fullConfig: OrganizationConfig = {
          id: configData.id,
          organization_id: configData.organization_id,
          labels: configData.labels || DEFAULT_ORGANIZATION_CONFIG.labels,
          vehicleTypes: configData.vehicle_types || DEFAULT_ORGANIZATION_CONFIG.vehicleTypes,
          siteTypes: configData.site_types || DEFAULT_ORGANIZATION_CONFIG.siteTypes,
          itemTypes: configData.item_types || DEFAULT_ORGANIZATION_CONFIG.itemTypes,
          settings: configData.settings || DEFAULT_ORGANIZATION_CONFIG.settings,
          created_at: configData.created_at,
          updated_at: configData.updated_at,
        };
        setConfig(fullConfig);
      } else {
        // Utiliser la config par défaut si pas de config enregistrée
        setConfig({
          id: 'default',
          organization_id: orgId,
          ...DEFAULT_ORGANIZATION_CONFIG,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Erreur chargement configuration:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [user?.id]);

  const getLabel = (key: keyof OrganizationConfig['labels']): string => {
    return config?.labels[key] || DEFAULT_ORGANIZATION_CONFIG.labels[key];
  };

  const getVehicleTypes = () => {
    return config?.vehicleTypes || DEFAULT_ORGANIZATION_CONFIG.vehicleTypes;
  };

  const getSiteTypes = () => {
    return config?.siteTypes || DEFAULT_ORGANIZATION_CONFIG.siteTypes;
  };

  const getItemTypes = () => {
    return config?.itemTypes || DEFAULT_ORGANIZATION_CONFIG.itemTypes;
  };

  const value: VocabularyContextType = {
    labels: config?.labels || DEFAULT_ORGANIZATION_CONFIG.labels,
    config,
    isLoading,
    error,
    organizationId,
    organizationName,
    domainType,
    getLabel,
    getVehicleTypes,
    getSiteTypes,
    getItemTypes,
    refresh: loadConfig,
  };

  return (
    <VocabularyContext.Provider value={value}>
      {children}
    </VocabularyContext.Provider>
  );
}

export function useVocabulary() {
  const context = useContext(VocabularyContext);
  if (!context) {
    throw new Error('useVocabulary must be used within a VocabularyProvider');
  }
  return context;
}

// Hook simplifié pour juste les labels
export function useLabels() {
  const { labels, getLabel, isLoading } = useVocabulary();
  return { labels, getLabel, isLoading };
}
