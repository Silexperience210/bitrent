# 🚀 IMPLEMENTATION ROADMAP - BitRent Production

**Status:** Ready to implement  
**Timeline:** 4-5 weeks (100 hours estimated)  
**Difficulty:** Intermediate (good Node.js knowledge required)

---

## 📅 TIMELINE & MILESTONES

### WEEK 1-2: NWC PRODUCTION + BASIC BACKEND

#### Day 1-2: Setup & Planning
```bash
# Create git branch
git checkout -b production/phase-1-nwc

# Setup backend project structure
mkdir backend
cd backend
npm init -y
npm install express cors dotenv axios
npm install nostr-tools @noble/secp256k1
npm install -D nodemon

# Setup .env template
touch .env.example
```

**Environment Variables Needed:**
```
NOSTR_WALLET_CONNECT_STRING=nostr+walletconnect://...
VERCEL_FRONTEND_URL=https://bitrent.vercel.app
NWC_RELAY_URL=wss://relay.getalby.com/v1
NODE_ENV=production
PORT=3001
```

#### Day 3: NWC Production Implementation

**File: `backend/services/nwc-service.js`**
```javascript
const axios = require('axios');
const { parseConnectionString } = require('../utils/nwc-parser');

class NWCService {
    constructor() {
        this.connectionString = process.env.NOSTR_WALLET_CONNECT_STRING;
        this.parsed = parseConnectionString(this.connectionString);
        this.invoiceCache = new Map();
    }

    async createInvoice(satoshis, memo) {
        try {
            // TODO: Implement actual NWC invoice creation
            // This requires nostr-tools + wallet connection
            const invoice = {
                request: 'lnbc...',
                checkingId: 'xxx',
                amount: satoshis,
                expiresAt: Date.now() + 3600000,
                memo
            };
            
            this.invoiceCache.set(invoice.checkingId, {
                ...invoice,
                createdAt: Date.now(),
                status: 'pending'
            });
            
            return invoice;
        } catch (error) {
            throw new Error(`Failed to create invoice: ${error.message}`);
        }
    }

    async verifyInvoice(checkingId) {
        const cached = this.invoiceCache.get(checkingId);
        if (cached) {
            return {
                paid: cached.status === 'paid',
                status: cached.status
            };
        }
        // TODO: Query NWC for status
        return { paid: false, status: 'expired' };
    }

    registerWebhook(callbackUrl) {
        // TODO: Register webhook with NWC
        // NWC will POST to /api/nwc/webhook when payment received
        console.log(`Webhook registered: ${callbackUrl}`);
    }
}

module.exports = new NWCService();
```

**File: `backend/routes/payments.js`**
```javascript
const express = require('express');
const router = express.Router();
const nwcService = require('../services/nwc-service');
const dbService = require('../services/db-service');

// Create payment invoice
router.post('/invoice', async (req, res) => {
    const { rentalId, satoshis, memo } = req.body;
    
    try {
        const invoice = await nwcService.createInvoice(satoshis, memo);
        
        // Save to database
        await dbService.payments.save({
            id: invoice.checkingId,
            rentalId,
            amount: satoshis,
            status: 'pending',
            createdAt: new Date()
        });
        
        res.json({
            invoiceHash: invoice.checkingId,
            request: invoice.request,
            expiresAt: invoice.expiresAt
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// NWC webhook callback (when payment received)
router.post('/webhook', async (req, res) => {
    const { checkingId, status, amount } = req.body;
    
    try {
        // Update payment status
        await dbService.payments.update(checkingId, { status });
        
        if (status === 'paid') {
            // Find associated rental
            const payment = await dbService.payments.findById(checkingId);
            const rental = await dbService.locations.findById(payment.rentalId);
            
            // Mark rental as active
            await dbService.locations.update(payment.rentalId, {
                status: 'active',
                paidAt: new Date()
            });
            
            // Notify client (future: email/Telegram)
            console.log(`Rental ${payment.rentalId} activated`);
        }
        
        res.json({ status: 'ok' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Check payment status
router.get('/status/:invoiceHash', async (req, res) => {
    try {
        const payment = await dbService.payments.findById(req.params.invoiceHash);
        const verified = await nwcService.verifyInvoice(req.params.invoiceHash);
        
        res.json({
            status: payment?.status || 'unknown',
            verified: verified.paid,
            amount: payment?.amount
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
```

#### Day 4-5: API Endpoints

