# BitRent Authentication Implementation - Phase 2

## Overview

BitRent Phase 2 implements **Nostr-based authentication** using NIP-98 signature verification and JWT tokens for secure, decentralized user authentication.

## Architecture

### Backend Flow

```
User                    Frontend                Backend
 │                         │                       │
 ├─ Click "Login" ────────→│                       │
 │                         │                       │
 │                         │─ POST /challenge ────→│
 │                         │                       │ Generate challenge
 │                         │←─ Return challenge ──│
 │                         │                       │
 │                         │ Sign with wallet ←───┐
 │ Select Wallet ─────────→│                      │
 │ Connect & Sign ────────→│                      │
 │                         │                       │
 │                         │─ POST /verify ──────→│
 │                         │ (challenge,sig,pubkey)│ Verify signature
 │                         │                       │ Create JWT
 │                         │←─ Return JWT ───────│
 │                         │                       │
 │ Logged in! ←───────────│                       │
 │ Token stored ──────────→│ localStorage          │

```

### Components

#### 1. Backend Services

**`services/nostr-auth.js`**
- `generateChallenge()` - Create random 32-byte challenge
- `verifySignature()` - Validate NIP-98 signatures
- `createJWT()` - Generate access tokens
- `verifyJWT()` - Verify JWT validity
- `createRefreshToken()` - Optional refresh tokens

#### 2. Middleware

**`middleware/requireAuth.js`**
- Validates JWT from Authorization header
- Sets `req.user` with decoded token
- Returns 401 if missing or invalid

**`middleware/requireAdmin.js`**
- Requires authenticated user
- Checks `is_admin` role
- Returns 403 if not admin

**`middleware/rateLimit.js`**
- `loginRateLimit` - Max 5 attempts per 15 mins
- `pubkeyRateLimit` - Max 60 requests per minute per pubkey
- `apiRateLimit` - Max 100 requests per minute per IP
- Auto-cleanup of expired entries

#### 3. Routes

**`POST /api/auth/nostr-challenge`**
- Request: `{ pubkey }`
- Response: `{ challenge, challenge_id, expires_at, expires_in }`
- Stores challenge in database for 5 minutes

**`POST /api/auth/nostr-verify`**
- Request: `{ challenge, signature, pubkey, timestamp }`
- Response: `{ token, pubkey, is_admin, expires_in, expires_at }`
- Verifies signature and returns JWT

**`GET /api/auth/profile`**
- Requires: Valid JWT token
- Response: `{ pubkey, is_admin, created_at }`
- Returns current user profile

**`POST /api/auth/refresh`**
- Requires: Valid JWT token
- Response: `{ token, expires_in, expires_at }`
- Issues new token before expiry

**`POST /api/auth/logout`**
- Requires: Valid JWT token
- Response: `{ success: true, message }`
- Clears session (frontend handles token deletion)

#### 4. Frontend

**`js/nostr-auth.js`**
- Main authentication client library
- Handles wallet connections (Alby, NIP-07)
- Manages login/logout flow
- Updates UI based on auth state

**`js/jwt-storage.js`**
- Secure token storage in localStorage
- Auto-refresh before expiration
- Token decoding and validation utilities

**`components/login-modal.html`**
- Wallet selection UI
- Status/error/success messages
- Security information

**`components/user-header.html`**
- Login button (when logged out)
- User display with pubkey (when logged in)
- Logout button

