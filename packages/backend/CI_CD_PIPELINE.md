# BitRent Phase 4: CI/CD Pipeline Documentation

## Overview

This document describes the complete CI/CD pipeline for BitRent, including automated testing, quality gates, and deployment processes.

## Architecture

```
GitHub Repository
    ↓
Webhook Trigger
    ↓
GitHub Actions Workflow
    ├─ Lint & Format
    ├─ Unit Tests
    ├─ Integration Tests
    ├─ E2E Tests
    ├─ Security Scan
    ├─ Coverage Upload
    └─ Notifications
    ↓
Quality Gate Pass/Fail
    ↓
Auto-Deploy to Staging (if main)
    ↓
Manual Approval for Production
    ↓
Deploy to Production
```

## Workflows

### 1. Test Workflow (test.yml)

Runs on every push and PR.

#### Triggers

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

#### Jobs

**a) Unit Tests**
- Runs on Node 18, 20, 22
- Tests all services, utils, middleware
- Generates coverage reports
- Uploads to Codecov

```bash
npm run test:unit
```

**b) Integration Tests**
- Database setup
- Auth flow tests
- Payment flow tests
- Rental flow tests

```bash
npm run test:integration
```

**c) E2E Tests**
- Chrome, Firefox, Safari
- Mobile browsers
- Admin dashboard
- Client marketplace
- Payment flows

```bash
npm run test:e2e
```

**d) Security Scan**
- npm audit
- Snyk scan
- Dependency check

**e) Quality Gates**
- Coverage threshold check
- Test failure detection
- Performance baseline

#### Artifacts

- Coverage reports
- Test results (JUnit XML)
- Playwright reports
- Performance metrics

### 2. Coverage Workflow (coverage.yml)

Tracks test coverage over time.

```bash
# Generates and uploads coverage
codecov/codecov-action@v3
  - files: ./coverage/coverage-final.json
  - flags: unittests
```

### 3. Deploy Workflow (deploy.yml)

Handles deployment to staging/production.

#### Stages

1. **Staging Deployment** (automatic on main)
   ```bash
   npm run build
   docker build -t bitrent:latest .
   docker push registry.io/bitrent:latest
   ```

2. **Production Deployment** (manual approval)
   - Creates GitHub Release
   - Deploys to production
   - Runs smoke tests
   - Monitors for errors

### 4. Performance Workflow (performance.yml)

Monitors performance regressions.

```bash
# Load testing with k6
k6 run tests/performance/load-test.js

# Captures metrics:
# - Response times
# - Throughput
# - Error rates
```

### 5. Security Workflow (security.yml)

Regular security scans.

```bash
# Dependency vulnerabilities
npm audit --audit-level=high

# Code scanning
snyk test

# OWASP compliance
# - SQL injection tests
# - XSS tests
# - CSRF tests
```

## GitHub Secrets

Required secrets in GitHub:

```
CODECOV_TOKEN         - Codecov token
SNYK_TOKEN           - Snyk.io token
SLACK_WEBHOOK_URL    - Slack notifications
DOCKER_USERNAME      - Docker registry username
DOCKER_PASSWORD      - Docker registry password
NPM_TOKEN           - NPM registry token
SENTRY_AUTH_TOKEN   - Sentry authentication
```

## Quality Gates

### Coverage Thresholds

```
Global:      80%+
Services:    90%+
Routes:      85%+
Middleware:  80%+
Utils:       95%+
```

### Test Requirements

- All tests must pass
- No flaky tests
- Performance baseline must hold
- Security scan must pass

### Deployment Requirements

- All tests passing
- Coverage > 80%
- No critical security issues
- Manual approval for production

## Local Testing Before Push

```bash
# Run full test suite
npm run test:all

# Check coverage
npm run test:coverage

# Lint code
npm run lint

# Security check
npm audit

# Only then
git push
```

## Deployment Process

### To Staging

Automatic on merge to `main`:

```
Merge to main
  ↓
Tests pass
  ↓
Build Docker image
  ↓
Push to registry
  ↓
Deploy to staging
  ↓
Run smoke tests
  ↓
Notify team
```

### To Production

Manual approval required:

```
Create Release on GitHub
  ↓
Select version
  ↓
Manual approval
  ↓
Build production image
  ↓
Deploy to production
  ↓
Canary rollout (10%)
  ↓
Monitor for errors
  ↓
Gradual rollout (100%)
  ↓
Health checks
  ↓
Notify team
```

