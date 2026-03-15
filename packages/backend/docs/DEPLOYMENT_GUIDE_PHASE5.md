# BitRent Phase 5 - Complete Deployment & Go-Live Guide

## 🎯 Overview

This comprehensive guide covers BitRent's complete deployment pipeline for Phase 5 (Go-Live). It includes:

1. **Infrastructure setup** (Railway, Supabase, Vercel, Cloudflare)
2. **Multi-environment configuration** (dev, staging, production)
3. **Automated deployment pipeline** (GitHub Actions)
4. **Monitoring & observability**
5. **Disaster recovery & backup**
6. **Security hardening**
7. **Launch checklist & procedures**
8. **Incident response**

---

## 📋 Quick Start

### For first-time setup:
```bash
# 1. Read INFRASTRUCTURE_SETUP.md (1-2 hours)
# 2. Follow the Railway/Supabase/Vercel setup steps
# 3. Configure environment variables
# 4. Deploy to staging
# 5. Run smoke tests
# 6. Deploy to production
```

### For regular deployments:
```bash
# Push to main branch on GitHub
git push origin main

# GitHub Actions automatically:
# 1. Runs all tests
# 2. Builds Docker image
# 3. Deploys to staging
# 4. Runs smoke tests
# 5. Waits for approval
# 6. Deploys to production
# 7. Monitors for 24h
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────┐
│        Cloudflare CDN & DDoS Protection     │
└────────┬────────────────────────────────────┘
         │ api.bitrent.io / bitrent.io
    ┌────┴──────────────────────┐
    │                           │
┌───▼─────────┐         ┌──────▼──────┐
│   Frontend  │         │   Backend   │
│ (Vercel)    │         │  (Railway)  │
│ ✅ Global   │         │ ✅ EU-West  │
│ ✅ CMS      │         │ ✅ Scalable │
└─────────────┘         └──────┬──────┘
                                │
                        ┌───────▼─────────┐
                        │   Database      │
                        │  (Supabase)     │
                        │ ✅ PostgreSQL   │
                        │ ✅ Backups      │
                        │ ✅ RLS          │
                        └─────────────────┘

External Integrations:
├── Sentry (error tracking)
├── Datadog (monitoring)
├── UptimeRobot (health checks)
├── PagerDuty (on-call)
└── Slack (notifications)
```

---

## 📊 Deployment Environments

### Development (Local)
```bash
npm run dev
# http://localhost:3000
# Connected to local database or dev Supabase
```

### Staging (Pre-production)
```
https://api-staging.bitrent.io
- Auto-deployed from develop branch
- Uses staging Supabase database
- Full feature testing
- Load testing allowed
- Demo environment
```

### Production (Live)
```
https://api.bitrent.io
- Manual approval required before deployment
- Uses production Supabase database
- Real user traffic
- 24/7 monitoring
- Rollback capability
```

---

## 🚀 Deployment Process

### Step 1: Local Development & Testing

```bash
# Create feature branch
git checkout -b feature/my-feature

# Develop locally
npm run dev
npm run test

# Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
```

### Step 2: Pull Request & Review

```bash
# Create PR to develop branch
# GitHub automatically runs:
# - Linting
# - Unit tests
# - Integration tests
# - Security checks
# - Code coverage analysis

# Approval required from team
# Automated checks must pass
```

### Step 3: Merge to develop → Auto-deploy to Staging

```bash
# Once PR is approved, click "Merge"
# GitHub Actions automatically:
# 1. Runs full test suite
# 2. Builds Docker image
# 3. Deploys to staging (Railway)
# 4. Runs smoke tests
# 5. Notifies team on Slack
```

### Step 4: Testing in Staging

```bash
# Manual testing
# QA testing
# Load testing
# Security testing
# User acceptance testing (if needed)

# Check staging logs
railway logs -s bitrent-api-staging --follow

# Verify functionality
curl https://api-staging.bitrent.io/health
```

### Step 5: Merge to main → Auto-deploy to Production

