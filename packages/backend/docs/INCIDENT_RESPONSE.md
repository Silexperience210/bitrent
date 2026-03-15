# BitRent Phase 5 - Incident Response Runbook

## Quick Reference

**Incident Severity Levels**:
- **P0 (CRITICAL)**: Complete outage, > 100 users affected, immediate action required
- **P1 (HIGH)**: Major functionality broken, 10-100 users affected, respond within 15 min
- **P2 (MEDIUM)**: Partial degradation, < 10 users affected, respond within 1 hour
- **P3 (LOW)**: Minor bug, no users affected yet, respond within 24 hours

## Section 1: P0 CRITICAL - Complete Outage

### Symptoms
- API completely unavailable (no HTTP response)
- All users can't access application
- UptimeRobot alerts with "DOWN"
- Error rate > 50%

### Immediate Actions (First 5 minutes)
```
1. Acknowledge alert in PagerDuty
2. Ping #launch team on Slack
3. Open war room: zoom.us/bitrent-incidents
4. Start war room: recording ON, 5 min updates
5. Get on call: +1 XXX-XXX-XXXX (bridge)
```

### Diagnosis (5-15 minutes)
```bash
# Check system status
railway status -s bitrent-api

# Check logs for errors
railway logs -s bitrent-api --follow | grep -i error

# Health check
curl -v https://api.bitrent.io/health

# Database check
curl https://api.bitrent.io/health/db

# External services
curl https://api.bitrent.io/health/external
```

### Common Causes & Solutions

#### A. API Server Crashed
```bash
# Signs: Service state = "Stopped" or "Unhealthy"

# Solution 1: Auto-restart (Railway does this)
# Wait 2-3 minutes for automatic restart

# Solution 2: Manual restart
railway restart -s bitrent-api

# Solution 3: Redeploy if restart fails
railway redeploy -s bitrent-api

# Verify: curl https://api.bitrent.io/health
```

#### B. Database Unreachable
```bash
# Signs: Database health check fails, connection timeouts

# Solution 1: Check Supabase status
# Go to https://supabase.io/status
# Check Supabase dashboard for alerts

# Solution 2: Reset database connection
# In Railway: restart service to reset connections

# Solution 3: Check network connectivity
ping db.project-ref.supabase.co

# Solution 4: Verify credentials
# Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

#### C. Out of Memory / CPU
```bash
# Signs: Slow responses, service restarts repeatedly

# Solution 1: Scale up Railway instance
# Railway Dashboard → Settings → Instance → Memory
# Increase from 512MB to 1GB (or higher)

# Solution 2: Check for memory leaks
railway logs -s bitrent-api | grep -i "memory"

# Solution 3: Restart service
railway restart -s bitrent-api

# Solution 4: Check for infinite loops
# Review recent code changes
```

#### D. Network/DNS Issue
```bash
# Signs: DNS resolution fails, timeout errors

# Solution 1: Check DNS
nslookup api.bitrent.io
nslookup api-staging.bitrent.io

# Solution 2: Flush DNS cache
# macOS: sudo dscacheutil -flushcache
# Linux: sudo systemctl restart systemd-resolved

# Solution 3: Check Cloudflare
# Go to Cloudflare dashboard
# Verify DNS records are correct

# Solution 4: Verify SSL certificate
curl -v https://api.bitrent.io
# Look for certificate errors
```

### Decision Point: Can we fix in < 15 minutes?

**YES** → Continue fixing  
**NO** → Prepare rollback (see "Rollback Procedure" section)

### Rollback Procedure (If unable to fix)

```bash
# Step 1: Confirm rollback decision with team
# "We're going to rollback to previous version"

# Step 2: Get previous deployment
railway list -s bitrent-api
# Note the previous DEPLOYMENT_ID

# Step 3: Execute rollback
bash scripts/rollback.sh production

# Step 4: Verify
curl https://api.bitrent.io/health
bash scripts/smoke-tests.sh https://api.bitrent.io

