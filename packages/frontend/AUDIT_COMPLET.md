# 📊 AUDIT COMPLET BITRENT - ANALYSE PROFONDE & RECOMMANDATIONS

**Date:** 2026-03-15  
**Analyseur:** Claude (Subagent)  
**Repo:** https://github.com/Silexperience210/bitaxe-renting  
**Status Actuel:** ✅ Complet en mode DÉMO | ⚠️ Production: Partiellement intégrée

---

## 1️⃣ AUDIT COMPLET: DÉMO vs PRODUCTION

### 📋 Inventaire TOUS les Éléments en Mode Démo

#### A. **Données Mineurs** 🔴 CRITIQUE
**Fichier:** `admin.html` (ligne 666-681)
```javascript
const demoMiners = [
    { id: 'bitaxe-1', name: 'Bitaxe 30GH/s #1', ip: '192.168.1.166', ... },
    // ... 9 autres mineurs SIMULÉS
]
localStorage.setItem('bitaxe-demo-mineurs', JSON.stringify(demoMiners));
```

**Problème:**
- ✅ 10 mineurs pré-configurés en localStorage
- ❌ Pas de vraie Bitaxe connectée (les IPs sont mockées)
- ❌ Stats en temps réel complètement simulées
- ❌ Hashrate/Température/Fan = données aléatoires
- ❌ Statut "online" toujours true en démo
- ✅ Données persistent en localStorage

**Production Need:** Remplacer `initializeDemoData()` par vraies IPs Bitaxe + appels API réels

---

#### B. **Système de Paiement NWC** 🔴 CRITIQUE
**Fichier:** `libs/nwc.js` (ligne 10, 36, 98, etc.)
```javascript
class NWCManager {
    constructor() {
        this.demoMode = true; // ← Mode DÉMO par défaut!
    }
    
    async createInvoice(amount, memo) {
        if (this.demoMode) {
            return this._generateDemoInvoice(invoice); // ← FAUX invoice
        }
        // Production code jamais exécuté
    }
}
```

**Problème:**
- ❌ `demoMode = true` par défaut (toutes les invoices sont mockées)
- ❌ `_generateDemoInvoice()` crée de faux `lnbc...` strings
- ❌ Paiements pas vérifiés contra une vraie wallet Lightning
- ❌ `verifyPayment()` simule en 2-30s au lieu de vérifier via NWC
- ❌ Pas de vrai appel à l'API NWC (code vide en production)
- ❌ `sendPayment()` toujours simule, jamais envoie vers Lightning
- ✅ Peut switch de demoMode via `nwc.setDemoMode(false)`
- ⚠️ Gère correctement les timeouts (30s par défaut)

**Production Need:** 
1. Implémenter vraie connexion NWC
2. Utiliser `webln` ou `nostr-tools` pour paiements réels
3. Remplacer simulation par vraie vérification d'invoice

---

#### C. **API Bitaxe** 🔴 CRITIQUE
**Fichier:** `libs/bitaxe.js` (lignes 200-300+)
```javascript
async getMinerInfo(ip, port) {
    try {
        const [status, hashrate, temp] = await Promise.all([
            this.getStatus(ip, port),      // ← Appel réel (échoue en démo)
            this.getHashrate(ip, port),    // ← Appel réel (échoue en démo)
            this.getTemperature(ip, port)  // ← Appel réel (échoue en démo)
        ]);
    } catch (err) {
        // Si erreur, retourne données SIMULÉES!
        return {
            online: false,
            hashrate: simulatedData...  // ← FAUX!
        };
    }
}
```

**Problème:**
- ❌ Essaie vraies URLs Bitaxe (`http://192.168.1.166/api/system/info`)
- ❌ Génère données aléatoires si pas de réponse (fallback simulé)
- ❌ Pas de vraie intégration Bitaxe (les mineurs ne sont pas accessibles)
- ❌ Cache fonctionne (5s expiry) mais cache que du faux
- ❌ Erreurs réseau jamais gérées proprement
- ✅ Essaie vraie API au moins

**Production Need:**
1. Tester avec vraie Bitaxe connectée localement
2. Ajouter validation IP/port
3. Gestion erreurs réseau robuste
4. Fallback et retry logic

---

#### D. **Locations (Rentals)** 🟠 IMPORTANT
**Fichier:** `admin.html`, `client.html` (localStorage)
```javascript
// Locations générées au runtime, données réelles EN DÉMO
// Mais pas de vraie Bitaxe qui mineuse derrière!
const location = {
    id: 'loc-' + Date.now(),
    minerId: minerId,
    clientPubkey: clientPubkey,  // ← Optionnel, rarement rempli
    startTime: Date.now(),
    endTime: endTime,
    minutesRented: duration,
    satsPaid: amount,
    status: 'active'|'completed'  // ← Gestion temps réelle
};
```

