# Architecture Globale du Système

## 1. Architecture en Couches

```mermaid
graph TB
    subgraph "Couche Présentation"
        UI[Next.js Frontend]
        WEB[Application Web React]
        MOBILE[Application Mobile Future]
    end

    subgraph "Couche Métier"
        API[Server Actions Next.js]
        OPTIM[Service FastAPI Optimisation]
        AUTH[Supabase Auth]
        REALTIME[Supabase Realtime]
    end

    subgraph "Couche Données"
        DB[(PostgreSQL Supabase)]
        CACHE[(Redis Cache)]
        STORAGE[Supabase Storage]
        MQTT[Broker MQTT Mosquitto]
    end

    subgraph "Services Externes"
        MAPS[Google Maps API]
        SMS[Twilio SMS]
        EMAIL[SendGrid Email]
    end

    UI --> API
    UI --> AUTH
    UI --> REALTIME
    WEB --> API

    API --> DB
    API --> OPTIM
    API --> STORAGE

    OPTIM --> DB
    AUTH --> DB
    REALTIME --> DB

    OPTIM --> MAPS
    API --> SMS
    API --> EMAIL

    DB --> CACHE

    MOBILE -.-> API

    style UI fill:#4CAF50
    style WEB fill:#4CAF50
    style API fill:#2196F3
    style OPTIM fill:#2196F3
    style DB fill:#FF9800
    style MQTT fill:#FF9800
```

## 2. Architecture Technique Détaillée

```mermaid
graph LR
    subgraph "Client Browser"
        BROWSER[Navigateur Web]
        MAP[Leaflet Map]
        FORM[React Hook Form]
    end

    subgraph "Next.js Application"
        SSR[Server Side Rendering]
        SC[Server Components]
        SA[Server Actions]
        MIDDLEWARE[Middleware Auth]
    end

    subgraph "Backend Services"
        SUPABASE[Supabase BaaS]
        FASTAPI[FastAPI Service]
        MQTT_BROKER[MQTT Broker]
    end

    subgraph "Base de Données"
        PG[(PostgreSQL)]
        RLS[Row Level Security]
        FUNCTIONS[Triggers & Functions]
    end

    subgraph "Optimisation"
        ORTOOLS[Google OR-Tools]
        VRP[VRP Solver]
        VRPTW[VRPTW Solver]
    end

    BROWSER --> SSR
    MAP --> SC
    FORM --> SA

    SSR --> MIDDLEWARE
    MIDDLEWARE --> SUPABASE
    SA --> SUPABASE
    SA --> FASTAPI

    SUPABASE --> PG
    SUPABASE --> RLS
    PG --> FUNCTIONS

    FASTAPI --> ORTOOLS
    ORTOOLS --> VRP
    ORTOOLS --> VRPTW

    BROWSER -.->|WebSocket| SUPABASE
    BROWSER -.->|MQTT| MQTT_BROKER

    style BROWSER fill:#E3F2FD
    style SUPABASE fill:#C8E6C9
    style FASTAPI fill:#FFE0B2
    style PG fill:#F8BBD0
    style ORTOOLS fill:#D1C4E9
```

## 3. Architecture de Déploiement

```mermaid
graph TB
    subgraph "Internet"
        USER[Utilisateurs]
        DRIVER[Conducteurs Mobile]
    end

    subgraph "CDN Cloudflare"
        CDN[CDN Assets]
    end

    subgraph "Vercel Cloud"
        NEXT[Next.js App Serverless]
        EDGE[Edge Functions]
    end

    subgraph "Supabase Cloud"
        AUTH_SRV[Auth Service]
        DB_SRV[Database Service]
        RT_SRV[Realtime Service]
        STORAGE_SRV[Storage Service]
    end

    subgraph "AWS/Cloud Server"
        FAST[FastAPI Container]
        MQTT_SRV[MQTT Broker]
        REDIS_SRV[(Redis)]
    end

    subgraph "Monitoring"
        SENTRY[Sentry Errors]
        ANALYTICS[Analytics]
    end

    USER --> CDN
    USER --> NEXT
    DRIVER --> NEXT

    CDN --> NEXT
    NEXT --> AUTH_SRV
    NEXT --> DB_SRV
    NEXT --> RT_SRV
    NEXT --> FAST

    FAST --> DB_SRV
    FAST --> REDIS_SRV

    DRIVER -.->|GPS| MQTT_SRV
    MQTT_SRV --> DB_SRV

    NEXT --> SENTRY
    NEXT --> ANALYTICS

    style USER fill:#90CAF9
    style NEXT fill:#A5D6A7
    style DB_SRV fill:#FFAB91
    style FAST fill:#CE93D8
```