# Step 5: Update status
# Post in Slack: "We've rolled back to previous version. Working to resolve."
```

### Communication During P0
```
T+0:    Alert triggered
T+2:    Status: INVESTIGATING
T+5:    Status update + ETA
T+10:   Major update + action taken
T+15:   Decision: FIX or ROLLBACK
T+30:   Resolution + root cause summary
T+1h:   Post-incident review begins
```

---

## Section 2: P1 HIGH - Major Degradation

### Symptoms
- Some API endpoints responding slowly
- Error rate 5-50%
- Database queries slow
- 10-100 users affected

### Response Timeline

| Time | Action |
|------|--------|
| T+0 | Acknowledge alert |
| T+5 | Identify affected endpoint |
| T+10 | Check logs & metrics |
| T+15 | Implement fix or workaround |
| T+30 | Resolved or escalated to P0 |

### Diagnosis
```bash
# Which endpoint is slow?
# Check Sentry errors
# Go to https://sentry.io/bitrent-backend

# Database performance
railway logs -s bitrent-api | grep "query_time"

# Cache hit rate
curl https://api.bitrent.io/metrics | grep "cache"

# Check recent changes
git log --oneline -10
```

### Solutions

**Slow API endpoint:**
```javascript
// Check if it's a database query issue
// Review database indexes
// Add caching if applicable
// Optimize query

// Redeploy if code fix
git push origin main
# Wait for auto-deployment

// Or manually restart
railway restart -s bitrent-api
```

**Database slow:**
```bash
# Kill long-running queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# Restart connections
railway restart -s bitrent-api

# Scale up if needed
```

**High error rate:**
```bash
# Check Sentry for error types
# Implement retry logic if transient
# Fix code if bug
# Redeploy
```

---

## Section 3: P2 MEDIUM - Partial Outage

### Symptoms
- One feature broken
- < 10 users affected
- Error rate 0.1-5%
- Response time elevated but acceptable

### Response
1. **Acknowledge** (no immediate alert, check when available)
2. **Diagnose** (same process as P1)
3. **Fix** (can wait up to 1 hour)
4. **Verify** (run smoke tests)
5. **Communicate** (update Slack)

### Typical P2 Issues
- Feature flag misconfigured
- Third-party service rate limit hit
- Cache invalidation issue
- Minor data inconsistency

---

## Section 4: Database Recovery

### Scenario: Data Corruption or Logical Error

```bash
# Step 1: Confirm corruption
psql $DATABASE_URL
SELECT COUNT(*) FROM rentals;  # Check record count
SELECT * FROM rentals WHERE created_at > NOW() - '1 hour';

# Step 2: Create forensic backup
bash scripts/backup-database.sh production
# Save backup location for investigation

# Step 3: Get the backup to restore from
ls -lt /backups/bitrent_production_*.sql.gz | head -5

# Step 4: Restore from clean backup
bash scripts/restore-database.sh /backups/bitrent_production_YYYYMMDD_HHMMSS.sql.gz production

# Step 5: Verify
npm run verify-schema
curl https://api.bitrent.io/health/db

# Step 6: Investigation
# - What caused the corruption?
# - How can we prevent it?
# - Update DISASTER_RECOVERY.md
```

### Scenario: Lost Data (Accidental Deletion)

```bash
# Step 1: STOP all write operations
railway stop -s bitrent-api

# Step 2: Create backup of current state
bash scripts/backup-database.sh production

# Step 3: Identify point-in-time for recovery
# Check Supabase PITR (Point In Time Recovery)
# Available up to 7 days back

# Step 4: Restore to specific time
# This requires Supabase support for PITR
# Contact Supabase support team

# Step 5: Restart API
railway start -s bitrent-api

# Step 6: Verify restored data
curl https://api.bitrent.io/api/rentals/count
```

---

## Section 5: Security Incident

### Scenario: Potential Breach

```bash
# Step 1: Secure the environment
# - Rotate JWT_SECRET
# - Rotate NWC_SECRET
# - Rotate all API keys
# - Reset admin passwords

