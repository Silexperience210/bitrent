# BitRent Deployment Guide

Complete guide for deploying BitRent across all environments.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Development Deployment](#development-deployment)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Rollback Procedures](#rollback-procedures)
7. [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm or yarn
- Git
- Railway CLI (for production)
- AWS CLI (for backups)

### Clone and Setup

```bash
git clone https://github.com/bitrent/bitrent.git
cd bitrent

# Copy environment files
cp .env.development.example .env.development
cp .env.staging.example .env.staging
cp .env.production.example .env.production

# Install dependencies
npm install

# Start development environment
docker-compose up -d
npm run dev
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Users                             │
└─────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                  │
┌───────▼────────┐ ┌─────▼──────────┐ ┌────▼────────┐
│   Cloudflare   │ │   Vercel CDN   │ │  Analytics  │
│  (DDoS, Cache) │ │   (Frontend)   │ │   (Sentry)  │
└────────────────┘ └────────────────┘ └─────────────┘
        │                                    │
        └────────────────┬────────────────────┘
                         │
                    ┌────▼──────┐
                    │   Railway  │
                    │  (Backend) │
                    └────┬───────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
    ┌─────▼────┐  ┌─────▼────┐  ┌─────▼────┐
    │ Supabase │  │   Redis  │  │  Sentry  │
    │ (DB/Auth)│  │ (Cache)  │  │  (Logs)  │
    └──────────┘  └──────────┘  └──────────┘
```

## Development Deployment

### Local Development with Docker Compose

```bash
# Start services
docker-compose up -d

# Check services
docker-compose ps

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Manual Development Deployment

```bash
# Install dependencies
npm install

# Run migrations
npm run migrate

# Seed database (optional)
npm run seed:dev

# Start development server
npm run dev

# URL: http://localhost:3000
```

### Database Setup

```bash
# Create database
npm run db:create

# Run migrations
npm run db:migrate

# Seed data
npm run db:seed

# Reset database
npm run db:reset
```

## Staging Deployment

### Automated Deployment

Staging is automatically deployed when pushing to the `develop` branch.

```bash
# Push to develop to trigger auto-deployment
git checkout develop
git pull origin develop
git merge feature/your-feature
git push origin develop
```

GitHub Actions will automatically:
1. Run tests
2. Build Docker image
3. Deploy to Railway staging
4. Run smoke tests
5. Notify Slack

### Manual Staging Deployment

```bash
# Deploy using deployment script
./scripts/deploy.sh staging

# Or use Railway directly
railway link --project bitrent-staging
railway up

# Run health checks
./scripts/health-check.sh staging
./scripts/smoke-tests.sh staging https://staging.bitrent.io
```

### Monitoring Staging

```bash
# View logs
railway logs

# Monitor metrics
# Visit: https://staging.bitrent.io/metrics

# Check Sentry for errors
# Visit: https://sentry.io/organizations/bitrent
```

## Production Deployment

### Deployment Requirements

✅ All tests passing
✅ Security audit complete
✅ Code review approved
✅ Performance benchmarks met
✅ Database backup created
✅ Rollback procedure ready

### Automated Deployment

Production deployments require approval and follow this flow:

```
Merge to main
    ↓
Tests run
    ↓
Staging deployment + smoke tests
    ↓
Production approval request (GitHub issue)
    ↓
Approval received
    ↓
Database backup
    ↓
Production deployment
    ↓
Smoke tests + health checks
    ↓
24h monitoring window
```

### Manual Production Deployment

```bash
# 1. Prepare release
git checkout main
git pull origin main
npm install
npm run build

# 2. Create backup
./scripts/backup-database.sh production

# 3. Run pre-deployment checks
./scripts/health-check.sh production

# 4. Deploy
./scripts/deploy.sh production v1.2.3

# 5. Verify
./scripts/smoke-tests.sh production https://bitrent.io
./scripts/health-check.sh production --verbose

# 6. Monitor
./scripts/performance-test.sh production https://bitrent.io 300
```

### Production Deployment Steps

#### 1. Pre-Deployment Checklist

```bash
# Verify all tests pass
npm test

# Run security audit
npm audit

# Check coverage
npm run test:coverage

# Verify database backups
aws s3 ls s3://bitrent-backups/production/

# Check Sentry for unresolved issues
curl -H "Authorization: Bearer $SENTRY_TOKEN" \
  https://sentry.io/api/0/organizations/bitrent/issues/
```

#### 2. Create Backup

```bash
# Backup production database
./scripts/backup-database.sh production

# Verify backup
ls -lh ./backups/database/production_backup_*.sql.gz

# Upload to S3
aws s3 cp ./backups/database/ s3://bitrent-backups/production/ --recursive
```

#### 3. Deploy

```bash
# Deploy to production
./scripts/deploy.sh production

# Monitor deployment progress
railway logs --tail 100

# Check deployment status
railway status
```

#### 4. Post-Deployment Verification

```bash
# Run smoke tests
./scripts/smoke-tests.sh production https://bitrent.io

# Health check
./scripts/health-check.sh production --verbose

# Performance check
./scripts/performance-test.sh production https://bitrent.io 60

# Check Sentry for errors
curl -H "Authorization: Bearer $SENTRY_TOKEN" \
  https://sentry.io/api/0/organizations/bitrent/issues/ | jq '.[] | select(.level=="error")'

# Monitor real-time metrics
# Visit https://bitrent.io/metrics
```

#### 5. Monitoring (24h Window)

During the first 24 hours after production deployment:

- **Immediate (0-1h)**: Monitor error rates, response times, database load
- **Short-term (1-6h)**: Check for user-reported issues, validate key features
- **Medium-term (6-24h)**: Analyze performance metrics, user behavior

Key metrics to watch:

```bash
# API Response Time
curl -w "@curl-format.txt" -o /dev/null -s https://bitrent.io/api/v1/miners

# Error Rate (from Sentry)
curl -H "Authorization: Bearer $SENTRY_TOKEN" \
  "https://sentry.io/api/0/organizations/bitrent/events/?query=level:error&statsPeriod=24h"

# Database Performance
# Check Railway dashboard for query times

# User Activity
# Check Amplitude for active users, rentals created, payments processed
```

## Rollback Procedures

### Automatic Rollback

BitRent automatically rolls back to the previous version if:

- Critical errors detected in Sentry (> 5 errors in 1 hour)
- Health check fails for > 5 minutes
- Database connection fails
- API response time > 10s

### Manual Rollback

#### Triggered from GitHub UI

1. Go to Actions → Rollback Deployment
2. Click "Run workflow"
3. Select environment and version
4. Click "Run"

GitHub Actions will:
- Fetch previous version
- Create database backup
- Deploy rolled-back version
- Run smoke tests
- Verify functionality

#### Command Line Rollback

```bash
# Rollback to previous version
./scripts/rollback.sh

# Rollback to specific version
./scripts/rollback.sh v1.1.0

# Rollback staging
./scripts/rollback.sh v1.1.0 staging

# Rollback production (requires confirmation)
./scripts/rollback.sh v1.1.0 production
```

### Rollback Verification

```bash
# Check current version
curl https://bitrent.io/api/v1/version

# Run health checks
./scripts/health-check.sh production --verbose

# Run smoke tests
./scripts/smoke-tests.sh production https://bitrent.io

# Monitor for errors
# Check Sentry dashboard
# Monitor Slack alerts
```

### Database Rollback (if needed)

```bash
# List available backups
aws s3 ls s3://bitrent-backups/production/

# Restore specific backup
./scripts/restore-database.sh production s3://bitrent-backups/production/production_backup_20240115_120000.sql.gz

# Verify restored data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM rentals;"
```

## Troubleshooting

### Deployment Fails

**Problem**: Deployment script exits with error

**Solutions**:

```bash
# 1. Check logs
docker logs bitrent-api

# 2. Verify environment variables
env | grep -E "^(NODE_ENV|DATABASE_URL|REDIS_URL)"

# 3. Check database connection
npm run db:verify

# 4. Check Docker images
docker images | grep bitrent

# 5. Rebuild Docker image
docker build -t bitrent:latest .
```

### Database Migration Fails

**Problem**: Migration script errors during deployment

**Solutions**:

```bash
# 1. Check migration status
npm run db:status

# 2. Rollback to previous migration
npm run db:migrate:down

# 3. Fix migration and try again
npm run db:migrate:up

# 4. If all else fails, restore from backup
./scripts/restore-database.sh production
```

### Health Check Fails

**Problem**: Health check endpoint returns 500

**Solutions**:

```bash
# 1. Check API logs
railway logs --tail 100

# 2. Verify database connection
curl -X POST https://bitrent.io/api/v1/db-health

# 3. Check Redis connection
redis-cli -u redis://redis:6379 PING

# 4. Restart services
railway restart

# 5. If still failing, rollback
./scripts/rollback.sh
```

### High Error Rate

**Problem**: Sentry shows many errors after deployment

**Steps**:

1. **Monitor** (5 min): Confirm error rate is actually elevated
2. **Investigate** (10 min): Check Sentry for error patterns
3. **Decide** (2 min): Determine if critical or can be left
4. **Act** (5 min): Either fix or rollback

```bash
# Check error details
curl -H "Authorization: Bearer $SENTRY_TOKEN" \
  "https://sentry.io/api/0/organizations/bitrent/issues/?query=is:unresolved" | jq

# If critical, rollback
./scripts/rollback.sh

# Otherwise, create issue and fix in next release
gh issue create --title "Fix critical error: ..." --body "Error details..."
```

### Performance Degradation

**Problem**: Response times > 200ms after deployment

**Solutions**:

```bash
# 1. Check database performance
psql $DATABASE_URL -c "SELECT query_time FROM pg_stat_statements ORDER BY query_time DESC LIMIT 10;"

# 2. Check Redis cache hit rate
redis-cli --stat

# 3. Check CPU/Memory usage
# Via Railway dashboard: Infrastructure → Metrics

# 4. If needed, scale up
railway service scale --cpus 2 --memory 512Mi

# 5. Or rollback if critical
./scripts/rollback.sh
```

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Code review approved
- [ ] Security audit complete
- [ ] Performance benchmarks met
- [ ] Database backup created
- [ ] Rollback procedure tested
- [ ] Team notified
- [ ] Monitoring configured

### During Deployment

- [ ] Deployment script running
- [ ] Watch deployment progress
- [ ] Monitor error rate (should be 0)
- [ ] Check response times
- [ ] Verify critical features work

### Post-Deployment

- [ ] Smoke tests pass
- [ ] Health checks pass
- [ ] Performance tests pass
- [ ] Monitor for 24 hours
- [ ] Close deployment issue
- [ ] Create release notes
- [ ] Update status page

## Support

For deployment issues:

1. Check this guide
2. Check GitHub Actions logs
3. Check Sentry for errors
4. Check Railway logs
5. Ask in #deployments Slack channel
6. Contact devops team: devops@bitrent.io