**Problème:**
- ✅ Durée et coûts calculés correctement
- ✅ Historique stocké en localStorage
- ❌ Mais mineurs loués ne mineuse pas vraiment!
- ❌ Pas de vraie "allocation de ressource"
- ❌ Pas de webhook pour notifier client que rental est prêt
- ❌ Pas de vrai timeout/arrêt du mineur après expiration

**Production Need:**
1. Vrai allocation du mineur au client
2. Gestion du timeout automatique (stop API call au mineur)
3. Webhooks de notification

---

#### E. **Temps Accéléré & Simulations** 🟡 BON À AVOIR
**Fichier:** Tout le projet
```javascript
// Stats simulées dans le code (appels qui échouent = données random)
getTemperature() {
    return 25 + Math.random() * 20;  // ← Random 25-45°C
}

fan: 30 + Math.random() * 40;  // ← Random 30-70%
```

**Problème:**
- ❌ Pas de temps accéléré en dur, mais simulation du temps réel
- ❌ Graphiques remplies de données fausses
- ❌ ROI/earnings estimations basées sur hashrate faux
- ✅ Rafraîchissement toutes les 5 secondes (streaming)

---

#### F. **Authentification & Sécurité** 🔴 CRITIQUE
**Problème:**
- ❌ **Aucune authentification** - n'importe qui peut accéder admin.html
- ❌ **Pas d'authentification Nostr** (client_pubkey optionnel et non validé)
- ❌ **NWC secret en localStorage** (pas sécurisé, devrait être server-side)
- ❌ **Pas de rate limiting** - DOS vulnérable
- ❌ **Pas d'HTTPS enforcé** (juste sur Vercel par défaut)
- ❌ **CORS ouvert** - n'importe qui peut appeler les APIs

**Production Need:** Authentification obligatoire + serveur backend

---

### 📊 TABLEAU RÉCAPITULATIF: DÉMO vs PRODUCTION

| Feature | Status | Démo | Production | Need |
|---------|--------|------|------------|------|
| **Mineurs** | 🔴 DÉMO | ✅ 10 fake | ❌ Vraies APIs | Intégrer vraies IPs |
| **Paiements NWC** | 🔴 DÉMO | ✅ Simulation | ❌ 0% implémenté | Implémenter NWC réel |
| **Bitaxe API** | 🔴 DÉMO | ❌ Fallback | ⚠️ Partiel | Tester + robustesse |
| **Rentals** | 🟠 PARTIEL | ✅ Gestion | ⚠️ Pas de vraie allocation | Backend requis |
| **Auth** | 🔴 CRITIQUE | ❌ Aucune | ❌ Aucune | JWT + Backend |
| **Storage** | 🟠 LIMITÉ | ✅ localStorage | ❌ Pas de DB | PostgreSQL/Firebase |
| **Webhooks** | 🟡 ABSENT | ❌ | ❌ | À implémenter |
| **Rate Limit** | 🔴 CRITIQUE | ❌ | ❌ | À implémenter |
| **Logs/Audit** | 🟡 ABSENT | ❌ | ❌ | À implémenter |

---

## 2️⃣ PROPOSITIONS D'AMÉLIORATIONS DÉTAILLÉES

### 🎛️ A. DASHBOARD ADMINISTRATEUR

#### Priorité: 🔴 CRITIQUE

1. **Authentification Nostr (Admin)**
   - Exiger clé publique Nostr pour accéder admin.html
   - Signature des requêtes avec privée key (NIP-07)
   - Vérification côté backend

2. **Gestion Vraie des Mineurs**
   - Ajouter vraies IPs Bitaxe (pas juste "192.168.1.166")
   - Test de connexion avant de sauver
   - Statut online réel (ping périodique)
   - Logs d'accès par client

3. **Historique & Export**
   - Export CSV des rentals
   - Export JSON complet (backup)
   - Import JSON (restore)
   - Filtrages avancés (date, mineur, client)

#### Priorité: 🟠 IMPORTANT

4. **Statistiques Avancées**
   - ROI par mineur (gain/investissement)
   - Profit margin (revenu - électricité)
   - Prévisions revenus (ML simple)
   - Comparaison avec mining solo vs pool

5. **Tarification Dynamique**
   - Ajuster prix automatiquement basé sur demand
   - Surge pricing si tous les mineurs loués
   - Rabais pour locations longues (24h+)
   - Prix par mineur (actuellement global)