# Step 2: Audit logs
# - Check Supabase audit log for suspicious queries
# - Check Sentry for unauthorized API calls
# - Check Cloudflare logs for suspicious IPs

# Step 3: Assess impact
# - Did attacker access customer data?
# - Did attacker modify data?
# - Did attacker steal API keys?

# Step 4: Containment
# - Block suspicious IPs in Cloudflare WAF
# - Rotate credentials
# - Patch vulnerability
# - Redeploy

# Step 5: Recovery
# - Restore clean database backup if needed
# - Verify data integrity
# - Full audit

# Step 6: Communication
# - Notify affected users immediately
# - Update security policy
# - Consider bug bounty program

# Step 7: Post-incident
# - Security audit
# - Code review
# - SIEM integration
```

---

## Section 6: Performance Issues

### Symptom: Slow Responses (< 1s, but > 200ms)

```bash
# Check what's slow
# 1. API response time slow
#    → Check database query times
#    → Check external API calls
#    → Check cache hit rate

# 2. Database slow
#    → Run EXPLAIN ANALYZE on slow queries
#    → Check for missing indexes
#    → Monitor connection pool

# 3. External service slow
#    → Check service status (Sentry, Datadog, etc.)
#    → Implement timeout & retry logic
#    → Consider circuit breaker

# Solutions:
# 1. Database optimization
psql $DATABASE_URL -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# 2. Add caching
# - Redis for frequently accessed data
# - HTTP caching headers

# 3. Optimize code
# - Batch API calls
# - Implement pagination
# - Add indexes

# 4. Scale up
# - Increase Railway instance size
# - Add read replicas (future)
```

---

## Section 7: Post-Incident

### After any incident (P0, P1, P2):

```markdown
## Incident Report Template

**Incident ID**: [Auto-generated]
**Date/Time**: [When it happened]
**Duration**: [How long it lasted]
**Severity**: [P0/P1/P2]

### Summary
[Brief overview of what happened]

### Impact
- Users affected: [Number]
- Data lost: [Yes/No/Details]
- Services affected: [API/Frontend/Database/etc]

### Timeline
- T+0:00 - Alert triggered
- T+0:05 - Team responded
- T+0:15 - Root cause identified
- T+0:30 - Fix deployed
- T+0:45 - Verified & monitoring

### Root Cause
[What actually caused the issue?]

### Resolution
[How was it fixed?]

### Action Items
- [ ] Fix code issue (if applicable)
- [ ] Improve monitoring (if needed)
- [ ] Update documentation
- [ ] Team training on fix
- [ ] Follow-up with users

### Lessons Learned
- What went well?
- What could be improved?
- How do we prevent this?
```

### Schedule Retrospective

1. **Day 0 (incident day)**: Emergency response
2. **Day 1**: Initial post-mortem (30 min)
3. **Day 3**: Full retrospective (1 hour)
   - What happened?
   - Why it happened?
   - What we'll do differently?
   - Action item owners
4. **Day 7**: Verify action items completed

---

## Contact Information

| Role | Name | Email | Phone | Slack |
|------|------|-------|-------|-------|
| On-Call | @on-call | on-call@bitrent.io | +1 | @on-call |
| DevOps | DevOps Lead | devops@bitrent.io | +1 | @devops |
| Database | DBA | dba@bitrent.io | +1 | @dba |
| Security | Security Lead | security@bitrent.io | +1 | @security |
| CTO | CTO | cto@bitrent.io | +1 | @cto |

---

## External Support

| Service | Status Page | Support |
|---------|------------|---------|
| Railway | railway.app/status | support@railway.app |
| Supabase | status.supabase.com | support@supabase.io |
| Cloudflare | www.cloudflarestatus.com | support@cloudflare.com |
| Vercel | vercel.status.io | support@vercel.com |

---

**Version**: 1.0  
**Last Updated**: March 2026  
**Next Review**: June 2026
