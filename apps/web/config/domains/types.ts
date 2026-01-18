/**
 * Types pour la configuration des domaines
 * Système de configuration dynamique multi-domaine
 */

export type DomainType =
  | 'school_transport'
  | 'logistics'
  | 'urban_transit'
  | 'medical_transport'
  | 'waste_collection'
  | 'custom';

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
  | 'textarea';

export interface DomainField {
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[];
  default?: any;
  placeholder?: string;
  helpText?: string;
}

export interface DomainLabels {
  vehicle: string;
  vehicles: string;
  cargo: string;
  cargos: string;
  mission: string;
  missions: string;
  location: string;
  locations: string;
}

export interface DomainConstraints {
  [key: string]: any;
}

export interface DomainKPI {
  key: string;
  label: string;
  unit: string;
  target: number;
  description?: string;
}

export interface DomainColors {
  primary: string;
  success: string;
  warning: string;
  danger: string;
}

export interface DomainFeatures {
  realTimeTracking: boolean;
  routeOptimization: boolean;
  notifications: boolean;
  reports: boolean;
  proofOfService: boolean;
  scheduling: boolean;
  maintenance: boolean;
  analytics: boolean;
  multiStop: boolean;
  timeWindows: boolean;
  capacityManagement: boolean;
  driverManagement: boolean;
  customerPortal: boolean;
  mobileApp: boolean;
  apiAccess: boolean;
  webhooks: boolean;
}

export interface DomainNotifications {
  email: boolean;
  sms: boolean;
  push: boolean;
  webhook: boolean;
  events: string[];
}

export interface DomainIntegrations {
  gps: boolean;
  erp: boolean;
  crm: boolean;
  accounting: boolean;
  customApi: boolean;
}

export interface DomainBranding {
  primaryColor: string;
  secondaryColor: string;
  logo?: string;
  favicon?: string;
  customCSS?: string;
}

export interface DomainLocalization {
  defaultLanguage: string;
  supportedLanguages: string[];
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  distanceUnit: 'km' | 'miles';
}

export interface DomainConfig {
  domain: DomainType;
  name: string;
  description: string;
  icon: string;
  labels: DomainLabels;
  cargoFields: DomainField[];
  vehicleFields: DomainField[];
  locationFields?: DomainField[];
  missionFields?: DomainField[];
  constraints: DomainConstraints;
  kpis: DomainKPI[];
  colors?: DomainColors;
  features?: Partial<DomainFeatures>;
  notifications?: Partial<DomainNotifications>;
  integrations?: Partial<DomainIntegrations>;
  branding?: Partial<DomainBranding>;
  localization?: Partial<DomainLocalization>;
  workflows?: DomainWorkflow[];
  statuses?: DomainStatus[];
}

export interface DomainWorkflow {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  actions: string[];
  enabled: boolean;
}

export interface DomainStatus {
  id: string;
  label: string;
  color: string;
  icon?: string;
  order: number;
  isFinal: boolean;
}

export interface Organization {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  domain_type: DomainType;
  domain_config: DomainConfig;
  description?: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
  status: 'active' | 'suspended' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'manager' | 'member';
  permissions: string[];
  joined_at?: string;
  created_at: string;
  updated_at: string;
}
