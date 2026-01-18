# Module Transport - Planification et Suivi Intelligents

Module complet de planification et suivi en temps réel du transport professionnel, intégré dans MakerKit.

## Architecture

```
Transport_intelligent/
├── apps/web/                              # Application Next.js (MakerKit)
│   ├── app/home/transport/                # Pages du module transport
│   │   ├── dashboard/                     # Tableau de bord admin
│   │   ├── tournees/                      # Liste des tournées
│   │   └── tracking/                      # Suivi temps réel
│   ├── config/                            # Configuration routes & navigation
│   └── supabase/migrations/               # Migrations PostgreSQL
│       └── 20250128000000_transport_schema.sql
│
├── modules/transport/                     # API FastAPI
│   ├── api/
│   │   ├── main.py                       # Point d'entrée FastAPI
│   │   ├── config.py                     # Configuration
│   │   ├── routes/                       # Endpoints API
│   │   │   ├── health.py                # Health checks
│   │   │   └── summary.py               # Données résumées
│   │   ├── models/                       # Modèles de données
│   │   ├── schemas/                      # Schémas Pydantic
│   │   └── services/                     # Services métier
│   ├── requirements.txt                  # Dépendances Python
│   ├── Dockerfile                        # Image Docker
│   └── .env                              # Variables d'environnement
│
├── config/mosquitto/                     # Configuration MQTT
│   └── mosquitto.conf
│
└── docker-compose.yml                    # Orchestration des services
```

## Schéma de Données

### Tables principales :

1. **passagers** - Étudiants/employés à transporter
   - Informations personnelles, adresse, coordonnées GPS
   - Besoins spécifiques (mobilité réduite, etc.)

2. **bus** - Flotte de véhicules
   - Capacité, équipements, statut
   - Immatriculation, type de bus

3. **tournees** - Planification des trajets
   - Bus assigné, date, horaires
   - Séquence d'arrêts, statistiques

4. **arrets** - Points de ramassage/dépose
   - Ordre dans la tournée, fenêtres de temps
   - Heures prévues vs réelles, statut

5. **inscriptions** - Liaison passagers ↔ tournées
   - Date d'inscription, statut
   - Besoins de retour

6. **positions_gps** - Tracking temps réel
   - Coordonnées GPS, vitesse, cap
   - Précision, timestamp

7. **evenements** - Notifications et alertes
   - Retards, changements d'itinéraire
   - Priorité, destinataires

8. **contraintes_optimisation** - Paramètres d'optimisation
   - Capacité max, durée max, distance max
   - Configuration flexible

## Fonctionnalités - Semaine 1 (Cadrage & Socle)

### ✅ Implémenté

1. **Structure du projet**
   - Dossiers frontend (Next.js) et backend (FastAPI)
   - Configuration Docker et docker-compose
   - Migrations PostgreSQL

2. **Schéma de données**
   - 8 tables avec relations et contraintes
   - Index pour performances
   - Row-Level Security (RLS)
   - Triggers pour updated_at

3. **API FastAPI**
   - Point d'entrée `/` avec informations de base
   - `GET /health` - Health check complet
   - `GET /health/ready` - Readiness check
   - `GET /health/live` - Liveness check
   - `GET /summary` - Résumé dashboard (mock JSON)
   - `GET /summary/tournees` - Liste tournées (mock JSON)
   - Configuration CORS
   - Documentation auto (Swagger UI)

4. **Interface Next.js**
   - 3 pages principales :
     - **Dashboard Admin** (`/home/transport/dashboard`)
     - **Liste Tournées** (`/home/transport/tournees`)
     - **Tracking Temps Réel** (`/home/transport/tracking`)
   - Navigation intégrée dans MakerKit
   - Design responsive avec shadcn/ui
   - Rafraîchissement automatique des données

5. **Infrastructure**
   - Docker Compose pour orchestration
   - Service MQTT (Mosquitto) pour tracking
   - PostgreSQL via Supabase local

## Démarrage

### Prérequis

- Node.js 18+
- Python 3.12+
- Docker & Docker Compose
- pnpm (recommandé)

### Option 1 : Démarrage avec Supabase Local (Recommandé)

```bash
# 1. Démarrer Supabase local (inclut PostgreSQL)
cd apps/web
pnpm supabase:start

# Note : Supabase démarre sur :
# - PostgreSQL : localhost:54322
# - Studio : http://localhost:54323

# 2. Appliquer la migration transport
pnpm supabase db reset
# Ou si vous voulez juste appliquer la nouvelle migration :
# pnpm supabase migration up

# 3. Démarrer l'app Next.js
pnpm dev
# Accessible sur http://localhost:3000

# 4. Dans un autre terminal, démarrer l'API FastAPI
cd ../../modules/transport
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
# Accessible sur http://localhost:8000
```

### Option 2 : Démarrage avec Docker Compose (Tout-en-un)

