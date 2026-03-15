# BitRent Vercel - Quick Start (5 minutes)

Fast track to getting BitRent running on Vercel.

## 🚀 TL;DR - Deploy in 5 Steps

### 1. Install & Test Locally

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
npm run dev
curl http://localhost:3000/api/health  # Should return 200
```

### 2. Push to GitHub

```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

### 3. Deploy on Vercel

Visit [vercel.com](https://vercel.com):
1. Click "New Project"
2. Select your GitHub repo
3. Click "Deploy"

### 4. Add Environment Variables

In Vercel dashboard, go to Settings → Environment Variables and add:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=YOUR_ANON_KEY
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=24h
ADMIN_NOSTR_PUBKEY=your-pubkey
NWC_WALLET_PUB=wallet-pubkey
NWC_CONNECTION_SECRET=secret
CORS_ORIGIN=https://bitrent-XXXXX.vercel.app,http://localhost:3000
```

### 5. Redeploy & Test

1. In Vercel, click "Deployments" → Latest → "Redeploy"
2. Wait 1 minute for deployment
3. Test:

```bash
curl https://bitrent-XXXXX.vercel.app/api/health
```

✅ **Done! Your backend is live.** 🎉

---

## 🏃 Commands Cheat Sheet

```bash
# Local development
npm run dev

# Run tests
npm test

# Build for production
npm run build

# View logs (via Vercel CLI)
vercel logs

# Deploy with Vercel CLI
vercel
```

---

## 📁 Project Structure (Important Files)

```
api/              ← Your API endpoints (auto-deployed)
lib/              ← Shared utilities
public/           ← Frontend static files
vercel.json       ← Vercel configuration
.env.example      ← Environment template
package.json      ← Dependencies
```

---

## 🔑 Key Files Created

| File | Purpose |
|------|---------|
| `api/auth/*.js` | Login, token refresh, profile |
| `api/admin/*.js` | Miner management, stats |
| `api/client/*.js` | User rentals, browse mineurs |
| `api/payments/verify.js` | Payment verification |
| `lib/supabase.js` | Database helper |
| `lib/jwt.js` | Token management |
| `lib/cors.js` | CORS handler |
| `public/js/api-client.js` | Frontend API client |

---

## ✅ Endpoints at a Glance

### Auth (No token needed for challenge)
```
POST   /api/auth/challenge              Get auth challenge
POST   /api/auth/verify                 Verify signature & login
GET    /api/auth/profile                Get logged-in user
POST   /api/auth/refresh                Refresh JWT token
POST   /api/auth/logout                 Logout
```

### Client (Token required)
```
GET    /api/client/mineurs              Browse available miners
POST   /api/client/rentals              Create rental
GET    /api/client/rentals              Get my rentals
GET    /api/client/rentals/:id          Rental details
PUT    /api/client/rentals/:id          Update rental
DELETE /api/client/rentals/:id          Cancel rental
```

### Payments (Token required)
```
POST   /api/payments/verify             Verify payment & activate
```

### Admin (Token + admin role required)
```
GET    /api/admin/mineurs               List all miners
POST   /api/admin/mineurs               Create miner
PUT    /api/admin/mineurs/:id           Update miner
DELETE /api/admin/mineurs/:id           Delete miner
GET    /api/admin/stats                 Platform statistics
```

### Health (No token needed)
```
GET    /api/health                      Status check
```

---

## 🔧 Frontend Integration

The frontend uses the updated API client:

```javascript
import apiClient from './public/js/api-client.js';

// Get mineurs
const mineurs = await apiClient.getAvailableMiners();

// Create rental
const rental = await apiClient.createRental(minerId, 24);

// Admin stats
const stats = await apiClient.getPlatformStats();
```

All URLs automatically use `/api/` endpoints.

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| `404 Not Found` | Check endpoint path matches `api/` structure |
| `401 Unauthorized` | Add `Authorization: Bearer TOKEN` header |
| `403 Forbidden` | Verify admin role or ownership |
| CORS error | Add domain to `CORS_ORIGIN` env var |
| Database connection error | Check `SUPABASE_URL` and `SUPABASE_KEY` |
| Cold start slow | Normal on first request, <1s afterwards |

---

## 📊 Cost Breakdown

| Item | Cost |
|------|------|
| Vercel (API Routes + hosting) | **$0** ✅ |
| Supabase (free tier) | **$0** ✅ |
| Domain (optional) | **$0-12/year** |
| **Total** | **$0/month** 🎉 |

---

## 🎓 Next Steps

1. **Test all endpoints** - Use the endpoints list above
2. **Setup custom domain** - [Vercel docs](https://vercel.com/docs/custom-domains)
3. **Enable analytics** - Vercel → Analytics tab
4. **Setup monitoring** - Vercel alerts for errors
5. **Optimize database** - Add indexes in Supabase

---

## 📚 Full Documentation

- **Detailed setup:** [DEPLOYMENT_VERCEL.md](./DEPLOYMENT_VERCEL.md)
- **Architecture:** [VERCEL_MIGRATION.md](./VERCEL_MIGRATION.md)
- **API reference:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## 💬 Need Help?

Check:
1. `vercel logs` - See function logs
2. Vercel dashboard - Check deployment status
3. Supabase dashboard - Check database logs
4. Browser DevTools - Check network requests

---

**Enjoy your serverless, zero-cost backend! 🚀**
