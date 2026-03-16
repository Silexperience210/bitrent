# 🔐 Secure Setup & Credentials Management

**IMPORTANT:** Never commit secrets to GitHub. Use environment variables instead.

---

## GitHub Token Management

### Create a New GitHub Token (Safe Approach)

1. **Go to:** https://github.com/settings/tokens
2. **Click:** "Generate new token (classic)"
3. **Scopes needed for BitRent:**
   - ☑️ `public_repo` (required for public repo)
   - ☑️ `read:user` (optional, for profile)
4. **Name it:** `bitrent-deployment`
5. **Expiration:** 90 days (for security)
6. **Copy & store safely** (you'll only see it once)

### Configure Git Credentials

**Option A: Git Credential Manager (Recommended)**
```bash
git config --global credential.helper manager-core
# Or for Windows:
git config --global credential.helper manager

# First push will prompt for username/token
git push -u origin master
# Enter username: Silexperience210
# Enter password: YOUR_GITHUB_TOKEN
```

**Option B: SSH (Most Secure)**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "silex@bitrent.io"
# Press Enter for all prompts

# Add to GitHub: https://github.com/settings/ssh/new
# Then use:
git remote set-url origin git@github.com:Silexperience210/bitrent.git
```

**Option C: Personal Access Token in .git/config (Less Secure)**
```bash
# NOT RECOMMENDED - Can leak if .git/ is exposed
# Only use this if you understand the risks
```

---

## Environment Variables - Local Setup

### Never Commit These Files
```
# Always in .gitignore:
.env
.env.local
.env.production.local
.env.*.local
.env.*.example  (templates ONLY, no real values)
```

### Backend Environment File
Create **`packages/backend/.env`** (NEVER commit):

```bash
# Database - Get from Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Auth - Generate Random Strings
JWT_SECRET=your-super-secret-random-string-32-chars-min
JWT_EXPIRY=7d
ADMIN_PUBKEYS=your-nostr-pubkey-1,your-nostr-pubkey-2

# Payments - From Your Wallet
NWC_CONNECTION_STRING=nostr+walletconnect://...?relay=...&secret=...
NWC_RELAY=wss://relay.getalby.com/v1

# Server
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Sentry (optional)
SENTRY_DSN=https://key@sentry.io/project-id
```

### Frontend Environment File
Create **`packages/frontend/.env.local`** (NOT committed):

```bash
# These can be semi-public (frontend is public anyway)
VITE_API_URL=http://localhost:3000
VITE_NWC_RELAY=wss://relay.getalby.com/v1
VITE_ADMIN_PUBKEY=your-nostr-pubkey-here
```

---

## Vercel Environment Variables

### Setup for Production

1. **Go to:** https://vercel.com/dashboard
2. **Select project:** bitrent
3. **Settings → Environment Variables**

#### Frontend (packages/frontend)
```
VITE_API_URL=https://your-backend-url.vercel.app
VITE_NWC_RELAY=wss://relay.getalby.com/v1
VITE_ADMIN_PUBKEY=your-nostr-pubkey
```

#### Backend (packages/backend)
```
# Copy all from your local .env file
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
JWT_SECRET=your-secret
JWT_EXPIRY=7d
ADMIN_PUBKEYS=pubkey1,pubkey2
NWC_CONNECTION_STRING=nostr+walletconnect://...
NWC_RELAY=wss://relay.getalby.com/v1
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
SENTRY_DSN=https://...
```

---

## Nostr Keys Management

### What You Need

1. **Admin Public Key** (for authentication)
   - From your Nostr wallet (Alby, Nos.social, etc.)
   - Format: `npub1...` or hex `1234...`
   - Can be public (everyone can see it)

2. **NWC Connection String** (for payments)
   - From your Alby account (Get NWC URI)
   - Format: `nostr+walletconnect://...`
   - **KEEP SECRET** - stores your wallet encryption key

### Where to Get NWC Connection String

1. **Open Alby:** https://getalby.com
2. **Go to:** Settings → Wallets → NWC
3. **Click:** "Generate NWC Connection"
4. **Copy the full URI** (starts with `nostr+walletconnect://`)
5. **Paste into .env** as `NWC_CONNECTION_STRING`

### Rotate Keys Periodically

```bash
# To rotate NWC connection (get new wallet connection):
# 1. Open Alby dashboard
# 2. Revoke old NWC connection
# 3. Generate new connection string
# 4. Update .env and redeploy

# To rotate JWT_SECRET:
# 1. Generate new random string: openssl rand -base64 32
# 2. Update .env
# 3. All existing tokens become invalid (users must re-login)
# 4. Redeploy
```

---

## Supabase Credentials

### Get Your Credentials

1. **Go to:** https://supabase.com/dashboard
2. **Select your project**
3. **Settings → API**
4. **Copy these:**
   - `Project URL` → `SUPABASE_URL`
   - `service_role key` → `SUPABASE_SERVICE_KEY` (SECRET)
   - `anon public key` → `SUPABASE_ANON_KEY` (can be public)

### Row-Level Security (RLS)

- Enable RLS on all tables (done by migrations)
- Policies control who can access what
- RLS runs at database level (most secure)

---

## Local Development - Secrets File (Optional)

If you want to keep secrets separate from git:

**Create `.env.local`** (in .gitignore):
```bash
# Local development secrets only
# Never committed to git

SUPABASE_URL=[your-url]
SUPABASE_SERVICE_KEY=[your-key]
JWT_SECRET=[your-secret]
NWC_CONNECTION_STRING=[your-connection]
```

**Never put actual values here in documentation!**
- Copy from Supabase dashboard directly to your local `.env.local`
- Never share these files
- Never commit to git

---

## Secret Rotation Schedule

| Secret | Rotate Every | How |
|--------|-------------|-----|
| NWC Connection String | 6 months | Revoke in Alby, generate new |
| JWT_SECRET | 3 months | Generate new, redeploy |
| GitHub Token | 6 months | Create new token on GitHub |
| Supabase Keys | 12 months | Rotate in Supabase dashboard |

---

## Audit Secrets Already Committed

**Check if secrets are in Git history:**

```bash
# Search for secrets in commits
git log --all -p | grep -i "secret\|token\|key" | head -20

# Using git-secrets (if installed)
git secrets --scan

# Using gitleaks
gitleaks detect --source git
```

**If secrets were committed:**

1. **Revoke them immediately** (GitHub, Supabase, Alby)
2. **Regenerate with new values**
3. **Use git-filter-repo to remove from history** (advanced)
4. **Force push** (if private repo)

---

## CI/CD Security

### GitHub Actions Secrets

1. **Go to:** https://github.com/Silexperience210/bitrent/settings/secrets/actions
2. **Add secrets:**
   ```
   SUPABASE_URL
   SUPABASE_SERVICE_KEY
   JWT_SECRET
   NWC_CONNECTION_STRING
   SENTRY_DSN
   ```

3. **Use in workflows:**
   ```yaml
   - name: Deploy
     env:
       SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
       SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
     run: npm run build && npm run deploy
   ```

---

## Best Practices Checklist

- [ ] Created new GitHub token (not using old one)
- [ ] .env files are in .gitignore
- [ ] No secrets in .env.example files
- [ ] Supabase credentials are secure
- [ ] NWC connection string is private
- [ ] JWT_SECRET is random (32+ chars)
- [ ] Vercel environment variables are set
- [ ] GitHub Actions secrets are configured
- [ ] Tokens have minimum required scopes
- [ ] No hardcoded secrets in code

---

## Emergency - Revoke Compromised Secrets

If a secret was exposed:

```bash
# 1. GitHub Token
# Go to: https://github.com/settings/tokens
# Click "Delete" next to the token

# 2. Supabase Keys
# Go to: https://supabase.com/dashboard
# Settings → API → Rotate key

# 3. NWC Connection
# Alby dashboard → Wallets → NWC → Revoke

# 4. Create new secrets immediately
# Update all .env files
# Redeploy
```

---

**Remember:** 
- 🔒 Secrets stay secret
- 🔄 Rotate regularly
- 📝 Document what you're securing
- 🚨 Act fast if compromised

---

Last updated: 2026-03-15