6. **Alertes & Monitoring**
   - Alerte température (dépassement limite)
   - Alerte downtime (mineur offline >5min)
   - Alerte paiement non reçu (après 15min)
   - Alerte hashrate anormale (chute >20%)

7. **Multi-Devise**
   - Sats (défaut)
   - mBTC
   - USD (via exchange API)
   - Affichage côte en temps réel

#### Priorité: 🟡 BON À AVOIR

8. **Sécurité & Protection**
   - Rate limiting (10 req/min par IP)
   - DDoS protection (Cloudflare)
   - Fail2ban pour attaques brutes
   - Chiffrement localStorage (AES-256)

9. **Webhooks & Notifications**
   - Webhook pour chaque rental (start, end, error)
   - Email notifications (si rental failed)
   - Telegram bot pour alertes
   - Nostr DM pour communications

10. **Tableau de Bord Avancé**
    - Widgets personnalisables
    - Dark/Light mode toggle (actuellement dark only)
    - Exportable dashboard (PDF)
    - Affichage kiosque (auto-refresh)

---

### 🛍️ B. DASHBOARD CLIENT

#### Priorité: 🟠 IMPORTANT

1. **Historique Détaillé**
   - Timeline visuelle de chaque rental
   - Calcul des gains générés par rental
   - Durée exacte vs durée payée
   - Status de paiement pour chaque rental

2. **Calcul Gains Temps Réel**
   - Afficher BTC/USD gagné en live
   - Basé sur hashrate réel + price BTC
   - Graphique gains accumulés
   - Comparaison "si j'avais miné 24h"

3. **Système Invitations/Referrals**
   - Code de referral unique par client
   - Bonus pour invitations (5% reduction)
   - Commission au referrer
   - Tracking des referrals

#### Priorité: 🟡 BON À AVOIR

4. **Ratings & Reviews**
   - Voter sur la qualité du mineur (1-5 stars)
   - Commentaires texte
   - Hashrate stable?
   - Température normale?
   - Affichage des meilleurs mineurs

5. **Multi-Language**
   - EN, FR (défaut), ES, DE
   - Via simple i18n object
   - User preference en localStorage

6. **Wallet Balance Display**
   - Afficher solde Lightning du client
   - Estimer "combien de temps je peux miner"
   - Suggestion: recharger si < 10k sats

7. **Auto-Renewal**
   - Checkbox: "Renouveler automatiquement"
   - Si paiement OK, prolonger de 1h/24h
   - Canceller via dashboard client

8. **Batch Rentals**
   - Louer plusieurs mineurs à la fois
   - Prix discount pour batch (ex: -10% pour 3)
   - Facile transition entre mineurs

---

### 💳 C. PAIEMENT NWC - PRODUCTION

#### Priorité: 🔴 CRITIQUE

1. **Vraie Intégration NWC**
   - Implémenter WalletConnect protocol
   - Utiliser `nostr-tools` + `webln` (ou direct NWC)
   - Tester avec real wallet (Alby, OkHttp, etc.)
   - Support multi-wallets

2. **Gestion Timeouts**
   - Invoice expire après 1h (par défaut NWC)
   - Gérer les invoices expirées (retirer de la queue)
   - Relancer nouvelle invoice si client prend trop temps

3. **Retry Logic**
   - Si paiement échoue, relancer après 30s
   - Max 3 retries (puis abandon)
   - Notifier client de l'erreur
   - Offrir alternative (nouvelle invoice)

4. **Webhook Vérification**
   - **PLUS IMPORTANT:** Passer de POLLING à WEBHOOKS
   - Backend enregistre callback URL avec NWC
   - NWC webhook au backend quand paiement reçu
   - Instant verification (0.5s vs 30s polling)
   - Économise CPU/bandwidth

#### Priorité: 🟠 IMPORTANT

5. **Gestion Invoices Expirées**
   - Database: track invoice timestamps
   - Cron job: nettoyer invoices >1h
   - Historique paiements detaillé
   - Raison de l'expiration (timeout, rejected, etc.)

6. **Sécurité Données Sensibles**
   - Chiffrer NWC connection string en localStorage
   - Mieux: Server-side secrets (env vars)
   - Pas d'export de config avec secrets
   - Audit logs des paiements

#### Priorité: 🟡 BON À AVOIR

7. **Historique Paiements**
   - Timeline des invoices (générée, payée, expirée)
   - Montants, memos, timestamps
   - Fallback si webhook manqué (retry)
   - Réconciliation avec NWC ledger

---

