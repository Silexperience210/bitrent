# Security Best Practices - Phase 2

## Authentication Security

### 1. Password-Less Authentication

✅ **Implemented:** Nostr signatures instead of passwords

**Benefits:**
- No passwords to lose or steal
- Users already have wallet private keys
- Decentralized identity verification

**Security:**
- Private keys never leave user's wallet
- Only public key transmitted
- Signature proves key ownership

### 2. Challenge-Response Protocol

✅ **Implemented:** 5-minute expiring challenges

**Process:**
```
1. Server generates random challenge
2. User signs with private key
3. Server verifies signature
4. Server checks challenge timestamp
5. Server invalidates challenge after use
```

**Security:**
- Prevents replay attacks
- Time-bound validity
- One-time use only

### 3. Signature Verification

✅ **Implemented:** Format validation and timestamp freshness

**Checks:**
- Pubkey format: 64 hex characters
- Signature format: 128 hex characters  
- Timestamp within 5 minutes of now
- Challenge not expired (5 min max)

**Code:**
```javascript
// Validate pubkey (64 hex chars)
const validPubkey = /^[0-9a-f]{64}$/i.test(pubkey);

// Validate signature (128 hex chars)  
const validSig = /^[0-9a-f]{128}$/i.test(signature);

// Check timestamp freshness
const age = Math.abs(Date.now() / 1000 - timestamp);
const valid = age < 300; // 5 minutes
```

## Token Security

### 1. JWT Configuration

✅ **Implemented:** HS256 with secure settings

**Token Details:**
- Algorithm: HS256 (HMAC SHA-256)
- Secret: 32+ character random string
- Expiration: 24 hours
- Unique JWT ID (jti) for revocation

### 2. Token Storage

🔄 **Current:** localStorage
⚠️ **Note:** XSS protection required

**Frontend Security:**
```javascript
// Secure storage
localStorage.setItem('bitrent_token', token);

// Exclude sensitive data
// Don't store password, private keys, etc.

// Clear on logout
localStorage.removeItem('bitrent_token');
```

**Production Upgrade:**
Use httpOnly cookies instead:
```javascript
// Server: Set httpOnly cookie
res.cookie('token', token, {
  httpOnly: true,  // Not accessible via JavaScript
  secure: true,    // Only over HTTPS
  sameSite: 'strict' // CSRF protection
});
```

### 3. Token Transmission

✅ **Implemented:** Authorization header with Bearer scheme

**Correct:**
```
Authorization: Bearer eyJhbGc...
```

**Never:**
```
// DON'T: Query parameters (logged in URLs)
?token=eyJhbGc...

// DON'T: Cookies for XSS-vulnerable apps
cookie: token=eyJhbGc...
```

### 4. Token Refresh

✅ **Implemented:** Auto-refresh before expiration

**Strategy:**
```javascript
// Refresh 5 minutes before expiry
if (timeLeft < 300) {
  await refreshToken();
}

// Check every 60 seconds
setInterval(checkAndRefresh, 60000);
```

**Benefits:**
- Shorter valid token window
- Less damage if token compromised
- User stays logged in longer

### 5. Token Revocation

⚠️ **Not yet implemented:** Consider for production

**Options:**

**Option 1: Simple Logout (Current)**
```javascript
// Token becomes invalid after 24h naturally
// Clear localStorage on logout
localStorage.removeItem('bitrent_token');
```

**Option 2: Blacklist (Recommended)**
```sql
CREATE TABLE token_blacklist (
  jti VARCHAR(255) PRIMARY KEY,
  expires_at TIMESTAMP
);

-- On logout, add token's jti
INSERT INTO token_blacklist VALUES ('jti-value', expires_at);

-- Check on every request
SELECT COUNT(*) FROM token_blacklist WHERE jti = ?;
```

**Option 3: Device Management**
```
Allow users to see active devices
Logout from specific devices
Logout from all devices
```

## Rate Limiting & DDoS Protection

### 1. Login Rate Limiting

✅ **Implemented:** 5 attempts per 15 minutes per IP

```javascript
const limit = 5;
const windowMs = 15 * 60 * 1000; // 15 minutes

// Blocks brute-force attacks
// Exponential backoff possible
```

### 2. API Rate Limiting

✅ **Implemented:** 100 requests per minute per IP

```javascript
const limit = 100;
const windowMs = 60 * 1000; // 1 minute

// Prevents DDoS attacks
// Fair usage policy
```

### 3. Pubkey Rate Limiting

✅ **Implemented:** 60 requests per minute per pubkey

```javascript
const limit = 60;
const windowMs = 60 * 1000; // 1 minute

// Prevents single account abuse
// Per-user rate limiting
```

### 4. Cleanup Strategy

✅ **Implemented:** Auto-cleanup every 5 minutes

```javascript
// Remove entries older than 30 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);

// Keeps memory usage bounded
// Prevents unbounded growth
```

**Production Note:** Use Redis instead:
```javascript
const redis = require('redis');
const client = redis.createClient();

// Automatic expiration
client.setex(`ratelimit:${key}`, 900, count);
```

## CORS & CSP

### 1. CORS Whitelist

✅ **Implemented:** Configurable origin

```env
CORS_ORIGIN=http://localhost:3001
```

**Server Configuration:**
```javascript
app.use(cors({
  origin: config.api.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Production:**
```env
CORS_ORIGIN=https://bitrent.app
```

### 2. Content Security Policy (CSP)

✅ **Implemented:** Helmet.js CSP headers

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'https:'],
      connectSrc: ["'self'", 'wss:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
    }
  }
}));
```

