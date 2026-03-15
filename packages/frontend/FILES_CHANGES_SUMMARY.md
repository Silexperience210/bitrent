# 📝 FILES CHANGES SUMMARY - BitRent Production Transition

**Purpose:** Quick reference of ALL files to create/modify and their specific changes

---

## 📂 EXISTING FILES TO MODIFY

### 1. `admin.html` (Size: ~42 KB)

**Changes:**
```diff
- Line 666: Remove initializeDemoData() call
+ Line 666: Add loadAdminFromAPI() call

- Lines 10-15: Remove demo mode toggle
+ Lines 10-15: Add Nostr auth check & login button

- All localStorage references
+ Replace with apiClient.request() calls

Example changes:
- OLD: LocalStorage.getMiners()
+ NEW: await apiClient.getMiners()

- OLD: const demoMiners = [...]
+ NEW: const mineurs = await apiClient.getMiners()

- All NWC demo paiements
+ Use real apiClient.createInvoice()

- All Bitaxe.getMinerInfo() fallbacks
+ Expect real data from backend API
```

**Affected Functions:**
- `initializeAdmin()` - Add auth check
- `loadMiners()` - Use API instead localStorage
- `loadActiveLocations()` - Use API
- `loadHistory()` - Use API
- `onAddMiner()` - Validate with backend first
- `onDeleteMiner()` - Use API
- `onRentalStop()` - Notify backend
- `generatePaymentQR()` - Use real NWC invoice from backend

**Lines to Change:** ~150 lines (20% of file)

---

### 2. `client.html` (Size: ~34 KB)

**Changes:**
```diff
- Remove all NWC demo simulation code
+ Replace with real apiClient.createInvoice()

- Lines 500-600: Payment verification (polling)
+ Replace with webhook listener or cleaner polling

- All localStorage rental tracking
+ Use backend API for active rental

- Mock Bitaxe stats
+ Get real stats from backend API

- Hardcoded "mode: DEMO"
+ Remove, backend handles everything
```

**Affected Functions:**
- `startRental()` - Use API, get real invoice
- `verifyPayment()` - Still poll if no webhook yet
- `getRentalStats()` - Stream from backend
- `endRental()` - Notify backend
- `getRentalHistory()` - Fetch from DB via API

**Lines to Change:** ~120 lines (15% of file)

---

### 3. `libs/helpers.js` (Size: ~13 KB)

**Changes:**
```diff
- KEEP: All formatting functions (formatSats, formatDate, etc.)
- KEEP: All validation functions
- KEEP: All stats calculation functions

- REMOVE: LocalStorageManager class (entire class, 150+ lines)
+ REPLACE with thin wrapper or delete (no longer needed)

- KEEP: StatisticsHelper class
+ Just moves to backend, frontend can use it for local calcs

- ADD: Import new APIClient
+ const apiClient = new APIClient()
```

**Functions to Keep:**
- `formatSats()`
- `formatDate()`
- `formatDuration()`
- `calculateUSD()`
- `createChart()`
- All validation functions
- `StatisticsHelper` (for frontend-side calculations)

**Functions to Remove:**
- `LocalStorageManager` (entire class)
  - `getMiners()`
  - `saveMiner()`
  - `getLocations()`
  - `saveLocation()`
  - etc.

**Lines to Change:** ~200 lines removed

---

### 4. `libs/nwc.js` (Size: ~9 KB)

**Changes:**
```diff
- REMOVE: This file (or keep for legacy compatibility)
+ Frontend should call API instead

- IF KEEPING: Just for reference/documentation
+ But all functionality moves to backend

Option A: DELETE the file
Option B: Keep but add comment "DEPRECATED - Use backend API"
```

**Rationale:**
- Backend `services/nwc-service.js` handles all NWC logic
- Frontend has no business calling NWC directly
- Secrets stay on backend

---

### 5. `libs/bitaxe.js` (Size: ~14 KB)

**Changes:**
```diff
- KEEP: All calculation functions
  - calculateEstimatedEarnings()
  - estimateRentalRevenue()
  - formatHashrate()
  - etc.

- REMOVE: API call functions
  - getMinerInfo() (move to backend)
  - getStatus() (move to backend)
  - getHashrate() (move to backend)
  - getTemperature() (move to backend)
  - checkMultiple() (move to backend)
  - createRealtimeStream() (move to backend)

- REPLACE: With frontend-only version that:
  + Receives data from backend API
  + Does calculations/formatting
  + Updates UI
```

**Frontend Version Needed:**
```javascript
// libs/bitaxe-frontend.js (NEW)
class BitaxeFrontend {
    // Calculation-only functions
    calculateEstimatedEarnings(hashrate) { ... }
    estimateRentalRevenue(hashrate, satPerMin, minutes) { ... }
    formatHashrate(h) { ... }
    
    // Stream from API, don't fetch directly
    async streamMinerStats(ip, port, onData) {
        setInterval(async () => {
            const stats = await apiClient.getMinerStats(ip);
            onData(stats);
        }, 5000);
    }
}
```

