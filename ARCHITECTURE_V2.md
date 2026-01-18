# Architecture v2.0 - Module Transport Intelligent

Documentation de la nouvelle architecture modulaire et généralisée.

## Vue d'ensemble des améliorations

### Problèmes résolus

| Problème | Solution |
|----------|----------|
| Code dupliqué (connexion DB) | Repository Pattern générique |
| Pas de connection pooling | SQLAlchemy async avec pool |
| Pas d'authentification API | JWT + intégration Supabase |
| Double schéma DB incohérent | Schéma unifié multi-tenant |
| State management fragile | Zustand + React Query |
| Secrets en dur | Docker secrets + env sécurisé |
| API dépréciée (on_event) | Lifespan context manager |

## Nouvelle Structure Backend

```
modules/transport/api/
├── core/                          # Composants fondamentaux
│   ├── __init__.py
│   ├── config.py                  # Configuration Pydantic centralisée
│   ├── database.py                # Connection pool SQLAlchemy async
│   ├── security.py                # JWT, auth, permissions
│   └── exceptions.py              # Hiérarchie d'exceptions
│
├── domains/                       # Domaines métier (DDD)
│   ├── base/                      # Composants de base réutilisables
│   │   ├── models.py              # BaseModel avec timestamps, multi-tenant
│   │   ├── schemas.py             # Schemas Pydantic génériques
│   │   ├── repository.py          # Repository générique CRUD
│   │   └── service.py             # Service générique avec hooks
│   │
│   ├── vehicle/                   # Domaine Véhicule
│   │   ├── models.py              # Modèle Vehicle
│   │   ├── schemas.py             # VehicleCreate, VehicleUpdate, etc.
│   │   ├── repository.py          # VehicleRepository
│   │   ├── service.py             # VehicleService (logique métier)
│   │   └── routes.py              # Endpoints REST /vehicles
│   │
│   ├── site/                      # Domaine Site/Location
│   │   └── ...
│   │
│   └── route/                     # Domaine Route/Mission
│       └── ...
│
├── services/                      # Services transverses
│   ├── optimization/              # Optimisation de routes
│   │   ├── optimizer.py           # Orchestrateur principal
│   │   ├── strategies.py          # VRP, VRPTW (Strategy Pattern)
│   │   └── distance.py            # Calcul Haversine, matrices
│   │
│   └── geocoding/                 # Géocodage
│       └── __init__.py            # Nominatim/OpenStreetMap
│
├── main.py                        # Ancien point d'entrée (compatibilité)
└── main_v2.py                     # Nouveau point d'entrée avec lifespan
```

## Patterns utilisés

### 1. Repository Pattern

```python
# Utilisation
class VehicleRepository(BaseRepository[Vehicle]):
    async def find_available(self, org_id: UUID) -> List[Vehicle]:
        # Méthode spécifique au domaine
        pass

# BaseRepository fournit automatiquement:
# - create(), get_by_id(), find_by_organization()
# - update(), delete(), find_paginated()
# - search(), count(), exists()
```

### 2. Service Pattern avec Hooks

```python
class VehicleService(BaseService[Vehicle, VehicleRepository]):
    # Hooks pour personnaliser le comportement
    async def _validate_create(self, data: Dict) -> None:
        # Validation métier avant création
        pass

    async def _after_create(self, entity: Vehicle) -> None:
        # Actions post-création (notifications, cache, etc.)
        pass
```

### 3. Strategy Pattern (Optimisation)

```python
# Sélection automatique de l'algorithme
optimizer = RouteOptimizer()

# Sans contraintes temporelles -> VRP simple
result = optimizer.optimize(locations)

# Avec time windows -> VRPTW
result = optimizer.optimize(locations, {"time_windows": [...]})

# Ou choix explicite
optimizer.strategy = VRPTWStrategy(timeout_seconds=60)
```

### 4. Multi-Tenant avec RLS

```python
# Le repository filtre automatiquement par organization_id
async with db.tenant_session(org_id) as session:
    # SET app.organization_id est exécuté automatiquement
    # RLS policies PostgreSQL appliquent le filtrage
    vehicles = await repo.find_by_organization(org_id)
```

## Frontend - State Management

### Zustand Store

```typescript
// État global persistant
const useTransportStore = create(
  persist(
    (set) => ({
      organizationId: null,
      map: { center: [48.8566, 2.3522], zoom: 13 },
      filters: { status: null, type: null },
      // ...
    }),
    { name: 'transport-store' }
  )
);
```

### React Query Hooks

```typescript
// Hooks typés avec cache intelligent
export function useVehicles(filters?: VehicleFilters) {
  const orgId = useTransportStore((s) => s.organizationId);

  return useQuery({
    queryKey: vehicleKeys.list(orgId!, filters),
    queryFn: () => fetchVehicles(orgId!, filters),
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
    enabled: !!orgId,
  });
}

// Mutations avec invalidation automatique
export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
    },
  });
}
```

