# Nostr Login (NIP-98) Guide

This guide explains how Nostr authentication works in BitRent.

## Overview

BitRent uses **NIP-98** (HTTP Auth) for authentication:

1. User's Nostr wallet signs a challenge
2. Backend verifies the signature
3. JWT token issued for authenticated requests
4. Tokens automatically refresh before expiry

## Supported Wallets

| Wallet | Type | Support | Notes |
|--------|------|---------|-------|
| **Alby** | Browser Extension | ✅ Full | Recommended. Easy setup. |
| **NIP-07** | Browser Extension | ✅ Full | Generic extension support. |
| **NIP-46** | Remote Signer | 🚧 Planned | Mobile wallet support. |

## Authentication Flow (NIP-98)

```
User                 Frontend             Backend              Wallet
 │                      │                    │                  │
 │ 1. Click Login      │                    │                  │
 │──────────────────→  │                    │                  │
 │                      │ 2. Get pubkey     │                  │
 │                      │───────────────────────────────────→ │
 │                      │ ←─────────────────────────────────  │
 │                      │                   │                pubkey
 │                      │ 3. Request challenge                │
 │                      │────────────────→  │                │
 │                      │                   │                │
 │                      │   ←────────────────────────────    │
 │                      │      challenge                      │
 │                      │ 4. Sign challenge │                │
 │                      │───────────────────────────────────→ │
 │                      │                   │             sign(challenge)
 │                      │                   │ ←─────────────── │
 │                      │      5. Verify signature            │
 │                      │────────────────→  │                │
 │                      │                   │                │
 │                      │   ←────────────────────────────    │
 │                      │        JWT Token                    │
 │ Redirect           │                    │                │
 │ to dashboard  ←────│                    │                │
```

## Implementation Details

### 1. Get User's Public Key

```javascript
// Alby / NIP-07
const pubkey = await window.nostr.getPublicKey();

// Frontend code
const wallet = await auth.getWallet('alby');
const pubkey = await wallet.getPublicKey();
```

**What happens:**
- Browser asks for wallet permission
- Wallet displays "Allow pubkey access?" dialog
- User clicks "Allow"
- Wallet returns public key (64 hex characters)

---

### 2. Request Challenge from Backend

```
POST /api/auth/challenge
Content-Type: application/json

{
  "pubkey": "abc123def456..."
}
```

**Response:**
```json
{
  "challenge": "random-challenge-string-32-chars"
}
```

**Frontend code:**
```javascript
const response = await api.post('/api/auth/challenge', { pubkey });
const challenge = response.challenge;
```

**Why?** Challenge prevents replay attacks. Each login gets new challenge.

---

### 3. Create Authentication Event (NIP-98 Event)

```javascript
// NIP-98 specifies event kind 27235
const event = {
  kind: 27235,                              // HTTP Auth
  created_at: Math.floor(Date.now() / 1000), // Timestamp
  tags: [
    ['u', 'https://api.bitrent.dev/api/auth/verify'],  // Request URL
    ['method', 'POST']                      // HTTP method
  ],
  content: challenge,                       // Challenge to sign
  pubkey: pubkey                            // User's public key
};
```

**Frontend code:**
```javascript
const event = {
  kind: 27235,
  created_at: Math.floor(Date.now() / 1000),
  tags: [
    ['u', window.location.origin + '/api/auth/verify'],
    ['method', 'POST']
  ],
  content: challenge
};
```

---

### 4. Sign Event with Wallet

```javascript
// Wallet signs the event
const signedEvent = await window.nostr.signEvent(event);

// Now includes 'sig' field
console.log(signedEvent.sig); // "abc123..."
```

**What happens:**
- Browser asks wallet to sign
- Wallet shows "Sign with your key?" dialog
- User clicks "Sign"
- Wallet returns signed event with signature

**Frontend code:**
```javascript
const signed = await wallet.signEvent(event);
const signature = signed.sig;
```

---

### 5. Verify Signature with Backend

```
POST /api/auth/verify
Content-Type: application/json

{
  "pubkey": "abc123...",
  "challenge": "random-challenge",
  "signature": "signed-event-signature"
}
```

**Backend validates:**
1. Challenge matches (not expired, not reused)
2. Signature is valid for this pubkey
3. Event kind is 27235 (HTTP Auth)
4. Event timestamp is recent (±5 min)

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "pubkey": "abc123...",
    "role": "user|admin",
    "name": "satoshi",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Frontend code:**
```javascript
const result = await api.post('/api/auth/verify', {
  pubkey,
  challenge,
  signature
});

api.setToken(result.token);  // Store JWT
```

---

## JWT Token Structure

The returned JWT has 3 parts: `header.payload.signature`

**Payload (decoded):**
```json
{
  "pubkey": "abc123def456...",
  "role": "user",
  "iat": 1704067200,   // Issued at
  "exp": 1704153600    // Expires in 24 hours
}
```

**Frontend can decode:**
```javascript
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload.pubkey);  // User's public key
console.log(payload.role);    // "user" or "admin"
console.log(payload.exp);     // Expiry timestamp
```

---

## Token Refresh

Tokens expire after 24 hours. Frontend handles refresh automatically:

```javascript
// Before expiry, refresh token
POST /api/auth/refresh
Authorization: Bearer {old-token}

Response:
{
  "token": "new-jwt-token"
}
```

**Frontend code:**
```javascript
// Automatic - happens every 12 hours
auth.scheduleTokenRefresh();

// Or manual
await auth.refreshToken();

// Check if expiring soon (< 1 hour)
if (auth.isTokenExpiringSoon()) {
  await auth.refreshToken();
}
```