```bash
# Démarrer tous les services
docker-compose up -d

# Services disponibles :
# - API FastAPI : http://localhost:8000
# - MQTT Broker : localhost:1883
# - PostgreSQL : localhost:5433

# Pour voir les logs
docker-compose logs -f transport-api

# Pour arrêter
docker-compose down
```

### Vérification

1. **API FastAPI** : http://localhost:8000/docs
   - Tester `/health` → devrait retourner `{"status": "healthy"}`
   - Tester `/summary` → devrait retourner des données mock

2. **Next.js** : http://localhost:3000
   - Se connecter avec vos credentials MakerKit
   - Naviguer vers "Transport" dans le menu
   - Vérifier les 3 pages : Dashboard, Tournées, Tracking

3. **Supabase Studio** : http://localhost:54323
   - Vérifier les tables créées
   - Explorer les données

## Endpoints API Disponibles

### Health Checks
- `GET /health` - État général de l'API
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Données (Mock pour l'instant)
- `GET /summary` - Résumé dashboard
- `GET /summary/tournees` - Liste des tournées

### Documentation
- `GET /docs` - Swagger UI interactif
- `GET /redoc` - Documentation ReDoc

## Technologies Utilisées

### Frontend
- **Next.js 15** - Framework React avec App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Composants UI
- **Lucide React** - Icônes

### Backend
- **FastAPI** - Framework Python moderne
- **Pydantic** - Validation des données
- **Uvicorn** - Serveur ASGI
- **PostgreSQL** - Base de données
- **SQLAlchemy** - ORM (à implémenter)

### Infrastructure
- **Docker** - Conteneurisation
- **Docker Compose** - Orchestration
- **MQTT (Mosquitto)** - Messaging pour tracking
- **Supabase** - PostgreSQL + Auth + RLS

### Optimisation (à implémenter)
- **Google OR-Tools** - Optimisation de tournées
- **NumPy/SciPy** - Calculs scientifiques
- **GeoPy** - Calcul de distances

### Export (à implémenter)
- **Pandas** - Manipulation de données
- **OpenPyXL/XlsxWriter** - Export Excel
- **WeasyPrint/ReportLab** - Export PDF

## Prochaines Étapes (Semaine 2+)

### Semaine 2 - CRUD de base
- Endpoints CRUD pour passagers, bus, tournées
- Formulaires d'ajout/modification dans l'UI
- Connexion réelle à PostgreSQL (SQLAlchemy)
- Validation des données avec Pydantic

### Semaine 3 - Optimisation basique
- Algorithme d'optimisation de tournées simple
- Calcul de distances avec GeoPy
- Estimation de temps de trajet
- Tests de performance

### Semaine 4 - Tracking temps réel
- Intégration WebSocket pour positions GPS
- Connexion MQTT pour les bus
- Mise à jour en temps réel de l'UI
- Notifications push

### Semaine 5 - Ré-optimisation incrémentale
- Ajout dynamique de passagers
- Minimisation des changements
- Gestion des contraintes complexes

### Semaine 6 - Exports et rapports
- Export Excel de tournées
- Export PDF avec itinéraires
- Statistiques et KPIs
- Historique et analytics

## Configuration Avancée

### Variables d'Environnement

Créer un fichier `.env` dans `modules/transport/` :

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# API
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true

# CORS
CORS_ORIGINS=http://localhost:3000

# MQTT
MQTT_BROKER=localhost
MQTT_PORT=1883

# Contraintes
MAX_TOURNEE_DURATION_MINUTES=180
MAX_BUS_CAPACITY=50
MAX_DISTANCE_KM=100
```

### Navigation MakerKit

Les routes transport sont configurées dans :
- `apps/web/config/paths.config.ts` - Définition des chemins
- `apps/web/config/navigation.config.tsx` - Menu de navigation
- `apps/web/public/locales/en/common.json` - Traductions

## Troubleshooting

### L'API FastAPI ne démarre pas
```bash
# Vérifier que le port 8000 n'est pas utilisé
netstat -ano | findstr :8000  # Windows
lsof -i :8000                  # Linux/Mac

# Vérifier les dépendances
pip list | grep fastapi
```

### Les pages Next.js ne chargent pas les données
- Vérifier que l'API FastAPI tourne sur http://localhost:8000
- Vérifier la console du navigateur pour les erreurs CORS
- Vérifier que `CORS_ORIGINS` inclut http://localhost:3000

### Les migrations ne s'appliquent pas
```bash
# Réinitialiser la base de données
cd apps/web
pnpm supabase db reset

# Vérifier les logs Supabase
pnpm supabase status
```

### Docker Compose échoue
```bash
# Voir les logs détaillés
docker-compose logs transport-api

# Rebuild les images
docker-compose build --no-cache
docker-compose up -d
```

## Support

Pour toute question ou problème :
1. Vérifier les logs : `docker-compose logs -f`
2. Consulter la documentation API : http://localhost:8000/docs
3. Vérifier la base de données : http://localhost:54323

## Licence

Ce projet est intégré dans votre installation MakerKit.
