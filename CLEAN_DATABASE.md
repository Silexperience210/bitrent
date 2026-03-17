# 🧹 Nettoyage Complet de Supabase

## Problème
L'admin-dashboard affiche des données fictives car la base de données Supabase contient:
- 10 mineurs de test (192.168.1.101-110)
- 1 utilisateur admin factice
- Tous les rentals/payments associés

## Solution

### Option 1: Utiliser le Script de Cleanup (Recommandé)

```bash
cd packages/backend
node cleanup-fake-data.js
```

Ce script va:
✅ Supprimer les 10 mineurs de test
✅ Supprimer tous les rentals associés
✅ Supprimer tous les payments associés
✅ Laisser la DB prête pour les vrais mineurs

### Option 2: Supprimer manuellement via Supabase Dashboard

1. Allez sur: https://app.supabase.com/project/taxudennjzcmjqcsgesn
2. Allez dans l'onglet SQL Editor
3. Exécutez ces commandes:

```sql
-- Supprimer les payments
DELETE FROM payments;

-- Supprimer les rentals
DELETE FROM rentals;

-- Supprimer les mineurs avec IPs de test
DELETE FROM mineurs WHERE ip_address LIKE '192.168.1.%';

-- Supprimer l'utilisateur admin de test
DELETE FROM users WHERE nostr_pubkey = 'npub1qg6xqmq4c6e5q3wjk5c6e5q3wjk5c6e5q3wjk5c6e5q3wjk5c6e5q3wjk5c6e5';
```

## Après le Nettoyage

L'admin-dashboard affichera:
✅ 0 mineurs
✅ 0 rentals  
✅ 0 payments
✅ Prêt pour ajouter des vrais mineurs

## Ajouter un Vrai Mineur

Via l'admin-dashboard ou l'API:

```bash
curl -X POST https://workspace-omega-opal.vercel.app/api/admin/mineurs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "BitAxe-01",
    "ip": "192.168.100.50",
    "model": "bitaxe-ultra",
    "status": "online",
    "price_per_hour_sats": 6000
  }'
```

## Vérifier le Nettoyage

```bash
# Vérifier les mineurs
curl https://workspace-omega-opal.vercel.app/api/mineurs

# Résultat attendu:
# {"data": [], "success": true}
```