### ⚡ D. API BITAXE - ROBUSTESSE

#### Priorité: 🔴 CRITIQUE

1. **Validations Connexion**
   - Valider format IP (x.x.x.x)
   - Valider port (1-65535)
   - Ping avant de sauver nouveau mineur
   - Test API réel avant de marquer online

2. **Gestion Erreurs Réseau**
   - ECONNREFUSED → offline gracieux
   - ETIMEDOUT → retry après 5s
   - DNS resolution failures → log + fallback
   - Partial failures → multi-request recovery

3. **Cache Données (5-10 min)**
   - Stocker réponses API en mémoire
   - Expiry time: 5min pour stats, 10min pour config
   - Key: `{ip}:{port}:{endpoint}`
   - Invalidate manuellement si refresh demandé

#### Priorité: 🟠 IMPORTANT

4. **Fallback si Bitaxe Down**
   - Servir cached data (avec timestamp "stale")
   - Indiquer à UI: "données de 5min ago"
   - Essayer reconnection toutes les 30s
   - Notifier admin si down >5min

5. **Logs d'Accès Client**
   - Tracker qui a accédé quel mineur, quand
   - Durée de l'accès
   - IPs source (pour audit)
   - Store en DB (ou CSV export)

6. **Rate Limiting par Client**
   - Max 10 appels/min par IP
   - Max 100 appels/min total
   - Throttle vs ban (selon sévérité)
   - Whitelist pour trusted IPs (admin)

---

### 💾 E. DATABASE & STORAGE

#### Priorité: 🔴 CRITIQUE (pour production)

**Problème Actuel:** localStorage limité à ~5-10MB, insécurisé, pas de backup

1. **Passer de localStorage à Vraie DB**
   - **Option 1 (Simple & Gratuit):** Firebase Realtime DB
     - Setup: 5 minutes
     - Auto-sync avec frontend
     - Gratuit pour <100 concurrent users
   
   - **Option 2 (Contrôle Total):** PostgreSQL self-hosted
     - Requires: Backend Node.js
     - Meilleur pour données sensibles
     - Plus contrôle

   - **Option 3 (Intermédiaire):** Supabase (PostgreSQL + Auth)
     - Comme Firebase mais PostgreSQL
     - Authentification intégrée
     - Récommandé ⭐

2. **Backup Automatique**
   - Daily snapshot (00:00 UTC)
   - 30-days retention
   - Export CSV/JSON
   - Restore capability

3. **Version History**
   - Track changements: qui, quand, quoi
   - Rollback à une version antérieure
   - Audit trail complet

4. **Archivage Données Anciennes**
   - Move rentals >90 jours to archive table
   - Garder stats summary
   - Archive queryable mais slower

5. **GDPR Compliance**
   - Right to forget: supprimer données client
   - Data export: télécharger toutes données
   - Privacy policy complète
   - Consent tracking

---

### 🔌 F. BACKEND - CRÉATION

#### Priorité: 🔴 CRITIQUE (sans lui, prod impossible)

1. **API REST Minimal**
   - Node.js + Express (simple & rapide)
   ```
   GET    /api/mineurs           - List all miners
   POST   /api/mineurs           - Add new miner
   GET    /api/mineurs/:id       - Get miner stats
   PUT    /api/mineurs/:id       - Update miner
   DELETE /api/mineurs/:id       - Delete miner
   
   GET    /api/locations         - List rentals
   POST   /api/locations         - Create rental
   PUT    /api/locations/:id     - Update rental status
   
   POST   /api/payments/webhook  - NWC webhook receiver
   GET    /api/payments/:id      - Get payment status
   
   GET    /api/stats             - Dashboard stats
   POST   /api/auth/login        - Nostr auth
   ```

2. **Authentification JWT**
   - Login avec Nostr (sign message)
   - JWT token (expires 24h)
   - Refresh token (7 days)
   - CORS configuré correctement

3. **Server-Side NWC Secrets**
   - JAMAIS envoyer NWC secret au client
   - Backend stocke `NOSTR_WALLET_CONNECT_STRING` en env var
   - Backend fait les appels NWC (client peut pas voir secret)
   - Client appelle backend qui appelle NWC

4. **Server-Side Bitaxe API Calls**
   - Backend call `http://192.168.1.166/api/` (pas client)
   - Client appelle `/api/mineurs/:id/stats`
   - Backend cache + throttle les appels
   - Protège l'IP réelle des Bitaxe (pas exposée)

5. **Scheduler Cron**
   - Tâche: cleanup expired rentals (toutes les heures)
   - Tâche: verify unpaid invoices (toutes les 5min)
   - Tâche: collect miner stats (toutes les minutes)
   - Tâche: generate daily revenue report (00:00 UTC)

