# 🏗️ ARCHITECTURE COMPLÈTE - Système de Gestion du Transport Intelligent

## 📋 TABLE DES MATIÈRES
1. [Vision Générale](#vision-générale)
2. [Stack Technologique](#stack-technologique)
3. [Architecture Système](#architecture-système)
4. [Phases de Développement](#phases-de-développement)
5. [Workflows Détaillés](#workflows-détaillés)
6. [Modèle de Données](#modèle-de-données)

---

## 🎯 Vision Générale

**Objectif:** Plateforme SaaS complète pour la gestion intelligente des transports et logistique avec optimisation des itinéraires, suivi en temps réel, et gestion d'équipe.

**Utilisateurs Cibles:**
- **Administrateurs** - Gestion complète du système
- **Dispatchers** - Planification et assignation des missions
- **Chauffeurs** - Exécution des missions
- **Clients** - Suivi des livraisons

---

## 💻 Stack Technologique

### **Frontend**
```
├── Next.js 15 (App Router)
│   ├── Server Components (Performance)
│   ├── Client Components (Interactivité)
│   └── API Routes (Backend)
├── React 19
│   ├── Hooks (useState, useEffect, useContext)
│   └── Context API (État global)
├── TypeScript (Type Safety)
├── Tailwind CSS (Styling)
├── shadcn/ui (Components)
└── Lucide React (Icons)
```

### **Backend/Infrastructure**
```
├── Supabase (Backend as a Service)
│   ├── PostgreSQL (Database)
│   ├── Authentication (JWT)
│   ├── Real-time (WebSockets)
│   ├── Row Level Security (RLS)
│   └── SQL Functions (RPC)
├── Python FastAPI (Services personnalisés)
│   ├── VRP Solver (Vehicle Routing Problem)
│   └── Route Optimization
└── Docker (Containerization)
```

### **Services Externes**
```
├── Google Maps API
│   ├── Geocoding
│   ├── Directions
│   └── Distance Matrix
├── MQTT Broker (Real-time)
│   └── Mosquitto
├── AWS/GCP Cloud (Optional)
└── SendGrid/Twilio (Notifications)
```

### **DevOps & Testing**
```
├── Docker Compose
├── Git & GitHub
├── Supabase CLI
├── Jest (Testing)
└── Turbopack (Build)
```

---

## 🏛️ Architecture Système

### **Architecture Multi-Couches**

```
┌─────────────────────────────────────────────────────┐
│           CLIENT LAYER (Frontend)                   │
│  ┌──────────────────────────────────────────────┐   │
│  │  Web UI (Next.js)                            │   │
│  │  ├─ Team Dashboard (Admin)                   │   │
│  │  ├─ Driver Dashboard (Chauffeur)             │   │
│  │  ├─ Client Dashboard (Client)                │   │
│  │  └─ Dispatcher Dashboard (Planification)     │   │
│  └──────────────────────────────────────────────┘   │
└────────────────────┬─────────────────────────────────┘
                     │ REST API / GraphQL
┌────────────────────▼─────────────────────────────────┐
│        APPLICATION LAYER (Business Logic)            │
│  ┌──────────────────────────────────────────────┐    │
│  │  Next.js API Routes                          │    │
│  │  ├─ /api/missions                            │    │
│  │  ├─ /api/routes                              │    │
│  │  ├─ /api/tracking                            │    │
│  │  └─ /api/members                             │    │
│  │                                              │    │
│  │  FastAPI Services                            │    │
│  │  ├─ Route Optimization Engine                │    │
│  │  ├─ GPS Tracking Service                     │    │
│  │  └─ Notification Service                     │    │
│  └──────────────────────────────────────────────┘    │
└────────────────────┬─────────────────────────────────┘
                     │ SQL / RPC
┌────────────────────▼─────────────────────────────────┐
│      DATA LAYER (Database & Services)                │
│  ┌──────────────────────────────────────────────┐    │
│  │  Supabase PostgreSQL                         │    │
│  │  ├─ user_profiles (Utilisateurs)             │    │
│  │  ├─ organizations (Organisations)            │    │
│  │  ├─ missions (Missions/Tâches)               │    │
│  │  ├─ routes (Itinéraires)                     │    │
│  │  ├─ items (Articles/Cargos)                  │    │
│  │  ├─ sites (Points de collecte/livraison)     │    │
│  │  ├─ vehicles (Véhicules)                     │    │
│  │  ├─ invitations (Invitations)                │    │
│  │  └─ notifications (Notifications)            │    │
│  │                                              │    │
│  │  Real-time Services                          │    │
│  │  ├─ MQTT (GPS Tracking)                      │    │
│  │  ├─ WebSockets (Live Updates)                │    │
│  │  └─ Supabase Realtime                        │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### **Architecture des Composants**

```
App
├── Layouts
│   ├── AuthLayout (Login, Signup)
│   ├── AppLayout (Dashboard)
│   └── AdminLayout (Admin Panel)
├── Pages
│   ├── /auth/* (Authentication)
│   ├── /home/*
│   │   ├── team (Team Management)
│   │   ├── driver (Driver Dashboard)
│   │   ├── client (Client Dashboard)
│   │   └── dispatcher (Mission Planning)
│   └── /admin/* (Admin)
├── Components
│   ├── UI (shadcn components)
│   ├── Features
│   │   ├── MissionCard
│   │   ├── RouteMap
│   │   ├── TrackingMap
│   │   └── TeamMemberList
│   └── Forms
├── Contexts
│   ├── UserRoleContext (Auth & Permissions)
│   ├── VocabularyContext (Config)
│   └── ThemeContext (Dark Mode)
├── Hooks
│   ├── useUserRole
│   ├── useVocabulary
│   ├── useMissions
│   └── useTracking
└── Lib
    ├── supabase (Client)
    ├── api (API calls)
    ├── validators
    └── utils
```

---

## 📊 Phases de Développement

### **PHASE 1: Foundation (Semaines 1-3)**
**Objectif:** Infrastructure de base et authentification

```
✅ Setup Initial
  ├─ Next.js 15 + TypeScript
  ├─ Supabase Project Setup
  ├─ Database Schema Creation
  └─ Docker Environment

✅ Authentication
  ├─ Supabase Auth Integration
  ├─ Login/Signup Pages
  ├─ JWT Token Management
  └─ Protected Routes

✅ User Management
  ├─ User Profiles Table
  ├─ Role-Based Access Control (RBAC)
  ├─ Organization Structure
  └─ User Role Context

📦 Deliverables:
  - Working authentication system
  - Basic user profiles
  - Protected routes
  - Database schema v1.0
```

---

### **PHASE 2: Core Features (Semaines 4-8)**
**Objectif:** Fonctionnalités principales

```
✅ Mission Management
  ├─ Create/Read/Update/Delete Missions
  ├─ Mission Status Workflow
  │   └─ draft → planned → assigned → accepted → in_progress → completed
  ├─ Mission Assignment
  └─ Dispatcher Dashboard

✅ Team Management
  ├─ Add/Remove Team Members
  ├─ Role Assignment
  ├─ Team Member Profiles
  ├─ Permissions Management
  └─ Team Dashboard

✅ Driver Interface
  ├─ Available Missions View
  ├─ Accept/Decline Missions
  ├─ Mission Status Update
  └─ Driver Dashboard

✅ Client Interface
  ├─ Track Deliveries
  ├─ View Order Status
  ├─ Notifications
  └─ Client Dashboard

✅ Database Enhancement
  ├─ Missions Table
  ├─ Items/Cargo Table
  ├─ Sites (Pickup/Delivery) Table
  ├─ Routes Table
  └─ RLS Policies Setup

📦 Deliverables:
  - Functional dashboard for all roles
  - Mission CRUD operations
  - Team member management
  - Status tracking system
```

---

### **PHASE 3: Route Optimization (Semaines 9-12)**
**Objectif:** Intelligence d'optimisation des itinéraires

```
✅ Vehicles Management
  ├─ Vehicle Profiles
  ├─ Capacity Management
  ├─ Vehicle Types
  └─ Assignment to Drivers

✅ Route Planning
  ├─ Multi-Stop Route Creation
  ├─ Sequence Optimization
  ├─ Capacity Constraints
  └─ Time Windows

✅ Optimization Engine
  ├─ Python FastAPI Service
  ├─ VRP Solver (Google OR-Tools)
  ├─ Distance Matrix Calculations
  ├─ Haversine Distance Algorithm
  └─ Cost Minimization

✅ Map Integration
  ├─ Google Maps API
  ├─ Route Visualization
  ├─ Stop Markers
  ├─ Navigation Integration
  └─ ETA Calculation

✅ Database Schema
  ├─ Vehicles Table
  ├─ Route_Stops (Junction)
  ├─ GPS Coordinates
  └─ Distance Cache

📦 Deliverables:
  - Route optimization service
  - Multi-stop routes
  - Map visualization
  - ETA predictions
  - Optimization metrics
```

---

### **PHASE 4: Real-time Tracking (Semaines 13-16)**
**Objectif:** Suivi GPS en temps réel

```
✅ GPS Tracking
  ├─ Real-time Location Updates
  ├─ MQTT Broker Integration
  ├─ Location History
  ├─ Geofencing
  └─ Battery Optimization

✅ Live Updates
  ├─ WebSocket Connections
  ├─ Real-time Notifications
  ├─ Status Updates
  ├─ Driver Location Streaming
  └─ Client Notifications

✅ Tracking Dashboard
  ├─ Live Map
  ├─ Fleet Overview
  ├─ Driver Locations
  ├─ Route Progress
  └─ ETA Updates

✅ Notifications System
  ├─ In-app Notifications
  ├─ Email Alerts
  ├─ SMS Alerts
  ├─ Push Notifications
  └─ Notification Preferences

✅ Database
  ├─ GPS_Locations Table
  ├─ Notifications Table
  ├─ Notification_Preferences
  └─ Location History Archiving

📦 Deliverables:
  - Real-time tracking system
  - Live notification system
  - MQTT infrastructure
  - Tracking dashboard
  - Historical data storage
```

---

### **PHASE 5: Advanced Features (Semaines 17-20)**
**Objectif:** Fonctionnalités avancées

```
✅ Analytics & Reporting
  ├─ Driver Performance Metrics
  ├─ Route Efficiency Reports
  ├─ Cost Analysis
  ├─ KPI Dashboard
  └─ Data Export (CSV/PDF)

✅ Customization
  ├─ Organization Config (Labels)
  ├─ Custom Fields
  ├─ Workflow Customization
  ├─ Theme Customization
  └─ Language Support

✅ Integration
  ├─ API Documentation
  ├─ Webhook System
  ├─ Third-party Integrations
  ├─ Accounting Software
  └─ ERP Systems

✅ Mobile Optimization
  ├─ Responsive Design
  ├─ Mobile Apps (Optional)
  ├─ Offline Support
  └─ PWA Features

✅ Security & Compliance
  ├─ Data Encryption
  ├─ Audit Logs
  ├─ Compliance Reports
  ├─ GDPR Compliance
  └─ Data Retention Policies

📦 Deliverables:
  - Analytics platform
  - Advanced reporting
  - Integration APIs
  - Mobile-optimized app
  - Security audit reports
```

---

### **PHASE 6: Deployment & Scaling (Semaines 21-24)**
**Objectif:** Production-ready et scalabilité

```
✅ Infrastructure
  ├─ Docker Containerization
  ├─ Kubernetes Setup (Optional)
  ├─ Load Balancing
  ├─ CDN Integration
  └─ Auto-scaling

✅ Database Optimization
  ├─ Indexing Strategy
  ├─ Query Optimization
  ├─ Backup & Recovery
  ├─ Replication Setup
  └─ Performance Monitoring

✅ Monitoring & Logging
  ├─ Error Tracking (Sentry)
  ├─ Performance Monitoring
  ├─ Log Aggregation
  ├─ Alerting System
  └─ Uptime Monitoring

✅ Testing
  ├─ Unit Tests
  ├─ Integration Tests
  ├─ E2E Tests
  ├─ Load Testing
  └─ Security Testing

✅ Documentation
  ├─ API Documentation
  ├─ User Guides
  ├─ Admin Guides
  ├─ Developer Documentation
  └─ Architecture Docs

✅ CI/CD Pipeline
  ├─ GitHub Actions
  ├─ Automated Tests
  ├─ Automated Deployment
  ├─ Version Management
  └─ Rollback Strategy

📦 Deliverables:
  - Production environment
  - Monitoring dashboard
  - Full test coverage
  - Complete documentation
  - CI/CD pipeline
```

---

## 🔄 Workflows Détaillés

### **WORKFLOW 1: Création et Exécution d'une Mission**

```
┌─────────────────────────────────────────────────────────┐
│ 1. DISPATCHER - Crée une Mission                        │
├─────────────────────────────────────────────────────────┤
  1.1 Accède au Dispatcher Dashboard
  1.2 Clique "Créer une Mission"
  1.3 Remplit les détails:
      - Nom de la mission
      - Type de cargo
      - Points de collecte/livraison
      - Priorité
      - Notes spéciales
  1.4 Sélectionne le chauffeur assigné
  1.5 Soumet → Mission créée (Status: "draft")

│ Données stockées:                                       │
│ ├─ missions table                                      │
│ ├─ items table (cargo)                                 │
│ ├─ sites table (locations)                             │
│ └─ route_stops (sequences)                             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. OPTIMIZATION ENGINE - Optimise l'itinéraire         │
├─────────────────────────────────────────────────────────┤
  2.1 Collecte les missions du jour
  2.2 Récupère les coordonnées GPS (Google Maps)
  2.3 Récupère les contraintes:
      - Capacité du véhicule
      - Fenêtres de temps
      - Zones de livraison
  2.4 Exécute l'algorithme VRP (OR-Tools)
  2.5 Génère l'itinéraire optimal
  2.6 Calcule les ETA
  2.7 Stocke la route optimale

│ Services utilisés:                                      │
│ ├─ FastAPI Service                                     │
│ ├─ Google Maps API                                     │
│ ├─ OR-Tools VRP Solver                                 │
│ └─ Haversine Algorithm                                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. DRIVER - Accepte et Exécute                         │
├─────────────────────────────────────────────────────────┤
  3.1 Driver reçoit notification (mission assignée)
  3.2 Ouvre Driver Dashboard
  3.3 Voit missions disponibles
  3.4 Clique "Accepter la Mission" → Status: "accepted"
  3.5 Voit l'itinéraire sur la carte
  3.6 Clique "Démarrer" → Status: "in_progress"
      - GPS commence à tracker
      - MQTT envoie localisation en temps réel
  3.7 Arrive au 1er arrêt
      - Met à jour le statut du stop
      - Prend les photos/confirmations
  3.8 Répète pour chaque arrêt
  3.9 Clique "Terminer" → Status: "completed"

│ Données mises à jour:                                   │
│ ├─ missions.status                                     │
│ ├─ missions.actual_start_time                          │
│ ├─ missions.actual_end_time                            │
│ ├─ gps_locations (streaming)                           │
│ └─ route_stops.status                                  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. CLIENT & NOTIFICATIONS - Suivi en temps réel        │
├─────────────────────────────────────────────────────────┤
  4.1 Client ouvre Client Dashboard
  4.2 Voit sa livraison en cours
  4.3 Voir l'itinéraire et la position du chauffeur
  4.4 ETA automatiquement mis à jour
  4.5 Reçoit notifications:
      - "En route" (driver accepted)
      - "Chauffeur en chemin" (50 km)
      - "Arrivée imminente" (10 km)
      - "Livré" (completed)
  4.6 Peut télécharger la preuve de livraison

│ Canaux de notification:                                 │
│ ├─ WebSocket (Real-time)                               │
│ ├─ Email                                               │
│ ├─ SMS (Twilio)                                        │
│ ├─ Push Notification                                   │
│ └─ In-app Notification                                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. ANALYTICS - Reporting et Optimisation                │
├─────────────────────────────────────────────────────────┤
  5.1 Après complétions:
      - Calcul du temps réel vs prévu
      - Calcul du coût réel
      - Analyse de la déviation du chemin
      - Performance du chauffeur
  5.2 Données archivées pour rapport
  5.3 Metrics envoyés à dashboard
  5.4 Suggestions d'amélioration

│ Métriques calculées:                                    │
│ ├─ On-time delivery rate                               │
│ ├─ Route efficiency                                    │
│ ├─ Cost per delivery                                   │
│ ├─ Driver performance score                            │
│ └─ Fuel consumption estimate                           │
└─────────────────────────────────────────────────────────┘
```

---

### **WORKFLOW 2: Gestion d'Équipe**

```
┌─────────────────────────────────────────────────────────┐
│ 1. ADMIN - Ajoute un chauffeur                         │
├─────────────────────────────────────────────────────────┤
  1.1 Ouvre Team Management
  1.2 Clique "Ajouter un membre"
  1.3 Remplit:
      - Email
      - Téléphone
      - Type (driver, dispatcher, etc.)
  1.4 Soumet → Invitation créée (Status: "pending")

│ BD: invitations table                                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. EMAIL - Chauffeur reçoit l'invitation              │
├─────────────────────────────────────────────────────────┤
  2.1 Reçoit email avec lien d'invitation
  2.2 Clique le lien
  2.3 Crée son compte (Signup)
  2.4 Définit son mot de passe
  2.5 Accepte les conditions
  2.6 Compte créé + Profile créé

│ Authentification:                                       │
│ ├─ Supabase Auth (JWT)                                 │
│ ├─ Email verification                                  │
│ └─ Password hashing                                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. DRIVER - Setup initial                              │
├─────────────────────────────────────────────────────────┤
  3.1 Login avec email/password
  3.2 Complète son profil:
      - Nom, prénom
      - Numéro de téléphone
      - Photo de profil
      - License information
  3.3 Peut maintenant voir ses missions

│ BD: user_profiles table                                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. ADMIN - Gère les permissions                        │
├─────────────────────────────────────────────────────────┤
  4.1 Voir tous les membres dans Team Dashboard
  4.2 Voir les rôles et permissions
  4.3 Modifier le type d'utilisateur
  4.4 Activer/désactiver les comptes
  4.5 Voir l'historique d'activité

│ Permissions basées sur:                                 │
│ ├─ user_type (driver, dispatcher, admin)              │
│ ├─ organization_role (owner, admin, member)           │
│ └─ RLS policies (Row Level Security)                   │
└─────────────────────────────────────────────────────────┘
```

---

### **WORKFLOW 3: Authentification & Sessions**

```
┌──────────────────────────────────────────────────┐
│ USER VISITS APP                                  │
├──────────────────────────────────────────────────┤
  ↓
  Check localStorage for JWT token
  ↓
  ├─ Token exists? → Validate with Supabase
  │  ├─ Valid? → Load user data → Redirect to dashboard
  │  └─ Expired? → Refresh token automatically
  │
  └─ No token? → Redirect to /auth/login

│ JWT Token Flow:                                  │
│ ├─ Stored in localStorage                       │
│ ├─ Sent in Authorization header                 │
│ ├─ Validated on each request                    │
│ └─ Auto-refresh before expiry                   │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ AUTHENTICATION MIDDLEWARE                        │
├──────────────────────────────────────────────────┤
  1. Verify JWT signature
  2. Check token expiry
  3. Load user from database
  4. Check RLS policies
  5. Load user permissions
  6. Set context (UserRoleContext)
  7. Allow/deny request

│ Protected with:                                  │
│ ├─ JWT Authentication                           │
│ ├─ RLS (Row Level Security)                     │
│ ├─ CSRF Protection                              │
│ └─ CORS Headers                                 │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ LOAD USER DASHBOARD                             │
├──────────────────────────────────────────────────┤
  1. Fetch user profile
  2. Fetch user permissions
  3. Load organization config
  4. Load vocabulary (custom labels)
  5. Subscribe to real-time updates
  6. Initialize tracking (if driver)
  7. Render dashboard based on role

│ Context providers:                               │
│ ├─ UserRoleContext                              │
│ ├─ VocabularyContext                            │
│ └─ ThemeContext                                 │
└──────────────────────────────────────────────────┘
```

---

## 📊 Modèle de Données Complet

### **Tables Principales**

```sql
-- USERS & ORGANIZATIONS
users (Supabase Auth)
├─ id (UUID)
├─ email
├─ created_at
└─ last_sign_in_at

user_profiles
├─ id (UUID PK)
├─ user_id (UUID FK - Supabase)
├─ organization_id (UUID FK)
├─ first_name
├─ last_name
├─ display_name
├─ avatar_url
├─ phone
├─ user_type (admin, dispatcher, driver, client, staff)
├─ is_active
├─ license_number
├─ license_expiry
├─ vehicle_assigned_id
├─ notification_preferences (JSONB)
├─ language
├─ timezone
└─ created_at, updated_at

organizations
├─ id (UUID PK)
├─ name
├─ domain_type (logistics, delivery, taxi, etc.)
├─ logo_url
├─ settings (JSONB)
└─ created_at, updated_at

organization_members
├─ id (UUID PK)
├─ user_id (UUID FK)
├─ organization_id (UUID FK)
├─ role (owner, admin, manager, member)
└─ joined_at

invitations
├─ id (UUID PK)
├─ organization_id (UUID FK)
├─ email
├─ phone
├─ role
├─ user_type
├─ status (pending, accepted, expired, cancelled)
├─ expires_at
└─ created_at

---

-- MISSIONS & ROUTING
missions
├─ id (UUID PK)
├─ reference (UNIQUE)
├─ organization_id (UUID FK)
├─ name
├─ description
├─ status (draft, planned, assigned, accepted, in_progress, completed, cancelled)
├─ priority (low, normal, high, urgent)
├─ scheduled_date (DATE)
├─ start_time (TIME)
├─ estimated_end_time (TIME)
├─ actual_start_time (TIMESTAMP)
├─ actual_end_time (TIMESTAMP)
├─ dispatcher_notes
├─ driver_id (UUID FK)
├─ vehicle_id (UUID FK)
└─ created_at, updated_at

routes
├─ id (UUID PK)
├─ mission_id (UUID FK)
├─ vehicle_id (UUID FK)
├─ optimized_order (JSONB)
├─ total_distance (DECIMAL)
├─ estimated_duration (INTERVAL)
├─ actual_duration (INTERVAL)
├─ status (draft, optimized, active, completed)
└─ created_at, updated_at

route_stops
├─ id (UUID PK)
├─ mission_id (UUID FK)
├─ sequence_order (INTEGER)
├─ site_id (UUID FK)
├─ stop_type (pickup, delivery)
├─ status (pending, in_progress, completed)
├─ planned_arrival_time (TIMESTAMP)
├─ actual_arrival_time (TIMESTAMP)
├─ notes
└─ created_at, updated_at

sites
├─ id (UUID PK)
├─ organization_id (UUID FK)
├─ name
├─ site_type (warehouse, store, residence, office)
├─ address
├─ latitude (DECIMAL)
├─ longitude (DECIMAL)
├─ phone
├─ opening_hours (JSONB)
└─ created_at, updated_at

---

-- ITEMS & CARGO
items
├─ id (UUID PK)
├─ mission_id (UUID FK)
├─ route_id (UUID FK)
├─ organization_id (UUID FK)
├─ name
├─ item_type (package, document, etc.)
├─ quantity
├─ weight (DECIMAL)
├─ dimensions (JSONB)
├─ status (pending, in_transit, delivered, cancelled)
├─ priority
├─ description
├─ recipient_name
├─ recipient_phone
├─ pickup_site_id (UUID FK)
├─ delivery_site_id (UUID FK)
├─ estimated_delivery_time (TIMESTAMP)
└─ created_at, updated_at

---

-- VEHICLES
vehicles
├─ id (UUID PK)
├─ organization_id (UUID FK)
├─ name
├─ vehicle_type (car, van, truck, motorcycle)
├─ registration_number (UNIQUE)
├─ capacity (DECIMAL - kg)
├─ current_latitude (DECIMAL)
├─ current_longitude (DECIMAL)
├─ status (idle, in_use, maintenance, inactive)
├─ assigned_driver_id (UUID FK)
├─ last_location_update (TIMESTAMP)
└─ created_at, updated_at

---

-- TRACKING & LOCATION
gps_locations
├─ id (UUID PK)
├─ mission_id (UUID FK)
├─ driver_id (UUID FK)
├─ vehicle_id (UUID FK)
├─ latitude (DECIMAL)
├─ longitude (DECIMAL)
├─ accuracy (DECIMAL)
├─ speed (DECIMAL)
├─ heading (DECIMAL)
├─ timestamp (TIMESTAMP)
└─ created_at

---

-- NOTIFICATIONS & COMMUNICATION
notifications
├─ id (UUID PK)
├─ user_id (UUID FK)
├─ mission_id (UUID FK)
├─ organization_id (UUID FK)
├─ notification_type (mission_assigned, status_update, arrival, delivery, etc.)
├─ title
├─ message
├─ metadata (JSONB)
├─ is_read
├─ read_at (TIMESTAMP)
└─ created_at

notification_preferences
├─ id (UUID PK)
├─ user_id (UUID FK)
├─ email_enabled
├─ sms_enabled
├─ push_enabled
├─ in_app_enabled
└─ created_at, updated_at

---

-- ORGANIZATION CONFIG
organization_configs
├─ id (UUID PK)
├─ organization_id (UUID FK)
├─ labels (JSONB) - custom labels
├─ vehicle_types (JSONB)
├─ site_types (JSONB)
├─ item_types (JSONB)
├─ settings (JSONB)
└─ created_at, updated_at
```

---

## 🔐 Sécurité & RLS

### **Row Level Security Policies**

```sql
-- missions table
CREATE POLICY "users_can_view_own_missions"
  ON missions FOR SELECT
  USING (
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = missions.organization_id
      AND user_id = auth.uid()
    )
  );

-- user_profiles table
CREATE POLICY "users_can_view_team_members"
  ON user_profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- gps_locations table (sensitive)
CREATE POLICY "only_drivers_and_admins_can_view_locations"
  ON gps_locations FOR SELECT
  USING (
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN missions m ON m.organization_id = om.organization_id
      WHERE om.user_type IN ('admin', 'dispatcher')
      AND om.user_id = auth.uid()
      AND m.id = gps_locations.mission_id
    )
  );
```

---

## 📈 Scalabilité & Performance

### **Optimisations**

```
DATABASE:
├─ Indexing Strategy
│  ├─ missions (driver_id, status, scheduled_date)
│  ├─ gps_locations (mission_id, timestamp DESC)
│  ├─ user_profiles (organization_id, user_type)
│  └─ route_stops (mission_id, sequence_order)
├─ Partitioning (gps_locations by date)
├─ Query Optimization
├─ Connection Pooling (PgBouncer)
└─ Caching Strategy (Redis)

FRONTEND:
├─ Code Splitting (Next.js)
├─ Lazy Loading (React.lazy)
├─ Image Optimization (Next Image)
├─ Caching (React Query)
├─ Memoization (useMemo, useCallback)
└─ Virtual Scrolling (large lists)

INFRASTRUCTURE:
├─ CDN (for static assets)
├─ Load Balancing
├─ Auto-scaling
├─ Database Replication
└─ Read Replicas
```

---

## 🎯 Conclusion

Cette architecture fournit une **base solide et scalable** pour un système de gestion du transport. Chaque phase ajoute de la valeur progressivement, permettant des feedbacks utilisateurs et des ajustements avant d'avancer.

**Points clés:**
- ✅ Multi-tenant architecture
- ✅ Real-time capabilities
- ✅ Security-first approach (RLS)
- ✅ Scalable database design
- ✅ Modern tech stack
- ✅ Modular & maintainable code
