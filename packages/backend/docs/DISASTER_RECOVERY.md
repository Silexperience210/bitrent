# BitRent Phase 5 - Disaster Recovery Plan

## Executive Summary

This document outlines BitRent's disaster recovery strategy with the goal of:
- **RTO (Recovery Time Objective)**: 1 hour
- **RPO (Recovery Point Objective)**: 1 hour
- **99.9% Uptime** during normal operations

## 1. Disaster Scenarios & Response

### 1.1 Database Corruption

**Severity**: CRITICAL  
**Detection**: Automated health checks, error rate spike  
**RTO**: 15 minutes  
**Response**:

```bash
# Step 1: Identify corruption
psql $DATABASE_URL -c "SELECT pg_database.datname FROM pg_database WHERE datname = 'postgres';"

# Step 2: Create backup of corrupted state (for forensics)
bash scripts/backup-database.sh production

# Step 3: Restore from previous backup
bash scripts/restore-database.sh /backups/bitrent_production_TIMESTAMP.sql.gz production

# Step 4: Verify data integrity
npm run verify-schema
npm run health-check

# Step 5: Notify team
# Automatic Slack notification sent
```

### 1.2 API Server Crash

**Severity**: CRITICAL  
**Detection**: UptimeRobot alert, health check failure  
**RTO**: 5 minutes  
**Response**:

```bash
# Step 1: Auto-restart (Railway does this automatically)
# Railway restart policy: always (3 retries with exponential backoff)

# Step 2: Check logs for error
railway logs -s bitrent-api --follow

# Step 3: If persistent, redeploy previous version
bash scripts/rollback.sh production

# Step 4: Debug the issue
# - Check dependencies
# - Check environment variables
# - Check external service connectivity
```

### 1.3 DDoS Attack

**Severity**: HIGH  
**Detection**: Cloudflare DDoS alerts, traffic spike  
**RTO**: Immediate  
**Response**:

```bash
# Step 1: Cloudflare automatically activates DDoS mitigation
# - Rate limiting: 50 req/min per IP
# - WAF rules active
# - Challenge for suspicious traffic

# Step 2: Monitor from Cloudflare dashboard
# - Analytics > Security

# Step 3: If severe, increase Cloudflare protection level
# - Dashboard > Security > DDoS Settings

# Step 4: Consider failover to backup endpoint
# - AWS CloudFront as additional CDN layer
```

### 1.4 Complete Data Center Failure

**Severity**: CATASTROPHIC  
**Detection**: All services down >15 min  
**RTO**: 1 hour  
**Response**:

```bash
# Step 1: Activate Disaster Recovery Plan
# - Notify CEO, CTO, DevOps team
# - Open war room channel
# - Start incident timer

# Step 2: Restore from S3 backup
aws s3 cp s3://bitrent-backups-prod/backups/latest.sql.gz ./

# Step 3: Provision new Railway deployment
# - Supabase can redirect to new instance
# - Create new Railway service
# - Restore database
# - Run migrations

# Step 4: Update DNS to point to new instance
# - Cloudflare DNS change (5 min to propagate)
# - Clear cloudflare cache

# Step 5: Verify functionality
bash scripts/smoke-tests.sh https://api.bitrent.io
```

### 1.5 Ransomware Attack

**Severity**: CATASTROPHIC  
**Detection**: Unauthorized file modifications, data encryption  
**RTO**: 2 hours  
**Response**:

```bash
# Step 1: Isolate systems immediately
# - Disable all database backups momentarily
# - Stop application servers
# - Preserve current state for forensics

# Step 2: Engage security team
# - Do NOT pay ransom
# - Contact law enforcement (if applicable)
# - Notify customers

# Step 3: Restore from clean backup
# - Use backup from 24 hours before attack
# - Verify integrity before restore

# Step 4: Security audit
# - Review access logs
# - Patch vulnerabilities
# - Implement additional security measures
```

## 2. Backup Strategy

### 2.1 Backup Types & Schedule

| Type | Frequency | Retention | Location | Encryption |
|------|-----------|-----------|----------|-----------|
| Supabase Managed | Daily | 30 days | Supabase | Yes |
| S3 Full Backup | Daily (2 AM) | 30 days | AWS S3 | AES-256 |
| S3 Weekly | Weekly | 12 weeks | AWS S3 | AES-256 |
| Weekly Archive | Weekly | 52 weeks | Glacier | AES-256 |

### 2.2 Automated Backup

```bash
# Crontab entry (runs daily at 2 AM UTC)
0 2 * * * /path/to/bitrent-backend/scripts/backup-database.sh production

# Verify cron is running
sudo systemctl status cron

# Check backup logs
tail -f /var/log/bitrent/backup.log
```

### 2.3 Backup Testing

**Monthly backup restore test**:

```bash
# 1. Get latest backup
LATEST_BACKUP=$(ls -t /backups/bitrent_production_*.sql.gz | head -1)

# 2. Provision test database in Supabase
# - Create "bitrent-test" project

# 3. Restore backup
bash scripts/restore-database.sh $LATEST_BACKUP staging

# 4. Run tests
npm run test:integration

# 5. Verify data
# - Check record counts
# - Verify referential integrity
# - Check recent transactions

# 6. Report results
# - Email team with results
# - Document any issues
```

