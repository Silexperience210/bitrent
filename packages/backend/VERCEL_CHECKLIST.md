# BitRent Vercel Migration Checklist

Use this checklist to ensure your migration is complete and correct.

## Phase 1: Pre-Deployment ✅

### Code Structure
- [ ] API routes created in `/api` directory
  - [ ] `/api/auth/challenge.js`
  - [ ] `/api/auth/verify.js`
  - [ ] `/api/auth/profile.js`
  - [ ] `/api/auth/refresh.js`
  - [ ] `/api/auth/logout.js`
  - [ ] `/api/admin/mineurs/index.js`
  - [ ] `/api/admin/mineurs/[id].js`
  - [ ] `/api/admin/stats.js`
  - [ ] `/api/client/mineurs.js`
  - [ ] `/api/client/rentals/index.js`
  - [ ] `/api/client/rentals/[id].js`
  - [ ] `/api/payments/verify.js`
  - [ ] `/api/health.js`
  
- [ ] Shared libraries created in `/lib` directory
  - [ ] `lib/cors.js`
  - [ ] `lib/supabase.js`
  - [ ] `lib/jwt.js`
  - [ ] `lib/nostr-auth.js`
  - [ ] `lib/validation.js`
  - [ ] `lib/auth-middleware.js`
  - [ ] `lib/nwc.js`
  - [ ] `lib/response.js`

- [ ] Configuration files created
  - [ ] `vercel.json`
  - [ ] `.env.example`

- [ ] Frontend updated
  - [ ] `public/js/api-client.js` uses `/api/*` endpoints

- [ ] Dependencies updated
  - [ ] `package.json` has correct versions
  - [ ] No Express.js or server dependencies

### Local Testing
- [ ] Run `npm install` without errors
- [ ] Create `.env.local` file with test credentials
- [ ] Run `npm run dev` successfully
- [ ] Test health endpoint: `curl http://localhost:3000/api/health`
- [ ] Test auth flow:
  - [ ] GET challenge
  - [ ] Verify signature
  - [ ] Receive token
  - [ ] Use token in protected routes
- [ ] Test client endpoints:
  - [ ] Get mineurs list
  - [ ] Create rental
  - [ ] List rentals
- [ ] Test admin endpoints (with admin account):
  - [ ] Get all mineurs
  - [ ] Create miner
  - [ ] Update miner
  - [ ] Delete miner
  - [ ] Get stats
- [ ] Test payments:
  - [ ] Verify payment endpoint

### Code Quality
- [ ] No console.error logs (except for debugging)
- [ ] All routes have proper error handling
- [ ] All routes validate input
- [ ] Authentication required where needed
- [ ] Admin role checked where needed
- [ ] CORS headers properly set
- [ ] Response format consistent

---

## Phase 2: GitHub Preparation ✅

### Repository Setup
- [ ] Initialize git (if needed): `git init`
- [ ] Add all files: `git add .`
- [ ] Create initial commit: `git commit -m "feat: Vercel API Routes migration"`
- [ ] Create/switch to main branch: `git checkout -b main`
- [ ] Add remote: `git remote add origin https://github.com/YOUR_USERNAME/bitrent-backend.git`
- [ ] Push to GitHub: `git push -u origin main`

### Repository Contents Verified
- [ ] `/api` directory exists with all routes
- [ ] `/lib` directory exists with all utilities
- [ ] `/public` directory contains frontend files
- [ ] `vercel.json` exists at root
- [ ] `.env.example` exists at root
- [ ] `package.json` updated for Vercel
- [ ] `README.md` exists
- [ ] Documentation files exist:
  - [ ] `VERCEL_MIGRATION.md`
  - [ ] `DEPLOYMENT_VERCEL.md`
  - [ ] `QUICKSTART_VERCEL.md`
  - [ ] `VERCEL_REFACTOR_SUMMARY.md`

### Git Configuration
- [ ] Repository is public (for Vercel integration)
- [ ] Main branch set as default
- [ ] Branch protection rules optional but recommended

---

## Phase 3: Vercel Deployment ✅

### Account & Project Setup
- [ ] Vercel account created (free at vercel.com)
- [ ] GitHub account connected to Vercel
- [ ] Repository permissions granted
- [ ] New project created in Vercel