## Schéma de Base de Données Unifié

### Tables principales

| Table | Description | Multi-tenant |
|-------|-------------|--------------|
| `vehicles` | Véhicules (bus, camions, etc.) | Oui |
| `sites` | Points géographiques | Oui |
| `items` | Éléments à transporter | Oui |
| `routes` | Missions/tournées | Oui |
| `route_stops` | Arrêts sur une route | Via route |
| `gps_positions` | Historique GPS | Via vehicle |
| `events` | Notifications | Oui |
| `organization_config` | Config par org | Oui |

### Caractéristiques

- UUID pour tous les IDs
- Timestamps automatiques (created_at, updated_at)
- organization_id sur toutes les tables métier
- Index optimisés pour les requêtes fréquentes
- RLS policies pour isolation des données

## Configuration Sécurisée

### Développement

```bash
# Copier le template
cp modules/transport/.env.example modules/transport/.env

# Éditer les valeurs
nano modules/transport/.env
```

### Production (Docker Secrets)

```bash
# Générer les secrets
./scripts/setup-secrets.sh

# Démarrer avec docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d
```

Structure des secrets:
```
secrets/
├── .gitignore           # Ignore tous les fichiers
├── database_url.txt     # URL PostgreSQL
├── secret_key.txt       # Clé JWT
├── db_user.txt          # User PostgreSQL
└── db_password.txt      # Password PostgreSQL
```

## Migration depuis v1

### 1. Base de données

```bash
# Appliquer le nouveau schéma
psql -h localhost -p 54322 -U postgres -d postgres \
  -f modules/transport/migration_unified.sql
```

### 2. API Python

```bash
# Installer les nouvelles dépendances
pip install -r modules/transport/requirements.txt

# Lancer la nouvelle API
uvicorn api.main_v2:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend

Les hooks React Query sont rétro-compatibles. Remplacer progressivement:

```typescript
// Avant
const { data: vehicles } = await supabase.from('vehicles').select('*');

// Après
const { data: vehicles } = useVehicles();
```

## Endpoints API v2

### Health
- `GET /health` - État complet
- `GET /health/ready` - Kubernetes readiness
- `GET /health/live` - Kubernetes liveness

### Vehicles (exemple)
- `GET /api/v1/vehicles` - Liste paginée
- `GET /api/v1/vehicles/{id}` - Détail
- `POST /api/v1/vehicles` - Création
- `PUT /api/v1/vehicles/{id}` - Mise à jour
- `DELETE /api/v1/vehicles/{id}` - Suppression
- `GET /api/v1/vehicles/available` - Véhicules disponibles
- `GET /api/v1/vehicles/with-location` - Avec position GPS
- `PATCH /api/v1/vehicles/{id}/location` - MAJ position
- `PATCH /api/v1/vehicles/{id}/status` - MAJ statut

### Headers requis

```
Authorization: Bearer <jwt_token>
X-Organization-ID: <uuid>
Content-Type: application/json
```

## Performance

### Backend
- Connection pooling: 20 connexions de base, +10 overflow
- Cache de configuration via `@lru_cache`
- Index optimisés sur toutes les clés étrangères
- Requêtes async avec SQLAlchemy 2.0

### Frontend
- React Query staleTime: 5 minutes par défaut
- Refetch automatique pour données temps réel
- Invalidation ciblée (pas de refetch global)
- State persistant via Zustand persist

## Extensibilité

### Ajouter un nouveau domaine

1. Créer le dossier `domains/nouveau/`
2. Créer `models.py` héritant de `TenantBaseModel`
3. Créer `schemas.py` avec Create/Update/Response
4. Créer `repository.py` héritant de `BaseRepository`
5. Créer `service.py` héritant de `BaseService`
6. Créer `routes.py` avec les endpoints
7. Enregistrer le router dans `main_v2.py`

### Ajouter une stratégie d'optimisation

1. Créer une classe héritant de `OptimizationStrategy`
2. Implémenter la méthode `solve()`
3. Ajouter la logique de sélection dans `RouteOptimizer._select_strategy()`

## Tests

```bash
# Backend
cd modules/transport
pytest tests/ -v

# Frontend
cd apps/web
pnpm test
```

## Monitoring

### Logs structurés

```python
import structlog
logger = structlog.get_logger()

logger.info("vehicle_created", vehicle_id=str(vehicle.id), org_id=str(org_id))
```

### Métriques

- Health check: `/health`
- Database latency: mesuré dans health check
- Request count: via middleware (à implémenter)

---

**Version**: 2.0.0
**Date**: Janvier 2025