**`css/auth.css`**
- Complete styling for auth components
- Responsive design
- Dark theme with primary color (#f39c12)

## API Examples

### Getting Started

#### 1. Get Challenge

```bash
curl -X POST http://localhost:3000/api/auth/nostr-challenge \
  -H "Content-Type: application/json" \
  -d '{"pubkey":"abcd1234...ef5678"}'
```

Response:
```json
{
  "challenge": "a1b2c3d4...",
  "challenge_id": "uuid-here",
  "expires_at": "2026-03-15T16:05:00Z",
  "expires_in": 300
}
```

#### 2. Sign Challenge

Use wallet to sign the challenge:

```javascript
// Alby/NIP-07
const signature = await window.nostr.signMessage(challenge);
```

#### 3. Verify & Get Token

```bash
curl -X POST http://localhost:3000/api/auth/nostr-verify \
  -H "Content-Type: application/json" \
  -d '{
    "challenge": "a1b2c3d4...",
    "signature": "1234abcd...",
    "pubkey": "abcd1234...ef5678",
    "timestamp": 1679088300
  }'
```

Response:
```json
{
  "token": "eyJhbGc...",
  "pubkey": "abcd1234...ef5678",
  "is_admin": false,
  "expires_in": 86400,
  "expires_at": "2026-03-16T16:00:00Z"
}
```

#### 4. Use Token

Include in Authorization header:

```bash
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGc..."
```

## Security Features

### 1. Signature Verification
- Validates pubkey format (64 hex chars)
- Validates signature format (128 hex chars)
- Checks timestamp freshness (5 min tolerance)
- Uses SHA256 for message hashing

### 2. Rate Limiting
- Login attempts: 5 per 15 minutes per IP
- API requests: 100 per minute per IP
- Pubkey requests: 60 per minute per pubkey
- Automatic cleanup of expired entries

### 3. Token Security
- JWT with HS256 algorithm
- 24-hour expiration
- Unique JWT ID for revocation support
- Refresh token support (30-day expiry)

### 4. Database Protection
- RLS (Row Level Security) on all tables
- Challenges auto-expire
- User isolation via pubkey
- Admin-only actions protected

### 5. CORS & Headers
- Whitelist CORS origins
- CSP headers for XSS protection
- X-Frame-Options to prevent clickjacking
- Helmet.js for comprehensive security

## Frontend Integration

### 1. Include Scripts

```html
<script src="/js/jwt-storage.js"></script>
<script src="/js/nostr-auth.js"></script>
<link rel="stylesheet" href="/css/auth.css">
```

### 2. Add Components

```html
<!-- User header -->
<div id="app-header"></div>

<!-- Login modal -->
<div id="app-modals"></div>

<script>
  // Load components
  fetch('/components/user-header.html')
    .then(r => r.text())
    .then(html => document.getElementById('app-header').innerHTML = html);

  fetch('/components/login-modal.html')
    .then(r => r.text())
    .then(html => document.getElementById('app-modals').innerHTML = html);
</script>
```

### 3. Protect Routes

```html
<!-- Only show for logged-in users -->
<a href="/admin.html" data-require-admin>Admin Panel</a>

<!-- NostrAuth.updateUI() will hide this -->
```

### 4. Make Authenticated Requests

```javascript
// Get token
const token = JWTStorage.getAccessToken();

// Include in fetch
const response = await fetch('/api/admin/miners', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Environment Variables

Required in `.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# JWT
JWT_SECRET=your-very-long-random-secret-key-here
JWT_EXPIRY=24h

# Admin
ADMIN_NOSTR_PUBKEY=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789

# API
CORS_ORIGIN=http://localhost:3001
API_BASE_URL=http://localhost:3000

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Database Schema Changes

### Challenges Table
```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY,
  challenge VARCHAR(255) NOT NULL,
  pubkey VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_challenges_pubkey ON challenges(pubkey);
CREATE INDEX idx_challenges_expires_at ON challenges(expires_at);
```

### Users Table
```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_users_is_admin ON users(is_admin);
```

## Testing

### Test Login Flow

```javascript
// 1. Get challenge
const challenge = await fetch('/api/auth/nostr-challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pubkey: 'abc...' })
}).then(r => r.json());

// 2. Sign (simulated - need real wallet)
const signature = '1234...'; // From wallet

// 3. Verify
const token = await fetch('/api/auth/nostr-verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    challenge: challenge.challenge,
    signature,
    pubkey: 'abc...',
    timestamp: Math.floor(Date.now() / 1000)
  })
}).then(r => r.json());

console.log('Token:', token.token);
```

### Test Protected Routes

```javascript
const token = 'eyJhbGc...'; // From login

const profile = await fetch('/api/auth/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log('Profile:', profile);
```

## Troubleshooting

### "Invalid signature format"
- Signature must be 128 hex characters (Schnorr signature)
- Check wallet signing method

### "Challenge expired"
- Challenge expires after 5 minutes
- Request new challenge with `/nostr-challenge`

### "No authorization token provided"
- Include `Authorization: Bearer <token>` header
- Check token is stored correctly

### "Rate limit exceeded"
- Wait before retrying
- Different IP or pubkey for multiple attempts
- Check rate limit config

### Token not auto-refreshing
- Verify `jwt-storage.js` is loaded
- Check browser console for errors
- Token must have > 5 minutes until expiry

## Next Steps

1. **User Profiles** - Add display name, avatar, preferences
2. **Admin Dashboard** - Manage users, view logs, configure admins
3. **Two-Factor Auth** - Additional security layer
4. **Session Management** - Device tracking, logout from other sessions
5. **Audit Logs** - Complete auth event logging
6. **Rate Limit Persistence** - Use Redis instead of in-memory

## References

- [NIP-98: HTTP Auth](https://github.com/nostr-protocol/nips/blob/master/98.md)
- [NIP-07: Window Object Extension](https://github.com/nostr-protocol/nips/blob/master/07.md)
- [NIP-46: Nostr Connect](https://github.com/nostr-protocol/nips/blob/master/46.md)
- [JWT.io](https://jwt.io/)
- [Alby Docs](https://www.getalby.com/developer)
