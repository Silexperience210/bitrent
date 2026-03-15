# 🚀 BitRent Deployment Checklist

Complete monorepo: `github.com/Silexperience210/bitrent`

## Phase 1: GitHub & Repositories ✅

- [x] Monorepo consolidated (packages/frontend + packages/backend)
- [x] Root package.json with workspaces configured
- [x] Root .gitignore created
- [x] Monorepo README.md created
- [x] GitHub repository created: `Silexperience210/bitrent`
- [x] Code pushed to GitHub (master branch)
- [x] Git remote configured (no exposed secrets)

**Status: COMPLETE** ✅

---

## Phase 2: Supabase Database Setup ⏳

### What You Need to Do:

1. **Create Supabase Account**
   - Go to: https://supabase.com
   - Sign up (free tier is fine for MVP)
   - Create new project

2. **Get Your Credentials**
   - Project URL: `https://your-project.supabase.co`
   - Service Role Key: (with full DB access)
   - Anon Key: (for public access)

3. **Save Environment Variables**
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGc...  (service role key, KEEP SECRET)
   SUPABASE_ANON_KEY=eyJhbGc...     (public key, safe to expose)
   ```

4. **Run Migrations**
   ```bash
   cd packages/backend
   npm install  # Install dependencies first
   npm run migrations:up
   ```

5. **Verify Database**
   - Check Supabase dashboard
   - Should see 9 tables (users, mineurs, rentals, payments, etc.)
   - Should see ~30 indexes, RLS policies, triggers

**See:** `packages/backend/SUPABASE_SETUP.md` for detailed instructions

---

## Phase 3: Environment Variables Setup ⏳

### Backend (.env)
Create `packages/backend/.env`:

```
# Supabase (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...

# Auth (REQUIRED)
JWT_SECRET=generate-random-string-here
JWT_EXPIRY=7d
ADMIN_PUBKEYS=your-nostr-pubkey,other-admin-pubkey

# Payments (REQUIRED)
NWC_CONNECTION_STRING=nostr+walletconnect://...
NWC_RELAY=wss://relay.getalby.com/v1

# Server
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Monitoring (optional)
SENTRY_DSN=https://...@sentry.io/...
```

### Frontend (.env or .env.local)
Create `packages/frontend/.env.local`:

```
VITE_API_URL=https://your-backend-url.vercel.app
VITE_NWC_RELAY=wss://relay.getalby.com/v1
VITE_ADMIN_PUBKEY=your-nostr-pubkey
```

**See:** `packages/backend/.env.example` for all options

---

## Phase 4: Local Testing ⏳

### Test Backend
```bash
cd packages/backend
npm install
npm run dev
```

**Expected:** Server running on http://localhost:3000

Check health endpoint:
```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{ "status": "ok", "timestamp": "2026-03-15..." }
```

### Test Frontend
```bash
cd packages/frontend
npm install
npm run dev
```

**Expected:** Frontend running on http://localhost:5173

---

## Phase 5: Vercel Deployment ⏳

### Frontend Deployment

**Option A: Using Vercel CLI**
```bash
cd packages/frontend
vercel deploy --prod
```

**Option B: GitHub Integration**
1. Go to https://vercel.com/import
2. Connect your GitHub account
3. Select `Silexperience210/bitrent` repo
4. Set root directory to `packages/frontend`
5. Deploy

### Backend Deployment

**Option A: Using Vercel CLI**
```bash
cd packages/backend
vercel deploy --prod
```

**Option B: GitHub Integration**
1. Go to https://vercel.com/import
2. Connect your GitHub account
3. Select `Silexperience210/bitrent` repo
4. Set root directory to `packages/backend`
5. Deploy

**Configure Environment Variables:**
- In Vercel dashboard, add all `.env` variables
- Click "Deploy"

---

## Phase 6: Integration Testing ⏳

### Test API Endpoints
```bash
# Replace with your actual Vercel URL
curl https://your-backend.vercel.app/api/health
```

### Test Frontend
1. Open https://your-frontend.vercel.app
2. Click "Admin Login"
3. Scan Nostr QR code with Alby/NIP-07 wallet
4. Should be authenticated

### Test Payments
1. Go to Client interface
2. Browse available miners
3. Click "Rent"
4. Should trigger NWC payment flow

---

## Phase 7: Production Go-Live ✅ READY

When all phases complete:

1. **Monitor Logs**
   - Check Vercel logs for errors
   - Monitor Sentry for exceptions

2. **Health Checks**
   - Setup monitoring alerts
   - Configure incident response

3. **Announce Launch**
   - Share GitHub repo
   - Announce on social media
   - Monitor initial user activity

---

## Quick Command Reference

```bash
# Root level
npm install              # Install all dependencies
npm run dev             # Run both frontend + backend
npm run build           # Build both packages

# Frontend only
npm run frontend        # Run frontend dev server
npm run build --workspace=packages/frontend

# Backend only
npm run backend         # Run backend dev server
npm run migrations:up --workspace=packages/backend
npm test --workspace=packages/backend

# Git workflow
git checkout -b feature/my-feature
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature
# Open PR on GitHub

# Deploy
cd packages/frontend && vercel deploy --prod
cd packages/backend && vercel deploy --prod
```

---

## File Locations

| What | Where |
|------|-------|
| Frontend code | `packages/frontend/` |
| Backend code | `packages/backend/` |
| Monorepo config | `package.json`, `MONOREPO.md` |
| This checklist | `DEPLOYMENT_CHECKLIST.md` |
| Supabase guide | `packages/backend/SUPABASE_SETUP.md` |
| API docs | `packages/backend/API_DOCUMENTATION.md` |
| Database schema | `packages/backend/DATABASE_SCHEMA.md` |

---

## Support

- **GitHub Issues:** Report bugs at https://github.com/Silexperience210/bitrent/issues
- **Documentation:** See `packages/backend/` and `packages/frontend/` READMEs
- **Troubleshooting:** See `packages/backend/TROUBLESHOOTING.md`

---

## ⚠️ Security Notes

- **Never commit .env files** (should be in .gitignore)
- **Use environment variables** for all secrets
- **Rotate JWT_SECRET** periodically
- **Keep NWC_CONNECTION_STRING private**
- **Enable RLS policies** in Supabase for data protection
- **Use HTTPS only** for all API calls

---

**Last Updated:** 2026-03-15
**Status:** Ready for Supabase Setup (Phase 2)

Next: Create Supabase account and obtain credentials