#### Priorité: 🟠 IMPORTANT

6. **Middleware & Validation**
   - Input validation (nombre, email, IP, etc.)
   - Error handling centralisé
   - Request logging
   - Rate limiting middleware

---

### 🔐 G. SÉCURITÉ - GLOBAL

#### Priorité: 🔴 CRITIQUE

| Feature | Current | Need | Impact |
|---------|---------|------|--------|
| **Auth** | ❌ Aucune | JWT + Nostr | CRITIQUE |
| **Rate Limit** | ❌ | Middleware | DOS vulnerable |
| **Input Validation** | ⚠️ Minimal | Strict | Injection attacks |
| **HTTPS** | ✅ Vercel | ✅ Keep | Data in transit |
| **Secrets Management** | 🔴 localStorage | Backend env vars | CRITIQUE |
| **CORS** | ✅ Défaut Vercel | ✅ Explicit config | XSS protection |
| **Chiffrement** | ❌ | AES localStorage | Data at rest |
| **Audit Logs** | ❌ | DB table | Compliance |
| **2FA Admin** | ❌ | TOTP support | Account takeover |

---

## 3️⃣ INTÉGRATION RÉELLE - PLAN PHASE PAR PHASE

### 📅 PHASE 1: NWC PRODUCTION (Week 1-2)

**Goal:** Remplacer simulation de paiement par vrais paiements Lightning

**Tâches:**
- [ ] 1.1 Installer dépendances:
  ```bash
  npm install nostr-tools
  npm install @noble/secp256k1
  npm install axios
  ```

- [ ] 1.2 Implémenter vraie classe NWC:
  ```javascript
  // libs/nwc-production.js (NEW)
  class NWCProduction {
      async makeInvoice(amount, memo) {
          // Appel API NWC réel
          // Return: {pr: "lnbc...", hash: "xxx"}
      }
      
      async verifyInvoice(hash) {
          // Webhook-based (pas polling)
          // Return: {status: "paid"|"pending"|"expired"}
      }
  }
  ```

- [ ] 1.3 Créer endpoint webhook:
  ```javascript
  // backend/routes/nwc-webhook.js (NEW)
  app.post('/api/nwc/webhook', (req, res) => {
      // Reçoit: {invoiceHash: "xxx", status: "paid", ...}
      // Update location status: "completed"
      // Notify client via email/Telegram
  });
  ```

- [ ] 1.4 Tester avec vraie wallet:
  - Use Alby wallet (tesnet)
  - Simulate rental payment
  - Verify webhook received
  - Check location marked as paid

- [ ] 1.5 Gestion erreurs:
  - [ ] Timeout (invoice expire après 1h)
  - [ ] Rejected (insuffisant balance)
  - [ ] Network error (retry logic)

**Success Criteria:**
- ✅ Vraie invoice générée via NWC
- ✅ QR code scannabe par Alby
- ✅ Webhook reçu après paiement
- ✅ Location status mis à jour automatiquement

---

### ⚙️ PHASE 2: BITAXE RÉELLE (Week 2-3)

**Goal:** Connecter à vraies Bitaxe (pas données simulées)

**Tâches:**
- [ ] 2.1 Identifier vraies IPs Bitaxe:
  - [ ] IP Bitaxe #1: 192.168.1.166
  - [ ] IP Bitaxe #2, #3, ... (à ajouter)
  - [ ] Tester ping/connexion avant ajout

- [ ] 2.2 Implémenter vraie API Bitaxe:
  ```javascript
  // libs/bitaxe-production.js (NEW)
  class BitaxeProduction extends BitaxeAPI {
      async getMinerInfo(ip, port) {
          // Appel réel aux endpoints Bitaxe
          // Pas de fallback sur données simulées
          // Throw error si Bitaxe down
      }
  }
  ```

- [ ] 2.3 Gestion erreurs robustes:
  - [ ] ECONNREFUSED → offline status
  - [ ] ETIMEDOUT → retry après 5s (max 3)
  - [ ] Partial data → partial response
  - [ ] Network latency → timeout 10s

- [ ] 2.4 Cache + Fallback:
  - [ ] Cache en-mémoire (5min)
  - [ ] Fallback à cached data (mark as stale)
  - [ ] Background refresh

- [ ] 2.5 Monitoring temps réel:
  - [ ] Stream updates toutes les 5s
  - [ ] Frontend reçoit live hashrate/temp
  - [ ] Alerte si anomalie détectée

