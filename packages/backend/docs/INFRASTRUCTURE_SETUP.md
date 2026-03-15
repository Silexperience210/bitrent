# BitRent Phase 5 - Infrastructure Setup Guide

## Overview

This guide covers setting up the production infrastructure for BitRent Phase 5 using Railway, Supabase, Vercel, and Cloudflare.

## Prerequisites

- GitHub account
- Railway account (railway.app)
- Supabase account (supabase.com)
- Vercel account (vercel.com)
- Cloudflare account (cloudflare.com)
- Domain name (bitrent.io)
- AWS account (for S3 backups)

## 1. Infrastructure Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CDN & DNS (Cloudflare)            │
└────────┬────────────────────────────────────────────┘
         │
    ┌────┴─────────────────────────┐
    │                              │
┌───▼────────┐             ┌──────▼──────┐
│  Frontend  │             │  Backend    │
│  (Vercel)  │             │  (Railway)  │
└────────────┘             └──────┬──────┘
                                  │
                          ┌───────▼─────────┐
                          │   Database      │
                          │  (Supabase)     │
                          └─────────────────┘
```

## 2. Supabase Setup (Database)

### 2.1 Create Production Project

1. Go to https://supabase.com
2. Create a new project:
   - **Name**: bitrent-production
   - **Database Password**: Generate strong password (save in secure vault)
   - **Region**: EU-west-1 (Ireland) for GDPR compliance
3. Wait 2-3 minutes for project to initialize

### 2.2 Database Configuration

1. Go to **Settings > Database**
   - Enable **Point in time recovery** (7 days)
   - Set **Backup schedule** to Daily at 2 AM
   - Set **Backup retention** to 30 days

2. Configure **Connection pooling** (PgBouncer):
   - Mode: Transaction
   - Max pool size: 20
   - Timeout: 3s

3. Database extensions:
   - pgcrypto (enabled by default)
   - uuid-ossp (enable via SQL)
   - pg_trgm (for full-text search)

### 2.3 Run Migrations

```bash
# Get database URL
SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-key-here"

# Run migrations
npm run migrate

# Verify schema
psql $DATABASE_URL -c "\dt"
```

### 2.4 Enable Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE mineurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies (see SECURITY.md)
```

## 3. Railway Setup (Backend)

### 3.1 Create Railway Project

1. Go to https://railway.app
2. Create new project:
   - Connect GitHub account
   - Select bitrent-backend repository
   - Configure auto-deploy on push to `main`

### 3.2 Environment Configuration

Set environment variables in Railway dashboard:

```bash
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT & Security
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRY=7d

# NWC (Nostr Wallet Connect)
NWC_RELAY_URL=wss://relay.bitcoin.co
NWC_PUBKEY=your-pubkey
NWC_SECRET=your-secret

# Monitoring
SENTRY_DSN=your-sentry-dsn
DATADOG_API_KEY=your-datadog-key

# CORS & Domain
CORS_ORIGIN=https://bitrent.io,https://www.bitrent.io
API_BASE_URL=https://api.bitrent.io
```

### 3.3 Domain Configuration

1. In Railway dashboard → **Settings > Domain**
2. Add custom domain: `api.bitrent.io`
3. Configure DNS records (see Cloudflare section)
4. SSL certificate auto-provisioned by Railway

### 3.4 Scaling Configuration

In **Settings > Instance**:
- CPU: 0.5 shared
- Memory: 512 MB (start), can scale up
- Restart policy: Always

## 4. Vercel Setup (Frontend)

### 4.1 Deploy Frontend

1. Go to https://vercel.com
2. Import bitrent-frontend repository
3. Configure environment variables:

```bash
REACT_APP_API_BASE_URL=https://api.bitrent.io
REACT_APP_ANALYTICS_ID=your-analytics-id
```

### 4.2 Domain Configuration

1. Add custom domain: `bitrent.io`
2. Configure DNS delegation
3. SSL auto-enabled

## 5. Cloudflare Setup (CDN & DNS)

### 5.1 Add Domain

1. Go to https://cloudflare.com
2. Add site: bitrent.io
3. Update nameservers at domain registrar:
   - ns1.cloudflare.com
   - ns2.cloudflare.com

### 5.2 DNS Records

