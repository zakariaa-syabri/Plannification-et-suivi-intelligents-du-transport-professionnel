# Démarrage Rapide - Module Transport

Guide ultra-rapide pour démarrer le module Transport en 5 minutes.

## Étape 1 : Démarrer Supabase (PostgreSQL)

```bash
cd apps/web
pnpm supabase:start
```

**Attendez** que Supabase soit complètement démarré (vous verrez les URLs affichées).

## Étape 2 : Appliquer la Migration Transport

```bash
# Dans le même dossier apps/web
pnpm supabase db reset
```

Cela va créer toutes les tables nécessaires pour le module transport.

## Étape 3 : Démarrer Next.js

```bash
# Dans apps/web
pnpm dev
```

L'app sera accessible sur **http://localhost:3000**

## Étape 4 : Démarrer l'API FastAPI

**Ouvrez un nouveau terminal :**

```bash
cd modules/transport

# Créer et activer l'environnement virtuel Python
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Démarrer l'API
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

L'API sera accessible sur **http://localhost:8000**

## Étape 5 : Tester

1. **API FastAPI** : http://localhost:8000/docs
   - Cliquez sur "Try it out" pour tester `/health`
   - Testez `/summary` pour voir les données mock

2. **Application Next.js** : http://localhost:3000
   - Connectez-vous (créez un compte si nécessaire)
   - Dans le menu latéral, cliquez sur **"Transport"**
   - Explorez les 3 pages :
     - Dashboard (statistiques)
     - Routes (liste des tournées)
     - Live Tracking (suivi temps réel)

## Vérification Rapide

### ✅ L'API fonctionne ?
```bash
curl http://localhost:8000/health
# Doit retourner : {"status":"healthy","service":"transport-api"...}
```

### ✅ Les données arrivent ?
```bash
curl http://localhost:8000/summary
# Doit retourner un JSON avec statistiques, alertes, tournées
```

### ✅ L'UI charge les données ?
- Ouvrez http://localhost:3000/home/transport/dashboard
- Vous devriez voir des statistiques (tournées actives, passagers, etc.)
- Si vous voyez une erreur rouge : vérifiez que l'API FastAPI tourne

## Ports Utilisés

- **3000** : Next.js (frontend)
- **8000** : FastAPI (backend)
- **54322** : PostgreSQL (Supabase)
- **54323** : Supabase Studio (interface admin DB)

## En Cas de Problème

### "Cannot connect to database"
→ Vérifiez que Supabase est démarré : `pnpm supabase status`

### "API not responding"
→ Vérifiez que FastAPI tourne : ouvrez http://localhost:8000

### "CORS error" dans la console
→ Vérifiez que `modules/transport/.env` contient :
```
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### "Module not found" en Python
→ Assurez-vous d'avoir activé l'environnement virtuel :
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

## Prochaines Étapes

Maintenant que tout fonctionne, vous pouvez :

1. **Explorer la base de données** : http://localhost:54323
2. **Tester les endpoints** : http://localhost:8000/docs
3. **Modifier l'UI** : Fichiers dans `apps/web/app/home/transport/`
4. **Ajouter des endpoints** : Fichiers dans `modules/transport/api/routes/`

Pour plus de détails, consultez **TRANSPORT_MODULE_README.md**.
