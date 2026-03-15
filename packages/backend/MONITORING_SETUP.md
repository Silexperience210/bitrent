# BitRent Phase 4: Monitoring & Observability Setup

## Overview

Comprehensive monitoring stack for BitRent covering errors, logs, metrics, and alerting.

## Monitoring Stack

```
Application
    ↓
┌─────────┬──────────┬──────────┬─────────┐
│ Sentry  │ Winston  │Prometheus│ Health  │
└─────────┴──────────┴──────────┴─────────┘
    ↓         ↓           ↓         ↓
┌─────────────────────────────────────────┐
│    Dashboards & Alerting                │
│  - Grafana, Datadog, Slack, PagerDuty   │
└─────────────────────────────────────────┘
```

## 1. Error Tracking - Sentry

### Setup

```javascript
// server.js
import { initSentry, sentryErrorHandler } from './monitoring/sentry.js';

initSentry();
app.use(sentryErrorHandler);
```

### Configuration

```env
SENTRY_DSN=https://key@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

### Usage

```javascript
import { captureException, addBreadcrumb, setUserContext } from './monitoring/sentry.js';

// Set user context
setUserContext(userId, userEmail);

// Log breadcrumbs for tracking
addBreadcrumb('User initiated payment', { amount: 0.001 });

// Capture exceptions
try {
  await processPayment(payment);
} catch (error) {
  captureException(error, { context: 'payment_processing' });
}
```

### Sentry Dashboard

Access at: `https://sentry.io`

Features:
- Real-time error tracking
- Stack traces with source maps
- User context & breadcrumbs
- Release tracking
- Performance monitoring

### Alerts in Sentry

```
Issues → Create Alert Rule
  
Trigger: Error threshold exceeded
Action: Send to Slack/Email
```

## 2. Logging - Winston

### Setup

```javascript
// server.js
import { logger, httpLogger } from './monitoring/logging.js';

app.use(httpLogger);
```

### Log Files

```
logs/
├── error.log       # Error level logs
├── combined.log    # All logs
└── debug.log       # Debug logs (dev only)
```

### Usage

```javascript
import {
  logger,
  logAuthEvent,
  logPaymentEvent,
  logRentalEvent,
} from './monitoring/logging.js';

// Auth event
logAuthEvent('login_success', userId, { method: 'nostr' });

// Payment event
logPaymentEvent('payment_confirmed', paymentId, { amount: 0.001 });

// Rental event
logRentalEvent('rental_started', rentalId, { minerId: 'miner_001' });

// Generic logging
logger.info('Custom message', { custom: 'data' });
```

### Log Format

```json
{
  "timestamp": "2025-03-15 17:09:00",
  "level": "info",
  "message": "User initiated payment",
  "service": "bitrent-api",
  "userId": "user_123",
  "amount": 0.001,
  "duration": "245ms"
}
```

### Log Rotation

Automatic rotation when files exceed:
- Size: 5MB per file
- Files: Keep 10 files max

## 3. Metrics - Prometheus

### Setup

```javascript
// server.js
import { metricsMiddleware } from './monitoring/metrics.js';

app.use(metricsMiddleware);

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const metrics = collectMetrics();
  res.set('Content-Type', metrics.contentType);
  res.end(metrics.data);
});
```

### Metrics Types

#### HTTP Metrics
```
http_request_duration_seconds
http_requests_total
http_request_size_bytes
http_response_size_bytes
```

#### Database Metrics
```
db_query_duration_seconds
db_queries_total
db_connection_pool_size
```

#### Application Metrics
```
payments_total
rentals_total
active_users
miner_hashrate_gh
platform_status
```

### Usage

```javascript
import {
  trackQuery,
  trackAuth,
  trackPayment,
  trackRental,
  updateMinerMetrics,
} from './monitoring/metrics.js';

// Track database query
trackQuery('SELECT', 'rentals', 245, 'success');

// Track authentication
trackAuth('nostr', 'success');

// Track payment
trackPayment(0.001, 'confirmed', 'nwc');

// Track rental
trackRental('active', 2.5, 'bitaxe-ultra');

// Update miner metrics
updateMinerMetrics('miner_001', 'bitaxe-ultra', {
  status: true,
  hashRate: 520,
  uptime: 3600,
  powerConsumption: 25,
  temperature: 60.2,
});
```

### Prometheus Endpoint

```
http://localhost:3000/metrics
```

Response format:
```
# HELP http_request_duration_seconds Duration of HTTP requests
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/",status_code="200",le="0.1"} 5
http_request_duration_seconds_bucket{method="GET",route="/",status_code="200",le="0.5"} 23
...
```

## 4. Health Checks

### Endpoint

```javascript
// routes/health.js
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    components: {
      database: 'healthy',
      cache: 'healthy',
      externalAPI: 'degraded',
    },
  });
});
```

### Checks Included

```
✓ Application running
✓ Database connected
✓ Cache available
✓ External APIs reachable
✓ Memory usage normal
✓ Disk space available
```

## 5. Dashboard & Visualization

### Grafana Setup

