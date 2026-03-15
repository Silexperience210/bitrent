# BitRent Phase 5: Deployment & Go-Live

Complete infrastructure and deployment automation for BitRent peer-to-peer mining rental platform.

## 🚀 Quick Start

### Prerequisites

```bash
# Check versions
node --version          # v20+
docker --version        # 20+
git --version          # 2.30+
npm --version          # 9+

# Install Railway CLI
npm install -g @railway/cli

# Install AWS CLI
aws --version
```

### Development Setup

```bash
# Clone repository
git clone https://github.com/bitrent/bitrent.git
cd bitrent

# Install dependencies
npm install

# Setup environment
cp .env.development.example .env.development

# Start local development (Docker Compose)
docker-compose up -d

# Run application
npm run dev

# Access at http://localhost:3000
```

### Staging Deployment

```bash
# Push to develop branch
git checkout develop
git push origin develop

# GitHub Actions will automatically:
# ✅ Run tests
# ✅ Build Docker image
# ✅ Deploy to Railway staging
# ✅ Run smoke tests
# ✅ Notify Slack

# Monitor at: https://staging.bitrent.io
```

### Production Deployment

```bash
# Create release
git checkout main
git merge develop
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will:
# ✅ Run comprehensive tests
# ✅ Create production backup
# ✅ Request approval
# ✅ Deploy after approval
# ✅ Run smoke tests
# ✅ Monitor 24 hours

# Production: https://bitrent.io
```

## 📁 Project Structure

```
bitrent/
├── .github/
│   └── workflows/           # GitHub Actions CI/CD
│       ├── deploy-prod.yml  # Production deployment
│       ├── deploy-staging.yml
│       ├── rollback.yml
│       ├── backup.yml
│       └── health-check.yml
│
├── scripts/
│   ├── deploy.sh           # Deployment script
│   ├── rollback.sh          # Rollback script
│   ├── backup-database.sh   # Database backup
│   ├── restore-database.sh  # Database restore
│   ├── health-check.sh      # Health monitoring
│   ├── smoke-tests.sh       # Smoke tests
│   └── performance-test.sh  # Performance testing
│
├── config/
│   └── environments.js      # Environment configuration
│
├── infra/
│   ├── docker-compose.yml   # Local development setup
│   └── deployment-config.yaml
│
├── Dockerfile               # Production Docker image
├── .dockerignore            # Docker build ignore
├── railway.toml             # Railway configuration
├── nginx.conf               # Reverse proxy config
│
├── DEPLOYMENT_GUIDE.md      # Detailed deployment guide
├── INFRASTRUCTURE_SETUP.md  # Infrastructure setup guide
├── DISASTER_RECOVERY.md     # Disaster recovery procedures
├── INCIDENT_RESPONSE.md     # Incident response playbook
├── LAUNCH_CHECKLIST.md      # Pre-launch checklist
├── RUNBOOK.md               # Day-to-day operations
│
├── public/
│   ├── privacy-policy.md    # Privacy policy
│   └── terms-of-service.md  # Terms of service
│
├── .env.development.example # Development env template
├── .env.staging.example     # Staging env template
└── .env.production.example  # Production env template
```

## 🏗️ Infrastructure Architecture

### Multi-Environment Setup

```
Development                 Staging                      Production
────────────────           ──────────────               ──────────────
Local Docker          Railway + Supabase        Railway + Supabase
PostgreSQL            Staging DB                Production DB
Redis                 Staging Redis             Production Redis
                      (Full replica)            (Full replica)
                                               
Automated Tests       Automated Tests          Automated Tests
                      + Manual UAT              + Health Checks
                                               + Monitoring
```

### Services Deployed

| Service | Development | Staging | Production | Purpose |
|---------|-------------|---------|------------|---------|
| **Frontend** | Vite dev | Vercel | Vercel | Web UI |
| **Backend** | Node/Express | Railway | Railway | API server |
| **Database** | PostgreSQL | Supabase | Supabase | Data persistence |
| **Cache** | Redis | Redis | Redis | Session/cache |
| **CDN** | Local | Cloudflare | Cloudflare | Content delivery |
| **DNS** | Local | Cloudflare | Cloudflare | Domain management |
| **Backups** | N/A | AWS S3 | AWS S3 | Disaster recovery |
| **Monitoring** | Local logs | Sentry | Sentry | Error tracking |

## 🔄 Deployment Pipeline

### Automated CI/CD Pipeline

