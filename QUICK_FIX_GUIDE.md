# ⚡ GUIDE DE CORRECTION RAPIDE

## 🚀 ÉTAPES IMMÉDIATES

### Étape 1: Vérifier les erreurs réelles
Les pages affichent maintenant les erreurs ✅

1. Allez sur `/home/team` → Vous verrez soit:
   - Les données chargées ✅
   - Un message d'erreur spécifique ❌

2. Allez sur `/home/driver` → Vous verrez soit:
   - Les missions du driver ✅
   - **"Erreur: Colonne driver_id does not exist"** ← À corriger

3. Allez sur `/home/client` → Vous verrez soit:
   - Les livraisons du client ✅
   - **"Erreur: Colonnes introuvables dans la table items"** ← À corriger

---

### Étape 2: Diagnostic Supabase

**Ouvrir Supabase Dashboard:**
```bash
pnpm run supabase:web:start
```
Puis: http://localhost:54323 → SQL Editor

**Exécuter ce diagnostic:**
```sql
-- Voir colonnes dans missions
SELECT column_name FROM information_schema.columns
WHERE table_name='missions'
ORDER BY column_name;

-- Voir colonnes dans items
SELECT column_name FROM information_schema.columns
WHERE table_name='items'
ORDER BY column_name;
```

---

### Étape 3: Corriger selon les résultats

#### **Si vous voyez `driver_id` dans missions:**
✅ Pas de correction nécessaire pour Driver Dashboard

#### **Si vous voyez `assigned_to_id` ou autre dans missions:**
❌ Remplacer dans `apps/web/app/home/driver/page.tsx:120`:

```typescript
// Chercher cette ligne:
.eq('driver_id', profile.id)

// Remplacer par (exemple si c'est assigned_to_id):
.eq('assigned_to_id', profile.id)
```

#### **Si `recipient_user_id` existe dans items:**
✅ Client Dashboard devrait fonctionner

#### **Si `recipient_user_id` n'existe pas dans items:**
❌ Remplacer dans `apps/web/app/home/client/page.tsx:111`:

```typescript
// Remplacer cette requête complexe:
.or(`recipient_user_id.eq.${profile.user_id},metadata->>client_id.eq.${profile.user_id}`)

// Par la colonne réelle (exemple si c'est client_id):
.eq('client_id', profile.user_id)
```

---

## 🧪 VÉRIFICATION RAPIDE

### Test console (F12 → Console)
```javascript
// Test Driver Dashboard
const { data, error } = await supabase
  .from('missions')
  .select('id')
  .eq('driver_id', 'YOUR_USER_ID')
  .limit(1);

console.log('Data:', data);
console.log('Error:', error);
```

---

## 📝 RÉSUMÉ DES CHANGEMENTS

| Fichier | Changement | Raison |
|---------|-----------|--------|
| `team/page.tsx` | Affiche erreurs du contexte + données | Spinner indéfini |
| `driver/page.tsx` | Affiche erreur "driver_id not found" | Requête silencieuse échouée |
| `client/page.tsx` | Affiche erreur requête items | Requête silencieuse échouée |

---

## 🎯 OBJECTIF FINAL

**Avant vos changements:**
```
Page → Loading spinner indéfini → Rien n'apparaît ❌
```

**Après vos changements:**
```
Page → Erreur affichée clairement ✅ → Vous pouvez corriger le schema
```

---

## 💡 CONSEILS

1. **Si les 3 pages fonctionnent**: C'est que le schema est correct ✅
2. **Si une page affiche une erreur**: Lisez le message d'erreur précisément
3. **Utilisez Supabase CLI SQL Editor** pour tester les requêtes avant de les corriger
4. **Recharger la page** (F5) après chaque correction

---

## 🔗 RESSOURCES

- [Diagnostic complet](./DIAGNOSTIC_PAGES.md)
- [Schema Checker tool](./apps/web/lib/diagnostics/schema-checker.ts)
- [Supabase Docs - Selecting data](https://supabase.com/docs/reference/javascript/select)

---

## ❓ SI VOUS ÊTES BLOQUÉ

1. Naviguez sur l'une des 3 pages
2. Ouvrez la console (F12 → Console)
3. Copiez l'erreur affichée
4. Copiez le message d'erreur du dashboard
5. Vérifiez le schema Supabase pour cette table
6. Comparez avec le code de la requête

**Les erreurs vous guident maintenant!** 🎉