**File: `backend/routes/mineurs.js`**
```javascript
const express = require('express');
const router = express.Router();
const bitaxeService = require('../services/bitaxe-service');
const dbService = require('../services/db-service');
const { validateIP, validatePort } = require('../utils/validators');

// Get all miners
router.get('/', async (req, res) => {
    try {
        const mineurs = await dbService.mineurs.getAll();
        res.json(mineurs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get miner stats (real-time from Bitaxe)
router.get('/:id/stats', async (req, res) => {
    try {
        const miner = await dbService.mineurs.findById(req.params.id);
        const stats = await bitaxeService.getMinerInfo(miner.ip, miner.port);
        
        res.json({
            minerId: req.params.id,
            ...stats,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new miner (admin only)
router.post('/', async (req, res) => {
    const { name, ip, port, hashrate, satsPerMinute } = req.body;
    
    try {
        // Validate inputs
        if (!validateIP(ip)) return res.status(400).json({ error: 'Invalid IP' });
        if (!validatePort(port)) return res.status(400).json({ error: 'Invalid port' });
        
        // Test connection to Bitaxe
        const isOnline = await bitaxeService.isOnline(ip, port);
        if (!isOnline) {
            return res.status(400).json({ error: 'Bitaxe offline - cannot add' });
        }
        
        // Save to database
        const miner = await dbService.mineurs.create({
            name, ip, port, hashrate, satsPerMinute,
            status: 'libre',
            createdAt: new Date()
        });
        
        res.json(miner);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
```

#### Day 5: Frontend Integration

**File: `bitaxe-renting/libs/api-client.js`** (NEW)
```javascript
class APIClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('auth-token');
    }

    async request(method, endpoint, data = null) {
        const url = `${this.baseURL}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    }

    // Mineurs
    async getMiners() {
        return this.request('GET', '/mineurs');
    }

    async getMinerStats(id) {
        return this.request('GET', `/mineurs/${id}/stats`);
    }

    // Payments
    async createInvoice(rentalId, satoshis, memo) {
        return this.request('POST', '/payments/invoice', {
            rentalId, satoshis, memo
        });
    }

    async checkPaymentStatus(invoiceHash) {
        return this.request('GET', `/payments/status/${invoiceHash}`);
    }

    // Locations
    async createLocation(minerId, duration) {
        return this.request('POST', '/locations', {
            minerId, duration
        });
    }

    async getActiveLocation() {
        return this.request('GET', '/locations/active');
    }
}

const apiClient = new APIClient();
window.apiClient = apiClient;
```

**Modify: `bitaxe-renting/client.html`**
```javascript
// Remove old localStorage-based payment code
// Replace with:

async function startRental(minerId, durationMinutes) {
    try {
        // 1. Create location in backend
        const location = await apiClient.createLocation(minerId, durationMinutes);
        
        // 2. Create payment invoice
        const satoshis = await calculateRentalCost(minerId, durationMinutes);
        const invoice = await apiClient.createInvoice(location.id, satoshis, `Bitaxe rental ${location.id}`);
        
        // 3. Show QR code (use invoice.request)
        showQRCode(invoice.request);
        
        // 4. Poll for payment (or use webhook)
        const maxAttempts = 120; // 2 minutes
        for (let i = 0; i < maxAttempts; i++) {
            const payment = await apiClient.checkPaymentStatus(invoice.invoiceHash);
            
            if (payment.status === 'paid') {
                // Rental activated!
                showRentalActive(location);
                break;
            }
            
            await new Promise(r => setTimeout(r, 1000)); // Wait 1s
        }
    } catch (error) {
        showError(`Failed to start rental: ${error.message}`);
    }
}
```

#### Day 6: Testing

- [ ] Test invoice creation locally
- [ ] Test with Alby testnet wallet
- [ ] Verify webhook received
- [ ] Check payment status updates
- [ ] Frontend integration test

**Test Script:**
```bash
# Start backend
cd backend
npm start

# In another terminal, test API
curl http://localhost:3001/api/mineurs

# Test payment creation
curl -X POST http://localhost:3001/api/payments/invoice \
  -H "Content-Type: application/json" \
  -d '{"rentalId":"test-1","satoshis":5000,"memo":"test"}'
```

---

### WEEK 2-3: AUTHENTICATION + BITAXE REAL

#### Day 7-8: Nostr Authentication

**File: `backend/services/nostr-auth.js`**
```javascript
const { verifyEvent } = require('nostr-tools');

class NostrAuth {
    async verifySignature(event) {
        // event = {content, kind, created_at, pubkey, sig, ...}
        
        if (!verifyEvent(event)) {
            throw new Error('Invalid signature');
        }
        
        // Verify event is recent (within 5 minutes)
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - event.created_at) > 300) {
            throw new Error('Event too old');
        }
        
        return event.pubkey;
    }

    generateToken(pubkey) {
        const jwt = require('jsonwebtoken');
        return jwt.sign(
            { pubkey, iat: Date.now() },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
    }
}

