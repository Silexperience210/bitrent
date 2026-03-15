# BitRent Vercel Deployment Guide

Step-by-step guide to deploy BitRent on Vercel with zero server costs.

## Prerequisites

- GitHub account
- Vercel account (free at vercel.com)
- Supabase project already setup
- Node.js 18+

## ✅ Step 1: Prepare Your Repository

### 1.1 Install Dependencies

```bash
cd bitrent-backend
npm install
```

This installs:
- `@supabase/supabase-js` - Database client
- `jsonwebtoken` - JWT token handling
- `uuid` - ID generation
- `nostr-tools` - Nostr protocol support

### 1.2 Update Environment Variables

Create `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your values:

```env
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGc...
JWT_SECRET=your-secret-key-at-least-32-chars-long!!!
JWT_EXPIRES_IN=24h
ADMIN_NOSTR_PUBKEY=1234567890abcdef...
NWC_WALLET_PUB=1234567890abcdef...
NWC_CONNECTION_SECRET=...
CORS_ORIGIN=https://bitrent.vercel.app,http://localhost:3000
```

### 1.3 Test Locally

```bash
npm run dev
```

Test endpoints:

```bash
# Health check
curl http://localhost:3000/api/health

# Get challenge
curl -X POST http://localhost:3000/api/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"pubkey": "0000000000000000000000000000000000000000000000000000000000000000"}'
```

## 🚀 Step 2: Push to GitHub

### 2.1 Initialize Git (if needed)

```bash
git init
git add .
git commit -m "feat: Vercel API Routes migration"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bitrent-backend.git
git push -u origin main
```

### 2.2 Verify Repository

Ensure these files exist:

```
✅ api/
✅ lib/
✅ public/
✅ vercel.json
✅ package.json
✅ .env.example
✅ VERCEL_MIGRATION.md
```

## 🌐 Step 3: Connect to Vercel

### 3.1 Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Select "Import Git Repository"
4. Find and select `bitrent-backend`
5. Click "Import"

### 3.2 Configure Project Settings

Framework Preset: **None** (don't auto-detect)

Build Settings:
- **Build Command:** (leave empty or `npm run build`)
- **Install Command:** `npm install`
- **Output Directory:** (leave empty)

Root Directory: `.` (root of your repo)

### 3.3 Add Environment Variables

Click "Environment Variables" and add:

```
NODE_ENV = production
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_KEY = eyJhbGc...
JWT_SECRET = your-secret-key-at-least-32-chars-long!!!
JWT_EXPIRES_IN = 24h
ADMIN_NOSTR_PUBKEY = 1234567890abcdef...
NWC_WALLET_PUB = 1234567890abcdef...
NWC_CONNECTION_SECRET = ...
CORS_ORIGIN = https://bitrent.vercel.app,http://localhost:3000
```

**Important:** Keep `JWT_SECRET` private! It's your API signing key.

### 3.4 Deploy!

Click "Deploy" and wait 1-2 minutes.

Your app will be live at: `https://bitrent-XXXXX.vercel.app`

## 🧪 Step 4: Verify Deployment

### 4.1 Test Health Endpoint

```bash
curl https://bitrent-XXXXX.vercel.app/api/health
```

Response should be:

```json
{
  "status": "healthy",
  "uptime": 123.45,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected",
  "environment": "production"
}
```

### 4.2 Test Authentication

```bash
# Step 1: Get challenge
curl -X POST https://bitrent-XXXXX.vercel.app/api/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"pubkey": "YOUR_PUBKEY_HERE"}'

# Response: { "challenge": "abc123...", "challenge_id": "def456...", ... }
```

### 4.3 Check Logs

In Vercel dashboard:
1. Click on your project
2. Go to "Deployments" tab
3. Click latest deployment
4. Check "Logs" for any errors

## 📱 Step 5: Update Frontend

### 5.1 Update API Base URL

Edit your frontend config:

```javascript
// Before
const API_BASE_URL = 'https://railway-server.com/api';

// After
const API_BASE_URL = '/api';  // Relative URL (same origin)
```

Or set environment variable:

```env
REACT_APP_API_URL=https://bitrent-XXXXX.vercel.app/api
```

### 5.2 Verify Frontend Calls

The updated `api-client.js` in `/public/js/` handles:

