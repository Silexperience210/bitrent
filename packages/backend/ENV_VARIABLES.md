# Environment Variables Reference

## Overview

All configuration is done through environment variables. Never hardcode secrets.

## Server Configuration

### NODE_ENV
**Type:** `string`
**Values:** `development`, `production`, `test`
**Default:** `development`
**Purpose:** Runtime environment

```
NODE_ENV=production
```

### PORT
**Type:** `integer`
**Default:** `3000`
**Purpose:** Server port

```
PORT=3000
```

Note: Railway overrides this automatically.

---

## Database Configuration (Supabase)

### SUPABASE_URL
**Type:** `string` (URL)
**Required:** Yes
**Purpose:** Supabase project URL
**Format:** `https://xxxxx.supabase.co`

Get from: Supabase Project Settings → API → Project URL

```
SUPABASE_URL=https://your-project-id.supabase.co
```

### SUPABASE_ANON_KEY
**Type:** `string` (API Key)
**Required:** Yes
**Purpose:** Public key for client-side queries (not used in backend)
**Format:** ~140 character string

Get from: Supabase Project Settings → API → Anon public key

```
SUPABASE_ANON_KEY=your-long-anon-key-here
```

### SUPABASE_SERVICE_ROLE_KEY
**Type:** `string` (API Key)
**Required:** Yes
**Purpose:** Server-side admin key with full database access
**Format:** ~140 character string
**⚠️ CRITICAL:** Keep this secret! Never expose publicly.

Get from: Supabase Project Settings → API → Service role secret (or API)

```
SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key
```

**Security Note:**
- Don't commit to git
- Rotate regularly (in Supabase)
- Use only in backend .env
- Implement rate limiting to prevent abuse

---

## JWT Configuration

### JWT_SECRET
**Type:** `string`
**Required:** Yes
**Minimum Length:** 32 characters
**Purpose:** Signing and verifying JWT tokens
**⚠️ CRITICAL:** Must be cryptographically random

Generate with:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Maximum 256) }))

# Online (dev only)
https://www.uuidgenerator.net/ (use multiple)
```

```
JWT_SECRET=your-very-long-random-secret-string-at-least-32-chars
```

**Rotation:**
- Change every 90 days in production
- Old tokens remain valid until expiry
- Update all instances simultaneously

### JWT_EXPIRY
**Type:** `string` (duration)
**Default:** `7d`
**Purpose:** Token lifetime
**Formats:** `1h`, `7d`, `30d`, `365d`

```
JWT_EXPIRY=7d
```

Examples:
- `1h` - 1 hour (short-lived, secure)
- `7d` - 7 days (balance)
- `30d` - 30 days (long-lived, less secure)

---

## NWC Configuration (Nostr Wallet Connect)

### NWC_RELAY_URL
**Type:** `string` (WebSocket URL)
**Required:** Yes
**Purpose:** Nostr relay URL for wallet connection
**Format:** `wss://relay-url.com`

Common relays:
- `wss://nostr.example.com` - Your relay
- `wss://relay.damus.io` - Public relay

```
NWC_RELAY_URL=wss://relay.example.com
```

**Test with:**
```bash
wscat -c wss://relay.example.com
```

### NWC_PUBKEY
**Type:** `string` (hex)
**Required:** If NWC enabled
**Length:** 64 characters
**Purpose:** NWC server public key
**Format:** Hex string (0-9a-f)

```
NWC_PUBKEY=abc123def456...
```

### NWC_SECRET
**Type:** `string` (hex)
**Required:** If NWC enabled
**Length:** 64 characters
**Purpose:** NWC server secret key
**⚠️ CRITICAL:** Keep this secret!
**Format:** Hex string (0-9a-f)

```
NWC_SECRET=xyz789uvw012...
```

**Generation:**
```bash
# Using secp256k1
# (Use proper Nostr key generation tool)
```

---

## Authentication Configuration

### ADMIN_NOSTR_PUBKEY
**Type:** `string` (hex)
**Required:** Yes
**Purpose:** Nostr public key of admin user
**Length:** 64 characters

Set to your Nostr pubkey to get admin privileges.

```
ADMIN_NOSTR_PUBKEY=your-pubkey-hex-string
```

Get your pubkey from:
- Nostr client (Primal, Amethyst, etc.)
- `npx nostr-tools` command
- NIP-07 browser extension

---

## API Configuration

### CORS_ORIGIN
**Type:** `string` (URL)
**Default:** `http://localhost:3001`
**Purpose:** Allowed frontend origin for CORS

Development:
```
CORS_ORIGIN=http://localhost:3001
```

Production (single domain):
```
CORS_ORIGIN=https://bitrent.com
```

Production (multiple domains):
```
CORS_ORIGIN=https://bitrent.com,https://app.bitrent.com
```

