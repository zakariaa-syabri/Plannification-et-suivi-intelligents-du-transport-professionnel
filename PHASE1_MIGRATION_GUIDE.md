# Phase 1 : Migration Multi-tenant & Choix du Domaine
## Guide de Démarrage et Tests

✅ **Phase 1 complétée avec succès !**

Ce guide vous explique comment lancer et tester le nouveau système multi-tenant avec choix du domaine.

---

## 🎯 Ce qui a été implémenté

### ✅ Migrations de Base de Données

1. **Table `organizations`**
   - Stockage des organisations multi-tenant
   - Configuration de domaine en JSONB
   - 3 templates pré-configurés (scolaire, logistique, urbain)

2. **Colonnes multi-tenant ajoutées**
   - `organization_id` sur toutes les tables transport
   - `domain_type` sur les tables principales
   - Index pour performance

3. **Row Level Security (RLS)**
   - Isolation complète des données par organisation
   - Policies pour toutes les tables
   - Sécurité au niveau base de données

### ✅ Système de Configuration des Domaines

**3 domaines disponibles :**
- 🚌 **Transport Scolaire** - Gestion d'élèves, bus scolaires, tournées quotidiennes
- 📦 **Logistique** - Gestion de colis, camions, routes de livraison
- 🚍 **Transport Urbain** - Gestion de passagers, lignes régulières, stations

**Configuration dynamique :**
- Labels personnalisés (cargo/élève/colis, vehicle/bus/camion, etc.)
- Champs de formulaire configurables
- Contraintes d'optimisation par domaine
- KPIs spécifiques

### ✅ Flow d'Onboarding

**Étape 1 :** `/onboarding/domain`
- Sélection du domaine d'activité
- Interface visuelle avec cartes interactives
- Description et fonctionnalités de chaque domaine

**Étape 2 :** `/onboarding/organization`
- Configuration de l'organisation
- Formulaire adapté au domaine choisi
- Création automatique de l'organisation + membre owner

**Redirection automatique :**
- Après inscription → `/onboarding/domain`
- Après création organisation → `/home`
- Si déjà une organisation → `/home`

### ✅ Hooks et Helpers

**Client-side :**
- `useCurrentOrganization()` - Hook React pour récupérer l'organisation

**Server-side :**
- `getCurrentOrganization()` - Helper serveur avec cache
- `requireOrganization()` - Guard pour pages protégées

---

## 🚀 Démarrage

### 1. Appliquer les migrations

```bash
cd apps/web

# Démarrer Supabase local
pnpm supabase:start

# Appliquer TOUTES les migrations
pnpm supabase db reset

# Ou appliquer uniquement les nouvelles migrations
pnpm supabase migration up
```

### 2. Vérifier que les migrations sont appliquées

Ouvrir Supabase Studio : http://localhost:54323

Vérifier que les tables suivantes existent :
- ✅ `organizations`
- ✅ `organization_members`
- ✅ `passagers` (avec colonnes `organization_id` et `domain_type`)
- ✅ `bus` (avec colonnes `organization_id` et `domain_type`)
- ✅ `tournees` (avec colonnes `organization_id` et `domain_type`)

Vérifier les templates (3 lignes dans `organizations` avec slug commençant par `_template_`):
- ✅ `_template_school_transport`
- ✅ `_template_logistics`
- ✅ `_template_urban_transit`

### 3. Lancer l'application

```bash
# Dans apps/web
pnpm dev
```

Application disponible sur : http://localhost:3000

---

## 🧪 Tests

### Test 1 : Inscription et Onboarding

**Objectif :** Vérifier le flow complet depuis l'inscription jusqu'à la création de l'organisation

1. **Aller sur** http://localhost:3000

2. **S'inscrire** avec un nouveau compte
   - Email : `test1@example.com`
   - Mot de passe : `Test123456!`

3. **Vérifier l'email** dans Inbucket : http://localhost:54324
   - Cliquer sur le lien de confirmation

4. **Être redirigé automatiquement** vers `/onboarding/domain`
   - ✅ Voir 3 cartes de domaines
   - ✅ Pouvoir sélectionner un domaine (bordure bleue quand sélectionné)