**Lines to Change:** Keep ~100 lines, remove ~300 lines

---

### 6. `index.html` (Size: ~15 KB)

**Changes:**
```diff
- MINOR: Update links/descriptions
+ Link to new backend docs

- OPTIONAL: Add login button if not admin
+ "Enter Admin Dashboard" → requires Nostr login

- UPDATE: Feature list
+ Mark "Production Ready" features
```

**Lines to Change:** ~5-10 lines

---

### 7. `package.json` (Size: ~2 KB)

**Changes:**
```diff
- ADD: Build script
+ "build": "node build.js"

- ADD: Dev script
+ "dev": "npm start"

- OPTIONAL: Add backend dependencies
+ "backend": "cd backend && npm install"

Example:
{
    "name": "bitaxe-renting",
    "version": "2.0.0",
    "scripts": {
        "build": "echo 'Build complete'",
        "dev": "python -m http.server 8000",
        "test": "echo 'Tests pending'",
        "backend": "cd backend && npm start"
    }
}
```

**Lines to Change:** ~5 lines

---

### 8. `vercel.json` (Size: ~695 bytes)

**Changes:**
```diff
+ ADD: Rewrites for backend API
+ ADD: Environment variables config
+ ADD: Build settings

Example:
{
    "rewrites": [
        {
            "source": "/api/:path*",
            "destination": "https://bitrent-backend.railway.app/api/:path*"
        }
    ],
    "env": {
        "VITE_API_URL": "@vite_api_url"
    },
    "buildCommand": "npm run build"
}
```

**Lines to Change:** ~10 lines added

---

### 9. `.gitignore`

**Changes:**
```diff
+ ADD: .env (secrets)
+ ADD: node_modules/
+ ADD: /backend/node_modules/
+ ADD: /backend/.env
+ ADD: /data/*.json (local dev data)
+ ADD: .DS_Store
```

**Lines to Change:** ~8 lines added

---

### 10. `README.md` (Size: ~9 KB)

**Changes:**
```diff
- UPDATE: Demo section header
+ "Mode: DÉMO (Legacy - Use Production)" or remove

- ADD: Production setup section
+ Prerequisites, setup steps, NWC config

- ADD: Deployment section
+ Frontend on Vercel, Backend on Railway

- ADD: Architecture diagram
+ Frontend → Backend → Database

- UPDATE: Features list
+ Mark which are production-ready

- ADD: Troubleshooting
+ Common prod issues & fixes
```

**Lines to Change:** ~50 lines added/modified

---

### 11. `DEPLOYMENT.md`

**Changes:**
```diff
- REWRITE: Entire file

OLD Structure:
- Vercel deployment only
- No backend mentioned

NEW Structure:
- Frontend deployment (Vercel)
- Backend deployment (Railway/Heroku)
- Database setup (Supabase)
- NWC configuration
- Environment variables
- Pre-deployment checklist
- Go-live steps
```

**Lines to Change:** Completely rewritten

---

## 📂 NEW FILES TO CREATE

### Backend Files

```
backend/
├── package.json                    ← Dependencies
├── .env.example                    ← Config template
├── server.js                       ← Express app
│
├── middleware/
│   ├── auth.js                    ← JWT verification
│   ├── rateLimit.js               ← Rate limiting middleware
│   ├── errorHandler.js            ← Global error handler
│   └── corsConfig.js              ← CORS settings
│
├── routes/
│   ├── mineurs.js                 ← GET/POST miners
│   ├── locations.js               ← GET/POST rentals
│   ├── payments.js                ← Payments & webhooks
│   ├── auth.js                    ← Nostr login
│   ├── stats.js                   ← Dashboard stats
│   └── health.js                  ← Health check
│
├── services/
│   ├── nwc-service.js            ← NWC integration
│   ├── bitaxe-service.js         ← Bitaxe API calls
│   ├── db-service.js             ← Database abstraction
│   ├── nostr-auth.js             ← Nostr verification
│   └── email-service.js          ← Email notifications (future)
│
├── utils/
│   ├── validators.js              ← Input validation
│   ├── nwc-parser.js             ← Parse NWC strings
│   ├── logger.js                 ← Logging
│   └── helpers.js                ← Utility functions
│
├── crons/
│   ├── verify-invoices.js        ← Invoice verification
│   ├── cleanup-expired.js        ← Cleanup old rentals
│   └── collect-stats.js          ← Miner stats collection
│
├── data/                          ← JSON files (before DB)
│   ├── mineurs.json
│   ├── locations.json
│   └── payments.json
│
└── tests/
    ├── nwc.test.js
    ├── bitaxe.test.js
    └── api.test.js
```

