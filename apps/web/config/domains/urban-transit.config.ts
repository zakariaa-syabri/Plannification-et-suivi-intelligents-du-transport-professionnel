/**
 * Configuration pour le domaine Transport Urbain
 */

import type { DomainConfig } from './types';

export const URBAN_TRANSIT_CONFIG: DomainConfig = {
  domain: 'urban_transit',
  name: 'Transport Urbain',
  description:
    'Gestion de lignes de transport public avec horaires fixes et fréquences régulières',
  icon: '🚍',

  labels: {
    vehicle: 'Bus',
    vehicles: 'Bus',
    cargo: 'Passagers',
    cargos: 'Passagers',
    mission: 'Ligne',
    missions: 'Lignes',
    location: 'Station',
    locations: 'Stations',
  },

  cargoFields: [
    {
      name: 'passenger_count',
      type: 'number',
      label: 'Nombre de passagers',
      min: 0,
      helpText: 'Comptage anonyme des passagers',
    },
    {
      name: 'ticket_type',
      type: 'select',
      label: 'Type de ticket',
      options: [
        'Ticket simple',
        'Carnet 10 voyages',
        'Pass mensuel',
        'Pass annuel',
        'Tarif réduit',
        'Gratuit',
      ],
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
      name: 'ligne_numero',
      type: 'text',
      label: 'Numéro de ligne',
      required: true,
      placeholder: '12, A, C3...',
    },
    {
      name: 'capacite_assise',
      type: 'number',
      label: 'Capacité assise',
      required: true,
      min: 20,
      max: 100,
    },
    {
      name: 'capacite_debout',
      type: 'number',
      label: 'Capacité debout',
      required: true,
      min: 0,
      max: 150,
    },
    {
      name: 'accessibilite_pmr',
      type: 'boolean',
      label: 'Accessibilité PMR',
      default: true,
      helpText: 'Personnes à mobilité réduite',
    },
    {
      name: 'type_vehicule',
      type: 'select',
      label: 'Type de véhicule',
      options: ['Bus standard', 'Bus articulé', 'Tramway', 'Trolleybus'],
    },
    {
      name: 'climatisation',
      type: 'boolean',
      label: 'Climatisation',
      default: false,
    },
    {
      name: 'wifi',
      type: 'boolean',
      label: 'Wi-Fi à bord',
      default: false,
    },
    {
      name: 'equipements',
      type: 'multiselect',
      label: 'Équipements',
      options: [
        'Rampe PMR',
        'Caméras de surveillance',
        'Écrans d\'information',
        'Validation sans contact',
        'Prises USB',
        'Annonces sonores',
      ],
    },
  ],

  constraints: {
    fixedSchedule: true,
    frequencyMinutes: 15,
    maxStopsPerLine: 30,
    accessibilityRequired: true,
    maxDeviationMinutes: 3,
    bufferTimeAtStops: 1,
  },

  kpis: [
    {
      key: 'punctuality',
      label: 'Ponctualité',
      unit: '%',
      target: 92,
      description: 'Respect des horaires (écart < 3 min)',
    },
    {
      key: 'ridership',
      label: 'Fréquentation',
      unit: 'passagers/jour',
      target: 50000,
      description: 'Nombre moyen de passagers par jour',
    },
    {
      key: 'frequency_compliance',
      label: 'Respect de la fréquence',
      unit: '%',
      target: 95,
      description: 'Respect des intervalles entre passages',
    },
    {
      key: 'service_quality',
      label: 'Qualité de service',
      unit: '/10',
      target: 8,
      description: 'Note de satisfaction globale',
    },
  ],

  colors: {
    primary: '#8b5cf6', // Purple
    success: '#10b981', // Green
    warning: '#f59e0b', // Orange
    danger: '#ef4444', // Red
  },

  features: {
    realTimeTracking: true,
    routeOptimization: false, // Horaires fixes
    notifications: true,
    reports: true,
  },
};
