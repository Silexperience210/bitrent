# BitRent ⚡

> Marketplace de location de miners Bitaxe avec paiement Lightning et authentification Nostr. Zéro KYC, zéro mot de passe, 100% Bitcoin.

**Live:** [bitrent.vercel.app](https://bitrent.vercel.app) · **Stack:** Vercel + Supabase + nostr-tools v2 + NWC

---

## Comment ça marche

```
Utilisateur → Login Nostr (NIP-07)
           → Sélectionne un miner + durée + pool Bitcoin
           → Reçoit une vraie invoice Lightning (via NWC)
           → Scanne le QR avec son wallet
           → Le miner commence à miner pour lui instantanément
```

---

## Architecture

```
bitrent/
├── api/                     ← Vercel Serverless Functions (Node.js ESM)
│   ├── _lib/
│   │   ├── nostr.js         ← Vérification secp256k1 réelle (nostr-tools v2)
│   │   ├── nwc.js           ← NWC WebSocket NIP-47 (make_invoice / lookup_invoice)
│   │   ├── jwt.js           ← JWT HS256, fail-fast si secret manquant
│   │   ├── supabase.js      ← Client Supabase centralisé
│   │   └── cors.js
│   ├── auth/
│   │   ├── challenge.js     ← POST  /api/auth/challenge
│   │   ├── verify.js        ← POST  /api/auth/verify
│   │   └── profile.js       ← GET   /api/auth/profile
│   ├── miners/
│   │   └── index.js         ← GET   /api/miners
│   ├── rentals/
│   │   ├── create.js        ← POST  /api/rentals/create
│   │   ├── status.js        ← GET   /api/rentals/status?id=
│   │   └── list.js          ← GET   /api/rentals/list
│   ├── admin/
│   │   ├── miners.js        ← GET/POST/PATCH/DELETE /api/admin/miners
│   │   └── stats.js         ← GET   /api/admin/stats
│   └── cron/
│       ├── expire-rentals.js  ← Chaque minute : expire rentals + paiements
│       └── health-check.js    ← Toutes les 5 min : ping Bitaxe /api/system/info
│
├── public/                  ← Frontend statique (Vercel outputDirectory)
│   ├── index.html           ← Marketplace + modal de location
│   ├── dashboard.html       ← Dashboard utilisateur (mes locations)
│   ├── admin.html           ← Panel admin
│   ├── css/app.css          ← Thème dark Bitcoin
│   └── js/
│       ├── config.js
│       ├── api.js           ← Fetch wrapper avec JWT automatique
│       └── auth.js          ← Login Nostr NIP-07
│
└── packages/                ← Code legacy (non déployé, référence uniquement)
```

---

## Flux d'authentification (NIP-98)

1. Frontend appelle `window.nostr.getPublicKey()` → récupère la pubkey
2. `POST /api/auth/challenge` → backend génère un challenge aléatoire 32 bytes, stocké en DB (5 min TTL)
3. Frontend crée un event Nostr kind 27235 avec le challenge en `content`, le signe via `window.nostr.signEvent()`
4. `POST /api/auth/verify { event }` → backend appelle `verifyEvent(event)` de nostr-tools v2 (vérification secp256k1 réelle), active le JWT
5. JWT stocké dans localStorage, envoyé en `Authorization: Bearer` sur tous les appels suivants

## Flux de paiement Lightning (NIP-47)

1. `POST /api/rentals/create` → backend se connecte via WebSocket au relay NWC, envoie une requête `make_invoice` chiffrée NIP-04, reçoit une vraie invoice BOLT11
2. Frontend affiche le QR code de l'invoice
3. Frontend poll `GET /api/rentals/status?id=` toutes les 3 secondes
4. Le backend appelle `lookup_invoice` via NWC → si payé : rental → `active`, config mining révélée
5. Cron `expire-rentals` tourne toutes les minutes pour clore les locations terminées

---

## Variables d'environnement

Dans Vercel → Settings → Environment Variables :

```env
# Supabase (dashboard > Settings > API)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...   # service_role (pas anon)

# JWT (générer: openssl rand -hex 32)
JWT_SECRET=
JWT_EXPIRY=7d

# NWC (Alby > Settings > Nostr Wallet Connect > New Connection)
# Format: nostr+walletconnect://<walletPubkey>?relay=<url>&secret=<hex>
NWC_CONNECTION_STRING=nostr+walletconnect://...

# Admins (pubkeys Nostr hex, séparés par virgule)
ADMIN_PUBKEYS=

# Sécurité cron (générer: openssl rand -hex 16)
CRON_SECRET=
```

---

## Base de données

Le schéma est dans `packages/backend/migrations/`. À appliquer une fois dans Supabase SQL Editor :

```
001_init_schema.sql       ← Tables: users, mineurs, rentals, payments, challenges, audit_logs
002_add_performance_indexes.sql
003_add_rls_policies.sql  ← Row-Level Security sur toutes les tables
004_add_triggers_functions.sql
005_create_views.sql      ← 16 vues analytics
```

---

## Pages

| URL | Description | Auth |
|---|---|---|
| `/` | Marketplace — liste des miners disponibles, modal de location | Non requis |
| `/dashboard.html` | Mes locations actives + historique + config mining | Utilisateur |
| `/admin.html` | Gestion des miners, stats plateforme, rentals récentes | Admin |

---

## API Reference

### Auth
```
POST /api/auth/challenge   { pubkey }  → { challenge }
POST /api/auth/verify      { event }   → { token, user }
GET  /api/auth/profile                 → { user }         🔒
```

### Miners
```
GET  /api/miners                       → { miners[] }
GET  /api/admin/miners                 → { miners[] }     🔒 admin
POST /api/admin/miners                 → { miner }        🔒 admin
PATCH /api/admin/miners?id=            → { miner }        🔒 admin
DELETE /api/admin/miners?id=                              🔒 admin
```

### Rentals
```
POST /api/rentals/create               → { rental_id, invoice, amount_sats, ... }  🔒
GET  /api/rentals/status?id=           → { id, status, mining_config?, ... }        🔒
GET  /api/rentals/list                 → { rentals[] }                               🔒
```

### Admin & Cron
```
GET /api/admin/stats                   → { miners, rentals, users, revenue }  🔒 admin
GET /api/cron/expire-rentals           ← Vercel Cron (toutes les minutes)
GET /api/cron/health-check             ← Vercel Cron (toutes les 5 min)
GET /api/health                        → { ok, db, version }
```

---

## Développement local

```bash
git clone https://github.com/Silexperience210/bitrent
cd bitrent
npm install
cp .env.example .env   # remplir les variables
npx vercel dev         # http://localhost:3000
```

---

## Sécurité

- **Signature Nostr** : vérification secp256k1 réelle via `nostr-tools v2` — impossible de forger
- **JWT** : HS256, expiry configurable, pas de fallback sur secret vide
- **NWC** : connexion WebSocket chiffrée NIP-04 — les clés privées ne quittent jamais le serveur
- **Rate limiting** : max 5 challenges auth / pubkey / 5 min (Supabase-backed, résiste aux cold starts)
- **RLS** : Row-Level Security sur toutes les tables Supabase
- **IP validation** : format IP vérifié avant tout appel HTTP vers les miners
- **Admin** : double vérification DB + JWT, pubkeys définies en env var

---

## Tech Stack

| Couche | Technologie |
|---|---|
| Hosting | Vercel (free tier) |
| Database | Supabase PostgreSQL |
| Auth | Nostr NIP-07 / NIP-98 + JWT |
| Payments | Lightning NWC NIP-47 (Alby compatible) |
| Crypto | nostr-tools v2, ws v8 |
| Frontend | HTML/CSS/JS vanilla (aucun framework) |

---

## Licence

MIT — **Built by [Silexperience210](https://github.com/Silexperience210)**

Powered by ⚡ Lightning · 🔑 Nostr · ⛏️ Bitaxe