```javascript
// These now work automatically:
await apiClient.getAvailableMiners();      // GET /api/client/mineurs
await apiClient.createRental(id, hours);   // POST /api/client/rentals
await apiClient.getPlatformStats();        // GET /api/admin/stats
```

## 🔄 Step 6: Setup Custom Domain (Optional)

### 6.1 Update DNS Records

In your domain registrar, add:

```
CNAME: bitrent → cname.vercel.com
```

### 6.2 Configure in Vercel

1. Go to your Vercel project
2. Settings → Domains
3. Add your domain
4. Verify DNS changes

Your app is now at: `https://bitrent.example.com`

## 📊 Step 7: Monitor Performance

### 7.1 Vercel Analytics

In Vercel dashboard:
- View function execution times
- Monitor error rates
- Check bandwidth usage
- See cold start metrics

### 7.2 Supabase Monitoring

In Supabase dashboard:
- Check database query performance
- Monitor storage usage
- Review authentication logs

### 7.3 Set up Alerts

Enable notifications for:
- Failed deployments
- High error rates
- Performance degradation

## 🔐 Step 8: Security Checklist

- [ ] JWT_SECRET is strong (32+ random characters)
- [ ] Environment variables not committed to git
- [ ] CORS_ORIGIN restricted to your domains
- [ ] Admin pubkey properly configured
- [ ] Database RLS policies enabled in Supabase
- [ ] API rate limiting configured (optional)
- [ ] HTTPS enabled (automatic on Vercel)

## 🛠️ Troubleshooting

### Deployment Failed?

1. Check build logs in Vercel
2. Verify Node version: `node -v` (should be 18+)
3. Verify dependencies: `npm list`
4. Check for syntax errors: `npm run test`

### Endpoints Returning 404?

1. Check file structure matches `/api/` routes
2. Verify file names and casing (case-sensitive!)
3. Check `vercel.json` routes configuration
4. Review build output in Vercel logs

### Database Connection Failed?

1. Verify SUPABASE_URL and SUPABASE_KEY are correct
2. Check Supabase project is accessible
3. Verify network policies in Supabase
4. Test with: `curl 'https://YOUR_PROJECT.supabase.co/rest/v1/' -H 'apikey: YOUR_KEY'`

### Auth Token Not Working?

1. Verify JWT_SECRET is set (same in local and production)
2. Check token expiry time
3. Ensure Authorization header format: `Bearer TOKEN`
4. Verify admin pubkey if using admin endpoints

### CORS Errors?

1. Check CORS_ORIGIN includes your frontend domain
2. Verify headers include `Origin` from browser
3. Test with curl to bypass CORS:
   ```bash
   curl -H "Origin: https://yoursite.com" https://api.example.com/api/health
   ```

## 📈 Performance Tips

1. **Enable Caching**
   - Set cache headers in API responses
   - Use Redis for hot data (Vercel KV)

2. **Optimize Queries**
   - Add database indexes
   - Use pagination for large datasets
   - Cache frequently accessed data

3. **Monitor Cold Starts**
   - Should be <1s with current setup
   - Keep dependencies minimal
   - Avoid large node_modules

4. **Database Connection Pooling**
   - Supabase handles this automatically
   - No configuration needed

## 🎉 Success Indicators

Your deployment is successful when:

- ✅ Health endpoint returns 200
- ✅ Auth endpoints work (challenge/verify)
- ✅ Client can browse mineurs
- ✅ Admin can create/update resources
- ✅ Frontend loads from same domain
- ✅ Vercel dashboard shows no errors
- ✅ Database queries complete in <100ms

## 📞 Getting Help

If issues persist:

1. **Check Vercel Docs:** https://vercel.com/docs
2. **Check Supabase Docs:** https://supabase.com/docs
3. **Review API route format:** https://vercel.com/docs/concepts/functions/serverless-functions

## 🚀 Next Steps

1. Setup monitoring & alerts
2. Configure custom domain
3. Setup automatic backups
4. Enable analytics
5. Plan scaling strategy

---

**Congratulations! Your BitRent backend is now deployed on Vercel with zero server costs!** 🎉

Monthly savings: **$15-95** 💸
Deployment time: **< 5 minutes** ⚡
Uptime: **99.95%** ✅
Cost per month: **$0** 🎯
