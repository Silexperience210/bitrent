# BitRent Operations Runbook

Quick reference guide for day-to-day operations.

## Daily Operations Checklist

### Morning (9 AM)

- [ ] Review overnight logs
  ```bash
  railway logs --tail 100
  ```

- [ ] Check error rate
  ```bash
  curl -H "Authorization: Bearer $SENTRY_TOKEN" \
    "https://sentry.io/api/0/organizations/bitrent/issues/?query=is:unresolved&statsPeriod=24h"
  ```

- [ ] Check system health
  ```bash
  ./scripts/health-check.sh production
  ```

- [ ] Review alerts in Slack
  - Any PagerDuty alerts?
  - Any error spikes?

- [ ] Check database backups
  ```bash
  aws s3 ls s3://bitrent-backups/production/ | tail -1
  ```

### Evening (6 PM)

- [ ] Summary of daily metrics
- [ ] Any performance degradation?
- [ ] All backups completed?
- [ ] Prepare for handoff to on-call

## Common Tasks

### Scaling Up Services

**When**: High traffic, slow response times

```bash
# Check current resources
railway metrics

# Scale up CPU
railway service scale --cpus 2

# Scale up memory
railway service scale --memory 1Gi

# Monitor improvement
./scripts/performance-test.sh production https://bitrent.io 60
```

### Clearing Cache

**When**: Stale data, incorrect display

```bash
# Clear Redis cache
redis-cli -u $REDIS_URL FLUSHALL

# Clear Cloudflare cache
curl -X POST \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### Restarting Services

**When**: Hung processes, unresponsive service

```bash
# Graceful restart (completes current requests)
railway restart

# Monitor restart
sleep 30 && ./scripts/health-check.sh production
```

### Database Maintenance

**When**: Performance degradation, missing indexes

```bash
# Analyze and vacuum database
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Check table sizes
psql $DATABASE_URL -c "
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Identify slow queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Add index if needed
psql $DATABASE_URL -c "CREATE INDEX idx_rentals_user_id ON rentals(user_id);"
```

### Monitoring Specific Metrics

**API Response Time**:
```bash
curl -w "Response time: %{time_total}s\n" -o /dev/null -s https://bitrent.io/api/v1/miners
```

**Database Performance**:
```bash
# Check slow queries
psql $DATABASE_URL -c "\dt+" | grep -E "rentals|payments|users"

# Check query performance
EXPLAIN ANALYZE SELECT * FROM rentals WHERE user_id = 1;
```

**Memory Usage**:
```bash
# View current memory
railway metrics | grep -i memory

# If high, identify memory leaks
node --inspect app.js
# Connect to chrome://inspect
```

## Deployment Workflow

### Deploy to Staging

```bash
# 1. Merge to develop
git checkout develop
git merge feature/new-feature
git push origin develop

# GitHub Actions will automatically:
# - Run tests
# - Build and deploy
# - Run smoke tests
```

### Deploy to Production

```bash
# 1. Create release
git checkout main
git pull
git merge develop
git tag v1.2.3
git push origin v1.2.3

# GitHub Actions will:
# - Run full test suite
# - Create backup
# - Deploy to production
# - Request approval
```

### Hotfix Deployment

```bash
# 1. Create hotfix branch
git checkout main
git checkout -b hotfix/critical-issue

# 2. Fix issue
# ... make changes ...

# 3. Test locally
npm test

# 4. Deploy
git commit -m "HOTFIX: Critical issue fix"
git push origin hotfix/critical-issue
git create-pull-request --base main

# GitHub Actions will handle testing and deployment
```

## Troubleshooting

### Service Not Responding

```bash
# 1. Check if service is running
curl https://bitrent.io/health

# 2. Check logs
railway logs --tail 50

# 3. Check resources
railway metrics

# 4. Restart if needed
railway restart

# 5. If still not responding, rollback
./scripts/rollback.sh
```

### High Error Rate

```bash
# 1. Check Sentry for error pattern
curl -H "Authorization: Bearer $SENTRY_TOKEN" \
  "https://sentry.io/api/0/organizations/bitrent/issues/?query=is:unresolved"

# 2. Check logs
railway logs --tail 100 | grep ERROR

# 3. If recent deployment, rollback
git log --oneline | head -1
./scripts/rollback.sh

# 4. Otherwise, investigate and fix
# Make targeted fix, test, deploy
```

### Slow Database

```bash
# 1. Check slow queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# 2. Optimize query or add index
psql $DATABASE_URL -c "CREATE INDEX idx_name ON table(column);"