### Frontend Files

```
bitaxe-renting/
├── libs/api-client.js             ← API wrapper
├── libs/bitaxe-frontend.js        ← Frontend calcs only
│
└── DOCUMENTATION/
    ├── AUDIT_COMPLET.md           ← This deep analysis ✅
    ├── IMPLEMENTATION_ROADMAP.md  ← Week-by-week guide ✅
    ├── FILES_CHANGES_SUMMARY.md   ← This file ✅
    ├── SECURITY.md                ← Security checklist
    ├── PRODUCTION_CHECKLIST.md    ← Pre-launch checklist
    ├── API-BACKEND.md             ← API endpoint docs
    ├── DATABASE_SCHEMA.md         ← Supabase schema
    ├── NWC_INTEGRATION.md         ← NWC setup guide
    └── MIGRATION_GUIDE.md         ← localStorage → DB
```

### Configuration Files

```
.github/
└── workflows/
    ├── deploy.yml                 ← CI/CD automation
    └── backup.yml                 ← DB backup schedule

docker/
├── Dockerfile                     ← Container image
├── docker-compose.yml             ← Dev environment
└── .dockerignore
```

---

## 🔄 MIGRATION SEQUENCE (Order Matters!)

### Step 1: Create Backend Structure (Day 1-2)
1. Create `backend/` directory
2. Initialize `package.json`
3. Create all directories (middleware, routes, services, etc.)
4. Create empty placeholder files

### Step 2: Implement Core Services (Day 3-5)
1. `services/nwc-service.js`
2. `services/bitaxe-service.js`
3. `services/db-service.js`
4. `middleware/auth.js`

### Step 3: Create API Endpoints (Day 5-7)
1. `routes/mineurs.js`
2. `routes/locations.js`
3. `routes/payments.js`
4. `routes/auth.js`

### Step 4: Frontend Integration (Day 7-8)
1. Create `libs/api-client.js`
2. Create `libs/bitaxe-frontend.js`
3. Modify `admin.html`
4. Modify `client.html`
5. Modify `libs/helpers.js`

### Step 5: Testing & Deployment (Day 9-10)
1. Deploy backend to Railway
2. Update `vercel.json` with backend URL
3. Deploy frontend to Vercel
4. Test end-to-end

### Step 6: Database Migration (Week 2)
1. Create Supabase project
2. Run SQL schema migrations
3. Import JSON data
4. Update backend DB service
5. Verify data integrity

---

## 📊 CHANGE STATISTICS

| Category | Files | Lines | Status |
|----------|-------|-------|--------|
| Modify | 11 | ~500 | Medium effort |
| Create (Backend) | 20+ | ~3000 | High effort |
| Create (Frontend) | 2 | ~200 | Low effort |
| Create (Docs) | 8 | ~2000 | For reference |
| **Total** | **41+** | **~5700** | **2-3 weeks** |

---

## ✅ PRIORITY ORDER FOR MODIFICATIONS

### 🔴 CRITICAL (Must do first)
1. Create backend project structure
2. Implement NWC service
3. Create payment endpoints
4. Modify client.html (payment section)
5. Deploy backend

### 🟠 IMPORTANT (Do next)
6. Implement authentication
7. Create miner endpoints
8. Modify admin.html
9. Test with real Bitaxe
10. Create API client library

### 🟡 NICE TO HAVE
11. Create documentation files
12. Add monitoring/logging
13. Create tests
14. Setup CI/CD

---

## 🧪 TESTING CHECKLIST

For each modified file, test:

| File | Tests |
|------|-------|
| admin.html | - Auth required, - Load data from API, - Add/edit/delete miner, - Payment flow |
| client.html | - Payment creation, - QR code display, - Payment verification, - Rental status |
| api-client.js | - All CRUD operations, - Error handling, - Token management |
| nwc-service.js | - Invoice creation, - Webhook receiver, - Status checking |
| bitaxe-service.js | - Real connection test, - Cache behavior, - Error fallback |
| auth.js | - Login flow, - Token generation, - Token verification |

---

## 📝 NOTES FOR IMPLEMENTATION

**Important:**
- Backup all original files before modifying
- Use git branches for each phase
- Test thoroughly before deploying
- Keep demo mode files as reference
- Document all breaking changes

**Useful Commands:**
```bash
# Backup before changes
git checkout -b production/phase-1-nwc

# Test backend
npm install
npm start  # Runs on http://localhost:3001

# Test frontend + backend together
# Terminal 1: cd backend && npm start
# Terminal 2: python -m http.server 8000 (frontend on 8000)

# Deploy
# Backend: git push (Railway auto-deploys)
# Frontend: vercel deploy
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-15  
**Ready to Start:** ✅ YES