```bash
# Create PR from develop to main
# Same testing as before
# REQUIRES manual approval from CTO

# Once approved:
# 1. Auto-deployment to production begins
# 2. Smoke tests run in production
# 3. Health monitoring activated
# 4. Team notified on Slack
# 5. Status page updated
```

### Step 6: Production Monitoring (24h)

```bash
# Enhanced monitoring active:
# - Continuous health checks
# - Error rate monitoring
# - Response time tracking
# - Database performance
# - User activity tracking

# Automatic rollback if:
# - Error rate > 10%
# - API completely down
# - Database unreachable
# - Response time > 2s
```

---

## 🔧 Configuration Files

### Main Config Files
```
bitrent-backend/
├── .env.production.example  # Production environment variables
├── .env.staging.example     # Staging environment variables
├── railway.toml             # Railway deployment config
├── Dockerfile               # Docker image definition
├── docker-compose.prod.yml  # Local production testing
├── nginx.conf               # Reverse proxy configuration
└── scripts/
    ├── deploy.sh            # Deployment script
    ├── rollback.sh          # Rollback script
    ├── backup-database.sh   # Database backup
    ├── restore-database.sh  # Database restore
    ├── health-check.sh      # Continuous health monitoring
    └── smoke-tests.sh       # Post-deployment tests
```

### GitHub Actions Workflows
```
.github/workflows/
├── deploy-prod.yml          # Production deployment
├── deploy-staging.yml       # Staging deployment
├── rollback.yml            # Automated rollback
├── backup.yml              # Database backup
└── health-check.yml        # Continuous health checks
```

---

## 📈 Monitoring & Observability

