# BitRent Infrastructure Setup Guide

Complete guide for setting up BitRent infrastructure from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Railway Setup](#railway-setup)
3. [Supabase Setup](#supabase-setup)
4. [Cloudflare Setup](#cloudflare-setup)
5. [GitHub Integration](#github-integration)
6. [Monitoring Setup](#monitoring-setup)
7. [Backup & Recovery](#backup--recovery)
8. [Cost Estimation](#cost-estimation)

## Prerequisites

### Accounts Required

- [ ] GitHub (repository)
- [ ] Railway (deployment platform)
- [ ] Supabase (database & auth)
- [ ] Cloudflare (DNS & CDN)
- [ ] Sentry (error tracking)
- [ ] Slack (notifications)
- [ ] AWS (backups storage)
- [ ] Stripe (payments)

### Tools Required

```bash
# Node.js
node --version  # Should be v20+

# Docker
docker --version
docker-compose --version

# Git
git --version

# Railway CLI
npm install -g @railway/cli

# AWS CLI
aws --version

# Terraform (optional, for IaC)
terraform --version
```

## Railway Setup

### Create Railway Account

1. Visit [railway.app](https://railway.app)
2. Sign up with GitHub account
3. Create new project: "BitRent"

### Create Environments

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link project
railway link --project bitrent

# Create development environment
railway env create development

# Create staging environment
railway env create staging

# Create production environment
railway env create production
```

### Configure Services

#### Development Environment

```bash
# Switch to development
railway env development

# Add PostgreSQL
railway service add postgres:16-alpine

# Add Redis
railway service add redis:7-alpine

# Configure environment variables
railway variables set NODE_ENV=development
railway variables set LOG_LEVEL=debug
railway variables set DATABASE_URL=${{ Postgres.DATABASE_URL }}
railway variables set REDIS_URL=${{ Redis.DATABASE_URL }}
```

#### Staging Environment

```bash
# Switch to staging
railway env staging

# Create Supabase database
# (See Supabase setup below)

# Configure variables
railway variables set NODE_ENV=production
railway variables set LOG_LEVEL=info
railway variables set DATABASE_URL=$SUPABASE_DATABASE_URL
railway variables set REDIS_URL=$REDIS_STAGING_URL
```

#### Production Environment

```bash
# Switch to production
railway env production

# Configure production database
railway variables set NODE_ENV=production
railway variables set LOG_LEVEL=warn
railway variables set DATABASE_URL=$SUPABASE_DATABASE_URL
railway variables set REDIS_URL=$REDIS_PRODUCTION_URL

# Set production secrets
railway variables set JWT_SECRET=$RANDOM_SECRET_KEY
railway variables set STRIPE_SECRET_KEY=$STRIPE_PROD_KEY
```

### Deploy Application

```bash
# Deploy to development
railway env development
railway up

# Deploy to staging
railway env staging
railway up

# Deploy to production
railway env production
railway up
```

## Supabase Setup

### Create Supabase Project

1. Visit [supabase.com](https://supabase.com)
2. Sign up or log in
3. Create new project:
   - **Name**: bitrent-staging (or bitrent-production)
   - **Region**: Frankfurt (eu-central-1)
   - **Database**: PostgreSQL 16
   - **Password**: Generate strong password

4. Note the connection details:
   - Project URL
   - Anon Key
   - Service Role Key

### Create Development Database (Local)

```bash
# Using Docker Compose (already configured)
docker-compose up -d postgres

# Connection: postgresql://bitrent:dev_password@localhost:5432/bitrent_dev
```

### Setup Database Replication (Production)

```bash
# For high availability, setup read replica
# In Supabase dashboard:
# 1. Go to Settings → Databases
# 2. Create Read Replica
# 3. Region: EU-WEST (London)
```

### Configure Authentication

```sql
-- Enable email authentication
UPDATE auth.config SET email_auth_enabled = true;

-- Enable GitHub OAuth
-- In Supabase: Authentication → Providers → GitHub
-- Add credentials from GitHub app
```

### Create Database Tables

```bash
# Run migrations
npm run migrate:prod

# Or manually:
psql $SUPABASE_DATABASE_URL -f ./infra/schema.sql

# Seed data
npm run seed:prod
```

### Enable Row Level Security (RLS)

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view their own data"
ON users
FOR SELECT
USING (auth.uid() = id);

-- Similar for other sensitive tables
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
```

## Cloudflare Setup

### Register Domain

1. Register **bitrent.io** with domain registrar
2. Get nameserver details
3. Add domain to Cloudflare

### Add Domain to Cloudflare

1. Visit [dash.cloudflare.com](https://dash.cloudflare.com)
2. Add Site → Enter bitrent.io
3. Select Free plan (or Pro for better features)
4. Update nameservers at registrar:
   - ns1.cloudflare.com
   - ns2.cloudflare.com

### Configure DNS Records

```bash
# A record: bitrent.io → Railway IP
# CNAME record: www.bitrent.io → bitrent.io
# MX records: mail.bitrent.io (if needed)

# Via Cloudflare CLI or dashboard:
cloudflare dns create --name bitrent.io --type A --content <RAILWAY_IP>
cloudflare dns create --name www --type CNAME --content bitrent.io
```

### Enable SSL/TLS

```bash
# In Cloudflare dashboard:
# 1. SSL/TLS → Overview
# 2. Set to "Full (Strict)" mode
# 3. Create origin certificate:
#    - Settings → Origin Server → Create Certificate
```

### Configure Caching Rules

```bash
# Cache API responses (longer TTL)
cloudflare rules create --pattern "/api/*" --cache-ttl 3600

# Cache static assets (very long TTL)
cloudflare rules create --pattern "/static/*" --cache-ttl 31536000

# Don't cache user-specific data
cloudflare rules create --pattern "/api/v1/profile" --cache-ttl 0
```

### Enable DDoS Protection

```bash
# In Cloudflare dashboard:
# 1. Security → DDoS
# 2. Set to "Aggressive"
# 3. Enable Rate Limiting:
#    - POST /api/* → 100 req/min
#    - GET /api/* → 1000 req/min
```

### Setup WAF Rules

```bash
# In Cloudflare dashboard:
# 1. Security → WAF
# 2. Enable Managed Rules:
#    - Cloudflare Managed Ruleset
#    - OWASP ModSecurity
#    - Exposed API Tokens
# 3. Create custom rules:
#    - Block known malicious IPs
#    - Rate limit login endpoint
```

## GitHub Integration

### Create GitHub App

1. Go to Settings → Developer settings → GitHub Apps
2. Create new GitHub App:
   - **Name**: BitRent Deployment
   - **Homepage URL**: https://bitrent.io
   - **Webhook URL**: https://api.railway.app/webhooks/github
   - **Permissions**: Read repository contents, Write deployments

3. Generate private key
4. Note Client ID and Secret

### Setup GitHub Secrets

For deployment automation, add these secrets to GitHub:

```bash
# Railway
RAILWAY_TOKEN=<railway_api_token>
RAILWAY_STAGING_ENV_ID=<staging_environment_id>
RAILWAY_PROD_ENV_ID=<production_environment_id>

# Cloudflare
CLOUDFLARE_API_TOKEN=<api_token>
CLOUDFLARE_ZONE_ID=<zone_id>

# AWS (for backups)
AWS_ROLE_TO_ASSUME=arn:aws:iam::ACCOUNT:role/GitHubActionsRole

# Slack
SLACK_WEBHOOK_URL=<webhook_url>

# Sentry
SENTRY_DSN=<sentry_dsn>
SENTRY_AUTH_TOKEN=<auth_token>

# PagerDuty
PAGERDUTY_INTEGRATION_KEY=<integration_key>

# Environment variables
DATABASE_URL_STAGING=<supabase_staging_url>
DATABASE_URL_PRODUCTION=<supabase_production_url>
```

### Create GitHub Deploy Keys

```bash
# Generate SSH key for Railway
ssh-keygen -t rsa -b 4096 -f github_railway_key

# Add public key to Railway
railway keys add < github_railway_key.pub

# Add private key to GitHub Secrets
gh secret set RAILWAY_SSH_KEY < github_railway_key
```

## Monitoring Setup

### Sentry Configuration

1. Create Sentry account at [sentry.io](https://sentry.io)
2. Create organization: BitRent
3. Create projects:
   - Frontend
   - Backend
   - Admin Dashboard

4. Get DSN for each project
5. Configure in environment variables

```env
SENTRY_DSN=https://YOUR_DSN@sentry.io/PROJECT_ID
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=0.1
```

### PagerDuty Setup (Alerts)

1. Create PagerDuty account
2. Create service: BitRent Production
3. Create escalation policy
4. Generate integration key
5. Add to GitHub Secrets: PAGERDUTY_INTEGRATION_KEY

### UptimeRobot (Health Monitoring)

1. Create UptimeRobot account
2. Create monitors:
   - Production API: https://bitrent.io/health (every 5 min)
   - Staging API: https://staging.bitrent.io/health (every 10 min)
3. Configure alerts to Slack/Email

### Datadog (Infrastructure Monitoring)

1. Create Datadog account
2. Install agent on Railway
3. Create dashboards for:
   - API response times
   - Database performance
   - Error rates
   - Memory/CPU usage

## Backup & Recovery

### Setup AWS S3 for Backups

```bash
# Create S3 bucket
aws s3 mb s3://bitrent-backups

# Create backup lifecycle policy
cat > lifecycle.json <<EOF
{
  "Rules": [
    {
      "Id": "DeleteOldBackups",
      "Filter": {"Prefix": "production/"},
      "Expiration": {"Days": 30},
      "Status": "Enabled"
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket bitrent-backups \
  --lifecycle-configuration file://lifecycle.json

# Enable versioning for data protection
aws s3api put-bucket-versioning \
  --bucket bitrent-backups \
  --versioning-configuration Status=Enabled
```

### Create IAM Role for GitHub Actions

```bash
# Create role for automated backups
aws iam create-role --role-name GitHubActionsRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "github.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach S3 policy
aws iam attach-role-policy --role-name GitHubActionsRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

### Configure Database Backups

Backups are automated via GitHub Actions (see `.github/workflows/backup.yml`):

- **Daily**: 2 AM UTC
- **Weekly full**: Monday 3 AM UTC
- **Retention**: 30 days

### Test Restore Procedure

```bash
# Monthly restore test (automated)
# See `.github/workflows/backup.yml` for test-restore job

# Manual restore test:
./scripts/restore-database.sh staging
npm run test:e2e
```

## Cost Estimation

### Monthly Infrastructure Costs

| Service | Free | Pro | Usage | Monthly Cost |
|---------|------|-----|-------|--------------|
| Railway | - | CPU/RAM | 2 CPU, 1GB | $20-50 |
| Supabase | 500MB | - | 10GB | $50-100 |
| Cloudflare | Yes | Better | - | $20-50 |
| Sentry | 5k events | - | 10k events | $0-50 |
| AWS S3 | 5GB | - | 10GB | $0.23 |
| Domain | - | - | bitrent.io | $10 |
| **TOTAL** | | | | **$100-260** |

### Cost Optimization

```bash
# 1. Use Railway free tier during development
# 2. Use Cloudflare free tier for basic needs
# 3. Optimize database queries to reduce usage
# 4. Use caching to reduce API calls
# 5. Setup auto-scaling (if needed)

# Monitor costs
railway billing --period current-month
aws ce get-cost-and-usage --time-period ...
```

## Troubleshooting Infrastructure Issues

### Railway Deployment Fails

```bash
# Check logs
railway logs --tail 100

# Check service status
railway status

# Restart service
railway restart

# Check environment variables
railway variables list
```

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# Increase pool size if needed
export PG_POOL_SIZE=50
```

### Cloudflare Caching Issues

```bash
# Purge cache
cloudflare cache purge --everything

# Check cache status
curl -I https://bitrent.io | grep -i "cf-cache"

# Disable caching for specific paths
# Add to Cloudflare rules
```

## Next Steps

1. ✅ Complete infrastructure setup
2. ✅ Configure monitoring and alerts
3. ✅ Setup backups and recovery
4. ✅ Configure GitHub Actions for CI/CD
5. ✅ Perform security audit
6. ✅ Load testing and optimization
7. 🚀 Go live!

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for deployment instructions.