5. **Choisir "Transport Scolaire"** et cliquer sur "Continuer"

6. **Page `/onboarding/organization`**
   - ✅ Voir l'icône 🚌
   - ✅ Voir "Domaine sélectionné : Transport Scolaire"
   - ✅ Remplir le formulaire :
     - Nom : "École Primaire Victor Hugo"
     - Description : "Transport scolaire primaire"
     - Email : `contact@ecolevh.com`
   - ✅ Voir le slug généré : `ecole-primaire-victor-hugo`
   - ✅ Voir le récapitulatif avec "élèves", "bus", "tournées"

7. **Cliquer sur "Créer mon organisation"**

8. **Être redirigé** vers `/home`
   - ✅ Accès à l'application
   - ✅ Menu de navigation visible

### Test 2 : Vérifier l'isolation Multi-tenant

**Objectif :** S'assurer que les données sont bien isolées par organisation

1. **Se déconnecter** et **créer un 2ème compte**
   - Email : `test2@example.com`
   - Mot de passe : `Test123456!`

2. **Passer par l'onboarding** et choisir **"Logistique"**

3. **Créer l'organisation**
   - Nom : "Livraisons Express"
   - Domaine : Logistique

4. **Vérifier dans Supabase Studio**
   - Table `organizations` : 2 organisations créées (+ 3 templates = 5 lignes)
   - Table `organization_members` : 2 membres (1 par organisation)
   - Les 2 organisations ont des `domain_type` différents

5. **Se connecter avec le 1er compte** (`test1@example.com`)
   - ✅ Ne doit voir QUE les données de "École Victor Hugo"
   - ✅ Pas les données de "Livraisons Express"

### Test 3 : Redirection automatique

**Objectif :** Vérifier que les redirections fonctionnent correctement

1. **Sans être connecté**, aller sur http://localhost:3000/home
   - ✅ Redirigé vers `/auth/sign-in`

2. **Se connecter** avec un compte QUI A déjà une organisation
   - ✅ Redirigé vers `/home` directement
   - ✅ PAS redirigé vers `/onboarding/domain`

3. **Essayer d'accéder à** `/onboarding/domain` avec un compte qui a déjà une organisation
   - ✅ Redirigé vers `/home`

4. **Se connecter** avec un compte SANS organisation
   - ✅ Redirigé vers `/onboarding/domain`
   - ✅ Ne peut pas accéder à `/home` avant d'avoir créé l'organisation

### Test 4 : Configuration des domaines

**Objectif :** Vérifier que les configurations sont bien chargées

1. **Ouvrir la console du navigateur** (F12)

2. **Dans `/onboarding/domain`**, inspecter les cartes
   - ✅ Chaque domaine a une icône unique (🚌, 📦, 🚍)
   - ✅ Description différente
   - ✅ Labels différents dans le récapitulatif

3. **Dans `/onboarding/organization`**, regarder le récapitulatif
   - **Transport Scolaire :**
     - ✅ "élèves", "bus", "tournées"
   - **Logistique :**
     - ✅ "colis", "camions", "routes de livraison"
   - **Transport Urbain :**
     - ✅ "passagers", "bus", "lignes"

### Test 5 : Row Level Security (RLS)

**Objectif :** Vérifier que RLS bloque bien l'accès aux données d'autres organisations

1. **Se connecter avec test1@example.com** (École Victor Hugo)

2. **Créer un passager** via l'UI transport (si déjà implémenté)

3. **Dans Supabase Studio**, aller dans la table `passagers`
   - ✅ Voir que `organization_id` est bien rempli
   - ✅ Voir que `domain_type` = 'school_transport'

4. **Essayer de lire les passagers via SQL** dans le Query Editor :
   ```sql
   SELECT * FROM passagers;
   ```
   - ✅ Ne doit retourner QUE les passagers de l'organisation de l'utilisateur connecté

5. **Se déconnecter et se connecter avec test2@example.com**

6. **Refaire la requête SQL**
   ```sql
   SELECT * FROM passagers;
   ```
   - ✅ Ne doit retourner QUE les passagers de la 2ème organisation
   - ✅ Les passagers de l'organisation 1 ne sont PAS visibles