### Real-time Dashboards
1. **Railway Dashboard** (https://railway.app)
   - Service status
   - Deployment history
   - Resource usage
   - Logs

2. **Sentry Dashboard** (https://sentry.io)
   - Error tracking
   - Release tracking
   - Performance monitoring
   - Issue alerts

3. **Datadog Dashboard** (https://datadog.com)
   - Infrastructure metrics
   - API performance
   - Database queries
   - Custom dashboards

4. **Status Page** (https://bitrent-status.com)
   - Public status
   - Incident history
   - Maintenance windows

### Alerting

| Metric | Threshold | Action |
|--------|-----------|--------|
| API response time | > 1s | Page on-call |
| Error rate | > 5% | Page + Slack |
| CPU usage | > 90% | Auto-scale |
| Memory usage | > 95% | Restart |
| Uptime | < 99.9% | Incident |

---

## 🔐 Security Measures

### Application Security
- ✅ JWT authentication
- ✅ Rate limiting (100 req/15 min)
- ✅ CORS protection
- ✅ CSRF tokens
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Helmet.js security headers

### Transport Security
- ✅ HTTPS/TLS 1.2+
- ✅ HSTS headers
- ✅ Certificate pinning (optional)
- ✅ Certificate auto-renewal

### Infrastructure Security
- ✅ WAF rules (Cloudflare)
- ✅ DDoS protection
- ✅ Rate limiting (Nginx)
- ✅ IP whitelisting (admin)
- ✅ Secrets management (Railway)
- ✅ Backup encryption (AES-256)

### Data Security
- ✅ Database encryption at rest
- ✅ Connection SSL/TLS
- ✅ Row Level Security (RLS)
- ✅ Audit logging
- ✅ Backup encryption

---

## 💾 Backup & Recovery

### Automated Backups
```bash
# Daily at 2 AM UTC (configurable)
0 2 * * * bash /path/to/scripts/backup-database.sh production

# Backup locations:
# - Supabase managed (7 days PITR)
# - S3 (30 days retention)
# - Glacier (12 months archival)
```

### Recovery Procedure
```bash
# Restore from backup
bash scripts/restore-database.sh /backups/bitrent_production_TIMESTAMP.sql.gz production

# RTO: 1 hour
# RPO: 1 hour
# (As long as backups are recent)
```

---

## 🎯 Launch Checklist

See [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) for detailed checklist.

**Quick summary:**
- [ ] All tests passing
- [ ] Infrastructure ready
- [ ] Monitoring configured
- [ ] Backups tested
- [ ] Team trained
- [ ] Security hardened
- [ ] Documentation complete
- [ ] Go-live approval from CTO

---

## ⚠️ Incident Response

### P0 Critical (Complete Outage)

```bash
# Immediate actions:
1. Acknowledge alert
2. Join war room
3. Diagnose issue (logs, metrics, etc)
4. Apply fix or rollback
5. Verify health
6. Communicate status

# See INCIDENT_RESPONSE.md for detailed procedures
```

### P1 High (Major Degradation)

```bash
# Response within 15 minutes:
1. Acknowledge alert
2. Diagnose issue
3. Implement fix
4. Verify and monitor
```

### P2 Medium (Minor Issues)

```bash
# Response within 1 hour:
1. Acknowledge
2. Investigate at leisure
3. Deploy fix
4. Verify
```

---

## 📞 On-Call Schedule

**Week 1 (after launch):**
- 24/7 monitoring
- Full team on-call

**Week 2-4:**
- Daily check-ins
- On-call rotation

**After 1 month:**
- Regular on-call rotation
- Standard alerting

---

## 📚 Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| INFRASTRUCTURE_SETUP | Detailed setup guide | docs/INFRASTRUCTURE_SETUP.md |
| DEPLOYMENT_GUIDE_PHASE5 | This file | docs/DEPLOYMENT_GUIDE_PHASE5.md |
| DISASTER_RECOVERY | Recovery procedures | docs/DISASTER_RECOVERY.md |
| LAUNCH_CHECKLIST | Pre-launch verification | docs/LAUNCH_CHECKLIST.md |
| INCIDENT_RESPONSE | Incident procedures | docs/INCIDENT_RESPONSE.md |
| Runbook | Step-by-step procedures | docs/RUNBOOK.md |

---

## 🎓 Team Training

**Required training before launch:**

1. **Monitoring dashboards** (30 min)
   - Railway, Sentry, Datadog
   - Understanding alerts

2. **Incident response** (1 hour)
   - P0/P1/P2 procedures
   - Rollback procedures
   - Communication

3. **Database operations** (1 hour)
   - Backup/restore
   - Query monitoring
   - Emergency procedures

4. **Deployment process** (30 min)
   - How deployments work
   - How to check status
   - How to rollback

---

## ✅ Success Criteria

### Technical
- ✅ Zero critical bugs in first week
- ✅ Uptime > 99.9%
- ✅ Response time < 200ms (p95)
- ✅ Error rate < 0.1%

### Business
- ✅ >= 100 active users
- ✅ >= 10 rental transactions
- ✅ 99% transaction success rate
- ✅ Customer satisfaction >= 4.5/5

### Operational
- ✅ No unplanned downtime
- ✅ Backups working
- ✅ Team procedures effective
- ✅ Documentation accurate

---

## 🔗 Important Links

| Resource | URL |
|----------|-----|
| Railway Dashboard | https://railway.app/dashboard |
| Sentry | https://sentry.io/organizations/bitrent |
| Datadog | https://app.datadoghq.com |
| Supabase | https://app.supabase.com |
| Cloudflare | https://dash.cloudflare.com |
| Vercel | https://vercel.com/dashboard |
| Status Page | https://status.bitrent.io |
| GitHub | https://github.com/bitrent/bitrent-backend |

---

## 📞 Support

- **Technical Issues**: devops@bitrent.io
- **Business Issues**: cto@bitrent.io
- **Security Issues**: security@bitrent.io
- **24/7 Support**: [PagerDuty on-call rotation]

---

## 📝 Document Info

**Version**: 1.0  
**Last Updated**: March 15, 2026  
**Next Review**: March 22, 2026  
**Status**: In Preparation for Phase 5 Launch

---

**Ready to deploy?** Start with Step 1 in the "Deployment Process" section above!