module.exports = new NostrAuth();
```

**File: `backend/middleware/auth.js`**
```javascript
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = { verifyToken };
```

**File: `backend/routes/auth.js`**
```javascript
const express = require('express');
const router = express.Router();
const nostrAuth = require('../services/nostr-auth');

// Nostr login
router.post('/login', async (req, res) => {
    const { event } = req.body; // Signed Nostr event
    
    try {
        const pubkey = await nostrAuth.verifySignature(event);
        const token = nostrAuth.generateToken(pubkey);
        
        res.json({
            token,
            pubkey,
            expiresIn: 86400
        });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

module.exports = router;
```

**Modify: `bitaxe-renting/admin.html`**
```javascript
// Add Nostr login check
async function initializeAdmin() {
    const token = localStorage.getItem('auth-token');
    
    if (!token) {
        // Show login modal
        showNostrLoginModal();
        return;
    }
    
    // Verify token is still valid
    try {
        await apiClient.verifyToken();
        loadAdminData();
    } catch (error) {
        // Token expired, show login again
        localStorage.removeItem('auth-token');
        showNostrLoginModal();
    }
}

async function loginWithNostr() {
    // Use window.nostr (NIP-07)
    if (!window.nostr) {
        showError('No Nostr wallet extension found');
        return;
    }
    
    try {
        // Create challenge event
        const event = {
            kind: 27235,
            content: `Login to BitRent at ${new Date().toISOString()}`,
            created_at: Math.floor(Date.now() / 1000),
            tags: [['u', 'https://bitrent.vercel.app']]
        };
        
        // Sign with wallet
        const signedEvent = await window.nostr.signEvent(event);
        
        // Send to backend for verification
        const response = await apiClient.request('POST', '/auth/login', {
            event: signedEvent
        });
        
        // Save token
        localStorage.setItem('auth-token', response.token);
        
        // Reload admin page
        location.reload();
    } catch (error) {
        showError(`Login failed: ${error.message}`);
    }
}
```

#### Day 9-10: Bitaxe Real API

**File: `backend/services/bitaxe-service.js`**
```javascript
const axios = require('axios');

class BitaxeService {
    constructor() {
        this.cache = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    }

    getCacheKey(ip, port, endpoint) {
        return `${ip}:${port}:${endpoint}`;
    }

    async getMinerInfo(ip, port = 8080) {
        try {
            // Validate inputs first
            if (!this.validateIP(ip)) throw new Error('Invalid IP');
            if (!this.validatePort(port)) throw new Error('Invalid port');

            const [status, hashrate, temp] = await Promise.all([
                this._fetchWithCache(ip, port, '/api/system/info'),
                this._fetchWithCache(ip, port, '/api/system/metrics'),
                this._fetchWithCache(ip, port, '/api/system/metrics')
            ]);

            return {
                ip, port,
                online: true,
                hashrate: hashrate.hashrate || 0,
                temperature: temp.temperature || 0,
                fan: temp.fan || 0,
                uptime: status.uptime || 0,
                lastUpdate: Date.now()
            };
        } catch (error) {
            throw new Error(`Failed to get miner info: ${error.message}`);
        }
    }

    async _fetchWithCache(ip, port, endpoint) {
        const key = this.getCacheKey(ip, port, endpoint);
        
        // Check cache
        if (this.cache.has(key)) {
            const cached = this.cache.get(key);
            if (Date.now() - cached.timestamp < this.CACHE_TTL) {
                return cached.data;
            }
        }
        
        // Fetch from Bitaxe
        const url = `http://${ip}:${port}${endpoint}`;
        const data = await axios.get(url, { timeout: 5000 });
        
        // Cache result
        this.cache.set(key, {
            data: data.data,
            timestamp: Date.now()
        });
        
        return data.data;
    }

    async isOnline(ip, port = 8080) {
        try {
            await axios.get(`http://${ip}:${port}/api/system/info`, {
                timeout: 3000
            });
            return true;
        } catch {
            return false;
        }
    }

    validateIP(ip) {
        const ipRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
        return ipRegex.test(ip);
    }

    validatePort(port) {
        return port >= 1 && port <= 65535;
    }
}

module.exports = new BitaxeService();
```

#### Day 11: Database

**File: `backend/services/db-service.js`** (Start with JSON, migrate to Supabase later)
```javascript
const fs = require('fs').promises;
const path = require('path');

class JSONDatabase {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.mineurs = new JSONTable('mineurs.json');
        this.locations = new JSONTable('locations.json');
        this.payments = new JSONTable('payments.json');
    }
}

class JSONTable {
    constructor(filename) {
        this.filepath = path.join(__dirname, '../data', filename);
    }

    async getAll() {
        try {
            const data = await fs.readFile(this.filepath, 'utf-8');
            return JSON.parse(data) || [];
        } catch {
            return [];
        }
    }

    async findById(id) {
        const all = await this.getAll();
        return all.find(item => item.id === id);
    }

    async save(item) {
        const all = await this.getAll();
        const index = all.findIndex(i => i.id === item.id);
        
        if (index >= 0) {
            all[index] = item;
        } else {
            all.push(item);
        }
        
        await fs.writeFile(this.filepath, JSON.stringify(all, null, 2));
        return item;
    }

    async create(item) {
        item.id = 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        return this.save(item);
    }

    async update(id, updates) {
        const item = await this.findById(id);
        if (!item) throw new Error(`Item not found: ${id}`);
        
        const updated = { ...item, ...updates };
        return this.save(updated);
    }

    async delete(id) {
        const all = await this.getAll();
        const filtered = all.filter(i => i.id !== id);
        await fs.writeFile(this.filepath, JSON.stringify(filtered, null, 2));
    }
}

module.exports = new JSONDatabase();
```

#### Day 12: Testing & Deployment

- [ ] Test all API endpoints with real Bitaxe
- [ ] Verify auth flow
- [ ] Deploy backend to Railway/Heroku
- [ ] Test frontend with backend

**Deploy to Railway:**
```bash
# Create account at railway.app
# Connect GitHub repo
# Add env vars in Railway dashboard
# Deploy!
```

---

### WEEK 3-4: DATABASE & SECURITY

#### Phase 4: Database Migration (Supabase)

[See AUDIT_COMPLET.md Phase 4 for details]

**Quick Start:**
```bash
# Create Supabase project
# Run SQL schema (see AUDIT_COMPLET.md)
# Update backend DB service to use Supabase
# Migrate data from JSON files
# Test everything
```

#### Phase 5: Security Hardening

- [ ] Add rate limiting
- [ ] CORS configuration
- [ ] Input validation middleware
- [ ] Error handling (no stack traces)
- [ ] Logging (security events)
- [ ] HTTPS enforcement
- [ ] Security headers

---

## 📋 QUICK CHECKLIST

### Phase 1 (NWC + Basic API)
- [ ] Backend project setup
- [ ] NWC service implemented
- [ ] Payment endpoints working
- [ ] Miner endpoints working
- [ ] Frontend integration done
- [ ] Tested with Alby
- [ ] Deployed to production

### Phase 2 (Auth + Real Bitaxe)
- [ ] Nostr auth implemented
- [ ] Bitaxe real API working
- [ ] Caching implemented
- [ ] Error handling robust
- [ ] All endpoints protected with auth

### Phase 3 (Database)
- [ ] Supabase project created
- [ ] Schema migrations run
- [ ] Data migrated from JSON
- [ ] Backup strategy implemented
- [ ] GDPR compliance checked

### Phase 4 (Testing & Go-Live)
- [ ] Unit tests written
- [ ] Integration tests passing
- [ ] Load testing completed
- [ ] Security audit done
- [ ] Production deployment ready

---

## 🚀 DEPLOYMENT CHECKLIST

Before going live:
- [ ] NWC connection string configured
- [ ] Bitaxe IPs tested and online
- [ ] Database backups working
- [ ] Error tracking (Sentry) setup
- [ ] Monitoring (UptimeRobot) setup
- [ ] Email notifications working
- [ ] HTTPS certificate valid
- [ ] Rate limiting configured
- [ ] WAF enabled (Cloudflare)
- [ ] CDN configured

---

## 📞 SUPPORT & DEBUGGING

### Common Issues

**Bitaxe offline error:**
```
Error: connect ECONNREFUSED
→ Check Bitaxe IP is reachable
→ Check port 8080 is open
→ Verify firewall rules
```

**NWC connection failed:**
```
Error: Invalid connection string
→ Verify format: nostr+walletconnect://...
→ Check relay URL is accessible
→ Verify secrets are correct
```

**Database connection failed:**
```
Error: Could not connect to Supabase
→ Check SUPABASE_URL env var
→ Check SUPABASE_KEY env var
→ Verify IP whitelisting
```

---

## 📚 USEFUL RESOURCES

- Nostr Tools: https://github.com/nbd-wtf/nostr-tools
- NWC Spec: https://nip-49.nostr.com/
- Bitaxe API: https://docs.bitaxe.org/
- Express.js: https://expressjs.com/
- Supabase: https://supabase.com/docs

---

**Last Updated:** 2026-03-15  
**Next Review:** After Phase 1 completion
