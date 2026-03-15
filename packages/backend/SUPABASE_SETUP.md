# 🗄️ SUPABASE SETUP GUIDE - BitRent Backend

## TL;DR (5 Minutes)

```bash
# 1. Create Supabase account
# 2. Create project
# 3. Copy keys to .env
# 4. Run migrations
# Done!
```

---

## 📋 STEP 1: Create Supabase Account

1. **Go to:** https://supabase.com
2. **Click "Sign Up"** (top right)
3. **Login with GitHub** (recommended)
   - This syncs with your GitHub account
4. **Verify email** (check inbox)

✅ **You now have a Supabase account!**

---

## 📂 STEP 2: Create Your Project

1. **Go to Dashboard:** https://app.supabase.com
2. **Click "New Project"**
3. **Fill in:**
   - **Project Name:** `bitrent-prod` (or `bitrent-dev`)
   - **Database Password:** Generate strong password (save it!)
   - **Region:** Choose closest to you (EU/US)
4. **Click "Create New Project"**
5. **Wait 2-3 minutes** (Supabase sets up database)

✅ **Project created!**

---

## 🔑 STEP 3: Get Your API Keys

### Where to Find Keys:

1. **In Supabase Dashboard:**
   - Top left: Click your project name
   - Left sidebar: **Settings** → **API**

2. **You'll see:**
   - `Project URL` (looks like: `https://xxxx.supabase.co`)
   - `anon public` key (for client-side, long string)
   - `service_role` key (for server-side, long string - MORE POWERFUL!)

### Which Keys to Use?

```
┌─────────────────────────────────────────────┐
│ BACKEND (.env)                              │
├─────────────────────────────────────────────┤
│ SUPABASE_URL = Project URL                  │
│ SUPABASE_SERVICE_KEY = service_role key ✅  │
│ SUPABASE_ANON_KEY = anon public key        │
└─────────────────────────────────────────────┘

IMPORTANT:
- service_role = Full access (USE IN BACKEND ONLY!)
- anon = Limited access (USE IN FRONTEND ONLY!)
```

### Get Keys Step-by-Step:

1. **In Supabase Dashboard:**
   - Left sidebar: **Settings**
   - Click **API**

2. **Copy these values:**

   ```
   Project URL: https://xxxxx.supabase.co
   
   service_role (Secret)
   [Click "Reveal" button and copy the long string]
   eyJhbGciOiJIUzI1NiIsInR...
   ```

3. **Now open your `.env` file and paste:**

   ```bash
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR...
   ```

✅ **Keys configured!**

---

## 🗃️ STEP 4: Run Database Migrations

Migrations = SQL scripts that create tables, indexes, RLS policies

### Run Them:

```bash
# Install dependencies first
npm install

# Run migrations (creates tables)
npm run migrations:up

# Check status
npm run migrations:status
```

### What Migrations Do:

1. **001_init_schema.sql**
   - Creates 9 tables (users, mineurs, rentals, payments, etc.)
   - Adds constraints & foreign keys
   - Creates enum types

2. **002_add_performance_indexes.sql**
   - Adds 30+ indexes for fast queries
   - Optimizes common search patterns

3. **003_add_rls_policies.sql**
   - Adds Row-Level Security
   - Users can only see their own data
   - Admins can see everything

4. **004_add_triggers_functions.sql**
   - Auto-update timestamps
   - Auto-calculate totals
   - Auto-archive old data

5. **005_create_views.sql**
   - Creates analytics views
   - Pre-computes stats
   - Makes dashboard fast

### If Migration Fails:

```bash
# Check logs
npm run migrations:status

# Rollback last migration
npm run migrations:down

# Try again
npm run migrations:up
```

✅ **Database ready!**

---

## 📝 STEP 5: Verify Everything Works

### Check in Supabase Dashboard:

1. **Go to:** https://app.supabase.com
2. **Click your project**
3. **Left sidebar: Table Editor**
4. **You should see:**
   - `users` table (empty)
   - `mineurs` table (empty)
   - `rentals` table (empty)
   - `payments` table (empty)
   - `audit_logs` table (empty)
   - And more...