**Success Criteria:**
- ✅ Real-time stats de vraie Bitaxe
- ✅ Pas de données simulées
- ✅ Gestion gracieuse des offline
- ✅ Cache efficient

---

### 🖥️ PHASE 3: BACKEND SIMPLE (Week 3-4)

**Goal:** Déplacer logique côté serveur (sécurité + scalabilité)

**Tâches:**
- [ ] 3.1 Setup backend Node.js:
  ```bash
  mkdir backend
  cd backend
  npm init -y
  npm install express cors dotenv axios
  ```

- [ ] 3.2 Endpoints API:
  - [ ] `GET /api/mineurs` - List
  - [ ] `POST /api/mineurs` - Create (admin only)
  - [ ] `GET /api/mineurs/:id/stats` - Real-time stats
  - [ ] `POST /api/locations` - Create rental
  - [ ] `POST /api/auth/login` - Nostr auth

- [ ] 3.3 Authentification Nostr:
  ```javascript
  // backend/middleware/nostr-auth.js
  app.use('/api/admin/*', verifyNostrSignature);
  ```

- [ ] 3.4 Rate limiting:
  ```javascript
  const rateLimit = require("express-rate-limit");
  app.use(rateLimit({
      windowMs: 60 * 1000,
      max: 10 // 10 req/min
  }));
  ```

- [ ] 3.5 Stockage JSON (avant DB):
  ```
  data/
  ├── mineurs.json
  ├── locations.json
  └── payments.json
  ```

**Success Criteria:**
- ✅ Backend reçoit et stocke données
- ✅ Frontend appelle API (pas localStorage)
- ✅ Authentification requise pour admin
- ✅ Rate limiting actif

---

### 🗄️ PHASE 4: DATABASE RÉELLE (Week 4-5)

**Goal:** Passer de JSON files à vraie DB

**Tâches:**
- [ ] 4.1 Choisir DB:
  - [ ] **Recommandé:** Supabase (PostgreSQL)
  - [ ] Installation: 15 minutes
  - [ ] Gratuit (5 GB storage)

- [ ] 4.2 Créer tables:
  ```sql
  CREATE TABLE mineurs (
      id UUID PRIMARY KEY,
      name VARCHAR(100),
      ip VARCHAR(15),
      port INT,
      hashrate FLOAT,
      satsPerMinute INT,
      status VARCHAR(20),
      createdAt TIMESTAMP,
      updatedAt TIMESTAMP
  );
  
  CREATE TABLE locations (
      id UUID PRIMARY KEY,
      minerId UUID REFERENCES mineurs(id),
      clientPubkey VARCHAR(200),
      startTime TIMESTAMP,
      endTime TIMESTAMP,
      satsPaid INT,
      status VARCHAR(20),
      createdAt TIMESTAMP
  );
  
  CREATE TABLE payments (
      id UUID PRIMARY KEY,
      invoiceHash VARCHAR(200),
      amount INT,
      status VARCHAR(20),
      clientPubkey VARCHAR(200),
      timestamp TIMESTAMP
  );
  
  CREATE TABLE auditLogs (
      id UUID PRIMARY KEY,
      action VARCHAR(100),
      actor VARCHAR(200),
      target VARCHAR(100),
      changes JSONB,
      timestamp TIMESTAMP
  );
  ```

- [ ] 4.3 Migration données:
  - [ ] Exporter localStorage → JSON
  - [ ] Import JSON → Supabase
  - [ ] Verify data integrity

- [ ] 4.4 Transactions rentals:
  ```javascript
  // Atomic: créer location + update miner status
  const { data, error } = await supabase
      .rpc('create_rental_atomic', { 
          minerId, clientPubkey, duration 
      });
  ```

- [ ] 4.5 Backup strategy:
  - [ ] Daily snapshots (automated Supabase)
  - [ ] Point-in-time recovery
  - [ ] Export CSV monthly

**Success Criteria:**
- ✅ Données persistantes en Supabase
- ✅ Pas plus de localStorage
- ✅ Atomic transactions
- ✅ Backups configurés

---

## 4️⃣ FICHIERS À CRÉER/MODIFIER - LISTE COMPLÈTE

### 📝 NOUVEAU FILES (A Créer)

