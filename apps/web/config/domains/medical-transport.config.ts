/**
 * Configuration pour le domaine Transport Médical
 */

import type { DomainConfig } from './types';

export const MEDICAL_TRANSPORT_CONFIG: DomainConfig = {
  domain: 'medical_transport',
  name: 'Transport Médical',
  description:
    'Transport sanitaire de patients avec gestion des urgences, équipements médicaux et personnel soignant',
  icon: '🚑',

  labels: {
    vehicle: 'Ambulance',
    vehicles: 'Ambulances',
    cargo: 'Patient',
    cargos: 'Patients',
    mission: 'Transport',
    missions: 'Transports',
    location: 'Établissement',
    locations: 'Établissements',
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
      name: 'date_naissance',
      type: 'date',
      label: 'Date de naissance',
      required: true,
    },
    {
      name: 'numero_secu',
      type: 'text',
      label: 'Numéro de sécurité sociale',
      required: true,
      placeholder: '1 XX XX XX XXX XXX XX',
    },
    {
      name: 'contact_urgence',
      type: 'phone',
      label: 'Contact d\'urgence',
      required: true,
      placeholder: '+33 6 12 34 56 78',
    },
    {
      name: 'mobilite',
      type: 'select',
      label: 'Niveau de mobilité',
      required: true,
      options: ['Assis', 'Allongé', 'Fauteuil roulant', 'Brancard'],
    },
    {
      name: 'pathologie',
      type: 'text',
      label: 'Pathologie principale',
      placeholder: 'Dialyse, Chimiothérapie...',
    },
    {
      name: 'oxygene',
      type: 'boolean',
      label: 'Oxygène requis',
      default: false,
    },
    {
      name: 'accompagnant',
      type: 'boolean',
      label: 'Accompagnant autorisé',
      default: false,
    },
    {
      name: 'allergies',
      type: 'textarea',
      label: 'Allergies et contre-indications',
      placeholder: 'Latex, pénicilline...',
    },
    {
      name: 'prescription',
      type: 'text',
      label: 'N° de prescription médicale',
      placeholder: 'PM-2025-XXXXX',
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
      options: ['VSL', 'Ambulance A', 'Ambulance B', 'Ambulance C (SMUR)', 'Taxi conventionné'],
    },
    {
      name: 'agrement_ars',
      type: 'text',
      label: 'N° agrément ARS',
      required: true,
      placeholder: 'ARS-XX-XXXX',
    },
    {
      name: 'capacite_brancards',
      type: 'number',
      label: 'Nombre de brancards',
      min: 0,
      max: 2,
    },
    {
      name: 'capacite_fauteuils',
      type: 'number',
      label: 'Places fauteuil roulant',
      min: 0,
      max: 4,
    },
    {
      name: 'equipements_medicaux',
      type: 'multiselect',
      label: 'Équipements médicaux',
      options: [
        'Défibrillateur',
        'Oxygène',
        'Aspirateur de mucosités',
        'Monitoring cardiaque',
        'Pousse-seringue',
        'Matelas coquille',
        'Attelles',
      ],
    },
    {
      name: 'personnel_minimum',
      type: 'select',
      label: 'Personnel minimum requis',
      options: ['1 auxiliaire', '1 ambulancier DEA', '2 ambulanciers', 'Équipe SMUR'],
    },
  ],

  locationFields: [
    {
      name: 'type_etablissement',
      type: 'select',
      label: 'Type d\'établissement',
      required: true,
      options: ['Hôpital', 'Clinique', 'EHPAD', 'Centre de dialyse', 'Centre de rééducation', 'Domicile'],
    },
    {
      name: 'service',
      type: 'text',
      label: 'Service / Étage',
      placeholder: 'Oncologie - 3ème étage',
    },
    {
      name: 'contact_etablissement',
      type: 'phone',
      label: 'Téléphone de l\'établissement',
    },
  ],

  constraints: {
    maxWaitTimeMinutes: 15,
    requireMedicalCrew: true,
    priorityLevels: ['P1 - Urgent', 'P2 - Semi-urgent', 'P3 - Programmé'],
    maxDistanceKm: 100,
    returnTripRequired: true,
    hygieneProtocol: true,
    patientConfidentiality: true,
  },

  kpis: [
    {
      key: 'response_time',
      label: 'Temps de réponse',
      unit: 'min',
      target: 15,
      description: 'Délai moyen entre appel et prise en charge',
    },
    {
      key: 'patient_comfort',
      label: 'Confort patient',
      unit: '/5',
      target: 4.5,
      description: 'Note de satisfaction des patients',
    },
    {
      key: 'prescription_compliance',
      label: 'Conformité prescription',
      unit: '%',
      target: 100,
      description: 'Transports conformes à la prescription',
    },
    {
      key: 'equipment_availability',
      label: 'Disponibilité équipements',
      unit: '%',
      target: 98,
      description: 'Équipements médicaux disponibles et fonctionnels',
    },
  ],

  colors: {
    primary: '#dc2626', // Red
    success: '#16a34a', // Green
    warning: '#ea580c', // Orange
    danger: '#7c2d12', // Dark red
  },

  features: {
    realTimeTracking: true,
    routeOptimization: true,
    notifications: true,
    reports: true,
    proofOfService: true,
    scheduling: true,
    maintenance: true,
    driverManagement: true,
    timeWindows: true,
  },

  statuses: [
    { id: 'pending', label: 'En attente', color: '#6b7280', order: 1, isFinal: false },
    { id: 'confirmed', label: 'Confirmé', color: '#3b82f6', order: 2, isFinal: false },
    { id: 'dispatched', label: 'Véhicule envoyé', color: '#8b5cf6', order: 3, isFinal: false },
    { id: 'pickup', label: 'Prise en charge', color: '#f59e0b', order: 4, isFinal: false },
    { id: 'in_transit', label: 'En transit', color: '#06b6d4', order: 5, isFinal: false },
    { id: 'arrived', label: 'Arrivé', color: '#10b981', order: 6, isFinal: false },
    { id: 'completed', label: 'Terminé', color: '#22c55e', order: 7, isFinal: true },
    { id: 'cancelled', label: 'Annulé', color: '#ef4444', order: 8, isFinal: true },
  ],

  notifications: {
    email: true,
    sms: true,
    push: true,
    webhook: false,
    events: [
      'transport_confirmed',
      'vehicle_dispatched',
      'patient_pickup',
      'arrival_destination',
      'transport_completed',
      'delay_alert',
    ],
  },
};