### Test Backend Connection:

```bash
npm run dev

# Visit: http://localhost:3000/api/health
# Should return: { status: "ok", database: "connected" }
```

✅ **Everything working!**

---

## 🔐 ENVIRONMENT VARIABLES EXPLAINED

### Database Variables

```bash
# Your Supabase project URL
SUPABASE_URL=https://xxxxxxx.supabase.co

# Server-side key (KEEP SECRET!)
# Has full access to everything
# NEVER put in frontend!
SUPABASE_SERVICE_KEY=eyJhbGc...

# Client-side key (can be public)
# Limited access based on RLS policies
# Safe to put in frontend
SUPABASE_ANON_KEY=eyJhbGc...
```

### JWT Variables

```bash
# Secret key to sign JWT tokens
# Generate: openssl rand -base64 32
# NEVER share this!
JWT_SECRET=your-secret-here

# How long token lasts (24 hours)
JWT_EXPIRY=24h
```

### NWC (Nostr Wallet Connect)

```bash
# Your wallet's connection string
# Get from: Alby, mutiny, or other wallet
# Format: nostr+walletconnect://pubkey?relay=...
NWC_CONNECTION_STRING=nostr+walletconnect://...
```

### Admin Config

```bash
# Your Nostr pubkey (so you can login as admin)
# Can be hex (64 chars) or npub1... format
# Get from: Your wallet or https://nostr-check.vercel.app
ADMIN_PUBKEYS=your-pubkey-here
```

### Frontend URLs

```bash
# For development (localhost)
FRONTEND_URL=http://localhost:3000

# For production (your domain)
FRONTEND_PROD_URL=https://bitrent.io
```

---

## 🚀 STEP 6: Create Production vs Development

### Development Database (Local Testing):

```bash
# Use development Supabase project
SUPABASE_URL=https://dev-xxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=dev-key-here
NODE_ENV=development
```

### Production Database (Real Money):

```bash
# Use production Supabase project
SUPABASE_URL=https://prod-xxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=prod-key-here
NODE_ENV=production
```

**IMPORTANT:** Create 2 separate projects in Supabase:
1. One for dev/testing
2. One for production

This way accidents don't affect real data!

---

## 💾 STEP 7: Backup Strategy

### Automatic Backups (Supabase Pro):

```bash
# In Supabase Dashboard:
# Settings → Backups → Enable Daily Backups
```

### Manual Backup:

```bash
# Backup your database
npm run backup

# Restore from backup
npm run restore
```

---

## 🆘 TROUBLESHOOTING

### "Connection refused"
```bash
# Check SUPABASE_URL is correct
# Check SUPABASE_SERVICE_KEY is correct
# Check you have internet connection
```

### "Authentication failed"
```bash
# Check keys are not expired
# Go to Supabase Dashboard → Settings → API
# Regenerate keys if needed
```

### "Table doesn't exist"
```bash
# Migrations didn't run
npm run migrations:up
# Check output for errors
```

### "Permission denied"
```bash
# RLS policies blocking access
# Check user role in database
# Check SUPABASE_SERVICE_KEY is used (not anon key)
```

---

## 📚 NEXT STEPS

1. ✅ Create Supabase account
2. ✅ Create project
3. ✅ Copy keys to .env
4. ✅ Run migrations
5. ➜ **Next:** Test NWC payments
6. ➜ **Next:** Deploy to Railway

---

## 🎯 Quick Reference

| What | Where | How |
|------|-------|-----|
| **Create Account** | https://supabase.com | Sign up with GitHub |
| **Create Project** | https://app.supabase.com | Click "New Project" |
| **Get Keys** | Dashboard → Settings → API | Copy URL + service_role key |
| **Run Migrations** | Terminal | `npm run migrations:up` |
| **Check Tables** | Dashboard → Table Editor | Should show all 9 tables |
| **Test Backend** | http://localhost:3000/api/health | Should return "ok" |

---

**Questions?** Check the main README.md or BACKEND_SETUP.md