# 3. Vacuum to reclaim space
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# 4. Monitor improvement
./scripts/performance-test.sh production https://bitrent.io 60
```

### Out of Disk Space

```bash
# 1. Check disk usage
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('bitrent_prod'));"

# 2. Identify large tables
psql $DATABASE_URL -c "
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"

# 3. Archive old data if possible
psql $DATABASE_URL -c "DELETE FROM logs WHERE created_at < NOW() - INTERVAL '90 days';"

# 4. Upgrade database size if needed
# Via Supabase dashboard
```

## Performance Optimization

### Database Query Optimization

```bash
# Analyze current query
EXPLAIN ANALYZE SELECT * FROM rentals WHERE status = 'active';

# Add index if needed
CREATE INDEX idx_rentals_status ON rentals(status);

# Verify improvement
EXPLAIN ANALYZE SELECT * FROM rentals WHERE status = 'active';
```

### Caching Strategy

```bash
# Identify frequently accessed endpoints
grep -r "GET /api" ./logs | awk '{print $7}' | sort | uniq -c | sort -rn | head -10

# Cache those endpoints in Cloudflare
# Or in Redis for backend caching
```

### CDN Optimization

```bash
# Check cache hit rate
curl -I https://bitrent.io/api/v1/miners | grep CF-Cache

# Improve cache headers
# Via nginx.conf or Cloudflare rules
```

## Security Tasks

### Regular Security Checks

```bash
# Dependency audit
npm audit

# Fix vulnerabilities
npm audit fix

# Scan code
npm run lint

# Check for secrets in code
git log -p | grep -E "api_key|password|secret"
```

### SSL Certificate Renewal

```bash
# Check certificate expiry
echo | openssl s_client -servername bitrent.io -connect bitrent.io:443 2>/dev/null | openssl x509 -noout -dates

# Cloudflare handles auto-renewal, but verify:
# Dashboard → SSL/TLS → Origin Server
```

### Firewall Rules Review

```bash
# Check current WAF rules
cloudflare waf rules list

# Review rate limiting
cloudflare rate-limit list

# Update rules if needed
cloudflare rate-limit update --pattern "/api/*" --threshold 100
```

## Backup & Recovery

### Verify Daily Backups

```bash
# List recent backups
aws s3 ls s3://bitrent-backups/production/ | tail -5

# Verify backup integrity
aws s3 ls s3://bitrent-backups/production/production_backup_20240115_020000.sql.gz --summarize

# Test restore monthly
./scripts/restore-database.sh staging production_backup_20240115_020000.sql.gz
```

### Manual Backup

```bash
# Create manual backup
./scripts/backup-database.sh production

# Upload to S3
aws s3 cp ./backups/database/ s3://bitrent-backups/production/ --recursive
```

## Monitoring & Alerting

### Setting Up Alerts

```bash
# In PagerDuty:
1. New service: BitRent Production
2. Escalation policy: 5 min to Level 2, 10 min to CTO
3. Integration with Sentry, UptimeRobot

# In Slack:
1. Connect PagerDuty to #incidents
2. Connect Sentry to #errors
3. Connect UptimeRobot to #alerts
```

### Dashboard Access

- **Metrics**: https://railway.app → Metrics
- **Logs**: `railway logs`
- **Errors**: https://sentry.io
- **Status**: status.bitrent.io
- **Analytics**: https://amplitude.com

## Documentation Updates

### Keep Documentation Current

```bash
# Update runbook after major changes
vim RUNBOOK.md

# Update incident response after incidents
vim INCIDENT_RESPONSE.md

# Commit changes
git commit -m "docs: Update runbook for [change]"
git push origin main
```

## Support Escalation

### When to Escalate

| Situation | Escalate To | Action |
|-----------|------------|--------|
| Service down > 5 min | Level 2 | Call DevOps Lead |
| Unresolved > 15 min | Level 3 | Call CTO |
| Customer impact | PM | Notify Product Manager |
| Security issue | Security | Activate security protocol |
| High cost | Finance | Review usage |

### Contact Information

- **On-Call**: PagerDuty rotation
- **DevOps**: devops@bitrent.io
- **CTO**: cto@bitrent.io
- **Support**: support@bitrent.io

## Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Uptime | 99.9% | < 99.5% |
| Response Time | < 200ms | > 500ms |
| Error Rate | < 0.1% | > 1% |
| Database Load | Low | > 80% |
| Memory Usage | < 70% | > 85% |
| Disk Usage | < 70% | > 85% |
| Error Count | 0 | > 5/hour |

---

**Last Updated**: January 2024
**Version**: 1.0
**Maintained by**: DevOps Team