```
backend/
├── package.json                    (NEW - Backend deps)
├── .env.example                    (NEW - Config template)
├── server.js                       (NEW - Entry point)
├── middleware/
│   ├── auth.js                    (NEW - Nostr auth)
│   ├── rateLimit.js               (NEW - Rate limiting)
│   └── errorHandler.js            (NEW - Global error handling)
├── routes/
│   ├── mineurs.js                 (NEW - Miner CRUD)
│   ├── locations.js               (NEW - Rental endpoints)
│   ├── payments.js                (NEW - Payment endpoints)
│   ├── auth.js                    (NEW - Authentication)
│   └── stats.js                   (NEW - Analytics)
├── services/
│   ├── nwc-service.js            (NEW - NWC integration)
│   ├── bitaxe-service.js         (NEW - Bitaxe API calls)
│   └── db-service.js             (NEW - Database layer)
├── crons/
│   ├── verify-invoices.js        (NEW - Invoice verification)
│   ├── cleanup-expired.js        (NEW - Cleanup expired rentals)
│   └── collect-stats.js          (NEW - Miner stats collection)
└── utils/
    ├── validators.js              (NEW - Input validation)
    └── helpers.js                 (NEW - Utility functions)

bitaxe-renting/
├── libs/nwc-production.js         (NEW - Real NWC integration)
├── libs/bitaxe-production.js      (NEW - Real Bitaxe API)
├── API-PROD.md                    (NEW - Production API docs)
├── DEPLOY-PROD.md                 (NEW - Production deployment guide)
├── SECURITY.md                    (NEW - Security checklist)
└── MIGRATION.md                   (NEW - Migration guide: localStorage→DB)

docker/
├── Dockerfile                     (NEW - Container image)
├── docker-compose.yml             (NEW - Development setup)
└── .dockerignore                  (NEW)

.github/
└── workflows/
    ├── deploy.yml                 (NEW - CI/CD)
    └── backup.yml                 (NEW - Daily DB backup)
```

### 🔄 FICHIERS À MODIFIER (Existants)

```
bitaxe-renting/
├── admin.html
│   └── Remplacer:
│       - initializeDemoData() → appel API backend
│       - localStorage → API calls
│       - Ajouter auth check (redirect si pas authentifié)
│       - Multi-devise support
│       - Alerte & monitoring UI
│
├── client.html
│   └── Remplacer:
│       - Paiement NWC réel (pas simulation)
│       - Vérification webhook (pas polling)
│       - Real-time stats (streaming)
│       - Historique détaillé (depuis DB)
│       - Multi-language support
│
├── libs/helpers.js
│   └── Remplacer:
│       - LocalStorageManager → APIClient
│       - Format helpers (garder)
│       - Validation helpers (améliorer)
│       - Ajouter: cacheLayers, queue management
│
├── libs/nwc.js
│   └── Remplacer:
│       - demoMode = true → production NWC
│       - _generateDemoInvoice() → vrais appels NWC
│       - verifyPayment() → webhook receiver
│       - sendPayment() → authentique paiement
│
├── libs/bitaxe.js
│   └── Modifier:
│       - Fallback sur simulation → throw error ou cached data
│       - Ajouter timeout robuste
│       - Cache key management
│       - Error logging détaillé
│       - Validation IP/port
│
├── index.html
│   └── Ajouter:
│       - Link vers landing page production
│       - Auth button si connecté
│       - Blog/news section
│
├── package.json
│   └── Ajouter scripts:
│       - "build": minify all files
│       - "deploy": vercel deploy
│       - "start": start backend locally
│       - "test": run tests
│
├── vercel.json
│   └── Ajouter:
│       - Backend rewrite rules
│       - Environment variables
│       - Build command
│
├── README.md
│   └── Ajouter:
│       - Production setup guide
│       - Screenshots
│       - Features checklist
│       - Troubleshooting section
│
├── DEPLOYMENT.md
│   └── Mettre à jour:
│       - Vercel frontend config
│       - Backend deployment (Railway/Heroku)
│       - Database setup (Supabase)
│       - NWC configuration
│
└── .gitignore
    └── Ajouter:
        - .env (secrets)
        - node_modules/
        - dist/
        - .DS_Store
```

### 📚 DOCUMENTATION À CRÉER

```
bitaxe-renting/
├── AUDIT_COMPLET.md              (← Ce document)
├── SECURITY.md                   (NEW - Checklist sécurité)
├── PRODUCTION-CHECKLIST.md       (NEW - Avant go-live)
├── API-BACKEND.md               (NEW - Backend endpoints)
├── NWC-INTEGRATION.md           (NEW - NWC setup guide)
├── DATABASE-SCHEMA.md           (NEW - Supabase schema)
└── TROUBLESHOOTING.md           (NEW - Common issues & fixes)
```

---

## 5️⃣ CHECKLIST PRIORITÉS - CLASSEMENT FINAL

