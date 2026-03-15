# BitRent Incident Response Playbook

Quick-reference guide for responding to production incidents.

## Incident Severity Levels

| Level | Impact | RTO | Response |
|-------|--------|-----|----------|
| 🔴 **P1** | Service down, all users | 30 min | Immediate |
| 🟠 **P2** | Service degraded | 2 hours | Within 15 min |
| 🟡 **P3** | Limited impact | 8 hours | Within 1 hour |
| 🟢 **P4** | Minor issue | 24 hours | Within 4 hours |

## On-Call Procedures

### Incident Acknowledgment

When alerted:

1. **Acknowledge alert** in PagerDuty (within 2 min)
2. **Assess situation** - Check status page and dashboards
3. **Decide severity** - Assign P1/P2/P3/P4
4. **Escalate if needed** - Call in additional team members for P1/P2
5. **Communicate** - Post in #incidents Slack channel

### Incident Commander Role

- Take ownership of incident
- Make go/no-go decisions
- Coordinate team response
- Manage communication
- Lead post-incident review

## Common Incidents & Responses

### 🔴 P1: Service Completely Down

**Symptoms**: All requests returning 500 or timeout errors

**Triage (< 2 min)**:
```bash
# 1. Verify issue is real
curl -v https://bitrent.io/health

# 2. Check status page
# Any maintenance windows?

# 3. Check monitoring
# Sentry: Any errors?
# Railway: Service healthy?
# Cloudflare: Any issues?
```

**Response (< 5 min)**:

```bash
# 1. Check recent deployments
railway logs --tail 50

# 2. If recent deploy, rollback
./scripts/rollback.sh

# 3. If not recent deploy, restart
railway restart

# 4. Wait 30 seconds and verify
curl https://bitrent.io/health

# 5. Run smoke tests
./scripts/smoke-tests.sh production https://bitrent.io
```

**If Still Down (< 10 min)**:

```bash
# Check database
psql $DATABASE_URL -c "SELECT 1;"

# Check Redis
redis-cli -u $REDIS_URL PING

# Check external services
curl https://api.stripe.com/health
curl https://supabase.co/health
```

**Communication**:
- Post in Slack #incidents: "🔴 P1: Service down, investigating..."
- Update status page: "🔴 Major Outage"
- Notify team: "Service down, need immediate response"

---

### 🟠 P2: Service Degraded (High Error Rate)

**Symptoms**: Errors on >50% of requests, slow response times

**Triage (< 3 min)**:
```bash
# 1. Identify error pattern
curl -H "Authorization: Bearer $SENTRY_TOKEN" \
  "https://sentry.io/api/0/organizations/bitrent/issues/?query=is:unresolved&statsPeriod=1h"

# 2. Check affected endpoints
curl -w "@curl-format.txt" https://bitrent.io/api/v1/miners

# 3. Check resource usage
# Via Railway dashboard: Check CPU, Memory, Network
```

**Response (< 10 min)**:

```bash
# 1. Scale up services if needed
railway service scale --cpus 2 --memory 1Gi

# 2. Clear caches
redis-cli -u $REDIS_URL FLUSHALL

# 3. Restart services
railway restart

# 4. Monitor recovery
./scripts/health-check.sh production --verbose
```

**If Error Pattern Identified**:

```bash
# 1. Identify problematic code
# Review Sentry issue details
# Check recent changes in git

# 2. If recent deploy:
./scripts/rollback.sh

# 3. If specific endpoint:
# Disable endpoint temporarily
# Route traffic elsewhere
```

**Communication**:
- Post: "🟠 P2: Service degraded, investigating..."
- Status page: "🟡 Partial Outage - some users affected"
- Updates: Every 5-10 minutes

---

### 🟡 P3: Database Performance Issues

**Symptoms**: Slow queries, database timeouts, query pool exhausted

**Triage (< 5 min)**:
```bash
# 1. Check slow queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# 2. Check connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Check disk usage
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('bitrent_prod'));"

# 4. Check lock status
psql $DATABASE_URL -c "SELECT * FROM pg_locks;"
```

**Response (< 15 min)**:

```bash
# 1. Kill long-running queries
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND now() - pg_stat_activity.state_change > interval '5 min';"

# 2. Vacuum database
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# 3. Increase pool size
export PG_POOL_SIZE=50
railway variables set PG_POOL_SIZE=50

# 4. Monitor recovery
./scripts/health-check.sh production --verbose
```

---

### 🟡 P3: High Error Rate on Specific Endpoint

**Symptoms**: One API endpoint returning many errors

**Triage (< 5 min)**:
```bash
# 1. Identify endpoint
# From Sentry: Which endpoint?

# 2. Check logs
curl -s https://bitrent.io/api/v1/rentals
# See the errors?

# 3. Check what changed
git log --oneline -10
```

**Response (< 15 min)**:

```bash
# 1. Investigate root cause
# Database? External service? Code bug?

# 2. Quick fix options:
# - Rollback if recent change
# - Restart service
# - Disable feature temporarily

# 3. For quick fix:
./scripts/rollback.sh

# 4. For quick workaround:
# Comment out problematic code
# Deploy hotfix
git commit -m "HOTFIX: Disable broken endpoint"
git push origin main
```

