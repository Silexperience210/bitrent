# JWT Token Management - Phase 2

## Token Structure

### Access Token

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJwdWJrZXkiOiJhYmNkZWYwMTIzNDU2Nzg5YWJjZGVmMDEyMzQ1Njc4OSIsImlzX2FkbWluIjpmYWxzZSwi
dHlwZSI6ImFjY2VzcyIsImV4cCI6MTY3OTA5MTkwMCwiaWF0IjoxNjc5MDA1NTAwLCJzdWIiOiJhYmNkZWYwMTIz
NDU2Nzg5YWJjZGVmMDEyMzQ1Njc4OSIsImlzcyI6ImJpdHJlbnQiLCJqdGkiOiJhMWIyYzNkNGU1ZjZnN2g4In0.
x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9
```

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "pubkey": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
  "is_admin": false,
  "type": "access",
  "exp": 1679091900,
  "iat": 1679005500,
  "sub": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
  "iss": "bitrent",
  "jti": "a1b2c3d4e5f6g7h8"
}
```

**Claims:**
- `pubkey` - User's Nostr public key (64 hex chars)
- `is_admin` - Admin role flag
- `type` - Token type (access or refresh)
- `exp` - Expiration time (Unix timestamp)
- `iat` - Issued at (Unix timestamp)
- `sub` - Subject (same as pubkey)
- `iss` - Issuer (always "bitrent")
- `jti` - Unique token ID (for revocation)

## Token Lifecycle

### 1. Creation

```javascript
const token = jwtUtils.createAccessToken(pubkey, isAdmin);
// Returns: { token, expiresIn, expiresAt }
```

Expiration: **24 hours** from creation

### 2. Storage (Frontend)

**localStorage:**
```javascript
localStorage.setItem('bitrent_token', token);
```

**Key:** `bitrent_token`

**Security:**
- Not httpOnly (needs to be accessible by JS)
- Not stored in sessionStorage (survives page reload)
- Cleared on logout
- Auto-refresh before expiry

### 3. Transmission

Include in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Verification

```javascript
const decoded = jwtUtils.verifyToken(token);
if (decoded && decoded.pubkey) {
  // Token valid
}
```

### 5. Refresh

30 seconds before expiry:

```javascript
const newToken = await JWTStorage.refreshToken();
```

Endpoint: `POST /api/auth/refresh`

Response:
```json
{
  "token": "eyJ...",
  "expires_in": 86400,
  "expires_at": "2026-03-16T16:00:00Z"
}
```

### 6. Expiration

Token becomes invalid after 24 hours:

```javascript
if (JWTStorage.isTokenExpired(token)) {
  // Redirect to login
}
```

## Token Validation

### Server-Side

```javascript
// In middleware
const decoded = jwt.verify(token, config.jwt.secret);
// Throws if invalid, returns payload if valid
```

**Validation checks:**
1. Signature valid (HS256 with secret)
2. Expiration time not passed
3. Algorithm matches (HS256)
4. Claims are present

### Client-Side

```javascript
// Decode without verification (unsafe)
const decoded = JWTStorage.decodeToken(token);

// Check expiration
const isExpired = JWTStorage.isTokenExpired(token);

// Get time until expiry
const timeLeft = JWTStorage.getTimeUntilExpiry(token);

// Check if needs refresh
if (JWTStorage.needsRefresh(token)) {
  await JWTStorage.refreshToken();
}
```

## Refresh Token (Optional)

For longer-lived sessions and secure refresh:

```javascript
// Create refresh token (30-day expiry)
const refreshToken = jwtUtils.createRefreshToken(pubkey);
// Returns: { token, expiresIn, expiresAt }

// Store separately
localStorage.setItem('bitrent_refresh_token', refreshToken);

// Use to get new access token
const newAccessToken = await refreshWithToken(refreshToken);
```

## Security Considerations

### 1. Secret Management

```env
JWT_SECRET=your-very-long-random-secret-key-at-least-32-characters
```

**Requirements:**
- At least 32 characters
- Cryptographically random
- Never commit to version control
- Rotate regularly in production

### 2. Token Expiration

- Access tokens: **24 hours** (balances security and UX)
- Refresh tokens: **30 days** (optional)

Shorter expiry = more security but more user friction

### 3. Token Storage

