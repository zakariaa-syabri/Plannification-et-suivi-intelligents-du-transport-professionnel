/**
 * Configuration Centralisée des Icônes
 * Inspiré de Onfleet, Samsara, Route4Me, Circuit, Tookan
 * Utilise Lucide React - Icônes professionnelles
 */

import {
  // Navigation & Structure
  Home,
  LayoutDashboard,
  Map,
  MapPin,
  MapPinned,
  Route,
  Settings,
  Users,
  Building2,

  // Domaines de Transport
  Bus,
  Truck,
  Package,
  PackageCheck,
  School,
  Plane,
  Train,
  Car,
  Bike,
  Warehouse,

  // Cargos/Passagers
  User,
  UserCircle,
  Users2,
  UserCheck,
  UserPlus,
  Baby,
  PersonStanding,
  Backpack,
  ShoppingBag,
  Box,

  // Véhicules & Flotte
  TruckIcon,
  Ambulance,
  CarFront,
  BusFront,

  // Missions & Routes
  Navigation,
  RouteOff,
  MapPinOff,
  Compass,
  Timer,
  Clock,
  Calendar,
  CalendarDays,

  // Dashboard & Analytics
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,
  Gauge,
  Target,

  // Statuts & États
  CircleCheck,
  CircleX,
  CircleAlert,
  CirclePause,
  CircleDot,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,

  // Actions CRUD
  Plus,
  Edit,
  Trash2,
  Save,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Search,
  Filter,

  // Localisation & GPS
  MapPinIcon,
  Navigation2,
  Locate,
  LocateFixed,
  Radio,
  Crosshair,

  // Communication
  Bell,
  BellRing,
  BellOff,
  Mail,
  MessageSquare,
  Phone,

  // Optimisation
  Zap,
  Sparkles,
  Wand2,
  Brain,

  // Temps & Planning
  CalendarClock,
  AlarmClock,
  Hourglass,
  StopCircle,
  PlayCircle,

  // Documents & Exports
  FileText,
  File,
  FileSpreadsheet,
  Printer,
  Share2,

  // Paramètres & Config
  Sliders,
  Settings2,
  Wrench,
  Cog,

  // Sécurité
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  Eye,
  EyeOff,

  // Navigation UI
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Menu,
  X,
  MoreVertical,
  MoreHorizontal,

  // États & Feedback
  Loader2,
  CheckCheck,
  AlertTriangle,
  HelpCircle,

  // Performance
  Fuel,
  Battery,
  Zap as Lightning,

  type LucideIcon,
} from 'lucide-react';

/**
 * Catégories d'icônes organisées par contexte
 */

// ============================================
// 1. NAVIGATION PRINCIPALE
// ============================================
export const NavigationIcons = {
  home: Home,
  dashboard: LayoutDashboard,
  map: Map,
  routes: Route,
  fleet: Truck,
  team: Users,
  settings: Settings,
  organization: Building2,
} as const;

// ============================================
// 2. DOMAINES DE TRANSPORT
// ============================================
export const DomainIcons = {
  // Transport Scolaire
  schoolTransport: School,
  schoolBus: Bus,
  student: Backpack,

  // Logistique
  logistics: Package,
  delivery: Truck,
  warehouse: Warehouse,
  parcel: Box,

  // Transport Urbain
  urbanTransit: BusFront,
  publicTransport: Train,

  // Transport Médical
  medical: Ambulance,

  // Autres
  freight: TruckIcon,
  air: Plane,
  bike: Bike,
} as const;

// ============================================
// 3. CARGOS / PASSAGERS / ITEMS
// ============================================
export const CargoIcons = {
  // Génériques
  cargo: Package,
  item: Box,

  // Personnes
  passenger: User,
  student: Backpack,
  patient: UserCircle,
  customer: UserCheck,

  // Colis
  parcel: PackageCheck,
  package: ShoppingBag,
  box: Box,

  // Actions
  addCargo: UserPlus,
} as const;

// ============================================
// 4. VÉHICULES / FLOTTE
// ============================================
export const VehicleIcons = {
  // Génériques
  vehicle: Car,
  fleet: Truck,

  // Types spécifiques
  bus: Bus,
  truck: TruckIcon,
  van: CarFront,
  ambulance: Ambulance,
  bike: Bike,

  // États véhicule
  active: CircleCheck,
  inactive: CirclePause,
  maintenance: Wrench,
} as const;

// ============================================
// 5. MISSIONS / ROUTES / TOURNÉES
// ============================================
export const MissionIcons = {
  // Génériques
  mission: Navigation,
  route: Route,
  trip: Compass,

  // Actions
  optimize: Sparkles,
  navigate: Navigation2,

  // États
  planned: Calendar,
  inProgress: PlayCircle,
  completed: CheckCircle2,
  cancelled: CircleX,
} as const;

// ============================================
// 6. LOCALISATION / MAP / GPS
// ============================================
export const LocationIcons = {
  // Points
  location: MapPin,
  pinned: MapPinned,
  stop: MapPinIcon,

  // GPS & Tracking
  gps: Locate,
  tracking: LocateFixed,
  signal: Radio,
  target: Crosshair,

  // Navigation
  navigate: Navigation2,
  compass: Compass,
} as const;

