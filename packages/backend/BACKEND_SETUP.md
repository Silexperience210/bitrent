# BitRent Backend - Setup Guide

## Phase 1: Production Backend Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (supabase.com)
- NWC relay (Nostr Wallet Connect)
- Git

### Local Development Setup

1. **Clone the project** (or create the directory structure)

```bash
cd bitrent-backend
npm install
```

2. **Create `.env` file** (copy from `.env.example`)

```bash
cp .env.example .env
```

3. **Configure environment variables** in `.env`:

```
NODE_ENV=development
PORT=3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-secret-key (min 32 chars)
JWT_EXPIRY=7d

# NWC
NWC_RELAY_URL=wss://relay.example.com
NWC_PUBKEY=your-nwc-pubkey
NWC_SECRET=your-nwc-secret

# Admin
ADMIN_NOSTR_PUBKEY=your-admin-pubkey

# CORS
CORS_ORIGIN=http://localhost:3001

# Logging
LOG_LEVEL=debug
```

4. **Setup Supabase Database**

Go to your Supabase project:
- SQL Editor → New Query
- Copy entire contents from `models/schema.sql`
- Run the SQL

5. **Start the development server**

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Database Setup (Supabase)

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor
3. Create a new query and paste the contents of `models/schema.sql`
4. Execute the SQL

This will create all tables, indexes, and RLS policies.

### NWC Integration

1. Get your NWC connection string from your wallet provider
2. Extract the relay URL, pubkey, and secret
3. Add to `.env`

### Testing the Backend

```bash
# Check health
curl http://localhost:3000/health

# Get challenge for Nostr auth
curl -X POST http://localhost:3000/auth/nostr-challenge \
  -H "Content-Type: application/json" \
  -d '{"pubkey":"your-pubkey"}'

# List available miners
curl http://localhost:3000/client/mineurs
```

### Directory Structure

```
bitrent-backend/
├── server.js                 # Main entry point
├── config/
│   ├── env.js               # Environment configuration
│   └── database.js          # Database initialization
├── middleware/
│   ├── auth.js              # JWT & Nostr auth
│   ├── errorHandler.js      # Error handling
│   └── validation.js        # Request validation
├── services/
│   ├── nwc.js              # Nostr Wallet Connect
│   ├── bitaxe.js           # Bitaxe API
│   ├── payment.js          # Payment logic
│   └── rental.js           # Rental logic
├── routes/
│   ├── auth.js             # Auth endpoints
│   ├── admin.js            # Admin endpoints
│   ├── client.js           # Client endpoints
│   ├── payments.js         # Payment endpoints
│   └── health.js           # Health check
├── models/
│   └── schema.sql          # Database schema
├── frontend/
│   └── js/
│       ├── config.js       # Frontend config
│       └── api-client.js   # Frontend API client
├── package.json
├── .env.example
├── .env                    # (ignored in git)
└── README.md
```

### Key Features Implemented

✅ Node.js/Express server
✅ Supabase PostgreSQL database
✅ NWC (Nostr Wallet Connect) integration
✅ Nostr authentication (challenge-response)
✅ JWT token generation
✅ Admin endpoints (manage miners)
✅ Client endpoints (browse, rent miners)
✅ Payment management (Lightning Network)
✅ Error handling & validation
✅ CORS & security headers
✅ Rate limiting
✅ Health checks

### Next Steps

1. Deploy to Railway (see DEPLOYMENT_GUIDE.md)
2. Setup domain and SSL
3. Configure NWC relay with real connection
4. Update frontend to use production API
5. Setup monitoring and logging

### Troubleshooting

**Database connection error:**
- Check SUPABASE_URL and SERVICE_ROLE_KEY
- Verify network access
- Check Supabase project is active

**NWC not working:**
- Verify relay URL is accessible
- Check pubkey and secret format
- Test with wscat: `wscat -c wss://relay.url`

**CORS errors:**
- Update CORS_ORIGIN to match frontend URL
- Check frontend is making requests to correct API URL

**Port already in use:**
- Change PORT in .env
- Or kill process: `lsof -ti:3000 | xargs kill -9`