---

### 🟢 P4: Memory Leak

**Symptoms**: Memory usage continuously increasing, eventual crash

**Triage**:
```bash
# 1. Check memory trend
# Via Railway dashboard: Memory graph over time

# 2. Check for obvious leaks
# Review recent code changes
# Check for unfinished connections
```

**Response**:

```bash
# 1. Immediate: Restart service to free memory
railway restart

# 2. Medium-term: Identify leak
# Use Node.js heap snapshot tools
# node --inspect app.js

# 3. Long-term: Fix leak
# Add memory monitoring
# Regular restarts as temporary fix
```

---

## Quick Decision Tree

```
Is service completely down?
├─ YES → P1, Restart/Rollback immediately
└─ NO
   ├─ Is error rate > 50%?
   │  ├─ YES → P2, Scale up or rollback
   │  └─ NO
   │     └─ Is response time > 5s?
   │        ├─ YES → P3, Optimize database
   │        └─ NO → P4, Monitor and schedule fix
```

## Escalation Ladder

**When to escalate:**

```
Escalate to Level 2 if:
- P1 cannot be resolved in 15 minutes
- P2 cannot be resolved in 30 minutes
- P3 not improving after 45 minutes

Escalate to Level 3 (CTO) if:
- Level 2 escalation not resolved in 30 minutes
- Potential data loss or security issue
- Need decision on rollback or acceptance

Escalate to Level 4 (Executive) if:
- Estimated downtime > 2 hours
- Major customer impact
- Potential legal/compliance issue
```

## Communication Templates

### Initial Alert

```
🚨 INCIDENT ALERT
Service: [Name]
Severity: P[1-4]
Status: INVESTIGATING
Estimated Impact: [users/rentals/payments/etc]
Message: We're aware of the issue and investigating.
ETA: [15 minutes]
Updates: Every 5 minutes on #incidents
```

### Hourly Update

```
🔍 INVESTIGATION UPDATE
Duration: [X minutes]
Current Status: [Improving/Stable/Degrading]
Actions Taken: [List of actions]
Next Steps: [What we're doing next]
Estimated Resolution: [Time]
```

### All Clear

```
✅ INCIDENT RESOLVED
Resolved at: [Time]
Duration: [Total time]
Root Cause: [Brief explanation]
Impact: [How many users/rentals affected]
Preventive Measures: [What we're doing to prevent this]
Follow-up: Post-incident review scheduled for [date/time]
```

## Post-Incident Review

**Timeline**: Schedule within 24 hours

**Attendees**: Everyone involved + interested parties

**Template**:

```
1. Incident Summary
   - What happened?
   - When did it start?
   - How long until resolution?

2. Timeline
   - T+0: Initial alert
   - T+X: Root cause identified
   - T+Y: Fix deployed
   - T+Z: All clear

3. Root Cause Analysis
   - Primary cause: [What caused it?]
   - Contributing factors: [What made it worse?]
   - Why did we miss this? [Prevention?]

4. Action Items
   - [ ] Fix root cause
   - [ ] Add monitoring for early detection
   - [ ] Update documentation
   - [ ] Schedule team training

5. Lessons Learned
   - What went well? (Do more of this)
   - What could be better? (Do less of this)
   - What did we learn? (Remember for next time)
```

## Runbook Quick Links

- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Disaster Recovery Plan](DISASTER_RECOVERY.md)
- [Infrastructure Setup](INFRASTRUCTURE_SETUP.md)
- [Health Checks](scripts/health-check.sh)
- [Smoke Tests](scripts/smoke-tests.sh)
- [Rollback Procedure](scripts/rollback.sh)

## Emergency Contacts

| Role | Name | Phone | Email | Slack |
|------|------|-------|-------|-------|
| Incident Commander | [Name] | [Phone] | [Email] | @[handle] |
| DevOps Lead | [Name] | [Phone] | [Email] | @[handle] |
| Database Admin | [Name] | [Phone] | [Email] | @[handle] |
| Backend Lead | [Name] | [Phone] | [Email] | @[handle] |
| CTO | [Name] | [Phone] | [Email] | @[handle] |

## Useful Commands

```bash
# Check service health
curl https://bitrent.io/health

# View recent logs
railway logs --tail 100

# Check resources
railway metrics

# Restart service
railway restart

# Rollback to previous version
./scripts/rollback.sh

# Run health check
./scripts/health-check.sh production

# Run smoke tests
./scripts/smoke-tests.sh production https://bitrent.io

# Check Sentry for errors
curl -H "Authorization: Bearer $SENTRY_TOKEN" \
  "https://sentry.io/api/0/organizations/bitrent/issues/"

# Check database
psql $DATABASE_URL -c "SELECT 1;"

# Clear Redis cache
redis-cli -u $REDIS_URL FLUSHALL
```

---

**Remember**: Stay calm, follow the checklist, communicate clearly, and escalate early.
