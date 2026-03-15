# BitRent Phase 2: Nostr Authentication & Security

## 🎯 Overview

Phase 2 implements **complete Nostr-based authentication** for BitRent using NIP-98 signatures and secure JWT tokens.

**Features:**
- ✅ Nostr wallet login (Alby, NIP-07, etc.)
- ✅ NIP-98 signature verification
- ✅ JWT token management with auto-refresh
- ✅ Rate limiting & DDoS protection
- ✅ Admin role-based access control
- ✅ Secure token storage & transmission
- ✅ Responsive login UI
- ✅ Complete security headers

## 📁 Project Structure

```
bitrent-backend/
├── server.js                          # Main Express server
├── package.json                       # Dependencies
│
├── config/
│   ├── env.js                        # Environment variables
│   └── database.js                   # Supabase connection
│
├── services/
│   ├── nostr-auth.js                 # ✨ NEW: Signature verification
│   ├── rental.js
│   ├── payment.js
│   └── bitaxe.js
│
├── middleware/
│   ├── requireAuth.js                # ✨ NEW: JWT validation
│   ├── requireAdmin.js               # ✨ NEW: Admin check
│   ├── rateLimit.js                  # ✨ NEW: DDoS protection
│   ├── auth.js                       # OLD: Keep for compatibility
│   ├── errorHandler.js
│   └── validation.js
│
├── utils/
│   └── jwt.js                        # ✨ NEW: Token utilities
│
├── constants/
│   └── nostr.js                      # ✨ NEW: Nostr constants
│
├── routes/
│   ├── auth.js                       # ✨ UPDATED: Enhanced auth
│   ├── health.js
│   ├── client.js
│   ├── admin.js
│   └── payments.js
│
├── public/
│   ├── js/
│   │   ├── nostr-auth.js             # ✨ NEW: Client auth library
│   │   └── jwt-storage.js            # ✨ NEW: Token management
│   │
│   ├── components/
│   │   ├── login-modal.html          # ✨ NEW: Login UI
│   │   └── user-header.html          # ✨ NEW: User header
│   │
│   ├── css/
│   │   └── auth.css                  # ✨ NEW: Auth styles
│   │
│   ├── index.html
│   ├── admin.html
│   └── client.html
│
├── docs/
│   ├── AUTH_IMPLEMENTATION.md        # ✨ NEW: Full implementation guide
│   ├── JWT_TOKENS.md                 # ✨ NEW: Token management
│   ├── SECURITY_BEST_PRACTICES.md   # ✨ NEW: Security guide
│   └── PHASE2_README.md             # ✨ This file
│
└── models/
    └── schema.sql                    # Database schema
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd bitrent-backend
npm install
```

**Note:** Ensure you have these packages:
- express
- jsonwebtoken
- cors
- helmet
- express-rate-limit

### 2. Configure Environment

Create `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# JWT
JWT_SECRET=your-very-long-random-secret-key-minimum-32-characters
JWT_EXPIRY=24h

# Admin
ADMIN_NOSTR_PUBKEY=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789

# API
CORS_ORIGIN=http://localhost:3001
API_BASE_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
```

### 3. Database Setup

```bash
# Run Supabase migrations
npm run migrate

# Or manually execute models/schema.sql in Supabase dashboard
```

### 4. Start Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

**Output:**
```
╔═══════════════════════════════════════════════════════╗
║          BitRent Backend Server                        ║
║          Phase 2: Nostr Authentication                 ║
╚═══════════════════════════════════════════════════════╝

🚀 Server running on port 3000
🌍 Environment: development
📡 CORS Origin: http://localhost:3001
🔐 JWT Secret: ✓ Set
🗄️  Database: ✓ Configured

Available Routes:
- POST   /api/auth/nostr-challenge     Generate challenge
- POST   /api/auth/nostr-verify        Verify signature & login
- GET    /api/auth/profile             Get user profile
- POST   /api/auth/refresh             Refresh token
- POST   /api/auth/logout              Logout

- GET    /api/health/status            Health check
```

## 📖 API Documentation

### Authentication Flow

