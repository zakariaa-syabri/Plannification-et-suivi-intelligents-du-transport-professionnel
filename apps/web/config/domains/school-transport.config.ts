/**
 * Configuration pour le domaine Transport Scolaire
 */

import type { DomainConfig } from './types';

export const SCHOOL_TRANSPORT_CONFIG: DomainConfig = {
  domain: 'school_transport',
  name: 'Transport Scolaire',
  description:
    'Gestion du transport scolaire avec optimisation des tournées et suivi en temps réel',
  icon: '🚌',

  labels: {
    vehicle: 'Bus',
    vehicles: 'Bus',
    cargo: 'Élève',
    cargos: 'Élèves',
    mission: 'Tournée',
    missions: 'Tournées',
    location: 'Arrêt',
    locations: 'Arrêts',
  },

  cargoFields: [
    {
      name: 'nom',
      type: 'text',
      label: 'Nom complet',
      required: true,
      placeholder: 'Dupont Jean',
    },
    {
      name: 'age',
      type: 'number',
      label: 'Âge',
      required: true,
      min: 3,
      max: 18,
      helpText: 'Âge de l\'élève (entre 3 et 18 ans)',
    },
    {
      name: 'classe',
      type: 'text',
      label: 'Classe',
      placeholder: 'CE2, 6ème, Terminale...',
    },
    {
      name: 'parent_nom',
      type: 'text',
      label: 'Nom du parent/tuteur',
      required: true,
    },
    {
      name: 'parent_telephone',
      type: 'phone',
      label: 'Téléphone du parent',
      required: true,
      placeholder: '+33 6 12 34 56 78',
    },
    {
      name: 'parent_email',
      type: 'email',
      label: 'Email du parent',
      placeholder: 'parent@example.com',
    },
    {
      name: 'besoins_specifiques',
      type: 'textarea',
      label: 'Besoins spécifiques',
      placeholder: 'Allergies, handicap, traitement médical...',
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
      name: 'capacite',
      type: 'number',
      label: 'Capacité (nombre de places)',
      required: true,
      min: 10,
      max: 80,
    },
    {
      name: 'type_bus',
      type: 'select',
      label: 'Type de bus',
      options: ['Standard', 'Climatisé', 'PMR (Personnes à mobilité réduite)'],
      default: 'Standard',
    },
    {
      name: 'accompagnateur_requis',
      type: 'boolean',
      label: 'Accompagnateur requis',
      default: true,
    },
    {
      name: 'equipements',
      type: 'multiselect',
      label: 'Équipements',
      options: [
        'Ceintures de sécurité',
        'Rehausseurs',
        'Caméras de surveillance',
        'GPS',
        'Climatisation',
      ],
    },
  ],

  constraints: {
    maxTravelTimeMinutes: 45,
    requireAdultSupervision: true,
    maxConsecutivePickups: 10,
    bufferTimeMinutes: 5,
    maxDistanceKm: 50,
    allowBacktracking: false,
  },

  kpis: [
    {
      key: 'punctuality',
      label: 'Ponctualité',
      unit: '%',
      target: 95,
      description: 'Pourcentage d\'arrivées à l\'heure',
    },
    {
      key: 'parent_satisfaction',
      label: 'Satisfaction des parents',
      unit: '/5',
      target: 4.5,
      description: 'Note moyenne de satisfaction',
    },
    {
      key: 'attendance_rate',
      label: 'Taux de présence',
      unit: '%',
      target: 98,
      description: 'Pourcentage d\'élèves présents',
    },
    {
      key: 'average_travel_time',
      label: 'Temps de trajet moyen',
      unit: 'min',
      target: 30,
      description: 'Durée moyenne par élève',
    },
  ],

  colors: {
    primary: '#3b82f6', // Blue
    success: '#10b981', // Green
    warning: '#f59e0b', // Orange
    danger: '#ef4444', // Red
  },

  features: {
    realTimeTracking: true,
    routeOptimization: true,
    notifications: true,
    reports: true,
  },
};
