# BitRent Phase 2 - Quick Start Guide

## 🚀 Start Here (5 minutes)

### 1. Copy Environment File
```bash
cp .env.example .env
```

### 2. Edit `.env` with your values:
```env
PORT=3000
NODE_ENV=development

# Get from Supabase dashboard
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Generate a long random string
JWT_SECRET=your-very-long-random-secret-key-at-least-32-characters

# Your Nostr pubkey (for admin)
ADMIN_NOSTR_PUBKEY=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789

# Frontend URL
CORS_ORIGIN=http://localhost:3001
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Database (in Supabase)
Copy and run the SQL from `models/schema.sql` in your Supabase SQL editor.

### 5. Start Server
```bash
npm run dev
```

Output should show:
```
🚀 Server running on port 3000
📡 CORS Origin: http://localhost:3001
🔐 JWT Secret: ✓ Set
🗄️  Database: ✓ Configured
```

---

## 🔐 Test Authentication (Postman/curl)

### Step 1: Get Challenge
```bash
curl -X POST http://localhost:3000/api/auth/nostr-challenge \
  -H "Content-Type: application/json" \
  -d '{"pubkey":"abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"}'
```

**Response:**
```json
{
  "challenge": "a1b2c3d4...",
  "challenge_id": "uuid-here",
  "expires_at": "2026-03-15T16:05:00Z"
}
```

### Step 2: Get Signature (needs real wallet or test simulation)
```javascript
// In browser console with Alby installed:
const sig = await window.nostr.signMessage("a1b2c3d4...");
console.log(sig);
```

### Step 3: Verify & Get Token
```bash
curl -X POST http://localhost:3000/api/auth/nostr-verify \
  -H "Content-Type: application/json" \
  -d '{
    "challenge": "a1b2c3d4...",
    "signature": "1234abcd...",
    "pubkey": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    "timestamp": '$(date +%s)'
  }'
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "pubkey": "abcdef...",
  "is_admin": false
}
```

### Step 4: Use Token
```bash
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## 🎨 Frontend Integration (5 minutes)

### 1. Add to HTML
```html
<head>
  <link rel="stylesheet" href="/css/auth.css">
  <script src="/js/jwt-storage.js"></script>
  <script src="/js/nostr-auth.js"></script>
</head>

<body>
  <!-- User Header -->
  <div id="app-header"></div>
  
  <!-- Login Modal -->
  <div id="app-modals"></div>
  
  <!-- Your content -->
  <main>...</main>

  <script>
    // Load components
    fetch('/components/user-header.html')
      .then(r => r.text())
      .then(html => document.getElementById('app-header').innerHTML = html);

    fetch('/components/login-modal.html')
      .then(r => r.text())
      .then(html => document.getElementById('app-modals').innerHTML = html);
  </script>
</body>
```

### 2. Make Authenticated Requests
```javascript
// Get token
const token = JWTStorage.getAccessToken();

// Make request
fetch('/api/client/rentals', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log(data));
```

### 3. Listen for Auth Events
```javascript
// When user logs in
window.addEventListener('nostr:login', (e) => {
  console.log('Logged in:', e.detail.pubkey);
  // Update UI, redirect, etc.
});

// When user logs out
window.addEventListener('nostr:logout', () => {
  console.log('Logged out');
});
```

---

## 📁 Key Files to Know

### Backend Auth
- `routes/auth.js` - Main authentication endpoints
- `services/nostr-auth.js` - Signature verification
- `middleware/requireAuth.js` - JWT validation
- `middleware/requireAdmin.js` - Admin checking
- `middleware/rateLimit.js` - Rate limiting

### Frontend Auth
- `public/js/nostr-auth.js` - Login/logout logic
- `public/js/jwt-storage.js` - Token management
- `public/components/login-modal.html` - UI
- `public/css/auth.css` - Styling

### Documentation
- `docs/PHASE2_README.md` - Complete guide
- `docs/AUTH_IMPLEMENTATION.md` - Architecture
- `docs/JWT_TOKENS.md` - Token details
- `docs/SECURITY_BEST_PRACTICES.md` - Security

---

## ✅ Admin Setup

### 1. Get Your Pubkey
Install Alby or a Nostr wallet and get your public key (64 hex chars)

### 2. Set Admin Key
```env
ADMIN_NOSTR_PUBKEY=your_actual_pubkey_here
```

### 3. Login & Check
```javascript
// After logging in, check admin status:
const info = JWTStorage.getTokenInfo();
console.log(info.is_admin); // Should be true
```

### 4. Access Admin Routes
```javascript
// Now /api/admin routes work:
const response = await fetch('/api/admin/miners', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## 🐛 Troubleshooting

### "No authorization token provided"
```javascript
// Check token exists
const token = localStorage.getItem('bitrent_token');
console.log(token ? 'Found' : 'Missing'); // Should be 'Found'

// Check header format
headers: { 'Authorization': `Bearer ${token}` }
```

### "Challenge expired"
- Challenge expires after 5 minutes
- Request new challenge
- Check server time

### "Rate limit exceeded"
- Wait 15 minutes for login limit
- Check your IP (VPN might look like spam)

### Token not auto-refreshing
- Check `jwt-storage.js` is loaded
- Check browser console for errors
- Token must have > 5 mins left

---

## 🔐 Security Checklist

Before going to production:

- [ ] JWT_SECRET is random (32+ chars)
- [ ] HTTPS enabled (production only)
- [ ] CORS_ORIGIN set to your domain
- [ ] Admin pubkey configured
- [ ] Database backups enabled
- [ ] Rate limiting tested
- [ ] Security headers verified
- [ ] Environment variables in secure vault

---

## 📚 Learn More

- **Full API Docs:** `docs/AUTH_IMPLEMENTATION.md`
- **Token Details:** `docs/JWT_TOKENS.md`
- **Security Guide:** `docs/SECURITY_BEST_PRACTICES.md`
- **Complete Overview:** `docs/PHASE2_README.md`

---

## 🚀 Next Steps

1. ✅ Get it running locally
2. ✅ Test authentication flow
3. ✅ Integrate with your frontend
4. ✅ Set up admin account
5. ✅ Deploy to production
6. ✅ Configure monitoring
7. ✅ Set up backups

---

## 💡 Pro Tips

### Debugging
```javascript
// See all token info
console.log(JWTStorage.getTokenInfo());

// Check if logged in
console.log(JWTStorage.hasToken()); // true/false

// Get your pubkey
console.log(JWTStorage.getPubkey());

// Check if admin
console.log(JWTStorage.isAdmin()); // true/false
```

### Common Curl Commands
```bash
# Get challenge
curl -X POST http://localhost:3000/api/auth/nostr-challenge \
  -H "Content-Type: application/json" \
  -d '{"pubkey":"abc..."}'

# Get profile (replace TOKEN)
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer TOKEN"

# Refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Authorization: Bearer TOKEN"

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer TOKEN"
```

### JavaScript Shortcuts
```javascript
// Store token from login response
JWTStorage.setAccessToken(response.token);

// Get token for requests
const token = JWTStorage.getAccessToken();

// Check if expired
if (JWTStorage.isTokenExpired(token)) {
  window.location.href = '/';
}

// Manual refresh
const newToken = await JWTStorage.refreshToken();
```

---

## 🆘 Still Stuck?

1. Check server logs (`npm run dev` output)
2. Check browser console (F12 → Console)
3. Read the full docs in `docs/`
4. Check troubleshooting section in `docs/PHASE2_README.md`

---

**Ready to go!** 🎉
