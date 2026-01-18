# Commandes Essentielles - Module Transport

## Démarrage Complet

### Option 1 : Démarrage Manuel (Recommandé pour développement)

```bash
# Terminal 1 : Supabase + PostgreSQL
cd apps/web
pnpm supabase:start
pnpm supabase db reset  # Applique les migrations

# Terminal 2 : Next.js
cd apps/web
pnpm dev

# Terminal 3 : FastAPI
cd modules/transport
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### Option 2 : Docker Compose (Production)

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f transport-api

# Arrêter
docker-compose down
```

## Gestion Base de Données

```bash
cd apps/web

# Démarrer Supabase
pnpm supabase:start

# Arrêter Supabase
pnpm supabase:stop

# Voir le statut
pnpm supabase status

# Réinitialiser la BDD (applique toutes les migrations)
pnpm supabase db reset

# Créer une nouvelle migration
pnpm supabase migration new nom_migration

# Générer les types TypeScript depuis le schéma
pnpm supabase:typegen

# Accéder à la console SQL
pnpm supabase db psql
```

## Tests

```bash
# Tester l'API FastAPI
cd modules/transport
pip install -r test_requirements.txt
python test_api.py

# Tester manuellement les endpoints
curl http://localhost:8000/health
curl http://localhost:8000/summary
curl http://localhost:8000/summary/tournees

# Tests Next.js
cd apps/web
pnpm test
```

## Développement API

```bash
cd modules/transport

# Créer l'environnement virtuel
python -m venv venv

# Activer
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Installer les dépendances
pip install -r requirements.txt

# Démarrer en mode développement (auto-reload)
uvicorn api.main:app --reload

# Démarrer sur un port spécifique
uvicorn api.main:app --reload --port 8001

# Avec logs détaillés
uvicorn api.main:app --reload --log-level debug

# Générer requirements.txt
pip freeze > requirements.txt
```

## Développement Frontend

```bash
cd apps/web

# Installer les dépendances
pnpm install

# Démarrer en mode développement
pnpm dev

# Build pour production
pnpm build

# Lancer en production
pnpm start

# Linting
pnpm lint

# Format du code
pnpm format
```

## Docker

```bash
# Build l'image API
docker build -t transport-api ./modules/transport

# Run le container
docker run -p 8000:8000 transport-api

# Docker Compose complet
docker-compose up -d

# Rebuild une image
docker-compose build transport-api

# Voir les logs
docker-compose logs -f

# Arrêter tout
docker-compose down

# Nettoyer les volumes
docker-compose down -v
```

## Accès aux Services

| Service | URL | Description |
|---------|-----|-------------|
| Next.js App | http://localhost:3000 | Application frontend |
| Transport Module | http://localhost:3000/home/transport | Module transport |
| FastAPI Docs | http://localhost:8000/docs | Documentation interactive |
| FastAPI ReDoc | http://localhost:8000/redoc | Documentation alternative |
| API Health | http://localhost:8000/health | Health check |
| Supabase Studio | http://localhost:54323 | Interface admin DB |
| PostgreSQL | localhost:54322 | Base de données |
| MQTT Broker | localhost:1883 | Broker MQTT |

## Dépannage

```bash
# Vérifier les ports utilisés
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :8000
netstat -ano | findstr :54322

# Linux/Mac
lsof -i :3000
lsof -i :8000
lsof -i :54322

# Tuer un processus par port (Windows)
# Trouver le PID puis :
taskkill /PID <PID> /F

# Tuer un processus par port (Linux/Mac)
kill -9 $(lsof -t -i:8000)

# Vérifier les logs Supabase
cd apps/web
pnpm supabase status
cat .supabase/logs/postgres.log

# Vérifier les variables d'environnement
cd modules/transport
cat .env

# Réinstaller les dépendances Python
rm -rf venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Base de Données - Requêtes Utiles

```sql
-- Se connecter à PostgreSQL
psql -h localhost -p 54322 -U postgres -d postgres

-- Voir les tables du module transport
\dt public.*

-- Compter les passagers
SELECT COUNT(*) FROM public.passagers;

-- Voir les tournées du jour
SELECT * FROM public.tournees
WHERE date_tournee = CURRENT_DATE;

-- Voir les bus disponibles
SELECT * FROM public.bus
WHERE statut = 'disponible';

-- Dernières positions GPS
SELECT * FROM public.positions_gps
ORDER BY timestamp_gps DESC
LIMIT 10;
```

## Git (Recommandé)

```bash
# Initialiser Git
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "feat: Module Transport - Semaine 1 complete

- Structure projet complète
- Schéma BDD avec 8 tables
- API FastAPI avec endpoints health et summary
- 3 pages UI (dashboard, tournées, tracking)
- Docker Compose configuré
- Documentation complète"

# Créer une branche pour Semaine 2
git checkout -b semaine-2-crud
```

## Scripts Utiles

### Réinitialisation Complète

```bash
# Windows
cd apps/web && pnpm supabase db reset && cd ../.. && cd modules/transport && rmdir /s /q venv && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt

# Linux/Mac
cd apps/web && pnpm supabase db reset && cd ../.. && cd modules/transport && rm -rf venv && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
```

### Démarrage Rapide (après installation)

```bash
# Terminal 1
cd apps/web && pnpm supabase:start && pnpm dev

# Terminal 2
cd modules/transport && venv\Scripts\activate && uvicorn api.main:app --reload
```

## Variables d'Environnement

### modules/transport/.env

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
MQTT_BROKER=localhost
MQTT_PORT=1883
```

### apps/web/.env.local (MakerKit existant)

```env
# Vos variables MakerKit existantes
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Checklist de Démarrage

- [ ] Node.js 18+ installé
- [ ] Python 3.12+ installé
- [ ] Docker Desktop installé (optionnel)
- [ ] pnpm installé (`npm install -g pnpm`)
- [ ] Supabase CLI installé
- [ ] Repository cloné/téléchargé
- [ ] Dépendances installées (`pnpm install` dans apps/web)
- [ ] Supabase démarré (`pnpm supabase:start`)
- [ ] Migrations appliquées (`pnpm supabase db reset`)
- [ ] Environnement Python créé (`python -m venv venv`)
- [ ] Dépendances Python installées (`pip install -r requirements.txt`)
- [ ] API testée (http://localhost:8000/health)
- [ ] UI testée (http://localhost:3000/home/transport)

## Ressources

- **Documentation complète** : `TRANSPORT_MODULE_README.md`
- **Démarrage rapide** : `QUICKSTART.md`
- **Récapitulatif S1** : `SEMAINE_1_RECAP.md`
- **API Docs** : http://localhost:8000/docs
- **FastAPI Docs** : https://fastapi.tiangolo.com
- **Next.js Docs** : https://nextjs.org/docs
- **Supabase Docs** : https://supabase.com/docs