```
Code Push to Branch
    ↓
GitHub Actions Triggered
    ↓
┌─────────────────────────────┐
│   Test Phase                │
│ ✅ Unit tests               │
│ ✅ Integration tests        │
│ ✅ Security audit           │
│ ✅ Lint check               │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│   Build Phase               │
│ ✅ Docker image build       │
│ ✅ Push to registry         │
│ ✅ Vulnerability scan       │
└─────────────────────────────┘
    ↓
develop → staging          main → production
    ↓                            ↓
Deploy to Staging          Create Release
    ↓                            ↓
Smoke Tests                 Database Backup
    ↓                            ↓
Auto-Tests Pass            Request Approval
    ↓                            ↓
Notify Slack           Wait for Approval
                             ↓
                       Deploy to Production
                             ↓
                       Smoke Tests + Health Checks
                             ↓
                       24h Monitoring
                             ↓
                       Auto-Rollback if Critical Error
```

## 📋 Documentation Guide

### For Deployment
👉 **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**
- Step-by-step deployment procedures
- Pre/post-deployment checklists
- Troubleshooting common issues
- Production deployment flow

### For Infrastructure Setup
👉 **[INFRASTRUCTURE_SETUP.md](INFRASTRUCTURE_SETUP.md)**
- Railway configuration
- Supabase setup
- Cloudflare DNS & CDN
- GitHub Actions integration
- Monitoring setup (Sentry, PagerDuty, Datadog)
- AWS S3 backups

### For Disaster Recovery
👉 **[DISASTER_RECOVERY.md](DISASTER_RECOVERY.md)**
- RTO/RPO targets
- Disaster scenarios with recovery steps
- Database recovery procedures
- Backup verification
- Monthly recovery drills

### For Incidents
👉 **[INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md)**
- Severity levels and response times
- Quick decision tree for common issues
- Escalation procedures
- Communication templates
- Post-incident review process

### For Launch
👉 **[LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)**
- 4-week pre-launch checklist
- Go/no-go decision framework
- 24-hour post-launch monitoring
- Launch day procedures

### For Day-to-Day Operations
👉 **[RUNBOOK.md](RUNBOOK.md)**
- Daily operations checklist
- Common tasks (scaling, caching, restarts)
- Performance optimization
- Security tasks
- Backup verification

## 🔧 Key Commands

### Deployment

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production v1.2.3

# Manual Railway deployment
railway link --project bitrent-production
railway up
```

### Database

```bash
# Create backup
./scripts/backup-database.sh production

# Restore from backup
./scripts/restore-database.sh production

# Run migrations
npm run migrate

# Verify database
npm run db:verify
```

### Testing

```bash
# Run all tests
npm test

# Run smoke tests
./scripts/smoke-tests.sh production https://bitrent.io

# Run health checks
./scripts/health-check.sh production --verbose

# Run performance tests
./scripts/performance-test.sh production https://bitrent.io 300
```

### Monitoring

```bash
# View logs
railway logs --tail 100

# Check service metrics
railway metrics

# Health check
curl https://bitrent.io/health

# Database performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Rollback

```bash
# Rollback to previous version
./scripts/rollback.sh

# Rollback to specific version
./scripts/rollback.sh v1.1.0

# Rollback production (requires confirmation)
./scripts/rollback.sh v1.1.0 production
```

## 🛡️ Security Features

- ✅ **SSL/TLS**: All connections encrypted
- ✅ **DDoS Protection**: Cloudflare WAF enabled
- ✅ **Rate Limiting**: Per-endpoint rate limits
- ✅ **Input Validation**: All inputs sanitized
- ✅ **SQL Injection Prevention**: Parameterized queries
- ✅ **CSRF Protection**: Token validation
- ✅ **XSS Protection**: Content Security Policy headers
- ✅ **Authentication**: JWT tokens with expiry
- ✅ **Authorization**: Role-based access control
- ✅ **Audit Logging**: All changes tracked
- ✅ **Secrets Management**: Environment variables in Railway
- ✅ **Regular Backups**: Automated daily backups

## 📊 Monitoring & Alerts

### Real-Time Monitoring

- **Sentry**: Error tracking and alerting
- **PagerDuty**: Incident management
- **UptimeRobot**: Health checks every 5 minutes
- **Datadog**: Infrastructure monitoring
- **Amplitude**: User analytics
- **LogRocket**: Session replay (frontend)

### Alerting Channels

- **Slack**: #incidents, #alerts, #deployments
- **PagerDuty**: Critical issues (on-call rotation)
- **Email**: Support notifications
- **Status Page**: User-facing status.bitrent.io