## 4. Flux de Données - Création de Mission

```mermaid
sequenceDiagram
    participant D as Dispatcher
    participant UI as Next.js UI
    participant SA as Server Action
    participant DB as PostgreSQL
    participant OPTIM as FastAPI
    participant ORTOOLS as OR-Tools

    D->>UI: Ouvre Map Builder
    D->>UI: Ajoute sites sur carte
    D->>UI: Ajoute items (pickup/delivery)
    D->>UI: Ajoute véhicules
    D->>UI: Clique "Créer Mission"

    UI->>SA: createMission(data)
    SA->>DB: INSERT missions, items, sites
    DB-->>SA: mission_id
    SA-->>UI: Mission créée

    D->>UI: Clique "Optimiser Route"
    UI->>OPTIM: POST /api/optimize/route
    OPTIM->>DB: SELECT sites, vehicles
    DB-->>OPTIM: Données

    OPTIM->>ORTOOLS: Construit problème VRP
    ORTOOLS->>ORTOOLS: Calcule matrice distances
    ORTOOLS->>ORTOOLS: Résout VRP/VRPTW
    ORTOOLS-->>OPTIM: Solution optimale

    OPTIM-->>UI: Route optimisée + métriques
    UI->>SA: saveOptimizedRoute(route)
    SA->>DB: INSERT routes, route_stops
    DB-->>SA: OK
    SA-->>UI: Route sauvegardée
    UI-->>D: Affiche route sur carte
```

## 5. Flux de Données - Suivi GPS Temps Réel

```mermaid
sequenceDiagram
    participant DRV as Conducteur
    participant APP as App Mobile
    participant MQTT as MQTT Broker
    participant BACK as Backend
    participant DB as PostgreSQL
    participant RT as Realtime
    participant CLIENT as Client Web

    DRV->>APP: Démarre mission
    APP->>BACK: updateMissionStatus(in_progress)
    BACK->>DB: UPDATE missions SET status

    loop Toutes les 5 secondes
        APP->>APP: Capture position GPS
        APP->>MQTT: PUBLISH transport/vehicle/123/location
        MQTT->>BACK: Message reçu
        BACK->>DB: INSERT gps_locations
        BACK->>DB: UPDATE vehicles SET current_lat/lng

        DB->>RT: Changement détecté
        RT->>CLIENT: WebSocket notification
        CLIENT->>CLIENT: Met à jour marqueur carte
        CLIENT->>CLIENT: Recalcule ETA
    end

    DRV->>APP: Arrive à arrêt
    DRV->>APP: Marque arrêt complété
    APP->>BACK: completeStop(stop_id)
    BACK->>DB: UPDATE route_stops SET completed
    DB->>RT: Notification
    RT->>CLIENT: Arrêt complété
    CLIENT-->>DRV: Notification confirmée
```

