/**
 * Système de configuration des types d'éléments
 * Entièrement personnalisable par le client
 */

export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'textarea'
  | 'color'
  | 'coordinates';

export interface CustomField {
  id: string;
  name: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  min?: number;
  max?: number;
  defaultValue?: any;
}

export type ElementCategory = 'vehicle' | 'site' | 'item';

export interface ElementTypeConfig {
  id: string;
  name: string;
  namePlural: string;
  category: ElementCategory;
  icon: string;
  color: string;
  description?: string;
  fields: CustomField[];
  isDefault?: boolean;
}

export interface OrganizationConfig {
  id: string;
  organization_id: string;

  // Labels personnalisés
  labels: {
    vehicle: string;
    vehiclePlural: string;
    site: string;
    sitePlural: string;
    item: string;
    itemPlural: string;
    mission: string;
    missionPlural: string;
  };

  // Types d'éléments définis par l'utilisateur
  vehicleTypes: ElementTypeConfig[];
  siteTypes: ElementTypeConfig[];
  itemTypes: ElementTypeConfig[];

  // Paramètres généraux
  settings: {
    defaultMapCenter: [number, number];
    defaultZoom: number;
    distanceUnit: 'km' | 'miles';
    currency: string;
    timezone: string;
    language: string;
  };

  created_at: string;
  updated_at: string;
}

// Configuration par défaut pour une nouvelle organisation
export const DEFAULT_ORGANIZATION_CONFIG: Omit<OrganizationConfig, 'id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  labels: {
    vehicle: 'Véhicule',
    vehiclePlural: 'Véhicules',
    site: 'Site',
    sitePlural: 'Sites',
    item: 'Élément',
    itemPlural: 'Éléments',
    mission: 'Mission',
    missionPlural: 'Missions',
  },

  vehicleTypes: [
    {
      id: 'default_vehicle',
      name: 'Véhicule',
      namePlural: 'Véhicules',
      category: 'vehicle',
      icon: 'truck',
      color: '#3b82f6',
      description: 'Type de véhicule par défaut',
      isDefault: true,
      fields: [
        {
          id: 'name',
          name: 'name',
          type: 'text',
          label: 'Nom',
          required: true,
          placeholder: 'Ex: Véhicule 01',
        },
        {
          id: 'identifier',
          name: 'identifier',
          type: 'text',
          label: 'Identifiant',
          required: false,
          placeholder: 'Ex: ABC-123',
        },
        {
          id: 'capacity',
          name: 'capacity',
          type: 'number',
          label: 'Capacité',
          required: false,
          min: 1,
          max: 1000,
        },
      ],
    },
  ],

  siteTypes: [
    {
      id: 'default_depot',
      name: 'Dépôt',
      namePlural: 'Dépôts',
      category: 'site',
      icon: 'warehouse',
      color: '#10b981',
      description: 'Point de départ/arrivée des missions',
      isDefault: true,
      fields: [
        {
          id: 'name',
          name: 'name',
          type: 'text',
          label: 'Nom',
          required: true,
          placeholder: 'Ex: Dépôt Central',
        },
        {
          id: 'address',
          name: 'address',
          type: 'text',
          label: 'Adresse',
          required: true,
          placeholder: 'Ex: 123 Rue Example, Ville',
        },
      ],
    },
    {
      id: 'default_point',
      name: 'Point',
      namePlural: 'Points',
      category: 'site',
      icon: 'map-pin',
      color: '#f59e0b',
      description: 'Point de collecte ou livraison',
      fields: [
        {
          id: 'name',
          name: 'name',
          type: 'text',
          label: 'Nom',
          required: true,
          placeholder: 'Ex: Point A',
        },
        {
          id: 'address',
          name: 'address',
          type: 'text',
          label: 'Adresse',
          required: true,
          placeholder: 'Ex: 456 Avenue Example, Ville',
        },
      ],
    },
  ],

  itemTypes: [
    {
      id: 'default_item',
      name: 'Élément',
      namePlural: 'Éléments',
      category: 'item',
      icon: 'package',
      color: '#8b5cf6',
      description: 'Élément à transporter',
      isDefault: true,
      fields: [
        {
          id: 'name',
          name: 'name',
          type: 'text',
          label: 'Nom',
          required: true,
          placeholder: 'Ex: Colis 001',
        },
        {
          id: 'description',
          name: 'description',
          type: 'textarea',
          label: 'Description',
          required: false,
          placeholder: 'Description de l\'élément...',
        },
        {
          id: 'priority',
          name: 'priority',
          type: 'select',
          label: 'Priorité',
          required: false,
          options: ['Urgent', 'Normal', 'Basse'],
          defaultValue: 'Normal',
        },
      ],
    },
  ],

  settings: {
    defaultMapCenter: [48.8566, 2.3522], // Paris
    defaultZoom: 13,
    distanceUnit: 'km',
    currency: 'EUR',
    timezone: 'Europe/Paris',
    language: 'fr',
  },
};

// Fonctions utilitaires
export function getElementTypeById(
  config: OrganizationConfig,
  category: ElementCategory,
  typeId: string
): ElementTypeConfig | undefined {
  const types = category === 'vehicle'
    ? config.vehicleTypes
    : category === 'site'
    ? config.siteTypes
    : config.itemTypes;

  return types.find(t => t.id === typeId);
}

export function getDefaultElementType(
  config: OrganizationConfig,
  category: ElementCategory
): ElementTypeConfig | undefined {
  const types = category === 'vehicle'
    ? config.vehicleTypes
    : category === 'site'
    ? config.siteTypes
    : config.itemTypes;

  return types.find(t => t.isDefault) || types[0];
}

export function getAllElementTypes(
  config: OrganizationConfig,
  category: ElementCategory
): ElementTypeConfig[] {
  return category === 'vehicle'
    ? config.vehicleTypes
    : category === 'site'
    ? config.siteTypes
    : config.itemTypes;
}