---

## ✅ Checklist de Validation

Cochez au fur et à mesure :

### Migrations
- [ ] Migrations appliquées sans erreur
- [ ] Table `organizations` créée avec 5 lignes (3 templates + vos tests)
- [ ] Table `organization_members` créée
- [ ] Colonnes `organization_id` présentes sur toutes les tables transport
- [ ] RLS activé sur toutes les tables

### Onboarding
- [ ] Page `/onboarding/domain` accessible
- [ ] 3 domaines affichés avec leurs icônes
- [ ] Sélection d'un domaine fonctionne
- [ ] Bouton "Continuer" activé uniquement si un domaine est sélectionné
- [ ] Page `/onboarding/organization` affiche le bon domaine
- [ ] Formulaire d'organisation fonctionne
- [ ] Slug généré automatiquement
- [ ] Création d'organisation réussie
- [ ] Redirection vers `/home` après création

### Sécurité & Isolation
- [ ] Un utilisateur sans organisation ne peut pas accéder à `/home`
- [ ] Un utilisateur avec organisation est redirigé vers `/home` depuis `/onboarding`
- [ ] 2 organisations différentes ont des données isolées
- [ ] RLS empêche l'accès aux données d'autres organisations

### Hooks & Helpers
- [ ] `useCurrentOrganization()` retourne la bonne organisation côté client
- [ ] `getCurrentOrganization()` retourne la bonne organisation côté serveur
- [ ] Layout `/home` vérifie bien la présence d'une organisation

---

## 🐛 Troubleshooting

### Erreur : "Table organizations does not exist"

**Solution :**
```bash
cd apps/web
pnpm supabase db reset
```

### Erreur : "Column organization_id does not exist"

**Solution :**
Les migrations ne sont pas appliquées dans le bon ordre. Vérifiez que les fichiers de migration ont les timestamps corrects :
- `20250129000000_create_organizations.sql` (AVANT)
- `20250129000001_add_multitenant_to_transport.sql` (APRÈS)

### Erreur : "Cannot read properties of null (reading 'domain_config')"

**Solution :**
L'organisation n'est pas correctement récupérée. Vérifiez dans Supabase Studio que :
1. La table `organizations` contient bien votre organisation
2. La table `organization_members` lie bien votre user_id à l'organization_id
3. Le champ `domain_config` est bien rempli (JSONB non vide)

### Redirection infinie entre /home et /onboarding

**Solution :**
Vérifiez que le trigger `on_organization_created` a bien créé l'entrée dans `organization_members` :
```sql
SELECT * FROM organization_members WHERE user_id = 'YOUR_USER_ID';
```
Si absent, le trigger ne s'est pas exécuté. Recréez l'organisation.

### Les templates n'apparaissent pas

**Solution :**
Les templates ont un `owner_id` dummy. C'est normal, ils ne sont pas censés apparaître dans l'UI, seulement servir de référence pour la configuration.

---

## 🎉 Prochaines Étapes

Une fois que tous les tests passent, vous êtes prêt pour :

### Phase 2 : Renommage des Tables (Semaines 3-4)
- Renommer `passagers` → `cargos`
- Renommer `bus` → `vehicles`
- Renommer `tournees` → `missions`
- Migration des données

### Phase 3 : Attributs JSONB Dynamiques (Semaines 5-6)
- Migrer les champs spécifiques vers `attributes JSONB`
- Formulaires dynamiques basés sur `domain_config`
- Validation dynamique avec Zod

### Phase 4 : UI Dynamique (Semaines 7-8)
- Composants génériques qui s'adaptent au domaine
- Labels dynamiques partout dans l'UI
- Dashboard adapté au domaine

---

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifier les logs de Supabase : `pnpm supabase logs`
2. Vérifier les logs de Next.js dans le terminal
3. Ouvrir la console du navigateur (F12)
4. Vérifier les données dans Supabase Studio : http://localhost:54323

---

**Date de création :** 11 Janvier 2025
**Version :** Phase 1 - Migration Multi-tenant
**Statut :** ✅ Prêt pour tests