```bash
# Install Grafana
docker run -d \
  -p 3000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana

# Access at http://localhost:3000
```

### Add Prometheus Data Source

```
Configuration → Data Sources → Add → Prometheus
URL: http://prometheus:9090
```

### Import Dashboards

```
+ Create → Import
ID: 1860 (Node.js Prometheus)
```

### Custom Dashboards

**BitRent Dashboard:**
- Total revenue
- Active rentals
- Miner utilization
- Payment throughput
- Error rate
- API response times

## 6. Alerting

### Slack Integration

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Alert Rules

#### High Error Rate
```
Condition: errors/min > 10
Action: Alert in #errors channel
Severity: critical
```

#### High Response Time
```
Condition: p99_latency > 2s
Action: Alert in #performance channel
Severity: warning
```

#### Payment Processing Slow
```
Condition: payment_processing_duration > 30s
Action: Alert in #payments channel
Severity: warning
```

#### Low Miner Uptime
```
Condition: miner_uptime < 95%
Action: Alert in #operations channel
Severity: info
```

### PagerDuty Integration

```env
PAGERDUTY_API_KEY=...
PAGERDUTY_SERVICE_ID=...
```

Triggers:
- Critical errors (immediate)
- Service degradation (urgent)
- Payment failures (urgent)
- Database unavailable (immediate)

## 7. Logging Best Practices

### Structured Logging

```javascript
// Good
logger.info('Payment processed', {
  paymentId: 'payment_123',
  amount: 0.001,
  status: 'confirmed',
  duration: 245,
});

// Bad
logger.info('Payment processed');
```

### Log Levels

```
DEBUG   - Detailed diagnostic info
INFO    - General informational messages
WARN    - Warning messages
ERROR   - Error messages
FATAL   - Critical/fatal errors
```

### Sensitive Data

```javascript
// ❌ Never log
logger.info('User login', { password: '...' });

// ✅ Always filter
logger.info('User login', { userId: '...' });
```

## 8. Performance Monitoring

### Response Times

```
P50: < 100ms
P95: < 500ms
P99: < 1s
P99.9: < 5s
```

### Database Queries

```
Monitor slow queries > 500ms
Log query plans
Track N+1 problems
```

### API Performance

```
Monitor endpoint performance
Track throughput
Alert on degradation
```

## 9. Security Monitoring

### Log Authentication Events

```javascript
// Successful login
logAuthEvent('login_success', userId, {
  method: 'nostr',
  ip: req.ip,
});

// Failed login
logSecurityEvent('login_failed', 'warning', {
  publicKey: '...',
  reason: 'invalid_signature',
  ip: req.ip,
});

// Suspicious activity
logSecurityEvent('multiple_failed_attempts', 'critical', {
  userId: '...',
  attempts: 5,
  ip: req.ip,
});
```

### Rate Limiting Events

```
Monitor rate limit hits
Log IP addresses
Alert on abuse patterns
```

## 10. Deployment Checklist

Before production deployment:

- [ ] Sentry DSN configured
- [ ] Winston logs configured
- [ ] Prometheus metrics endpoint accessible
- [ ] Health check endpoint working
- [ ] Grafana dashboards created
- [ ] Alert rules configured
- [ ] Slack webhooks tested
- [ ] PagerDuty integration verified
- [ ] Log retention policies set
- [ ] Backup & archive plan documented

## 11. Monitoring Strategy

### Real-time Alerts

Critical issues → PagerDuty (immediate)

```
- Payment processing > 30s
- Error rate > 5%
- Database unavailable
- API p99 > 5s
```

### Daily Review

Team review each morning:

```
- Error logs
- Performance trends
- User impact
- Action items
```

### Weekly Reports

```
- Error summary
- Performance metrics
- Cost analysis
- Recommendations
```

### Monthly Analysis

```
- Trend analysis
- Capacity planning
- Cost optimization
- System improvements
```

## 12. Troubleshooting

### High Memory Usage

```
Check:
- Log rotation working
- Metrics not accumulating
- Cache not cleaning
- Memory leaks in code
```

### Missing Logs

```
Check:
- Log level configuration
- File permissions
- Disk space
- Log rotation not removing files
```

### Metrics Not Appearing

```
Check:
- Prometheus endpoint accessible
- Metrics middleware installed
- Labels correct
- Retention configured
```

## 13. Cost Optimization

### Sentry
- Free: 5,000 errors/month
- Pro: $29/month
- Estimated: $100-200/month

### Grafana Cloud
- Free: Basic dashboards
- Pro: Advanced features
- Estimated: $50-100/month

### Total Stack Cost
- Sentry: $100/month
- Grafana: $80/month
- Datadog: $20/month
- Others: $0/month (self-hosted)
- **Total: ~$200/month**

## Resources

- [Sentry Docs](https://docs.sentry.io/)
- [Winston Docs](https://github.com/winstonjs/winston)
- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)

## Support

For monitoring issues:
1. Check logs in `/logs`
2. Verify Prometheus metrics at `/metrics`
3. Review Grafana dashboards
4. Check Sentry issues
5. Create GitHub issue with details