---

## Session Management

### Check Authentication

```javascript
// Is user logged in?
if (auth.isAuthenticated()) {
  console.log('User is logged in');
}

// Is token still valid?
if (api.isTokenValid()) {
  console.log('Token is valid');
}
```

### Get User Info

```javascript
// From JWT
const user = api.getCurrentUser();
// { pubkey, role, iat, exp }

// From auth manager
const session = auth.getSession();
// { pubkey, wallet, user, isAdmin, tokenExpiresAt }
```

### Logout

```javascript
// Clear token and redirect to login
auth.logout();

// Clears:
// - localStorage JWT
// - localStorage pubkey
// - localStorage user data
// - Cancels token refresh timer
```

---

## Error Handling

### Common Login Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Wallet not found" | No extension installed | Install Alby or NIP-07 |
| "User rejected" | User clicked "Deny" | User needs to approve |
| "Invalid signature" | Wallet signing failed | Try again |
| "Challenge expired" | Took too long | Start over |
| "Role not authorized" | User is not admin | Use regular account |

**Frontend handling:**

```javascript
try {
  const result = await auth.login('alby');
} catch (error) {
  // error.message - user friendly error
  // error.data - detailed error info
  
  Utils.showError(error.message);
  
  // Retry or show options
}
```

---

## Testing

### Manual Testing

1. **Install Alby**
   - Go to https://getalby.com
   - Click "Install Extension"
   - Create account or import key

2. **Create Test Account**
   - In Alby, generate new key
   - Note the pubkey

3. **Test Login**
   - Go to http://localhost:8000
   - Click "Login with Nostr"
   - Select "Alby"
   - Approve permissions
   - Click "Sign"

4. **Verify**
   - Check localStorage has JWT
   - See user dashboard

### Automated Testing

```javascript
// In console
const result = await auth.login('alby');
console.log(result); // { success: true, pubkey, user, role }

// Check auth state
console.log(auth.getSession());

// Check token
console.log(api.isTokenValid());

// Simulate logout
auth.logout();
```

---

## Debugging

### Enable Debug Mode

```javascript
// In config.js or localStorage
localStorage.setItem('debug_mode', 'true');
```

**Logs all:**
- Auth challenges
- Signing requests
- Token refresh
- Session changes

### Check Wallet Connection

```javascript
// In browser console
window.nostr                    // Should exist
window.nostr.getPublicKey()    // Should return pubkey
window.nostr.signEvent(event)  // Should sign event
```

### Verify JWT Token

```javascript
// Decode JWT
const token = localStorage.getItem('bitrent_jwt');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload);

// Check expiry
const expiryTime = new Date(payload.exp * 1000);
console.log('Expires:', expiryTime);
console.log('Hours remaining:', (expiryTime - Date.now()) / (1000 * 60 * 60));
```

### Backend Verification

```bash
# Get challenge (curl)
curl -X POST http://localhost:3000/api/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"pubkey":"abc123..."}'

# Verify signature
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "pubkey":"abc123...",
    "challenge":"xyz...",
    "signature":"sig..."
  }'
```

---

## Security Considerations

### ✅ What's Secure

- Public key is public (no secret)
- Challenge is unique per login (prevents replay)
- Signature proves key ownership
- JWT stored in localStorage (cleared on logout)
- Tokens expire after 24 hours
- Backend validates all signatures

### ⚠️ What to Watch

- Keep JWT in localStorage (not in URL)
- Never share wallet's private key
- Don't store passwords (use Nostr keys instead)
- Use HTTPS in production only
- Validate JWT signature on backend
- Check token hasn't expired

### 🔐 Best Practices

1. **Never ask for private key** - Only need public key
2. **Always validate signatures** - Don't trust client
3. **Use HTTPS always** - In production
4. **Refresh tokens early** - Before expiry
5. **Logout on suspicious activity** - Extra security

---

## NIP-98 Standard

This implementation follows [NIP-98](https://github.com/nostr-protocol/nips/blob/master/98.md):

```
HTTP Auth Event (kind 27235)

tags:
  ["u", <request url>]        // Full URL of request
  ["method", <request method>] // GET, POST, PUT, DELETE

content: <challenge>          // Challenge from server

Signed by user's private key
```

**Why NIP-98?**
- Proven security model
- Widely supported
- Built for HTTP authentication
- No passwords needed

---

## FAQ

**Q: Why use Nostr instead of passwords?**
A: No password storage, no databases to hack, user controls their key.

**Q: Can I use the same account everywhere?**
A: Yes! Same Nostr public key works on any NIP-98 app.

**Q: What if I lose my Nostr key?**
A: Back up your seed phrase in Alby. Lost keys = lost accounts.

**Q: Is my pubkey private?**
A: No. It's public and identifies you. Your private key is secret.

**Q: How does wallet signing work?**
A: Wallet never shares private key. It signs locally and returns signature.

**Q: What if challenge expires?**
A: Start login over. Frontend gets new challenge.

---

## Resources

- [NIP-98 Spec](https://github.com/nostr-protocol/nips/blob/master/98.md)
- [Alby Docs](https://github.com/getAlby/alby)
- [Nostr Protocol](https://nostr.com)
- [NIP-07 (Extension API)](https://github.com/nostr-protocol/nips/blob/master/07.md)

---

**Questions?** Check FRONTEND_SETUP.md or contact support.
