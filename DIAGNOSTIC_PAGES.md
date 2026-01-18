# 🔍 RAPPORT DIAGNOSTIQUE - Pages Team, Driver, Client Dashboard

## Résumé des problèmes trouvés

### ✅ **PROBLÈMES RÉSOLUS:**

#### 1. **Team Page (`team/page.tsx`)**
- ❌ **Avant**: Affichait un spinner indéfini si les contextes échouaient
- ✅ **Après**:
  - Affiche les erreurs du contexte `useVocabulary()`
  - Affiche les erreurs de chargement des données
  - Button "Réessayer" pour recharger

#### 2. **Driver Dashboard (`driver/page.tsx`)**
- ❌ **Avant**: Affichait "Aucune mission" silencieusement si la requête échouait
- ✅ **Après**:
  - Affiche l'erreur Supabase réelle
  - Détecte spécifiquement l'erreur "driver_id does not exist"
  - Button "Réessayer" pour recharger

#### 3. **Client Dashboard (`client/page.tsx`)**
- ❌ **Avant**: Affichait "Aucun item en cours" silencieusement
- ✅ **Après**:
  - Affiche les erreurs de requête
  - Détecte les colonnes introuvables
  - Button "Réessayer" pour recharger

---

## ⚠️ **PROBLÈMES À VÉRIFIER**

### Problème 1: Colonne `driver_id` inexistante

**Localisation**: `apps/web/app/home/driver/page.tsx:111`

**Code problématique:**
```typescript
.eq('driver_id', profile.id)
```

**Diagnostic**: La colonne `driver_id` n'existe probablement pas dans la table `missions`.

**Solutions possibles** (à vérifier selon votre schema réel):

1. **Option A**: Utiliser `assigned_to_id`
   ```typescript
   .eq('assigned_to_id', profile.id)
   ```

2. **Option B**: Joindre via `vehicles` table
   ```typescript
   .eq('vehicle:vehicles.driver_id', profile.id)
   ```

3. **Option C**: Utiliser `user_id` (si missions ont une colonne user_id)
   ```typescript
   .eq('user_id', profile.id)
   ```

**Pour vérifier le schema réel**:
```bash
# Via Supabase CLI
pnpm run supabase:web:start
# Puis ouvrir http://localhost:54323
# Aller dans "SQL Editor" et exécuter:
SELECT column_name FROM information_schema.columns
WHERE table_name='missions' AND column_name LIKE '%driver%';
```

---

### Problème 2: Foreign keys inexactes

**Localisation**: `apps/web/app/home/client/page.tsx:98-109`

**Code problématique:**
```typescript
.select(`
  pickup_site:sites!items_pickup_site_id_fkey(id, name, address),
  delivery_site:sites!items_delivery_site_id_fkey(id, name, address),
`)
```

**Diagnostic**: Les noms de foreign keys peuvent être différents.

**Pour vérifier**:
```bash
# Voir toutes les foreign keys d'une table
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name='items' AND constraint_type='FOREIGN KEY';
```

---

### Problème 3: Colonnes JSONB inexistantes

**Localisation**: `apps/web/app/home/client/page.tsx:111`

**Code problématique:**
```typescript
.or(`metadata->>client_id.eq.${profile.user_id}`)
```

**Diagnostic**:
- La colonne `metadata` peut ne pas exister ou ne pas être JSONB
- La syntaxe `->>` (JSONB) peut ne pas fonctionner correctement

**Pour vérifier**:
```sql
-- Voir la structure réelle de la table items
SELECT * FROM items LIMIT 0;

-- Ou:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name='items';
```

---

## 📋 **CHECKLIST POUR CORRIGER**

### Pour la page Team:
- [ ] Vérifier que les tables `user_profiles`, `invitations`, `organization_members`, `organization_join_requests` existent
- [ ] Vérifier les RLS policies sur ces tables
- [ ] Tester: Naviguez vers `/home/team` et vérifiez les erreurs affichées

### Pour Driver Dashboard:
- [ ] **CRITIQUE**: Vérifier la colonne exacte pour filtrer les missions du driver
- [ ] Exécuter la requête Supabase CLI pour lister les colonnes de `missions`
- [ ] Mettre à jour `.eq('driver_id', ...)` avec la bonne colonne
- [ ] Tester: Naviguez vers `/home/driver`

### Pour Client Dashboard:
- [ ] Vérifier que la table `items` existe
- [ ] Vérifier les noms des foreign keys (pas forcément `items_pickup_site_id_fkey`)
- [ ] Vérifier si la colonne `metadata` est vraiment JSONB
- [ ] Tester: Naviguez vers `/home/client`

---

## 🧪 **COMMANDES DE TEST**

### Test 1: Vérifier le schema
```bash
pnpm run supabase:web:start
```
Puis ouvrir http://localhost:54323 → SQL Editor et exécuter:
```sql
-- Voir schema missions
\d missions

-- Voir schema items
\d items

-- Voir schema vehicles
\d vehicles
```

### Test 2: Tester les requêtes
Depuis le SQL Editor Supabase:
```sql
-- Test Driver Dashboard
SELECT id, name, status FROM missions
WHERE driver_id = '...' LIMIT 5;
-- OU si driver_id n'existe pas:
SELECT DISTINCT column_name FROM information_schema.columns
WHERE table_name='missions' ORDER BY column_name;

-- Test Client Dashboard
SELECT id, name FROM items
WHERE recipient_user_id = '...' LIMIT 5;
-- OU:
SELECT DISTINCT column_name FROM information_schema.columns
WHERE table_name='items' ORDER BY column_name;
```

---

## 🔧 **FIXES À APPLIQUER**

### 1. Driver Dashboard - Déterminer la bonne colonne

Après avoir trouvé la colonne correcte, remplacer dans `driver/page.tsx`:

```typescript
// ACTUELLEMENT (❌ Probablement faux):
.eq('driver_id', profile.id)

// REMPLACER PAR LA BONNE COLONNE (✅):
// Exemple si c'est assigned_to_id:
.eq('assigned_to_id', profile.id)
```

### 2. Client Dashboard - Corriger les foreign keys

Si les noms de foreign keys sont différents:

```typescript
// ACTUELLEMENT:
pickup_site:sites!items_pickup_site_id_fkey(...)

// REMPLACER PAR (exemple):
pickup_site:sites!fk_items_pickup_site(...)
// ou simplement:
pickup_site:sites(...)
```

### 3. Client Dashboard - Simplifier si nécessaire

Si la requête complexe échoue, simplifier:

```typescript
// Avant (peut échouer):
.or(`recipient_user_id.eq.${profile.user_id},metadata->>client_id.eq.${profile.user_id}`)

// Après (plus robuste):
.eq('recipient_user_id', profile.user_id)
// Ou: .eq('client_id', profile.user_id)
// Selon ce qui existe réellement
```

---

## 📝 **PROCHAINES ÉTAPES**

1. **Vérifier le schema** (voir commandes de test ci-dessus)
2. **Identifier les colonnes correctes** dans chaque table
3. **Mettre à jour les requêtes** dans les 3 pages
4. **Tester chaque page** et vérifier que les données s'affichent
5. **Vérifier les RLS policies** (s'il y a toujours des erreurs)

---

## 📞 **SUPPORT**

Si vous rencontrez une erreur spécifique:
1. Copiez le message d'erreur complet affiché à l'écran
2. Ouvrez la Console du navigateur (F12 → Console)
3. Copiez les logs d'erreur
4. Partagez-les pour un diagnostic plus précis

**Les erreurs doivent maintenant être visibles !** ✨