### API_BASE_URL
**Type:** `string` (URL)
**Purpose:** Public API URL for documentation/responses
**Used in:** Error responses, API docs

Development:
```
API_BASE_URL=http://localhost:3000
```

Production:
```
API_BASE_URL=https://api.bitrent.com
```

---

## Logging Configuration

### LOG_LEVEL
**Type:** `string`
**Values:** `debug`, `info`, `warn`, `error`
**Default:** `info`
**Purpose:** Minimum logging level

Development:
```
LOG_LEVEL=debug
```

Production:
```
LOG_LEVEL=info
```

**Levels:**
- `debug` - Verbose, all details (dev only)
- `info` - Normal operations
- `warn` - Warnings, use caution
- `error` - Errors only

---

## Monitoring Configuration (Phase 1.5)

### SENTRY_DSN
**Type:** `string` (URL)
**Required:** No
**Purpose:** Sentry error tracking
**Format:** `https://xxx@xxx.ingest.sentry.io/xxx`

```
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/123456
```

Get from: Sentry Project Settings → Client Keys (DSN)

Leave empty to disable Sentry.

---

## Rate Limiting Configuration

### RATE_LIMIT_WINDOW_MS
**Type:** `integer`
**Default:** `900000` (15 minutes)
**Purpose:** Time window for rate limit

```
RATE_LIMIT_WINDOW_MS=900000
```

Common values:
- `60000` - 1 minute
- `300000` - 5 minutes
- `900000` - 15 minutes (default)

### RATE_LIMIT_MAX_REQUESTS
**Type:** `integer`
**Default:** `100`
**Purpose:** Max requests per window per IP

```
RATE_LIMIT_MAX_REQUESTS=100
```

Common values:
- `50` - Strict (development)
- `100` - Moderate (production default)
- `500` - Lenient (high-volume)

---

## Configuration Examples

### Development (.env.development)
```
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

JWT_SECRET=your-secret-key-for-testing
JWT_EXPIRY=7d

NWC_RELAY_URL=wss://relay.test.com
NWC_PUBKEY=...
NWC_SECRET=...

ADMIN_NOSTR_PUBKEY=your-test-pubkey

CORS_ORIGIN=http://localhost:3001
API_BASE_URL=http://localhost:3000

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Production (.env.production)
```
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=... (prod key)
SUPABASE_SERVICE_ROLE_KEY=... (prod key)

JWT_SECRET=very-long-cryptographically-random-secret-32-chars-min
JWT_EXPIRY=7d

NWC_RELAY_URL=wss://relay.production.com
NWC_PUBKEY=... (prod pubkey)
NWC_SECRET=... (prod secret)

ADMIN_NOSTR_PUBKEY=your-admin-pubkey

CORS_ORIGIN=https://bitrent.com
API_BASE_URL=https://api.bitrent.com

SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/123456

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Setup Instructions

### 1. Local Development
```bash
cp .env.example .env
# Edit .env with your values
npm run dev
```

### 2. Production (Railway)
```bash
# Via Railway dashboard:
# 1. Go to Variables tab
# 2. Add each variable
# 3. Redeploy
```

### 3. Docker/Container
```bash
# Create .env file
docker build -t bitrent .
docker run --env-file .env -p 3000:3000 bitrent
```

---

## Security Best Practices

1. **Never commit .env to git**
   - Add to .gitignore
   - Use .env.example for reference

2. **Rotate secrets regularly**
   - JWT_SECRET every 90 days
   - NWC_SECRET if exposed
   - Database keys annually

3. **Use strong random values**
   - Minimum 32 characters
   - Cryptographically random (not predictable)
   - Use proper generation tools

4. **Restrict access**
   - Limit who can read .env
   - Use secrets manager in production
   - Don't share secrets via chat/email

5. **Monitor for leaks**
   - Check git history for accidents
   - Use secret scanning tools
   - Alert on unusual activity

---

## Troubleshooting

**Error: "Database not initialized"**
- Check SUPABASE_URL is correct
- Verify SERVICE_ROLE_KEY has access
- Test connection in Supabase SQL editor

**Error: "CORS error"**
- Verify CORS_ORIGIN matches frontend URL
- Check frontend sends requests to API_BASE_URL

**Error: "Invalid token"**
- Check JWT_SECRET matches (all servers)
- Verify token hasn't expired

**Error: "NWC relay not found"**
- Verify NWC_RELAY_URL is valid WebSocket URL
- Test with wscat: `wscat -c wss://relay.url`
- Check network firewall allows WebSocket

---

## Reference

**Character counts:**
- Hex strings (pubkey, secret): 64 characters
- JWT secret: 32+ characters
- API Keys (Supabase): ~140 characters
- URLs: variable, must be valid

**Formats:**
- Hex: `[0-9a-f]{64}`
- URL: `https://` or `wss://`
- Duration: `[0-9]+(ms|s|m|h|d)`
- Integer: `[0-9]+`
