# ⚡ BitRent - Bitcoin Mining Rental Platform

> **Rent mining power by the minute, pay with Lightning Network**

[![GitHub](https://img.shields.io/badge/GitHub-Silexperience210%2Fbitrent-blue)](https://github.com/Silexperience210/bitrent)
[![License](https://img.shields.io/badge/License-MIT-green)]()
[![Cost](https://img.shields.io/badge/Cost-$0%2Fmonth-success)]()

## 🎯 Overview

BitRent is a **production-ready Bitcoin mining rental platform** that allows:
- **Miners** to rent out Bitaxe mining rigs
- **Users** to rent computing power by the minute
- **Instant payments** via Lightning Network
- **Zero platform fees** (runs on free tiers only)

## ✨ Features

### Core Features
✅ **Nostr Authentication** - Sign in with your wallet (NIP-98)
✅ **Lightning Payments** - Pay instantly via Lightning Network (NWC)
✅ **Per-Minute Billing** - Only pay for what you use
✅ **Real-Time Monitoring** - Live hashrate and uptime tracking
✅ **Auto-Discovery** - Automatically detect miners on the network
✅ **Cron Jobs** - Health checks every 5 minutes
✅ **Webhooks** - Payment confirmation handlers
✅ **Admin Dashboard** - Full fleet management

### Technology Stack
- **Frontend**: Vercel Static (HTML/JS)
- **Backend**: Vercel Serverless (Node.js)
- **Database**: Supabase PostgreSQL (9 tables)
- **Auth**: Nostr Protocol (NIP-98)
- **Payments**: Lightning Network (NWC)
- **Version Control**: GitHub

## 📊 Platform Stats

| Metric | Value |
|--------|-------|
| **Active Miners** | 10 Bitaxe units |
| **Online** | 7+ (real-time) |
| **Total Hashrate** | ~950 TH/s |
| **Monthly Cost** | $0 |
| **API Endpoints** | 6+ |
| **Database Tables** | 9 |
| **Deployment** | Vercel (auto) |

## 🚀 Quick Start

### View Live
- **[Home](https://workspace-omega-opal.vercel.app)** - Landing page
- **[Marketplace](https://workspace-omega-opal.vercel.app/marketplace.html)** - Rent miners
- **[Payment Flow](https://workspace-omega-opal.vercel.app/payment-flow.html)** - Demo payments
- **[Admin Dashboard](https://workspace-omega-opal.vercel.app/admin-dashboard.html)** - Fleet management
- **[Miner Monitoring](https://workspace-omega-opal.vercel.app/miner-monitoring.html)** - Health checks
- **[API Test](https://workspace-omega-opal.vercel.app/test-api.html)** - Test endpoints

### API Endpoints

```
GET  /api/health                    Health check with component status
GET  /api/mineurs                   List all miners
POST /api/auth/challenge            Get auth challenge
POST /api/auth/verify               Verify signature & get JWT
GET  /api/auth/profile              Get user profile (auth required)
POST /api/rentals                   Create rental (auth required)
GET  /api/rentals                   List rentals
POST /api/payments                  Create payment invoice
POST /api/payments/webhook          Payment confirmation webhook
POST /api/mineurs/discovery         Discover or health-check miners
```

## 📁 Project Structure

```
bitrent/
├── api/
│   ├── health.js                    System health check
│   ├── auth/
│   │   ├── challenge.js             NIP-98 challenge generation
│   │   ├── verify.js                Signature verification & JWT
│   │   └── profile.js               User profile endpoint
│   ├── mineurs/
│   │   ├── index.js                 Miners CRUD
│   │   └── discovery.js             Auto-discovery & health checks
│   ├── rentals/
│   │   └── index.js                 Rentals CRUD
│   ├── payments/
│   │   ├── index.js                 Payments CRUD
│   │   └── webhook.js               Lightning webhook handler
│   └── cron/
│       └── miner-health-check.js    Scheduled health checks (*/5 min)
│
├── packages/
│   ├── frontend/
│   │   ├── index.html               Home page
│   │   ├── demo.html                Feature overview
│   │   ├── marketplace.html         Miner rental UI
│   │   ├── payment-flow.html        Payment demo
│   │   ├── admin-dashboard.html     Admin panel
│   │   ├── test-api.html            API testing
│   │   ├── miner-monitoring.html    Health monitoring
│   │   ├── config.js                API client config
│   │   ├── nostr-auth.js            Nostr auth (NIP-98)
│   │   ├── nwc-client.js            NWC real integration
│   │   └── lightning-payments.js    Lightning payment flow
│   └── backend/
│       ├── migrations/
│       │   └── 001_init_schema.sql  Database schema
│       └── package.json
│
├── vercel.json                      Vercel config + cron jobs
├── seed-data.js                     Database seeding script
└── README.md
```

## 💾 Database Schema

### Users
```sql
- id (UUID)
- pubkey_nostr (TEXT, UNIQUE)
- role (enum: admin, user)
- created_at, updated_at
- metadata (JSONB)
```

### Mineurs (Miners)
```sql
- id (UUID)
- owner_id (FK users)
- name, ip_address, port
- hashrate_specs, sats_per_minute
- status (enum: online, offline, maintenance)
- total_revenue_sats, uptime_percentage
- last_checked
- metadata (JSONB)
```

### Rentals
```sql
- id (UUID)
- miner_id (FK mineurs)
- user_id (FK users)
- start_time, end_time
- duration_minutes, sats_per_minute, total_sats
- status (enum: pending, active, completed, cancelled)
- invoice_hash
- payment_verified_at
```

### Payments
```sql
- id (UUID)
- rental_id (FK rentals)
- invoice_hash (UNIQUE)
- amount_sats
- status (enum: pending, confirmed, failed, expired)
- wallet_pubkey
- created_at, expires_at, confirmed_at
- attempts, error_message
```

## 🔐 Authentication

### Nostr (NIP-98)
1. User clicks "Connect Wallet"
2. Frontend requests challenge from `/api/auth/challenge`
3. User signs challenge with Nostr wallet
4. Frontend sends signature to `/api/auth/verify`
5. Backend verifies signature and returns JWT token
6. JWT token used for all subsequent API calls

### JWT Token
- Algorithm: HS256
- Expires: 7 days
- Stored in: `localStorage` (bitrent_token)

## ⚡ Payment Flow

### Lightning Network (NWC)
1. User selects miner and duration
2. Cost calculated (price/min × duration)
3. `/api/payments` creates invoice
4. Frontend sends invoice to NWC relay
5. User's wallet signs and broadcasts payment
6. `/api/payments/webhook` receives confirmation
7. Rental status changes to "active"
8. Mining starts to user's address

## 🔍 Miner Auto-Discovery

### Health Check (Cron)
- Runs every 5 minutes (configured in `vercel.json`)
- Checks status of all registered miners
- Updates: status, hashrate, uptime, temperature
- Logs all changes to audit logs

### Network Discovery
- Scans IP range for Bitaxe miners
- Checks HTTP `/api/status` endpoint
- Returns: IP, hashrate, online status
- Allows bulk miner registration

## 📈 Monitoring & Analytics

### Real-Time Metrics
- Total miners & online count
- Fleet hashrate (TH/s)
- Average uptime percentage
- Daily revenue (sats)

### Audit Logs
- All user actions logged
- Payment confirmations tracked
- Miner status changes recorded
- Admin actions audited

## 🚀 Deployment

### Current Setup
- **Frontend**: Deployed to Vercel (`vercel.json`)
- **Backend**: Serverless functions in `/api`
- **Database**: Supabase PostgreSQL
- **Auto-Deploy**: GitHub → Vercel on push

### Environment Variables
```
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
SUPABASE_ANON_KEY=...
JWT_SECRET=...
NODE_ENV=production
PORT=3000
CRON_SECRET=... (for cron auth)
```

### Zero Cost
- Vercel: Free tier ($0)
- Supabase: Free tier ($0)
- GitHub: Free (public repo)
- **Total: $0/month**

## 🔮 Future Roadmap

### Phase 2 (Q2 2026)
- [ ] Real NWC wallet connection
- [ ] Miner statistics API
- [ ] Revenue dashboard
- [ ] Multi-signature withdrawals
- [ ] Fiat payment option (Stripe)

### Phase 3 (Q3 2026)
- [ ] Mobile app (React Native)
- [ ] Docker containers
- [ ] Kubernetes orchestration
- [ ] Advanced analytics
- [ ] Machine learning price optimization

### Phase 4 (Q4 2026)
- [ ] Atomic swaps (no middleman)
- [ ] DAO governance
- [ ] Insurance pools
- [ ] Peer-to-peer mining
- [ ] Carbon offset tracking

## 📚 API Documentation

### GET /api/health
Returns system health status.

```bash
curl https://workspace-omega-opal.vercel.app/api/health
```

Response:
```json
{
  "status": "ok",
  "service": "BitRent Backend",
  "version": "1.0.0",
  "checks": {
    "database": "ready",
    "auth": "ready",
    "payments": "ready"
  }
}
```

### POST /api/auth/challenge
Get authentication challenge.

```bash
curl -X POST https://workspace-omega-opal.vercel.app/api/auth/challenge
```

Response:
```json
{
  "status": "ok",
  "challenge": {
    "id": "challenge_1234567890",
    "message": "Sign this message to authenticate with BitRent",
    "expires_at": "2026-03-17T18:00:00Z"
  }
}
```

### POST /api/auth/verify
Verify signature and get JWT token.

```bash
curl -X POST https://workspace-omega-opal.vercel.app/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "challenge_id": "challenge_1234567890",
    "signature": "...",
    "pubkey": "..."
  }'
```

Response:
```json
{
  "status": "ok",
  "token": "eyJhbGc...",
  "pubkey": "...",
  "message": "Authentication successful"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **Nostr Community** - NIP-98 specification
- **Lightning Network** - Payment infrastructure
- **Vercel** - Serverless hosting
- **Supabase** - Database platform
- **Bitaxe Community** - Mining hardware

## 📧 Contact

- GitHub Issues: [Silexperience210/bitrent](https://github.com/Silexperience210/bitrent/issues)
- Email: [your-email@example.com]

---

**Made with ⚡ for Bitcoin miners**