// ============================================
// 7. DASHBOARD / ANALYTICS / KPIs
// ============================================
export const AnalyticsIcons = {
  // Graphiques
  barChart: BarChart3,
  lineChart: LineChart,
  pieChart: PieChart,

  // Métriques
  metrics: Activity,
  gauge: Gauge,
  target: Target,

  // Tendances
  up: TrendingUp,
  down: TrendingDown,
} as const;

// ============================================
// 8. STATUTS & ÉTATS
// ============================================
export const StatusIcons = {
  // Succès
  success: CircleCheck,
  completed: CheckCheck,
  approved: ShieldCheck,

  // Erreur
  error: CircleX,
  failed: XCircle,

  // Avertissement
  warning: CircleAlert,
  alert: AlertTriangle,

  // Info
  info: Info,
  help: HelpCircle,

  // En cours
  inProgress: CircleDot,
  pending: Clock,
  paused: CirclePause,
} as const;

// ============================================
// 9. ACTIONS CRUD & COMMANDES
// ============================================
export const ActionIcons = {
  // CRUD
  add: Plus,
  create: Plus,
  edit: Edit,
  delete: Trash2,
  save: Save,

  // Copie & Partage
  copy: Copy,
  share: Share2,

  // Import/Export
  download: Download,
  upload: Upload,
  export: FileSpreadsheet,
  print: Printer,

  // Utilitaires
  refresh: RefreshCw,
  search: Search,
  filter: Filter,
} as const;

// ============================================
// 10. TEMPS & PLANNING
// ============================================
export const TimeIcons = {
  // Calendrier
  calendar: Calendar,
  schedule: CalendarDays,
  calendarTime: CalendarClock,

  // Horloge
  clock: Clock,
  timer: Timer,
  alarm: AlarmClock,
  hourglass: Hourglass,

  // Contrôles
  play: PlayCircle,
  stop: StopCircle,
} as const;

// ============================================
// 11. COMMUNICATION & NOTIFICATIONS
// ============================================
export const CommunicationIcons = {
  // Notifications
  notification: Bell,
  notificationActive: BellRing,
  notificationOff: BellOff,

  // Messages
  mail: Mail,
  message: MessageSquare,
  phone: Phone,
} as const;

// ============================================
// 12. OPTIMISATION & IA
// ============================================
export const OptimizationIcons = {
  optimize: Zap,
  ai: Brain,
  magic: Wand2,
  sparkle: Sparkles,
} as const;

// ============================================
// 13. DOCUMENTS & EXPORTS
// ============================================
export const DocumentIcons = {
  document: FileText,
  file: File,
  excel: FileSpreadsheet,
  print: Printer,
} as const;

// ============================================
// 14. PARAMÈTRES & CONFIGURATION
// ============================================
export const SettingsIcons = {
  settings: Settings,
  config: Settings2,
  adjust: Sliders,
  tools: Wrench,
  gear: Cog,
} as const;

// ============================================
// 15. SÉCURITÉ & PERMISSIONS
// ============================================
export const SecurityIcons = {
  security: Shield,
  verified: ShieldCheck,
  lock: Lock,
  unlock: Unlock,
  visible: Eye,
  hidden: EyeOff,
} as const;

// ============================================
// 16. UI & NAVIGATION
// ============================================
export const UIIcons = {
  // Chevrons
  right: ChevronRight,
  left: ChevronLeft,
  down: ChevronDown,
  up: ChevronUp,
  upDown: ChevronsUpDown,

  // Menu
  menu: Menu,
  close: X,
  moreVertical: MoreVertical,
  moreHorizontal: MoreHorizontal,

  // États
  loading: Loader2,

  // Notifications (alias pour facilité)
  bell: Bell,
  bellRing: BellRing,

  // Temps (alias pour facilité)
  clock: Clock,
} as const;

// ============================================
// 17. PERFORMANCE & ÉNERGIE
// ============================================
export const PerformanceIcons = {
  fuel: Fuel,
  battery: Battery,
  energy: Lightning,
  speed: Gauge,
} as const;

// ============================================
// EXPORTS GLOBAUX
// ============================================

/**
 * Toutes les icônes organisées par catégorie
 */
export const Icons = {
  navigation: NavigationIcons,
  domain: DomainIcons,
  cargo: CargoIcons,
  vehicle: VehicleIcons,
  mission: MissionIcons,
  location: LocationIcons,
  analytics: AnalyticsIcons,
  status: StatusIcons,
  action: ActionIcons,
  time: TimeIcons,
  communication: CommunicationIcons,
  optimization: OptimizationIcons,
  document: DocumentIcons,
  settings: SettingsIcons,
  security: SecurityIcons,
  ui: UIIcons,
  performance: PerformanceIcons,
} as const;

/**
 * Type helper pour toutes les icônes
 */
export type IconType = LucideIcon;

/**
 * Props communes pour les icônes
 */
export interface IconProps {
  size?: number | string;
  className?: string;
  strokeWidth?: number;
}

/**
 * Tailles d'icônes standardisées
 */
export const IconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
} as const;

/**
 * Helper pour obtenir une icône par nom
 */
export function getIcon(category: keyof typeof Icons, name: string): IconType | undefined {
  const categoryIcons = Icons[category] as Record<string, IconType>;
  return categoryIcons[name];
}

/**
 * Export par défaut
 */
export default Icons;
