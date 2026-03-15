# BitRent Disaster Recovery Plan

Enterprise-grade disaster recovery procedures for BitRent.

## Table of Contents

1. [Overview](#overview)
2. [Disaster Scenarios](#disaster-scenarios)
3. [Recovery Procedures](#recovery-procedures)
4. [Testing & Validation](#testing--validation)
5. [Incident Response](#incident-response)
6. [Communication Plan](#communication-plan)

## Overview

### RTO & RPO Targets

| Scenario | RTO | RPO | Priority |
|----------|-----|-----|----------|
| Database corruption | 1 hour | 1 hour | 🔴 Critical |
| Full service failure | 2 hours | 30 min | 🔴 Critical |
| Data center outage | 4 hours | 1 hour | 🟠 High |
| Partial failure | 30 min | 15 min | 🟠 High |
| Minor issues | 24 hours | 24 hours | 🟡 Medium |

### Backup Strategy

```
┌─────────────────────────────────────────┐
│     Daily Point-in-Time Backups         │
│  (Automated at 2 AM UTC)                │
└────────────┬────────────────────────────┘
             │
        ┌────▼─────┬──────────┬─────────┐
        │           │          │         │
    ┌───▼──┐    ┌──▼───┐  ┌───▼──┐  ┌──▼──┐
    │ Day1 │    │Day2  │  │ ...  │  │Day30│
    └──────┘    └──────┘  └──────┘  └─────┘
        │           │          │         │
    30-day retention in AWS S3
```

## Disaster Scenarios

### Scenario 1: Database Corruption

**Trigger**: Data integrity errors, constraint violations, or data loss

**Detection**:
- Sentry alerts for database errors
- Failed database queries
- Data validation failures

**Recovery Steps**:

```bash
# 1. Identify backup point
aws s3 ls s3://bitrent-backups/production/ | tail -5

# 2. Stop writes to database (put in read-only mode)
psql $DATABASE_URL -c "ALTER DATABASE bitrent_prod SET default_transaction_read_only = true;"

# 3. Backup current state for forensics
./scripts/backup-database.sh production

# 4. Restore from last known good backup
./scripts/restore-database.sh production production_backup_20240115_020000.sql.gz

# 5. Verify data integrity
npm run db:verify

# 6. Re-enable writes
psql $DATABASE_URL -c "ALTER DATABASE bitrent_prod SET default_transaction_read_only = false;"

# 7. Run smoke tests
./scripts/smoke-tests.sh production https://bitrent.io

# 8. Monitor for 1 hour
./scripts/health-check.sh production --verbose
```

**RTO**: 1 hour | **RPO**: 1 hour

### Scenario 2: Full Service Failure

**Trigger**: Complete outage affecting all users

**Detection**:
- Health check fails for all endpoints
- Alerts from UptimeRobot
- PagerDuty incident triggered
- User reports of service unavailability

**Recovery Steps**:

```bash
# 1. Assess situation
curl -v https://bitrent.io/health

# 2. Check service status
railway logs --tail 50
docker ps

# 3. Attempt auto-recovery (services may restart automatically)
sleep 60 && ./scripts/health-check.sh production

# 4. If still down, restart services
railway restart

# 5. If still down, redeploy
./scripts/deploy.sh production

# 6. If still down, rollback to previous version
./scripts/rollback.sh

# 7. Check database
psql $DATABASE_URL -c "SELECT 1;"

# 8. If database is issue, restore from backup
./scripts/restore-database.sh production

# 9. Verify all systems operational
./scripts/smoke-tests.sh production https://bitrent.io
./scripts/performance-test.sh production https://bitrent.io 300
```

**RTO**: 2 hours | **RPO**: 30 minutes

### Scenario 3: Data Center Outage

**Trigger**: AWS region becomes unavailable

**Detection**:
- Connection timeouts to all services
- CloudWatch alerts
- Health checks report timeout errors

**Recovery Steps (Requires Multi-Region Setup)**:

```bash
# 1. Detect failover needed
if [[ $(curl -s -o /dev/null -w "%{http_code}" https://bitrent.io) != "200" ]]; then
  echo "Primary region down, initiating failover"
fi

# 2. Promote read replica to primary (if setup)
# In Supabase:
# - Go to Settings → Databases
# - Click "Promote Replica"

# 3. Update DNS to point to backup region
cloudflare dns update --name bitrent.io --type A --content <BACKUP_REGION_IP>

# 4. Wait for DNS propagation
sleep 300

# 5. Verify backup region operational
curl https://bitrent.io/health

# 6. Monitor transition
./scripts/health-check.sh production --verbose

# 7. Restore from backup if needed
./scripts/restore-database.sh production

# 8. Notify users of brief outage
# Send Slack message, status page update
```

**RTO**: 4 hours | **RPO**: 1 hour

### Scenario 4: Ransomware Attack

**Trigger**: Malicious code deployed, files encrypted

**Detection**:
- Unusual file modification patterns
- Sentry alerts for suspicious code execution
- Users report data corruption

**Immediate Actions**:

```bash
# 1. Take service offline immediately
railway stop

# 2. Notify security team
# Post in #security-incident Slack channel
# Trigger incident response

# 3. Preserve evidence for forensics
# Don't delete anything, backup current state for analysis

# 4. Isolate affected systems
# Revoke access tokens
# Disable deployment pipeline

# 5. Review audit logs
# Check GitHub Actions logs
# Check Railway deployment logs
```

**Long-term Recovery**:

```bash
# 1. Restore from clean backup (before attack)
./scripts/restore-database.sh production production_backup_CLEAN_DATE.sql.gz

# 2. Review and fix security vulnerabilities
npm audit
npm audit fix --force  # Use with caution

# 3. Rotate all secrets
# Database credentials
# API keys
# GitHub tokens
# AWS credentials

# 4. Redeploy from verified source
git log --oneline | head  # Verify clean commit history
./scripts/deploy.sh production

# 5. Run security audit
npm run security-audit

# 6. Enable enhanced monitoring
# Increase Sentry sampling
# Enable WAF protection
# Review and update security policies
```

**RTO**: 6+ hours | **RPO**: Varies based on backup age

### Scenario 5: Accidental Data Deletion

**Trigger**: User or script accidentally deletes important data

**Example**:
```bash
# Oops! Wrong DELETE statement
DELETE FROM rentals WHERE created_at < '2024-01-15';  -- Should have WHERE clause!
```

**Detection**:
- Sentry alert for unexpected data loss
- Users report missing data
- Monitoring detects unusual deletion patterns

**Recovery Steps**:

```bash
# 1. Identify deletion time
# Check application logs for exact time

# 2. Choose backup point before deletion
BACKUP_TIME="20240115_153000"  # Before the deletion

# 3. Restore from backup
./scripts/restore-database.sh production production_backup_${BACKUP_TIME}.sql.gz

# 4. Verify recovery
psql $DATABASE_URL -c "SELECT COUNT(*) FROM rentals;"

# 5. Re-apply any legitimate changes since backup
# Manually re-enter or replay from audit log

# 6. Run tests
npm test

# 7. Deploy
./scripts/deploy.sh production
```

**RTO**: 1-2 hours | **RPO**: 1 hour

## Recovery Procedures

### Database Recovery Checklist

```bash
# 1. Identify what needs recovery
[ ] Corrupted data
[ ] Accidental deletion
[ ] Schema issues
[ ] Connection problems

# 2. Assess impact
[ ] How much data affected?
[ ] How many users impacted?
[ ] Business impact?
[ ] Recovery priority?

# 3. Select backup point
[ ] Latest backup
[ ] Last known good
[ ] Specific point in time

# 4. Prepare recovery
[ ] Create forensic backup
[ ] Notify stakeholders
[ ] Prepare rollback plan

# 5. Execute recovery
[ ] Stop application writes
[ ] Restore database
[ ] Verify data integrity
[ ] Re-enable writes

# 6. Verify recovery
[ ] Run smoke tests
[ ] Check data accuracy
[ ] Monitor for issues

# 7. Document recovery
[ ] Root cause analysis
[ ] Preventive measures
[ ] Update procedures
```

### Application Recovery Checklist

```bash
# 1. Diagnose issue
docker logs bitrent-api
railway logs --tail 100

# 2. Determine recovery method
[ ] Service restart
[ ] Code rollback
[ ] Redeployment
[ ] Database recovery

# 3. Execute recovery
# Service restart
railway restart

# Code rollback
./scripts/rollback.sh

# Redeployment
./scripts/deploy.sh production

# 4. Verify recovery
curl https://bitrent.io/health
./scripts/smoke-tests.sh production https://bitrent.io

# 5. Monitor recovery
./scripts/health-check.sh production --verbose
```

### Backup Verification Steps

```bash
# 1. List available backups
aws s3 ls s3://bitrent-backups/production/ --recursive

# 2. Check backup file integrity
aws s3 ls s3://bitrent-backups/production/production_backup_20240115_020000.sql.gz

# 3. Download and verify
aws s3 cp s3://bitrent-backups/production/production_backup_20240115_020000.sql.gz ./
gzip -t production_backup_20240115_020000.sql.gz

# 4. Restore to test database
psql postgresql://test_user:password@test-db:5432/test_db < <(gunzip -c production_backup_20240115_020000.sql.gz)

# 5. Verify restored data
psql postgresql://test_user:password@test-db:5432/test_db -c "SELECT COUNT(*) FROM users;"
psql postgresql://test_user:password@test-db:5432/test_db -c "SELECT COUNT(*) FROM rentals;"

# 6. Check for consistency
psql postgresql://test_user:password@test-db:5432/test_db -c "SELECT * FROM users WHERE created_at > NOW() - INTERVAL '1 day';"
```

## Testing & Validation

### Monthly Recovery Drills

```bash
# First Monday of each month: Full recovery test

# 1. Schedule maintenance window
# 2. Notify team
# 3. Select random backup from past 30 days
# 4. Restore to staging environment
# 5. Run full test suite
# 6. Document results
# 7. Report findings
```

### Automated Backup Verification

```bash
# Weekly restore test (automated in GitHub Actions)
# See `.github/workflows/backup.yml` for test-restore job

# Results logged and monitored
# Alerts if restore fails

# Monthly full recovery drill
# Scheduled manually
```

### Disaster Recovery Runbook Review

- **Quarterly**: Review and update procedures
- **After each incident**: Update based on lessons learned
- **Annual**: Full audit and testing

## Incident Response

### Incident Response Team

| Role | Person | Contact |
|------|--------|---------|
| Incident Commander | DevOps Lead | [+33-phone] |
| Database Lead | DB Admin | [email] |
| Application Lead | Backend Lead | [email] |
| Communication | PM | [email] |
| Executive | CTO | [email] |

### Incident Response Process

**Phase 1: Detection (0-5 min)**
- Alert triggered
- Incident Commander notified
- Assessment begins

**Phase 2: Assessment (5-15 min)**
- Determine scope and severity
- Activate response team
- Begin communication

**Phase 3: Mitigation (15-60 min)**
- Execute recovery procedures
- Monitor progress
- Keep stakeholders updated

**Phase 4: Recovery (60+ min)**
- Full service restoration
- Verification and testing
- System stabilization

**Phase 5: Post-Incident (24+ hours)**
- Root cause analysis
- Corrective actions
- Documentation

### Severity Levels

| Level | Impact | RTO | Response |
|-------|--------|-----|----------|
| 🔴 Critical | Service down, users affected | 1h | Immediate |
| 🟠 High | Service degraded | 2-4h | Within 30 min |
| 🟡 Medium | Limited users affected | 8-24h | Within 2h |
| 🟢 Low | Minor issue | 1 week | Within 24h |

## Communication Plan

### Outage Notification Template

**Internal (Slack #incidents)**:
```
🚨 INCIDENT: [Service] is [DOWN/DEGRADED]
Severity: [CRITICAL/HIGH/MEDIUM/LOW]
Affected: [Users/Rentals/Payments/etc]
Estimated Duration: [TIME]
Actions: [What we're doing to fix it]
Updates every 15 minutes
```

**External (Status Page)**:
```
We're investigating issues with [Service].
Our team is working on a fix.
Updates available at status.bitrent.io
```

**Post-Incident**:
```
[Service] has been restored.
Root cause: [Explanation]
Actions taken: [Preventive measures]
Incident report: [Link]
```

### Escalation Contacts

```
Level 1 (On-call): [Phone/Slack]
Level 2 (DevOps Lead): [Phone/Email]
Level 3 (CTO): [Phone/Email]
Level 4 (Executive): [Phone/Email]
```

## Key Takeaways

✅ **Always maintain backups**
- Daily automated backups
- 30-day retention
- Test restores monthly

✅ **Prepare for disasters**
- Document procedures
- Train team regularly
- Test disaster scenarios

✅ **Communicate clearly**
- Status page
- Team notifications
- User updates

✅ **Learn from incidents**
- Root cause analysis
- Preventive measures
- Knowledge sharing

✅ **Monitor constantly**
- Health checks every 5 minutes
- Error tracking (Sentry)
- Performance monitoring (Datadog)

---

**Last Updated**: [Date]
**Next Review**: [Date]
**Tested**: [Date]
