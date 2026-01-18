/**
 * Configuration pour le domaine Logistique & Livraisons
 */

import type { DomainConfig } from './types';

export const LOGISTICS_CONFIG: DomainConfig = {
  domain: 'logistics',
  name: 'Logistique & Livraisons',
  description:
    'Optimisation des routes de livraison avec gestion des poids, volumes et fenêtres de temps',
  icon: '📦',

  labels: {
    vehicle: 'Camion',
    vehicles: 'Camions',
    cargo: 'Colis',
    cargos: 'Colis',
    mission: 'Route de livraison',
    missions: 'Routes de livraison',
    location: 'Point de livraison',
    locations: 'Points de livraison',
  },

  cargoFields: [
    {
      name: 'reference',
      type: 'text',
      label: 'Référence',
      required: true,
      placeholder: 'CMD-2025-001',
    },
    {
      name: 'poids_kg',
      type: 'number',
      label: 'Poids (kg)',
      required: true,
      min: 0,
      placeholder: '25.5',
    },
    {
      name: 'volume_m3',
      type: 'number',
      label: 'Volume (m³)',
      required: true,
      min: 0,
      placeholder: '0.5',
    },
    {
      name: 'destinataire',
      type: 'text',
      label: 'Destinataire',
      required: true,
      placeholder: 'Entreprise ABC',
    },
    {
      name: 'telephone_destinataire',
      type: 'phone',
      label: 'Téléphone destinataire',
      placeholder: '+33 1 23 45 67 89',
    },
    {
      name: 'email_destinataire',
      type: 'email',
      label: 'Email destinataire',
      placeholder: 'contact@entreprise.com',
    },
    {
      name: 'priorite',
      type: 'select',
      label: 'Priorité',
      options: ['Urgent', 'Standard', 'Économique'],
      default: 'Standard',
    },
    {
      name: 'conditions_stockage',
      type: 'multiselect',
      label: 'Conditions de stockage',
      options: [
        'Fragile',
        'Surgelé (-18°C)',
        'Réfrigéré (2-8°C)',
        'Matière dangereuse',
        'Haut de pile',
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes de livraison',
      placeholder: 'Instructions spéciales pour la livraison...',
    },
  ],

  vehicleFields: [
    {
      name: 'immatriculation',
      type: 'text',
      label: 'Immatriculation',
      required: true,
      placeholder: 'AB-123-CD',
    },
    {
      name: 'type_vehicule',
      type: 'select',
      label: 'Type de véhicule',
      required: true,
      options: ['Fourgon', 'Porteur', 'Semi-remorque', 'Frigorifique'],
    },
    {
      name: 'charge_max_kg',
      type: 'number',
      label: 'Charge maximale (kg)',
      required: true,
      min: 500,
      max: 44000,
    },
    {
      name: 'volume_utile_m3',
      type: 'number',
      label: 'Volume utile (m³)',
      required: true,
      min: 5,
      max: 100,
    },
    {
      name: 'temperature_min',
      type: 'number',
      label: 'Température minimale (°C)',
      placeholder: '-18',
    },
    {
      name: 'temperature_max',
      type: 'number',
      label: 'Température maximale (°C)',
      placeholder: '25',
    },
    {
      name: 'hayon_elevateur',
      type: 'boolean',
      label: 'Hayon élévateur',
      default: false,
    },
    {
      name: 'equipements',
      type: 'multiselect',
      label: 'Équipements',
      options: [
        'GPS',
        'Hayon élévateur',
        'Groupe frigorifique',
        'Sangles d\'arrimage',
        'Diable / Transpalette',
      ],
    },
  ],

  constraints: {
    respectTimeWindows: true,
    maxWeightKg: 20000,
    maxVolumeM3: 100,
    allowMultipleTrips: true,
    maxStopsPerRoute: 30,
    maxDistanceKm: 300,
    priorityFirst: true,
  },

  kpis: [
    {
      key: 'delivery_success_rate',
      label: 'Taux de livraison réussie',
      unit: '%',
      target: 98,
      description: 'Pourcentage de livraisons réussies du premier coup',
    },
    {
      key: 'cost_per_km',
      label: 'Coût au kilomètre',
      unit: '€',
      target: 0.5,
      description: 'Coût moyen par kilomètre parcouru',
    },
    {
      key: 'on_time_delivery',
      label: 'Livraison à l\'heure',
      unit: '%',
      target: 90,
      description: 'Respect des fenêtres de temps',
    },
    {
      key: 'load_efficiency',
      label: 'Efficacité de chargement',
      unit: '%',
      target: 85,
      description: 'Taux d\'utilisation de la capacité',
    },
  ],

  colors: {
    primary: '#f97316', // Orange
    success: '#22c55e', // Green
    warning: '#eab308', // Yellow
    danger: '#dc2626', // Red
  },

  features: {
    realTimeTracking: true,
    routeOptimization: true,
    notifications: true,
    reports: true,
  },
};
