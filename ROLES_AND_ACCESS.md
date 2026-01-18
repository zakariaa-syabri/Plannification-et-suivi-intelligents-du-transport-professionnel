# Système de Rôles et Contrôle d'Accès (Phase 2)

## Vue d'ensemble

Le système est basé sur les **rôles utilisateurs** qui déterminant:
1. **Les pages accessibles** (fenêtres visibles)
2. **Les actions autorisées**
3. **Les données visibles**

---

## 🔐 Rôles et Accès

### **1. Admin (Administrateur)**
**Accès:** ⭐⭐⭐⭐⭐ Complet

| Page | Accès |
|------|-------|
| `/home` (Map Builder) | ✅ OUI |
| `/home/settings` | ✅ OUI |
| `/home/settings/configuration` | ✅ OUI |
| `/home/team` (Gestion équipe) | ✅ OUI |
| `/home/driver` (Dashboard chauffeurs) | ✅ OUI |
| `/home/client` (Dashboard clients) | ✅ OUI |

**Permissions:**
- Gérer l'organisation complètement
- Créer/modifier/supprimer les membres
- Assigner les rôles
- Configurer les paramètres
- Consulter tous les rapports

---

### **2. Dispatcher (Dispatcheur)**
**Accès:** ⭐⭐⭐⭐ Opérationnel complet

| Page | Accès |
|------|-------|
| `/home` (Map Builder) | ✅ OUI |
| `/home/settings` | ✅ OUI |
| `/home/settings/configuration` | ❌ NON |
| `/home/team` (Gestion équipe) | ❌ NON |
| `/home/driver` (Dashboard chauffeurs) | ✅ OUI |
| `/home/client` (Dashboard clients) | ✅ OUI |

**Permissions:**
- Planifier les missions
- Assigner les chauffeurs
- Suivre les livraisons en temps réel
- Consulter les rapports opérationnels
- Ne peut pas gérer les équipes

---

### **3. Supervisor (Superviseur)**
**Accès:** ⭐⭐⭐⭐ Supervision

| Page | Accès |
|------|-------|
| `/home` (Map Builder) | ✅ OUI |
| `/home/settings` | ✅ OUI |
| `/home/settings/configuration` | ❌ NON |
| `/home/team` (Gestion équipe) | ❌ NON |
| `/home/driver` (Dashboard chauffeurs) | ✅ OUI |
| `/home/client` (Dashboard clients) | ✅ OUI |

**Permissions:**
- Superviser les opérations
- Consulter les missions
- Suivre les chauffeurs
- Voir les rapports

---

### **4. Driver (Chauffeur)**
**Accès:** ⭐⭐ Limité à ses missions

| Page | Accès |
|------|-------|
| `/home` (Map Builder) | ❌ NON |
| `/home/settings` | ✅ OUI |
| `/home/settings/configuration` | ❌ NON |
| `/home/team` (Gestion équipe) | ❌ NON |
| `/home/driver` (Dashboard chauffeurs) | ✅ OUI |
| `/home/client` (Dashboard clients) | ❌ NON |

**Permissions:**
- Voir ses missions assignées
- Mettre à jour le statut de mission
- Voir son profil
- Communiquer avec le dispatcher

**Redirection par défaut:** `/home/driver`

---

### **5. Client (Client)**
**Accès:** ⭐⭐ Limité au suivi

| Page | Accès |
|------|-------|
| `/home` (Map Builder) | ❌ NON |
| `/home/settings` | ✅ OUI |
| `/home/settings/configuration` | ❌ NON |
| `/home/team` (Gestion équipe) | ❌ NON |
| `/home/driver` (Dashboard chauffeurs) | ❌ NON |
| `/home/client` (Dashboard clients) | ✅ OUI |

**Permissions:**
- Suivre ses livraisons
- Voir l'historique des trajets
- Voir son profil
- Recevoir les notifications

**Redirection par défaut:** `/home/client`

---

### **6. Staff (Personnel)**
**Accès:** ⭐ Accès basique

| Page | Accès |
|------|-------|
| `/home` (Map Builder) | ❌ NON |
| `/home/settings` | ✅ OUI |
| `/home/settings/configuration` | ❌ NON |
| `/home/team` (Gestion équipe) | ❌ NON |
| `/home/driver` (Dashboard chauffeurs) | ❌ NON |
| `/home/client` (Dashboard clients) | ❌ NON |