```dns
# API (Railway)
Name: api
Type: CNAME
Value: railway-project.up.railway.app

# WWW (Vercel)
Name: www
Type: CNAME
Value: bitrent.vercel.app

# Root (Vercel)
Name: @
Type: CNAME
Value: bitrent.vercel.app

# Email (if needed)
Name: @
Type: MX
Priority: 10
Value: mail.bitrent.io
```

### 5.3 SSL/TLS Configuration

1. **SSL/TLS > Overview**: Full (Strict) encryption
2. **Edge Certificates**: Auto renew enabled
3. **Min TLS Version**: 1.2

### 5.4 Security Rules

1. **WAF > Managed Rules**
   - Enable OWASP ModSecurity Core Rule Set
   - Enable Rate limiting rules

2. **Firewall > Rules**
   ```
   # Block all except whitelisted countries
   (cf.country not in {"FR" "DE" "US" "GB"})
   ```

3. **DDoS Protection**
   - Sensitivity: High
   - Challenge: On
   - Rate limiting: 50 req/min

### 5.5 Caching Rules

```
# Cache HTML
URL: /
Cache Level: Cache Everything
Browser Cache TTL: 30 minutes

# Cache static assets
URL: /static/*
Cache Level: Cache Everything
Browser Cache TTL: 1 month

# Don't cache API
URL: /api/*
Cache Level: Bypass
```

## 6. Database Backups

### 6.1 Supabase Automated Backups

Already configured in Supabase (daily at 2 AM, 30-day retention).

### 6.2 S3 Backups (Additional)

```bash
# Create S3 bucket
aws s3api create-bucket \
  --bucket bitrent-backups-prod \
  --region eu-west-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket bitrent-backups-prod \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket bitrent-backups-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### 6.3 Backup Schedule

```bash
# Add to crontab (runs at 2 AM daily)
0 2 * * * /path/to/bitrent-backend/scripts/backup-database.sh production

# Verify backups
aws s3 ls s3://bitrent-backups-prod/backups/
```

## 7. Monitoring Setup

### 7.1 Sentry (Error Tracking)

1. Create Sentry account: https://sentry.io
2. Create project for bitrent-backend
3. Get DSN: `https://key@sentry.io/project-id`
4. Add to environment variables

### 7.2 Datadog (Infrastructure)

1. Create Datadog account: https://datadog.com
2. Install Datadog agent (optional, not needed for basic monitoring)
3. Setup dashboards for:
   - API response times
   - Error rates
   - Database metrics

### 7.3 UptimeRobot (Health Checks)

1. Create UptimeRobot account
2. Create monitors:
   - `https://api.bitrent.io/health` (every 5 min)
   - `https://bitrent.io` (every 5 min)
3. Configure alerts to Slack

### 7.4 PagerDuty (On-Call)

1. Create PagerDuty account
2. Setup escalation policy
3. Create service for BitRent backend
4. Configure alerts from Sentry/Datadog

## 8. Security Hardening

### 8.1 API Security

```javascript
// helmet.js (already configured)
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- Rate limiting (100 req/15min per IP)
```

### 8.2 Database Security

- All connections use SSL/TLS
- Service role key stored in Railway secrets
- Supabase RLS enabled on all tables
- PostgreSQL version: 15.1 (latest)

### 8.3 Network Security

- Supabase: Private network access via Railway
- No direct database access from internet
- VPC configuration (if using Railway advanced)

## 9. Cost Optimization

```
Monthly Costs Estimate:
- Railway backend: $10-50 (usage-based)
- Supabase database: $25-100 (usage-based)
- Vercel frontend: $0-20 (pro plan)
- Cloudflare: $20 (pro plan)
- S3 backups: ~$1-5
- Monitoring: $0-50
---
TOTAL: $56-245/month
```

## 10. Deployment Checklist

- [ ] Supabase project created and configured
- [ ] Railway project deployed
- [ ] Vercel frontend deployed
- [ ] Cloudflare DNS configured
- [ ] SSL certificates active
- [ ] Health checks passing
- [ ] Backups tested
- [ ] Monitoring configured
- [ ] Team access provisioned
- [ ] Documentation updated

## Next Steps

1. **Phase 5A**: Multi-environment (staging)
2. **Phase 5B**: Deployment automation (GitHub Actions)
3. **Phase 5C**: Disaster recovery testing
4. **Phase 5D**: Launch preparation
5. **Phase 5E**: Go-live

## Support

For infrastructure issues:
1. Check Railway dashboard
2. Check Supabase dashboard
3. Check Cloudflare logs
4. Review error logs
5. Contact support teams
