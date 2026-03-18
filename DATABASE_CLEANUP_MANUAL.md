# 🧹 Nettoyage Manuel de la Base de Données

Le problème: 10 mineurs fictifs + données de test sont toujours dans Supabase

## Solution 1: Via Supabase Dashboard (Recommandé)

### Étapes:
1. **Va sur:** https://app.supabase.com/project/taxudennjzcmjqcsgesn
2. **Click:** "SQL Editor" (gauche)
3. **Copie-colle chaque requête** ci-dessous et exécute-la:

### Requête 1: Supprimer tous les paiements
```sql
DELETE FROM payments;
```

### Requête 2: Supprimer tous les rentals
```sql
DELETE FROM rentals;
```

### Requête 3: Supprimer tous les mineurs
```sql
DELETE FROM mineurs;
```

### Requête 4: Supprimer tous les utilisateurs
```sql
DELETE FROM users;
```

## Après le Nettoyage

✅ La base est complètement vide
✅ Prête pour les vrais mineurs
✅ L'admin-dashboard affichera 0 mineurs

## Vérification

Va sur le Supabase Dashboard et regarde les tables:
- Table "mineurs" → 0 rangées
- Table "users" → 0 rangées
- Table "rentals" → 0 rangées
- Table "payments" → 0 rangées

## Test après nettoyage

1. https://workspace-omega-opal.vercel.app/admin-dashboard.html
2. Devrait afficher "0 Mineurs" et "0 Rentals actifs"
3. Le rent-miner.html affichera "Aucun mineur disponible"

## Si tu as les credentials Supabase

Mets-les dans `packages/backend/.env`:
```
SUPABASE_URL=https://taxudennjzcmjqcsgesn.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
```

Alors tu peux utiliser:
```bash
cd packages/backend
node cleanup-fake-data.js
```