### Rollback

```bash
# If issues detected
./scripts/rollback.sh <version>

# Automatic rollback on critical errors
# (configured in deployment)
```

## Monitoring CI/CD

### GitHub Actions

View workflow runs:

```
Repository > Actions > [Workflow Name]
```

Check status:
- ✅ All checks passed
- ❌ Failed test
- ⏳ Running
- ⚠️ Manual approval needed

### Notifications

#### Slack

- Build started
- Tests completed
- Deployment successful/failed
- Manual approval required
- Production alerts

#### Email

- Test failures
- Coverage drops
- Security issues
- Deployment status

## Troubleshooting

### Tests Failing in CI But Not Locally

```bash
# Replicate CI environment
NODE_ENV=test npm run test:unit

# Check for:
# - Environment variable differences
# - Network issues
# - Database connectivity
# - Race conditions
```

### Slow CI Pipeline

1. Check job times
   - Go to Actions > Workflow > Build
   - Review timing for each step

2. Optimize:
   - Cache dependencies: `actions/setup-node@v4` with `cache: 'npm'`
   - Parallel jobs where possible
   - Remove unnecessary steps

3. Increase resources:
   - Use larger runners
   - More parallel jobs

### Deployment Failures

```bash
# Check logs
gh run view <run-id> --log

# Common issues:
# - Docker build failure
# - Registry auth issue
# - Kubernetes connection error
# - Health check timeout
```

## Best Practices

### Workflow Design

✅ **Do:**
- Run fast tests first
- Parallel execution where possible
- Cache dependencies
- Clear error messages
- Notify on failures

❌ **Don't:**
- Long sequential jobs
- Missing artifact uploads
- No monitoring
- Silent failures

### Branching Strategy

```
main (production)
  ↑
  └─ Merge only after CI passes
  
develop (staging)
  ↑
  └─ Daily integration point
  
feature/* (development)
  └─ PR against develop
     - CI must pass
     - Code review required
     - Merge to develop
```

### Commit Guidelines

```
✅ Good:
feat: add payment verification
fix: handle null rental IDs
test: add auth flow tests
docs: update testing guide

❌ Bad:
wip
fix stuff
asdf
```

## Advanced Configuration

### Matrix Testing

Test across multiple versions:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]
    os: [ubuntu-latest, windows-latest, macos-latest]
```

### Conditional Jobs

```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main' && success()
    # Only run on main branch if tests pass
```

### Artifacts & Caching

```yaml
# Cache dependencies
cache:
  key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
  path: ~/.npm

# Upload artifacts
artifacts:
  - coverage-reports
  - test-results
  - logs
```

## Cost Optimization

### GitHub Actions

- Free: 2000 minutes/month
- Shared runner: 1 credit/minute
- Private runner: 10 credits/minute

Optimization:
- Cancel previous runs: `concurrency`
- Parallel jobs for faster turnaround
- Cache aggressively

## Security in CI/CD

### Secret Management

```bash
# Add secrets
gh secret set MY_SECRET --body "value"

# Never log secrets
- run: npm deploy --token=${{ secrets.NPM_TOKEN }}
  env:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Access Control

- Protect `main` branch
- Require PR reviews
- Restrict deployment approvals
- Audit logs

### Scanning

- SAST: Code scanning
- DAST: API security tests
- Dependency scanning
- Container scanning

## Metrics & Reporting

### Key Metrics

- Build success rate
- Test execution time
- Coverage trend
- Deployment frequency
- Failure rate

### Reports

```bash
# Weekly report
gh api repos/{owner}/{repo}/actions/workflows \
  --paginate --template '{{range .workflows}}{{.runs_url}}{{"\n"}}{{end}}'
```

### Dashboards

- GitHub Actions dashboard
- Codecov dashboard
- Sentry monitoring
- Datadog metrics

## Maintenance

### Regular Tasks

**Weekly:**
- Review failed builds
- Check coverage trends
- Update dependencies

**Monthly:**
- Audit secret usage
- Review workflow logs
- Optimize slow jobs
- Update documentation

**Quarterly:**
- Security audit
- Performance review
- Cost analysis
- Strategy update

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Codecov Integration](https://docs.codecov.com/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## Support

For CI/CD issues:
1. Check workflow logs
2. Review error messages
3. Run tests locally
4. Create issue with details
