/**
 * Configuration des domaines - Index et utilitaires
 * Système de configuration multi-domaine
 */

import type { DomainConfig, DomainType } from './types';
import { SCHOOL_TRANSPORT_CONFIG } from './school-transport.config';
import { LOGISTICS_CONFIG } from './logistics.config';
import { URBAN_TRANSIT_CONFIG } from './urban-transit.config';

// Export des types
export * from './types';

// Export des configurations
export { SCHOOL_TRANSPORT_CONFIG } from './school-transport.config';
export { LOGISTICS_CONFIG } from './logistics.config';
export { URBAN_TRANSIT_CONFIG } from './urban-transit.config';

/**
 * Map de toutes les configurations de domaines disponibles
 */
export const DOMAIN_CONFIGS: Record<DomainType, DomainConfig | null> = {
  school_transport: SCHOOL_TRANSPORT_CONFIG,
  logistics: LOGISTICS_CONFIG,
  urban_transit: URBAN_TRANSIT_CONFIG,
  medical_transport: null, // À implémenter
  waste_collection: null, // À implémenter
  custom: null, // Configuration personnalisée
};

/**
 * Liste des domaines disponibles pour la sélection
 */
export const AVAILABLE_DOMAINS: Array<{
  type: DomainType;
  config: DomainConfig;
}> = [
  { type: 'school_transport', config: SCHOOL_TRANSPORT_CONFIG },
  { type: 'logistics', config: LOGISTICS_CONFIG },
  { type: 'urban_transit', config: URBAN_TRANSIT_CONFIG },
];

/**
 * Récupère la configuration d'un domaine par son type
 */
export function getDomainConfig(domainType: DomainType): DomainConfig | null {
  return DOMAIN_CONFIGS[domainType];
}

/**
 * Vérifie si un domaine est disponible
 */
export function isDomainAvailable(domainType: DomainType): boolean {
  return DOMAIN_CONFIGS[domainType] !== null;
}

/**
 * Récupère les labels d'un domaine
 */
export function getDomainLabels(domainType: DomainType) {
  const config = getDomainConfig(domainType);
  return config?.labels ?? {
    vehicle: 'Véhicule',
    vehicles: 'Véhicules',
    cargo: 'Cargo',
    cargos: 'Cargos',
    mission: 'Mission',
    missions: 'Missions',
    location: 'Localisation',
    locations: 'Localisations',
  };
}

/**
 * Récupère les champs de cargo d'un domaine
 */
export function getCargoFields(domainType: DomainType) {
  const config = getDomainConfig(domainType);
  return config?.cargoFields ?? [];
}

/**
 * Récupère les champs de véhicule d'un domaine
 */
export function getVehicleFields(domainType: DomainType) {
  const config = getDomainConfig(domainType);
  return config?.vehicleFields ?? [];
}

/**
 * Récupère les KPIs d'un domaine
 */
export function getDomainKPIs(domainType: DomainType) {
  const config = getDomainConfig(domainType);
  return config?.kpis ?? [];
}

/**
 * Récupère les contraintes d'un domaine
 */
export function getDomainConstraints(domainType: DomainType) {
  const config = getDomainConfig(domainType);
  return config?.constraints ?? {};
}

/**
 * Récupère les couleurs d'un domaine
 */
export function getDomainColors(domainType: DomainType) {
  const config = getDomainConfig(domainType);
  return (
    config?.colors ?? {
      primary: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
    }
  );
}

/**
 * Récupère les features activées pour un domaine
 */
export function getDomainFeatures(domainType: DomainType) {
  const config = getDomainConfig(domainType);
  return (
    config?.features ?? {
      realTimeTracking: true,
      routeOptimization: true,
      notifications: true,
      reports: true,
    }
  );
}

/**
 * Génère un slug unique pour une organisation
 */
export function generateOrganizationSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Retire les accents
    .replace(/[^a-z0-9]+/g, '-') // Remplace les caractères spéciaux par des tirets
    .replace(/^-+|-+$/g, '') // Retire les tirets au début et à la fin
    .substring(0, 50); // Limite la longueur
}

/**
 * Valide une configuration de domaine
 */
export function validateDomainConfig(config: Partial<DomainConfig>): boolean {
  if (!config.domain || !config.name || !config.labels) {
    return false;
  }

  if (!config.cargoFields || !Array.isArray(config.cargoFields)) {
    return false;
  }

  if (!config.vehicleFields || !Array.isArray(config.vehicleFields)) {
    return false;
  }

  return true;
}