## 3. Monitoring & Alerts

### 3.1 Health Checks

```bash
# Continuous health monitoring
bash scripts/health-check.sh https://api.bitrent.io

# Checks performed:
# - API /health endpoint (every 30s)
# - Database connectivity
# - Cache connectivity
# - External services
# - Response times
```

### 3.2 Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Response time | >200ms | >1s | Page on-call |
| Error rate | >1% | >5% | Page + Slack |
| CPU usage | >70% | >90% | Auto-scale |
| Memory usage | >80% | >95% | Restart + Alert |
| DB connections | >15/20 | >18/20 | Kill idle + Alert |
| Uptime | <99.5% | <99% | Incident review |

### 3.3 Monitoring Stack

- **Sentry**: Error tracking & alerting
- **Datadog**: Infrastructure metrics & dashboards
- **UptimeRobot**: External health checks
- **PagerDuty**: On-call escalation
- **Slack**: Team notifications

## 4. Incident Response Procedure

### 4.1 Detection

1. Automated alert → Slack → PagerDuty → On-call engineer

### 4.2 Response (First 15 minutes)

1. **Acknowledge alert** (acknowledge in PagerDuty)
2. **Assess severity**:
   - P1: Complete outage (respond immediately)
   - P2: Partial outage (respond within 15 min)
   - P3: Degradation (respond within 1 hour)
3. **Open war room** (Slack channel + voice call)
4. **Start tracking** (incident number, timeline)

### 4.3 Investigation (15-30 minutes)

1. **Check dashboards**:
   - Railway logs
   - Supabase metrics
   - Cloudflare analytics
   - Sentry errors
2. **Identify root cause**:
   - Database issue?
   - API crash?
   - External service?
   - DDoS attack?
3. **Communicate** (status updates every 5 min)

### 4.4 Resolution (30-60 minutes)

1. **Execute fix** (rollback, restart, scale, etc.)
2. **Verify health** (run smoke tests)
3. **Communicate** (resolution confirmed)
4. **Monitor** (enhanced monitoring for 24h)

### 4.5 Post-Incident (Within 24 hours)

1. **Incident review meeting**
2. **Root cause analysis**
3. **Action items** (fixes, monitoring improvements)
4. **Customer communication** (if needed)

## 5. Emergency Contacts

| Role | Person | Email | Phone | Backup |
|------|--------|-------|-------|--------|
| CTO | [Name] | cto@bitrent.io | +33 XX XX | - |
| DevOps Lead | [Name] | devops@bitrent.io | +33 XX XX | [Backup] |
| Database Admin | [Name] | dba@bitrent.io | +33 XX XX | [Backup] |
| Security Lead | [Name] | security@bitrent.io | +33 XX XX | [Backup] |

## 6. Communication Plan

### 6.1 Internal Communication

- **Slack channel**: #incidents
- **PagerDuty**: Escalation to on-call
- **Email**: High-severity incidents
- **War room**: Voice call for P1 incidents

### 6.2 External Communication

- **Status page**: https://bitrent-status.com
- **Email**: support@bitrent.io
- **Twitter**: @BitRentOfficial (if public incident)

### 6.3 Status Update Template

```
INCIDENT #001: Database Corruption
Severity: P1 (CRITICAL)
Status: INVESTIGATING
Duration: 12 minutes
Impact: All users unable to access rentals

ETA: Resolved within 30 minutes
Action: Restoring from backup (ETA 10 min)
```

## 7. Prevention Measures

### 7.1 Regular Audits

- **Weekly**: Database integrity check
- **Monthly**: Backup restore test
- **Quarterly**: Security audit
- **Quarterly**: Disaster recovery drill

### 7.2 Preventive Maintenance

- Keep dependencies updated
- Regular security patches
- Database optimization
- Log file rotation

### 7.3 Infrastructure Redundancy

- [Future] Multi-region deployment (Phase 5.1)
- [Future] Database replication (Phase 5.1)
- [Future] Load balancing (Phase 5.1)

## 8. Documentation

Required documentation:
- [ ] Runbook (detailed procedures)
- [ ] Contact list (regularly updated)
- [ ] Backup/restore procedures (tested monthly)
- [ ] Incident templates (standardized)
- [ ] Decision trees (troubleshooting)

## 9. Testing Schedule

```
Weekly:   Health check tests
Monthly:  Backup restoration test
Quarterly: Full disaster recovery drill
Annually: Comprehensive audit
```

## 10. Approval & Sign-Off

By reviewing and approving this plan, stakeholders acknowledge their responsibilities:

- [ ] CTO: Approves disaster recovery strategy
- [ ] DevOps Lead: Confirms procedures are documented and tested
- [ ] Security Lead: Reviews security implications
- [ ] CEO: Aware of RTO/RPO commitments

---

**Document Version**: 1.0  
**Last Updated**: March 2026  
**Next Review**: June 2026