**Benefits:**
- Prevents XSS attacks
- Blocks inline scripts
- Controls resource loading

### 3. Other Security Headers

✅ **Implemented:** Helmet.js defaults

```
X-Frame-Options: DENY               // Clickjacking protection
X-Content-Type-Options: nosniff     // MIME sniffing protection
Referrer-Policy: strict-origin      // Privacy protection
Strict-Transport-Security: max-age  // HTTPS enforcement
```

## Database Security

### 1. Row Level Security (RLS)

✅ **Implemented:** Supabase RLS policies

**Users Table:**
```sql
-- Can only view own profile
CREATE POLICY users_view_own ON users
  FOR SELECT USING (pubkey = auth.uid()::text OR is_admin = TRUE);
```

**Rentals Table:**
```sql
-- Can only view own rentals
CREATE POLICY rentals_view_own ON rentals
  FOR SELECT USING (
    user_pubkey = auth.uid()::text OR is_admin = TRUE
  );
```

### 2. Challenge Expiration

✅ **Implemented:** Auto-cleanup function

```sql
-- Challenges expire after 5 minutes
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM challenges WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

### 3. Connection Security

**Development:**
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

**Production:**
- Use service role key for backend only
- Protect .env files
- Rotate keys periodically
- Use environment secrets manager

## XSS Prevention

### 1. Input Validation

✅ **Implemented:** Joi schemas

```javascript
const schema = Joi.object({
  pubkey: Joi.string().hex().length(64).required(),
  signature: Joi.string().hex().length(128).required(),
});
```

### 2. Output Encoding

✅ **Recommended:** In frontend templates

```html
<!-- Vue/React auto-escapes -->
<span>{{ pubkey }}</span>

<!-- Never use innerHTML for user data -->
<!-- ❌ DON'T: element.innerHTML = userInput; -->
<!-- ✅ DO: element.textContent = userInput; -->
```

### 3. CSP Headers

✅ **Implemented:** Strict CSP

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
```

Prevents inline script execution.

## Admin Security

### 1. Admin Detection

✅ **Implemented:** Pubkey whitelist check

```env
ADMIN_NOSTR_PUBKEY=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789
```

**Verification:**
```javascript
if (pubkey !== config.admin.nostrPubkey) {
  return res.status(403).json({ error: 'Admin required' });
}
```

### 2. Admin Routes Protection

✅ **Implemented:** Admin middleware

```javascript
router.get('/admin/users', requireAdmin, async (req, res) => {
  // Only admins can access
});
```

### 3. Audit Logging

⚠️ **Not yet implemented:** Add for production

```javascript
// Log all admin actions
db.audit_logs.insert({
  admin_pubkey: req.user.pubkey,
  action: 'user_created',
  target: user.pubkey,
  timestamp: new Date()
});
```

## Monitoring & Logging

### 1. Error Logging

✅ **Implemented:** Console logging with [TAG]

```javascript
console.error('[AUTH] Signature verification failed');
console.log('[ADMIN] User deleted:', pubkey);
```

**Production:** Use Sentry or similar

```javascript
import * as Sentry from "@sentry/node";
Sentry.captureException(error);
```

### 2. Security Logging

⚠️ **Recommended:** Log security events

```javascript
// Log failed login attempts
db.security_logs.insert({
  event: 'failed_login',
  ip: getClientIP(req),
  pubkey: body.pubkey,
  timestamp: new Date()
});
```

### 3. Monitoring Alerts

**Set up alerts for:**
- Failed login attempts (> 10 in 1 hour)
- Admin actions
- Unusual rate limiting hits
- Token verification failures

## Development Best Practices

### 1. Secure Configuration

```env
# Never commit secrets
JWT_SECRET=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

**Use .env.example:**
```env
# .env.example
JWT_SECRET=your-secret-here
SUPABASE_SERVICE_ROLE_KEY=your-key-here
```

### 2. Dependency Management

```bash
# Regular updates
npm audit
npm update
npm audit fix
```

**Check for vulnerabilities:**
- GitHub dependabot
- npm audit
- Snyk

### 3. Code Review

- Review all auth changes
- Test edge cases
- Security-focused review
- Penetration testing before release

## Deployment Checklist

- [ ] HTTPS enabled
- [ ] JWT_SECRET is random 32+ chars
- [ ] CORS_ORIGIN set to production domain
- [ ] Environment variables in secure vault
- [ ] Database backups configured
- [ ] Rate limiting working
- [ ] Security headers present
- [ ] HSTS enabled
- [ ] CSP headers strict
- [ ] Monitoring/logging configured
- [ ] Admin key configured
- [ ] SSL certificate valid
- [ ] httpOnly cookies (if using)
- [ ] Session timeout configured
- [ ] Audit logging enabled

## Incident Response

### If Private Key Compromised

1. Create new admin account with new key
2. Log all admin actions
3. Audit user accounts for suspicious activity
4. Notify users of breach
5. Implement additional security (2FA)

### If JWT Secret Leaked

1. Generate new secret immediately
2. All existing tokens become invalid
3. Users must re-login
4. Review token usage in logs
5. Rotate secret regularly

### If Database Breached

1. Shutdown services
2. Analyze breach scope
3. Reset all JWT secrets
4. Force all users to re-login
5. Notify affected users
6. Implement additional protections

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [NIP-98: HTTP Auth](https://github.com/nostr-protocol/nips/blob/master/98.md)
- [Helmet.js Documentation](https://helmetjs.github.io/)