**localStorage (current):**
- ✅ Survives page reload
- ✅ Accessible to JavaScript
- ⚠️ Vulnerable to XSS (mitigated by CSP)

**Alternatives:**
- **httpOnly cookies** - More secure, requires backend support
- **sessionStorage** - Lost on tab close
- **Memory only** - Lost on page reload

### 4. Token Transmission

**HTTPS required in production:**
```
https://bitrent.app/api/auth/profile
```

**Not over HTTP:**
```
// DO NOT USE IN PRODUCTION
http://bitrent.app/api/auth/profile
```

### 5. XSS Protection

Prevent JavaScript injection:

```javascript
// CSP Header
Content-Security-Policy: default-src 'self';
```

Mitigates token theft via malicious scripts.

### 6. CSRF Protection

Not needed for token-based auth (only cookie-based).

## Token Revocation

### Strategy 1: Blacklist (Simple)

```javascript
// On logout, add to blacklist
const blacklist = new Set();
blacklist.add(token);

// On verify
if (blacklist.has(token)) {
  reject();
}
```

**Pros:** Simple
**Cons:** Requires server memory, doesn't scale

### Strategy 2: Database Lookup (Scalable)

```javascript
// On logout
db.token_blacklist.insert({ jti: token.jti });

// On verify
const isBlacklisted = await db.token_blacklist.findOne({ jti });
if (isBlacklisted) reject();
```

**Pros:** Scalable, persistent
**Cons:** Extra database query

### Strategy 3: Short Expiry (Current)

```
Access token: 24 hours (expires naturally)
Refresh token: 30 days (for longer sessions)
```

**Pros:** No revocation needed, automatic expiry
**Cons:** Compromised token valid until expiry

## Debugging

### Get Token Info

```javascript
const info = JWTStorage.getTokenInfo();
console.log(info);

// Output:
{
  hasToken: true,
  pubkey: "abcd...",
  is_admin: false,
  issued_at: Date,
  expires_at: Date,
  time_left_seconds: 80000,
  is_expired: false,
  needs_refresh: false
}
```

### Decode Token (Unsafe)

```javascript
const decoded = JWTStorage.decodeToken(token);
console.log(decoded);

// Output:
{
  header: { alg: "HS256", typ: "JWT" },
  payload: {
    pubkey: "...",
    is_admin: false,
    ...
  },
  signature: "x1y2z3..."
}
```

### Check Token Status

```javascript
// Is expired?
console.log(JWTStorage.isTokenExpired(token));

// Time until expiry
console.log(JWTStorage.getTimeUntilExpiry(token), 'seconds');

// Needs refresh?
console.log(JWTStorage.needsRefresh(token));
```

## Common Issues

### "Invalid token"

**Causes:**
1. Token malformed (missing parts)
2. Secret changed (server restarted)
3. Token corrupted (transmission issue)

**Fix:**
- Request new token via login
- Check server logs for secret

### "Token expired"

**Causes:**
1. Token older than 24 hours
2. Clock skew (server and client times differ)

**Fix:**
- Request new token
- Refresh 5 mins before expiry (auto-handled)

### "No authorization token provided"

**Causes:**
1. Missing Authorization header
2. Wrong format (not "Bearer ...")
3. Token not stored in localStorage

**Fix:**
```javascript
// Check token storage
const token = localStorage.getItem('bitrent_token');
console.log('Token:', token ? 'Found' : 'Missing');

// Check header format
headers: { 'Authorization': `Bearer ${token}` }
```

### Auto-refresh not working

**Causes:**
1. `jwt-storage.js` not loaded
2. Token in sessionStorage instead of localStorage
3. Browser console errors

**Fix:**
```html
<!-- Include BEFORE other scripts -->
<script src="/js/jwt-storage.js"></script>

<!-- Check for errors -->
<script>
  console.log(JWTStorage.getTokenInfo());
</script>
```

## Production Checklist

- [ ] JWT_SECRET is random and 32+ characters
- [ ] HTTPS enabled everywhere
- [ ] CORS whitelist configured
- [ ] CSP headers set
- [ ] Token refresh working
- [ ] httpOnly cookies considered for production
- [ ] Token revocation strategy decided
- [ ] Expiration times appropriate
- [ ] Logging and monitoring in place
- [ ] Rate limiting configured