### Project Configuration
- [ ] Framework preset: None (don't auto-detect)
- [ ] Build command: (empty or `npm run build`)
- [ ] Install command: `npm install`
- [ ] Output directory: (empty)
- [ ] Root directory: `.`
- [ ] Node version: 18.x

### Environment Variables Set
- [ ] `NODE_ENV` = `production`
- [ ] `SUPABASE_URL` = Your Supabase project URL
- [ ] `SUPABASE_KEY` = Your Supabase anon key (NOT secret key!)
- [ ] `JWT_SECRET` = Strong random string (32+ characters)
- [ ] `JWT_EXPIRES_IN` = `24h`
- [ ] `ADMIN_NOSTR_PUBKEY` = Your Nostr public key
- [ ] `NWC_WALLET_PUB` = Your NWC wallet pubkey
- [ ] `NWC_CONNECTION_SECRET` = Your NWC secret
- [ ] `CORS_ORIGIN` = Your domain(s) (comma-separated)

### Deployment
- [ ] Initial deployment successful
- [ ] Deployment time: ~1-2 minutes
- [ ] No build errors in Vercel logs
- [ ] No runtime errors in Vercel logs
- [ ] Vercel assigned URL: `https://bitrent-XXXXX.vercel.app`

---

## Phase 4: Post-Deployment Testing ✅

### Basic Health Check
- [ ] Health endpoint returns 200:
  ```bash
  curl https://bitrent-XXXXX.vercel.app/api/health
  ```
- [ ] Response includes:
  - [ ] `status: "healthy"`
  - [ ] `database: "connected"`
  - [ ] `timestamp: "..."`

### Authentication Flow
- [ ] POST `/api/auth/challenge`:
  ```bash
  curl -X POST https://bitrent-XXXXX.vercel.app/api/auth/challenge \
    -H "Content-Type: application/json" \
    -d '{"pubkey": "YOUR_PUBKEY"}'
  ```
  - [ ] Returns challenge UUID
  - [ ] Status 200

- [ ] POST `/api/auth/verify`:
  - [ ] Send signed challenge
  - [ ] Receive JWT token
  - [ ] Token valid and contains pubkey
  - [ ] Status 200

### Protected Endpoints
- [ ] GET `/api/auth/profile`:
  - [ ] Returns user info when authenticated
  - [ ] Returns 401 without token
  - [ ] Returns 401 with invalid token

- [ ] GET `/api/client/mineurs`:
  - [ ] Returns mineurs list without auth
  - [ ] Returns mineurs list with auth
  - [ ] Status 200

### Admin Endpoints (as admin user)
- [ ] GET `/api/admin/stats`:
  - [ ] Returns stats object
  - [ ] Contains user/miner/rental counts
  - [ ] Status 200

- [ ] Admin operations work:
  - [ ] Create miner
  - [ ] Update miner
  - [ ] Delete miner
  - [ ] List mineurs

### Admin Restriction (as non-admin user)
- [ ] GET `/api/admin/stats`:
  - [ ] Returns 403 Forbidden
  - [ ] Message: "Admin access required"

### Payment Flow
- [ ] POST `/api/payments/verify`:
  - [ ] Validates payment_hash
  - [ ] Validates invoice
  - [ ] Updates rental status
  - [ ] Status 200 on success
  - [ ] Status 402 on payment failure

---

## Phase 5: Monitoring & Performance ✅

### Vercel Dashboard
- [ ] No failed deployments
- [ ] Function execution times < 1s
- [ ] No 5xx errors in logs
- [ ] Memory usage healthy
- [ ] Bandwidth within limits

### Database Checks
- [ ] Supabase connection stable
- [ ] Query times < 100ms
- [ ] No connection pool exhaustion
- [ ] Database logs show no errors

### Load Testing (Optional)
- [ ] Test with multiple concurrent requests
- [ ] Verify auto-scaling works
- [ ] Monitor cold starts (should be minimal)

---

## Phase 6: Frontend Integration ✅

### API Client Update
- [ ] Frontend uses `/api/*` endpoints
- [ ] No hardcoded external URLs
- [ ] CORS headers properly handled

### Frontend Testing
- [ ] Login flow works
- [ ] Browse mineurs works
- [ ] Create rental works
- [ ] Admin panel works (if applicable)

### Browser Console
- [ ] No CORS errors
- [ ] No 404 errors
- [ ] No auth errors (unless intentional)

---

## Phase 7: Custom Domain (Optional) ✅

### DNS Configuration
- [ ] Domain registered/purchased
- [ ] CNAME record created:
  ```
  CNAME: bitrent → cname.vercel.com
  ```
- [ ] DNS propagated (wait 5-30 minutes)

### Vercel Setup
- [ ] Custom domain added in Vercel
- [ ] Domain verified
- [ ] SSL certificate auto-generated
- [ ] Redirect from old domain configured

### Testing
- [ ] Custom domain works: `https://bitrent.yourcompany.com/api/health`
- [ ] Old domain redirects (if applicable)
- [ ] SSL certificate valid

---

## Phase 8: Production Hardening ✅

### Security
- [ ] JWT_SECRET is strong (32+ random chars)
- [ ] JWT_SECRET never committed to git
- [ ] ADMIN_NOSTR_PUBKEY verified correct
- [ ] CORS_ORIGIN doesn't include `*`
- [ ] Environment variables not logged
- [ ] Database Row Level Security enabled

### Monitoring
- [ ] Vercel error alerts configured
- [ ] Email notifications enabled
- [ ] Slack alerts configured (optional)
- [ ] Uptime monitoring setup (optional)

### Backup & Recovery
- [ ] Database backups enabled
- [ ] Backup retention configured
- [ ] Tested restore process
- [ ] Disaster recovery plan documented

---

## Phase 9: Documentation ✅

### User Documentation
- [ ] README.md updated for Vercel
- [ ] QUICKSTART_VERCEL.md complete
- [ ] DEPLOYMENT_VERCEL.md step-by-step
- [ ] VERCEL_MIGRATION.md comprehensive
- [ ] API documentation up-to-date

### Team Documentation
- [ ] Environment setup documented
- [ ] Deployment procedure documented
- [ ] Troubleshooting guide created
- [ ] Monitoring procedure documented

### Code Documentation
- [ ] Each API route has comments
- [ ] Each lib file has JSDoc
- [ ] Error messages clear and helpful
- [ ] Validation error messages helpful

---

## Phase 10: Go-Live Preparation ✅

### Final Verification
- [ ] All endpoints tested and working
- [ ] Performance acceptable
- [ ] No security issues
- [ ] Database reliable
- [ ] Monitoring active
- [ ] Alerts configured
- [ ] Team trained

### Announcement
- [ ] Documentation published
- [ ] Team notified
- [ ] Users informed (if applicable)
- [ ] Links updated everywhere

### Post-Launch
- [ ] Monitor first 24 hours closely
- [ ] Check error logs regularly
- [ ] Verify performance metrics
- [ ] Be ready for quick fixes

---

## Troubleshooting Checklist

If issues occur, check:

### Deployment Issues
- [ ] All required environment variables set
- [ ] No syntax errors in code
- [ ] All files properly uploaded
- [ ] Node version compatible (18+)
- [ ] Vercel logs show actual error

### Runtime Issues
- [ ] Database connection string correct
- [ ] JWT_SECRET matches between deployments
- [ ] CORS_ORIGIN includes your domain
- [ ] Admin pubkey matches database
- [ ] Token not expired

### Performance Issues
- [ ] Database queries optimized
- [ ] Indexes created for filters
- [ ] Connection pooling enabled
- [ ] No memory leaks in code
- [ ] Vercel resources sufficient

### CORS Issues
- [ ] Frontend domain in CORS_ORIGIN
- [ ] Preflight requests returning 200
- [ ] Headers include Access-Control-Allow-*
- [ ] Credentials properly handled

---

## Success Criteria

Your migration is successful when:

- ✅ All 14+ API routes respond correctly
- ✅ Health check returns 200 with correct data
- ✅ Auth flow works: challenge → verify → token
- ✅ Protected routes require authentication
- ✅ Admin routes require admin role
- ✅ Database operations complete successfully
- ✅ Response times < 500ms
- ✅ No errors in Vercel logs
- ✅ Frontend communicates with backend
- ✅ Custom domain works (if configured)
- ✅ Monitoring active and working
- ✅ Team able to deploy updates
- ✅ Cost reduced to $0/month

---

## Final Sign-Off

- [ ] Project lead approval
- [ ] QA testing complete
- [ ] Security review passed
- [ ] Performance review passed
- [ ] Documentation complete
- [ ] Team trained
- [ ] Ready for production

---

## Post-Launch Maintenance

### Daily
- [ ] Monitor error logs
- [ ] Check response times
- [ ] Verify database is responsive

### Weekly
- [ ] Review performance metrics
- [ ] Check bandwidth usage
- [ ] Review error patterns

### Monthly
- [ ] Analyze usage patterns
- [ ] Optimize slow queries
- [ ] Update dependencies
- [ ] Review costs (should be $0)

---

**Checklist Version:** 1.0  
**Last Updated:** 2024  
**Status:** Production Ready 🚀

---

Print this checklist and track progress as you migrate!