### 🔴 CRITIQUE (Prod pas possible sans)
```
□ 1. NWC Paiements Production
   - Implémenter vraie intégration
   - Webhook verification (pas polling)
   - Gestion timeouts/rejets
   
□ 2. Authentification Admin
   - Nostr auth obligatoire
   - JWT tokens côté backend
   - Rate limiting
   
□ 3. Backend API
   - Express.js setup minimal
   - Endpoints CRUD (mineurs, locations, payments)
   - Server-side NWC secrets
   - Server-side Bitaxe API calls
   
□ 4. Database Migration
   - Supabase setup (PostgreSQL)
   - Tables schema
   - Import données localStorage
   - Backup automation
   
□ 5. Sécurité Minimale
   - HTTPS (Vercel ✅)
   - Input validation
   - CORS configuration
   - Secrets en env vars
```

### 🟠 IMPORTANT (Très recommandé)
```
□ 6. Bitaxe API Robustesse
   - Vraies IPs Bitaxe
   - Gestion erreurs réseau
   - Cache + fallback
   - Logs d'accès
   
□ 7. Dashboard Admin
   - Stats avancées (ROI, profit margin)
   - Tarification dynamique
   - Alertes (température, downtime)
   - Export/Import données
   
□ 8. Dashboard Client
   - Historique détaillé
   - Calcul gains temps réel
   - System invitations/referrals
   - Multi-language
   
□ 9. Monitoring
   - Logs système
   - Audit trail
   - Error tracking (Sentry)
   - Uptime monitoring
   
□ 10. Testing
   - Unit tests (Jest)
   - Integration tests
   - Load testing (k6)
   - Security audit
```

### 🟡 BON À AVOIR (Nice to have)
```
□ 11. Webhooks Avancés
   - Email notifications
   - Telegram bot
   - Nostr DMs
   
□ 12. CI/CD Pipeline
   - GitHub Actions
   - Auto-deploy on push
   - Automated tests
   
□ 13. Performance
   - CDN pour assets
   - Image optimization
   - Minification CSS/JS
   - Caching headers
   
□ 14. Analytics
   - Usage tracking
   - Revenue analytics
   - User behavior
   
□ 15. UI Improvements
   - Dark/Light mode toggle
   - Responsive improvements
   - Accessibility (a11y)
   - PWA support
```

### 🟢 FUTUR (Plus tard)
```
□ 16. Advanced Features
   - ML-based pricing
   - Multi-location support
   - API publique pour partners
   - Mobile app (React Native)
   
□ 17. Integrations
   - Pool API integration
   - Exchange rate feeds
   - Trading bots
   
□ 18. Scalability
   - Load balancing
   - Database sharding
   - CDN global
   - Kubernetes deployment
```

---

## 📊 RÉSUMÉ EXÉCUTIF

### État Actuel
- ✅ **Frontend:** Complet, fonctionnel, beau design
- ✅ **Démo Mode:** Parfait pour tests/présentation
- ❌ **Production:** 95% simulation, 5% implémenté
- ❌ **Security:** Aucune authentification

### Prochaines Étapes (Ordre)
1. **Week 1:** NWC production + Backend API basic
2. **Week 2:** Authentification + Bitaxe réelle
3. **Week 3:** Database migration
4. **Week 4:** Testing + Security audit
5. **Week 5:** Go-live production

### Effort Estimé
- **Phase 1-2:** 40-50 heures (paiements + API)
- **Phase 3-4:** 30-40 heures (backend + DB)
- **Testing:** 20-30 heures
- **Total:** ~100 heures (2-3 semaines avec 40h/week)

### Risk Assessment
| Risk | Severity | Mitigation |
|------|----------|-----------|
| NWC API changes | Medium | Track their docs, test regularly |
| Bitaxe connectivity | High | Reliable fallback, monitoring |
| Payment security | Critical | Server-side secrets only |
| Database migration | Medium | Backup before, test restore |
| Performance at scale | Medium | Load testing, CDN |

---

## 📝 Notes Finales

**Strengths du projet:**
- Architecture bien pensée
- Code bien structuré
- Documentation excellente
- Design UI très bon
- Logique métier correcte

**À améliorer:**
- Passer du 100% démo à 100% production
- Implémenter backend (inévitable)
- Sécuriser (auth + secrets)
- Scalabilité (DB + caching)

**Recommandation:**
Suivre le plan phase par phase. Chaque phase apporte de vraie valeur. NWC est la priorité absolue (permet vrais paiements). Database est important mais pas urgente (localStorage OK pour 1000 users).

---

**Document créé:** 2026-03-15 16:58 GMT+1  
**Version:** 1.0  
**Status:** ✅ Prêt pour implémentation