```
1. User clicks "Login with Nostr"
   ↓
2. Frontend requests challenge from server
   POST /api/auth/nostr-challenge
   ← {challenge, challenge_id, expires_at}
   ↓
3. User selects wallet and signs challenge
   (Challenge is signed by user's wallet)
   ↓
4. Frontend sends signature to server
   POST /api/auth/nostr-verify
   {challenge, signature, pubkey, timestamp}
   ← {token, pubkey, is_admin}
   ↓
5. Token stored in localStorage
   ↓
6. All subsequent requests include token
   Authorization: Bearer <token>
```

### Endpoints

#### POST /api/auth/nostr-challenge

Get a challenge to sign with wallet.

```bash
curl -X POST http://localhost:3000/api/auth/nostr-challenge \
  -H "Content-Type: application/json" \
  -d '{
    "pubkey": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
  }'
```

Response:
```json
{
  "challenge": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
  "challenge_id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2026-03-15T16:05:00.000Z",
  "expires_in": 300
}
```

#### POST /api/auth/nostr-verify

Verify signature and get JWT token.

```bash
curl -X POST http://localhost:3000/api/auth/nostr-verify \
  -H "Content-Type: application/json" \
  -d '{
    "challenge": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
    "signature": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "pubkey": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    "timestamp": 1679088300
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "pubkey": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
  "is_admin": false,
  "expires_in": 86400,
  "expires_at": "2026-03-16T16:00:00.000Z"
}
```

#### GET /api/auth/profile

Get current user profile.

```bash
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Response:
```json
{
  "pubkey": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
  "is_admin": false,
  "created_at": "2026-03-15T14:00:00.000Z"
}
```

#### POST /api/auth/refresh

Refresh access token.

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400,
  "expires_at": "2026-03-16T16:00:00.000Z"
}
```

#### POST /api/auth/logout

Logout current user.

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Response:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## 🔐 Frontend Integration

### 1. Include Scripts

```html
<head>
  <!-- JWT Storage & Auto-Refresh -->
  <script src="/js/jwt-storage.js"></script>
  
  <!-- Nostr Authentication -->
  <script src="/js/nostr-auth.js"></script>
  
  <!-- Authentication Styles -->
  <link rel="stylesheet" href="/css/auth.css">
</head>
```

### 2. Add UI Components

```html
<!-- User Header -->
<div id="header"></div>

<!-- Login Modal -->
<div id="modals"></div>

<script>
  // Load components
  fetch('/components/user-header.html')
    .then(r => r.text())
    .then(html => {
      const div = document.createElement('div');
      div.innerHTML = html;
      document.getElementById('header').appendChild(div);
    });

  fetch('/components/login-modal.html')
    .then(r => r.text())
    .then(html => {
      const div = document.createElement('div');
      div.innerHTML = html;
      document.getElementById('modals').appendChild(div);
    });
</script>
```

### 3. Make Authenticated Requests

```javascript
// Get token
const token = JWTStorage.getAccessToken();

// Make request with authorization
fetch('/api/client/rentals', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log(data));
```

### 4. Listen for Auth Events

```javascript
// Login event
window.addEventListener('nostr:login', (e) => {
  console.log('Logged in:', e.detail.pubkey);
  console.log('Is admin:', e.detail.is_admin);
});

// Logout event
window.addEventListener('nostr:logout', () => {
  console.log('Logged out');
});

// Token expired
window.addEventListener('jwt:expired', () => {
  console.log('Token expired, please login again');
  window.location.href = '/';
});

// Token refreshed
window.addEventListener('jwt:refreshed', () => {
  console.log('Token automatically refreshed');
});
```

## 🛡️ Security Features

### 1. Signature Verification
- ✅ NIP-98 standard compliance
- ✅ Public key format validation (64 hex chars)
- ✅ Signature format validation (128 hex chars)
- ✅ Timestamp freshness check (5 min tolerance)

### 2. Rate Limiting
- ✅ 5 login attempts per 15 minutes per IP
- ✅ 100 API requests per minute per IP  
- ✅ 60 requests per minute per pubkey
- ✅ Automatic cleanup of expired entries

### 3. Token Security
- ✅ HS256 algorithm
- ✅ 24-hour expiration
- ✅ Unique JWT ID (jti)
- ✅ Auto-refresh 5 mins before expiry

### 4. CORS & CSP
- ✅ CORS origin whitelist
- ✅ Content Security Policy headers
- ✅ X-Frame-Options protection
- ✅ Strict-Transport-Security (HTTPS)

