# BitRent Backend - Deployment Guide

## Deployment to Railway

### Prerequisites

- GitHub account with repository
- Railway account (railway.app)
- Supabase project and credentials
- NWC credentials
- Domain name (optional, Railway provides default)

### Step 1: Prepare GitHub Repository

1. Create a GitHub repository:
```bash
git init
git add .
git commit -m "Initial commit: BitRent backend Phase 1"
git remote add origin https://github.com/yourusername/bitrent-backend.git
git push -u origin main
```

2. Make sure `.env` and `node_modules/` are in `.gitignore`

### Step 2: Create Railway Project

1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub"
5. Connect your repository
6. Select the bitrent-backend repository
7. Deploy

### Step 3: Configure Environment Variables

In Railway project dashboard:

1. Go to "Variables" tab
2. Add all environment variables:

```
NODE_ENV=production
PORT=3000

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

JWT_SECRET=your-secure-secret-min-32-chars
JWT_EXPIRY=7d

NWC_RELAY_URL=wss://relay.example.com
NWC_PUBKEY=your-nwc-pubkey
NWC_SECRET=your-nwc-secret

ADMIN_NOSTR_PUBKEY=your-admin-pubkey

CORS_ORIGIN=https://yourdomain.com
API_BASE_URL=https://api-yourdomain.com

LOG_LEVEL=info
```

### Step 4: Setup Database Backups

In Supabase:

1. Go to Project Settings → Backups
2. Enable automated backups (daily)
3. Test restore to ensure backups work

### Step 5: Domain Configuration (Optional)

1. In Railway, go to Settings → Domain
2. Add your custom domain or use Railway's default
3. Update `CORS_ORIGIN` and `API_BASE_URL` in variables
4. Point your domain DNS to Railway

### Step 6: Monitor Deployment

1. Go to Deployments tab
2. Wait for deployment to complete
3. Check logs for errors
4. Test health endpoint: `GET /health`

### Step 7: Post-Deployment Testing

```bash
# Test health check
curl https://your-api.railway.app/health

# Test auth endpoint
curl -X POST https://your-api.railway.app/auth/nostr-challenge \
  -H "Content-Type: application/json" \
  -d '{"pubkey":"your-pubkey"}'

# List miners
curl https://your-api.railway.app/client/mineurs
```

### Step 8: Update Frontend

In your frontend code (`frontend/js/config.js`):

```javascript
export const config = {
  API_BASE_URL: 'https://your-api.railway.app',
  // ...
};
```

Or let it auto-detect based on domain.

### Step 9: Enable Monitoring (Phase 1.5)

1. Optional: Setup Sentry for error tracking
2. Add `SENTRY_DSN` to environment variables
3. Logs will be collected automatically

### Deployment Checklist

- [ ] GitHub repository created and pushed
- [ ] Railway project created
- [ ] All environment variables configured
- [ ] Database schema applied
- [ ] Health endpoint responds
- [ ] Nostr auth working
- [ ] Admin can add miners
- [ ] Clients can view miners
- [ ] Payment flow tested
- [ ] Frontend API URL updated
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Backups enabled

### Rollback Procedure

If deployment fails:

1. Go to Deployments tab
2. Select previous working deployment
3. Click "Redeploy"
4. Check logs for errors
5. Fix and push new commit

### Scaling

Railway automatically scales based on load:
- Horizontal scaling: Multiple instances
- Vertical scaling: More CPU/RAM

Current Phase 1 should handle:
- ~100 concurrent users
- ~1000 rentals/day
- ~10 active miners

### Environment Variables Security

⚠️ **IMPORTANT:**
- Never commit `.env` to git
- Use Railway's built-in secrets manager
- Rotate `JWT_SECRET` periodically
- Keep `NWC_SECRET` safe
- Enable 2FA on Railway

### Monitoring Commands

```bash
# Check deployment status
# (Via Railway dashboard)

# View logs
# (Via Railway dashboard → Deployments → Logs)

# Health check
curl https://your-api.railway.app/health

# Check readiness
curl https://your-api.railway.app/health/readiness
```

### Common Issues

**Port Already in Use:**
Railway automatically assigns a port, no action needed.

**Database Connection Failed:**
- Verify SUPABASE_URL and SERVICE_ROLE_KEY
- Check Supabase project is active
- Test connection: `psql postgresql://...`

**CORS Errors:**
- Update CORS_ORIGIN to match frontend domain
- Ensure frontend makes requests to correct API URL

**NWC Not Working:**
- Verify relay URL is accessible
- Check network connectivity
- Test relay: `wscat -c wss://relay.url`

**High Memory Usage:**
- Check for memory leaks (should stabilize)
- Increase memory allocation in Railway settings
- Review code for inefficient queries

### CI/CD Pipeline

Railway automatically:
1. Detects push to main branch
2. Installs dependencies
3. Runs build (if any)
4. Starts server with `npm start`
5. Performs health check
6. Routes traffic to new deployment

### Performance Optimization

Current optimizations:
- ✅ Database connection pooling (Supabase)
- ✅ Response caching (via HTTP headers)
- ✅ Rate limiting (100 req/15min)
- ✅ Helmet.js for security headers

Future optimizations (Phase 1.5):
- Redis caching for frequent queries
- Database query optimization
- API response compression
- CDN integration

### Next Steps

1. Setup GitHub Actions for testing (optional)
2. Enable Sentry monitoring
3. Setup PagerDuty alerts
4. Create runbook for common issues
5. Plan Phase 1.5 improvements
