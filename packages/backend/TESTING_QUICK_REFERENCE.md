# BitRent Testing - Quick Reference Card

## One-Minute Setup

```bash
npm install
npx playwright install
npm run test:all
```

## Common Commands

### Run Tests
```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # E2E tests only
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage report
```

### Debug Tests
```bash
npm test -- --verbose              # Verbose output
npm test -- --no-coverage          # Skip coverage
npx playwright test --headed        # See browser
npx playwright test --debug         # Step through
```

### View Reports
```bash
open coverage/lcov-report/index.html    # Coverage (macOS)
npx playwright show-report              # E2E report
gh run view <run-id> --log             # CI/CD logs
```

## File Locations

| What | Where |
|------|-------|
| Unit Tests | `tests/unit/*.test.js` |
| Integration Tests | `tests/integration/*.test.js` |
| E2E Tests | `tests/e2e/*.spec.js` |
| Test Data | `tests/fixtures/test-data.js` |
| Mocks | `tests/fixtures/mock-*.js` |
| Setup | `tests/setup.js` |
| Jest Config | `jest.config.js` |
| Playwright Config | `playwright.config.js` |

## Test Structure

### Unit Test Template
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should do something', () => {
    expect(result).toBe(expected);
  });
});
```

### Integration Test Template
```javascript
describe('Complete Flow', () => {
  test('should complete flow: step1 → step2 → step3', async () => {
    const step1 = await action1();
    const step2 = await action2(step1);
    expect(step2).toBeDefined();
  });
});
```

### E2E Test Template
```javascript
test('should do something', async ({ page }) => {
  await page.goto('/path');
  await page.fill('[data-testid="input"]', 'value');
  await page.click('[data-testid="button"]');
  await expect(page.locator('text=Success')).toBeVisible();
});
```

## Test Selectors

Use data-testid for reliability:
```html
<!-- In components -->
<button data-testid="btn-login">Login</button>
<input data-testid="input-email" />
<div data-testid="alert-error">Error message</div>
```

```javascript
// In tests
await page.click('[data-testid="btn-login"]');
await page.fill('[data-testid="input-email"]', 'test@example.com');
await expect(page.locator('[data-testid="alert-error"]')).toBeVisible();
```

## Debugging

### Unit/Integration Tests
```bash
# Add this to your test
console.log('Debug:', variable);

# Run with output visible
npm test -- --verbose

# Or use Node debugger
node --inspect-brk node_modules/.bin/jest tests/unit/auth.test.js
```

### E2E Tests
```bash
# Step-by-step debugging
npx playwright test --debug

# Screenshot on failure
# (Enabled in playwright.config.js)

# View trace
npx playwright show-trace trace.zip
```

## Coverage Targets

```
Services:   90%+  ✅
Routes:     85%+  ✅
Middleware: 80%+  ✅
Utils:      95%+  ✅
Overall:    80%+  ✅
```

Check coverage:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## CI/CD

### On GitHub
- Tests run automatically on PR
- Tests run on push to main/develop
- Coverage uploaded to Codecov
- Manual approval for production

### Local Before Push
```bash
npm run test:unit && npm run test:integration
```

## Monitoring

### Check Health
```bash
curl http://localhost:3000/health
```

### View Logs
```bash
tail -f logs/error.log        # Errors
tail -f logs/combined.log     # All logs
tail -f logs/debug.log        # Debug (dev)
```

### Metrics
```bash
curl http://localhost:3000/metrics
```

## Key Test Files

### Critical Tests
- `tests/unit/auth.test.js` - Nostr signature, JWT tokens
- `tests/unit/nwc.test.js` - Payment invoices, preimage validation
- `tests/unit/payment.test.js` - Cost calculation, refunds
- `tests/integration/auth-flow.test.js` - Complete auth cycle
- `tests/integration/payment-flow.test.js` - Payment to confirmation
- `tests/e2e/admin-dashboard.spec.js` - Admin workflows

## Common Issues

### Tests timeout
```javascript
jest.setTimeout(15000);  // Global
test('...', async () => {...}, 20000);  // Per test
```

### Database errors
```bash
# Check database
psql -U postgres -d bitrent_test

# Or skip DB tests
npm test -- --testPathIgnore=integration
```

### Playwright issues
```bash
# Reinstall browsers
npx playwright install

# Check compatibility
npx playwright install-deps
```

### Tests pass locally but fail in CI
```bash
# Replicate CI environment
NODE_ENV=test npm run test:unit
```

## Assertions Cheatsheet

### Jest
```javascript
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toBeTruthy();
expect(array).toContain(item);
expect(array).toHaveLength(3);
expect(fn).toHaveBeenCalledWith(arg);
expect(promise).rejects.toThrow();
```

### Playwright
```javascript
await expect(locator).toBeVisible();
await expect(locator).toContainText('text');
await expect(locator).toHaveValue('value');
await expect(page).toHaveURL('url');
```

## Environment Variables

### For Testing
```env
NODE_ENV=test
JWT_SECRET=test-secret-key
SUPABASE_URL=https://test.supabase.co
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bitrent_test
```

### For E2E
```env
E2E_BASE_URL=http://localhost:3000
E2E_USERNAME=test
E2E_PASSWORD=test
```

## Best Practices

✅ **Do:**
- Test behavior, not implementation
- Use descriptive names
- Keep tests focused
- Mock external dependencies
- Use fixtures for common data

❌ **Don't:**
- Depend on test order
- Skip error cases
- Use hardcoded values
- Test multiple concerns in one test
- Leave console.log in code

## Resources

- [Testing Guide](./TESTING_GUIDE.md) - Comprehensive guide
- [CI/CD Pipeline](./CI_CD_PIPELINE.md) - Automation
- [Monitoring Setup](./MONITORING_SETUP.md) - Observability
- [Phase 4 Summary](./PHASE_4_SUMMARY.md) - Complete overview

## Quick Links

- Jest: https://jestjs.io/docs/getting-started
- Playwright: https://playwright.dev/docs/intro
- Supertest: https://github.com/visionmedia/supertest
- Sentry: https://docs.sentry.io/
- Prometheus: https://prometheus.io/docs/

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, add tests
npm test:unit

# Commit
git add .
git commit -m "feat: add feature

- Add unit tests
- Add integration tests
- Update docs"

# Push
git push origin feature/my-feature

# Create PR
# CI/CD runs automatically
# Once tests pass → merge
```

## Need Help?

1. Check test output for error message
2. Review test file comments
3. Read [TESTING_GUIDE.md](./TESTING_GUIDE.md)
4. Ask in team chat
5. Create GitHub issue

---

**Last Updated:** 2025-03-15
**Phase 4 Status:** 85% Complete ✅