## 6. Modèle de Données - Relations Principales

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : has
    ORGANIZATIONS ||--o{ MISSIONS : owns
    ORGANIZATIONS ||--o{ VEHICLES : owns
    ORGANIZATIONS ||--o{ SITES : owns
    ORGANIZATIONS ||--o{ ITEMS : owns

    USERS ||--o{ ORGANIZATION_MEMBERS : member_of
    USERS ||--o{ USER_PROFILES : has
    USERS ||--o{ MISSIONS : drives
    USERS ||--o{ GPS_LOCATIONS : tracks

    MISSIONS ||--o{ ROUTES : has
    MISSIONS ||--o{ ROUTE_STOPS : contains
    MISSIONS ||--o{ ITEMS : transports
    MISSIONS ||--o{ GPS_LOCATIONS : tracked_by

    ROUTES ||--o{ ROUTE_STOPS : includes
    VEHICLES ||--o{ ROUTES : assigned_to
    VEHICLES ||--o{ GPS_LOCATIONS : emits

    SITES ||--o{ ROUTE_STOPS : destination
    SITES ||--o{ ITEMS : pickup
    SITES ||--o{ ITEMS : delivery

    USERS ||--o{ NOTIFICATIONS : receives
    MISSIONS ||--o{ NOTIFICATIONS : generates

    ORGANIZATIONS {
        uuid id PK
        uuid owner_id FK
        string name
        string slug UK
        jsonb domain_config
        timestamp created_at
    }

    MISSIONS {
        uuid id PK
        uuid organization_id FK
        string reference UK
        string status
        date scheduled_date
        uuid driver_id FK
        uuid vehicle_id FK
    }

    ROUTES {
        uuid id PK
        uuid mission_id FK
        uuid vehicle_id FK
        jsonb optimized_order
        decimal total_distance
        interval estimated_duration
    }

    VEHICLES {
        uuid id PK
        uuid organization_id FK
        string vehicle_type
        decimal capacity
        decimal current_latitude
        decimal current_longitude
    }

    SITES {
        uuid id PK
        uuid organization_id FK
        string name
        decimal latitude
        decimal longitude
        jsonb opening_hours
    }
```

## 7. Architecture Multi-Tenant

```mermaid
graph TB
    subgraph "Organization A"
        ORGA[Organization A]
        USERSA[Users A]
        VEHICLESA[Vehicles A]
        MISSIONSA[Missions A]
    end

    subgraph "Organization B"
        ORGB[Organization B]
        USERSB[Users B]
        VEHICLESB[Vehicles B]
        MISSIONSB[Missions B]
    end

    subgraph "Organization C"
        ORGC[Organization C]
        USERSC[Users C]
        VEHICLESC[Vehicles C]
        MISSIONSC[Missions C]
    end

    subgraph "Shared Infrastructure"
        DB[(PostgreSQL Database)]
        RLS[Row Level Security]
        AUTH[Authentication Service]
        CACHE[(Redis Cache)]
    end

    ORGA --> RLS
    ORGB --> RLS
    ORGC --> RLS

    USERSA --> AUTH
    USERSB --> AUTH
    USERSC --> AUTH

    RLS --> DB
    AUTH --> DB

    DB --> CACHE

    RLS -.->|Isolates by org_id| ORGA
    RLS -.->|Isolates by org_id| ORGB
    RLS -.->|Isolates by org_id| ORGC

    style ORGA fill:#E8F5E9
    style ORGB fill:#E3F2FD
    style ORGC fill:#FFF3E0
    style RLS fill:#FFCDD2
    style DB fill:#F3E5F5
```

## 8. Pipeline CI/CD

```mermaid
graph LR
    subgraph "Développement"
        DEV[Développeur]
        GIT[Git Commit]
    end

    subgraph "GitHub Actions"
        LINT[ESLint]
        TYPE[TypeScript Check]
        TEST[Tests Unitaires]
        BUILD[Build]
    end

    subgraph "Staging"
        STAGE_DEPLOY[Deploy Staging]
        E2E[Tests E2E]
        VALIDATE[Validation Manuelle]
    end

    subgraph "Production"
        PROD_BUILD[Build Production]
        DOCKER[Docker Images]
        DEPLOY[Deploy Production]
    end

    DEV --> GIT
    GIT --> LINT
    LINT --> TYPE
    TYPE --> TEST
    TEST --> BUILD

    BUILD --> STAGE_DEPLOY
    STAGE_DEPLOY --> E2E
    E2E --> VALIDATE

    VALIDATE -->|Approve| PROD_BUILD
    PROD_BUILD --> DOCKER
    DOCKER --> DEPLOY

    VALIDATE -->|Reject| DEV

    style GIT fill:#4CAF50
    style BUILD fill:#2196F3
    style DEPLOY fill:#FF5722
```

## 9. Architecture de Sécurité

```mermaid
graph TB
    subgraph "Client Layer"
        BROWSER[Navigateur]
        HTTPS[HTTPS/TLS]
    end

    subgraph "Application Layer"
        NEXT[Next.js]
        MIDDLEWARE[Auth Middleware]
        CSRF[CSRF Protection]
    end

    subgraph "API Layer"
        JWT[JWT Validation]
        RATELIMIT[Rate Limiting]
        VALIDATION[Input Validation]
    end

    subgraph "Database Layer"
        RLS_LAYER[Row Level Security]
        POLICIES[Security Policies]
        ENCRYPTION[Encryption at Rest]
    end

    subgraph "Infrastructure Layer"
        FIREWALL[Firewall]
        WAF[Web Application Firewall]
        DDoS[DDoS Protection]
    end

    BROWSER --> HTTPS
    HTTPS --> NEXT
    NEXT --> MIDDLEWARE
    MIDDLEWARE --> CSRF

    CSRF --> JWT
    JWT --> RATELIMIT
    RATELIMIT --> VALIDATION

    VALIDATION --> RLS_LAYER
    RLS_LAYER --> POLICIES
    POLICIES --> ENCRYPTION

    HTTPS --> FIREWALL
    FIREWALL --> WAF
    WAF --> DDoS

    style HTTPS fill:#4CAF50
    style JWT fill:#2196F3
    style RLS_LAYER fill:#FF9800
    style FIREWALL fill:#F44336
```

## 10. Composants du Système

```mermaid
graph TB
    subgraph "Frontend Components"
        MAP_BUILDER[Map Builder]
        DRIVER_DASH[Driver Dashboard]
        CLIENT_DASH[Client Dashboard]
        ADMIN_PANEL[Admin Panel]
        TEAM_MGMT[Team Management]
    end

    subgraph "Core Services"
        MISSION_SVC[Mission Service]
        ROUTE_SVC[Route Service]
        VEHICLE_SVC[Vehicle Service]
        GPS_SVC[GPS Tracking Service]
        NOTIF_SVC[Notification Service]
    end

    subgraph "Optimization Engine"
        VRP_ENGINE[VRP Engine]
        DISTANCE_CALC[Distance Calculator]
        ETA_CALC[ETA Calculator]
        CONSTRAINT_MGR[Constraint Manager]
    end

    subgraph "Data Layer"
        USER_REPO[User Repository]
        MISSION_REPO[Mission Repository]
        VEHICLE_REPO[Vehicle Repository]
        GPS_REPO[GPS Repository]
    end

    MAP_BUILDER --> MISSION_SVC
    MAP_BUILDER --> ROUTE_SVC
    MAP_BUILDER --> VEHICLE_SVC

    DRIVER_DASH --> MISSION_SVC
    DRIVER_DASH --> GPS_SVC

    CLIENT_DASH --> MISSION_SVC
    CLIENT_DASH --> GPS_SVC

    ADMIN_PANEL --> USER_REPO
    TEAM_MGMT --> USER_REPO

    MISSION_SVC --> MISSION_REPO
    ROUTE_SVC --> VRP_ENGINE
    VEHICLE_SVC --> VEHICLE_REPO
    GPS_SVC --> GPS_REPO

    VRP_ENGINE --> DISTANCE_CALC
    VRP_ENGINE --> ETA_CALC
    VRP_ENGINE --> CONSTRAINT_MGR

    MISSION_SVC --> NOTIF_SVC
    GPS_SVC --> NOTIF_SVC

    style MAP_BUILDER fill:#81C784
    style VRP_ENGINE fill:#FFB74D
    style GPS_SVC fill:#64B5F6
    style NOTIF_SVC fill:#BA68C8
```

## Légende

- **Rectangles** : Composants/Services
- **Cylindres** : Bases de données
- **Flèches pleines** : Communication synchrone
- **Flèches pointillées** : Communication asynchrone
- **Couleurs** :
  - Vert : Couche présentation
  - Bleu : Couche métier
  - Orange : Couche données
  - Violet : Services externes