### Key Metrics

| Metric | Target | Alert |
|--------|--------|-------|
| Uptime | 99.9% | < 99% |
| Response Time | < 200ms | > 500ms |
| Error Rate | < 0.1% | > 1% |
| Database Load | < 80% | > 85% |

## 💾 Backup & Disaster Recovery

### Backup Strategy

- **Frequency**: Daily automated backups at 2 AM UTC
- **Retention**: 30-day rolling window
- **Storage**: AWS S3 with encryption
- **Verification**: Monthly restore tests
- **RTO**: 1-2 hours
- **RPO**: 1 hour

### Recovery Procedures

See [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md) for detailed procedures for:
- Database corruption
- Full service failure
- Data center outage
- Accidental data deletion
- Security incidents

## 🚦 Health & Status

### Status Page

👉 **https://status.bitrent.io**

Public status of all services with incident history.

### Health Endpoints

- **API Health**: `GET /health` (returns 200 OK)
- **Database**: `GET /api/v1/health/db` (checks database connectivity)
- **Cache**: `GET /api/v1/health/redis` (checks Redis)
- **Services**: `GET /api/v1/health/services` (checks all services)

## 📞 Support & Escalation

### Support Channels

- **Email**: support@bitrent.io
- **Slack**: #support (internal)
- **Status**: status.bitrent.io

### Escalation

| Issue | Escalate To | Time |
|-------|------------|------|
| Service Down | On-Call | 5 min |
| High Error Rate | DevOps Lead | 15 min |
| Unresolved Issues | CTO | 30 min |
| Business Impact | Executive | 1 hour |

### Contact List

- **On-Call**: PagerDuty rotation
- **DevOps**: devops@bitrent.io
- **Support**: support@bitrent.io
- **General**: contact@bitrent.io

## 📈 Performance Targets

- **Latency**: P95 < 200ms, P99 < 500ms
- **Throughput**: 1,000+ requests/second
- **Availability**: 99.9% uptime
- **Error Rate**: < 0.1% of requests
- **MTTR**: < 30 minutes for critical issues

## 🎯 Next Steps

### Before Launch

1. ✅ [Set up infrastructure](INFRASTRUCTURE_SETUP.md)
2. ✅ [Configure environments](INFRASTRUCTURE_SETUP.md#environment-variables)
3. ✅ [Run security audit](DEPLOYMENT_GUIDE.md#pre-deployment-checklist)
4. ✅ [Complete launch checklist](LAUNCH_CHECKLIST.md)
5. ✅ [Train team](RUNBOOK.md)
6. ✅ [Schedule on-call rotation](INCIDENT_RESPONSE.md#on-call-procedures)

### During Launch

1. ✅ [Follow deployment guide](DEPLOYMENT_GUIDE.md#production-deployment)
2. ✅ [Run smoke tests](scripts/smoke-tests.sh)
3. ✅ [Monitor health](scripts/health-check.sh)
4. ✅ [Watch for 24 hours](LAUNCH_CHECKLIST.md#post-launch-monitoring-24-hours)

### After Launch

1. ✅ [Review metrics](RUNBOOK.md#key-metrics-to-monitor)
2. ✅ [Optimize performance](RUNBOOK.md#performance-optimization)
3. ✅ [Plan improvements](INCIDENT_RESPONSE.md#post-incident-review)

## 🔗 Useful Links

- **GitHub Repository**: https://github.com/bitrent/bitrent
- **Railway Dashboard**: https://railway.app
- **Sentry Dashboard**: https://sentry.io
- **Status Page**: https://status.bitrent.io
- **Supabase Console**: https://supabase.com
- **Cloudflare Dashboard**: https://dash.cloudflare.com

## 📝 Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | Jan 2024 | Initial deployment setup |

## 📄 License

Copyright © 2024 BitRent. All rights reserved.

---

**Last Updated**: January 2024
**Maintained by**: DevOps & Infrastructure Team
**Next Review**: [Quarterly]

## Quick Help

- **"How do I deploy?"** → See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **"There's an incident!"** → See [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md)
- **"How do I set up infrastructure?"** → See [INFRASTRUCTURE_SETUP.md](INFRASTRUCTURE_SETUP.md)
- **"What's the disaster recovery plan?"** → See [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md)
- **"What are my daily tasks?"** → See [RUNBOOK.md](RUNBOOK.md)
- **"Are we ready to launch?"** → See [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)