### 5. Admin Protection
- ✅ Admin pubkey whitelist
- ✅ Role-based access control (RBAC)
- ✅ Admin-only endpoint protection
- ✅ Admin action logging

## 📚 Documentation

- **[AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md)** - Complete auth implementation guide
- **[JWT_TOKENS.md](./JWT_TOKENS.md)** - JWT token management and lifecycle
- **[SECURITY_BEST_PRACTICES.md](./SECURITY_BEST_PRACTICES.md)** - Security hardening guide

## 🧪 Testing

### Test Login Flow

```javascript
// 1. Get challenge
const challenge = await fetch('/api/auth/nostr-challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pubkey: 'abc...def' })
}).then(r => r.json());

console.log('Challenge:', challenge.challenge);

// 2. Sign (requires actual wallet)
const signature = await window.nostr.signMessage(challenge.challenge);

// 3. Verify
const token = await fetch('/api/auth/nostr-verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    challenge: challenge.challenge,
    signature,
    pubkey: 'abc...def',
    timestamp: Math.floor(Date.now() / 1000)
  })
}).then(r => r.json());

console.log('Token:', token.token);
console.log('Admin:', token.is_admin);

// 4. Get profile
const profile = await fetch('/api/auth/profile', {
  headers: { 'Authorization': `Bearer ${token.token}` }
}).then(r => r.json());

console.log('Profile:', profile);
```

### Test Rate Limiting

```bash
# Try 6 login attempts quickly
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/nostr-challenge \
    -H "Content-Type: application/json" \
    -d '{"pubkey":"abc...def"}'
  echo "Attempt $i"
done

# 6th should return 429 Too Many Requests
```

## 🚨 Troubleshooting

### "No authorization token provided"
- Check `Authorization: Bearer <token>` header format
- Verify token is in localStorage: `localStorage.getItem('bitrent_token')`
- Make sure jwt-storage.js is loaded

### "Invalid signature format"
- Signature must be 128 hex characters
- Check wallet signing method
- Verify challenge is being signed correctly

### "Challenge expired"
- Challenge expires after 5 minutes
- Get new challenge with `/nostr-challenge` endpoint
- Check client clock is synchronized

### "Rate limit exceeded"
- Wait 15 minutes for login limit to reset
- Check rate limiting in `middleware/rateLimit.js`
- Verify IP address is correct (use VPN/proxy carefully)

### Token not auto-refreshing
- Ensure `jwt-storage.js` is loaded before other scripts
- Check browser console for errors
- Verify token refresh endpoint is working

## 📦 Dependencies

**Key packages:**
```json
{
  "express": "^4.18.2",
  "jsonwebtoken": "^9.1.0",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "express-rate-limit": "^7.1.5",
  "joi": "^17.11.0",
  "@supabase/supabase-js": "^2.39.0"
}
```

**Optional for production:**
```json
{
  "@sentry/node": "latest",
  "redis": "latest",
  "prom-client": "latest"
}
```

## 🔄 Upgrade Path

### Phase 2 Enhancements (Upcoming)

1. **httpOnly Cookies** - More secure token storage
2. **Refresh Tokens** - Longer sessions with short-lived access tokens
3. **Token Blacklist** - Instant logout on all devices
4. **2FA** - TOTP or similar additional security
5. **Session Management** - Device tracking and logout from specific devices
6. **Audit Logs** - Complete authentication event logging

## ✅ Checklist

- [x] Nostr signature verification (NIP-98)
- [x] JWT token generation and validation
- [x] Rate limiting for brute-force protection
- [x] Admin role-based access control
- [x] Frontend login modal and authentication
- [x] JWT auto-refresh mechanism
- [x] Security headers (CORS, CSP, etc.)
- [x] Comprehensive documentation
- [ ] httpOnly cookie storage
- [ ] Token revocation/blacklist
- [ ] Multi-factor authentication
- [ ] Audit logging

## 🆘 Support

For issues or questions:
1. Check documentation in `/docs`
2. Review error messages in console/logs
3. Check GitHub issues
4. Contact development team

## 📄 License

MIT

---

**Phase 2 Status:** ✅ Complete
**Next Phase:** Phase 3 - Advanced Features