**Permissions:**
- Voir son profil
- Changer ses paramètres personnels
- Recevoir les notifications

**Redirection par défaut:** `/home/settings`

---

## 🔄 Flux d'Invitation et Attribution de Rôle

### Phase 1: Création d'Invitation
```
Admin crée invitation
  ↓
Spécifie: Email + Type (rôle)
  ↓
Système génère token unique
  ↓
Admin copie le lien
```

### Phase 2: Acceptation d'Invitation
```
Utilisateur clique le lien
  ↓
Formulaire sign-up (email pré-rempli)
  ↓
Entre: password + prénom + nom
  ↓
Système crée compte + profile + member
  ↓
Rôle assigné automatiquement
  ↓
Redirige selon rôle:
  ├─ Admin/Dispatcher → /home
  ├─ Driver → /home/driver
  └─ Client → /home/client
```

---

## 🛡️ Implémentation

### Fichiers Clés

**Configuration:**
- `lib/role-based-routes.ts` - Règles d'accès par rôle
- `lib/hooks/useRoleAccess.ts` - Hook pour vérifier l'accès

**Composants:**
- `app/home/_components/home-sidebar-content.tsx` - Menu filtré (sidebar)
- `app/home/_components/home-menu-navigation-content.tsx` - Menu filtré (header)
- `app/home/_components/home-layout-protector.tsx` - Protection des pages
- `app/home/_components/role-welcome-banner.tsx` - Message personnalisé

**Pages:**
- `app/home/unauthorized/page.tsx` - Page d'accès refusé
- `app/home/settings/page.tsx` - Paramètres (accessible à tous)
- `app/home/driver/page.tsx` - Dashboard chauffeur
- `app/home/client/page.tsx` - Dashboard client

### Flux de Vérification d'Accès

```typescript
// 1. Vérifier l'accès à une route
const canAccess = hasAccessToRoute(userType, pathname);

// 2. Obtenir la redirection
const redirectTo = getRedirectPath(userType, pathname);

// 3. Filtrer les routes du menu
const filteredRoutes = filterNavigationRoutes(userType, routes);
```

---

## 📋 Changements Apportés

### ✅ Phase 1: Sign-up avec Invitation
- [x] Server Action pour accepter invitation
- [x] Page `/auth/accept-invitation?token=...`
- [x] Génération automatique du lien
- [x] Création du compte + profil + membership

### ✅ Phase 2: Fenêtres Spécifiques par Rôle
- [x] Configuration des accès par rôle
- [x] Menu dynamique selon le rôle (sidebar + header)
- [x] Protection automatique des pages
- [x] Redirection selon le rôle
- [x] Page d'accès refusé
- [x] Message de bienvenue personnalisé

---

## 🧪 Test du Système

### Scénario 1: Admin
1. Créer une invitation pour un email
2. Spécifier le rôle: **Admin**
3. Accepter l'invitation
4. ✅ Doit avoir accès à: Home + Team + Driver + Client + Settings

### Scénario 2: Dispatcher
1. Créer une invitation
2. Spécifier le rôle: **Dispatcher**
3. Accepter l'invitation
4. ✅ Doit avoir accès à: Home + Driver + Client + Settings
5. ❌ Ne doit PAS avoir accès à: Team + Configuration

### Scénario 3: Driver
1. Créer une invitation
2. Spécifier le rôle: **Driver**
3. Accepter l'invitation
4. ✅ Doit voir: Dashboard Driver + Settings
5. ❌ Ne doit PAS voir: Map Builder
6. Redirection automatique vers `/home/driver`

### Scénario 4: Client
1. Créer une invitation
2. Spécifier le rôle: **Client**
3. Accepter l'invitation
4. ✅ Doit voir: Dashboard Client + Settings
5. ❌ Ne doit PAS voir: Map Builder, Team
6. Redirection automatique vers `/home/client`

---

## 🔮 Futur

### Améliorations Possibles
- [ ] Permissions granulaires (create, read, update, delete par entité)
- [ ] Rôles personnalisés par organisation
- [ ] Délégation de rôles (un admin peut en créer d'autres)
- [ ] Audit log des actions par rôle
- [ ] Limitation par nombre de missions/véhicules selon le plan

---

## 📞 Support

Si un utilisateur n'a pas accès à une page:
1. Vérifier son rôle dans: `app/home/settings`
2. Contacter l'admin pour changer de rôle
3. L'admin peut modifier le rôle dans: `app/home/team`
