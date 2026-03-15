# BitRent Phase 4: Testing & Quality Assurance Guide

## Overview

This guide covers the complete testing strategy for BitRent Phase 4, including unit tests, integration tests, E2E tests, and quality assurance processes.

## Testing Pyramid

```
        /\          E2E Tests (Playwright)
       /  \         - Admin dashboard
      /    \        - Client marketplace
     /______\       - Payment flows
     
    / Unit  /       Unit Tests (Jest)
   /Tests  /        - Services
  /________/        - Utilities
  
  Integration Tests (Supertest)
  - Auth flows
  - Payment flows
  - Database transactions
```

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Environment Setup

Create a `.env.test` file:

```env
NODE_ENV=test
PORT=3001
JWT_SECRET=test-secret
SUPABASE_URL=https://test.supabase.co
SUPABASE_ANON_KEY=test-key
SUPABASE_SERVICE_KEY=test-service-key
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bitrent_test
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm test tests/unit/auth.test.js

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm test tests/integration/auth-flow.test.js
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test
npx playwright test admin-dashboard.spec.js

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run against specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Full Test Suite

```bash
# Run all tests
npm run test:all

# Run all tests with coverage
npm run test:coverage
```

## Test Coverage

### Target Coverage

- **Overall**: 80%+
- **Services**: 90%+
- **Routes**: 85%+
- **Middleware**: 80%+
- **Utils**: 95%+
- **Database**: 75%+

### Viewing Coverage Reports

```bash
# Generate coverage
npm run test:coverage

# Open coverage report
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows
```

## Unit Tests

### Testing Services

Each service has comprehensive unit tests covering:

#### Auth Service (`tests/unit/auth.test.js`)
- Challenge generation
- Signature verification
- JWT token creation
- Token verification
- Token refresh
- Session management

```javascript
test('should generate valid JWT token', async () => {
  const token = await authService.generateToken(userId);
  expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
});
```

#### NWC Service (`tests/unit/nwc.test.js`)
- Invoice creation
- Payment verification
- Preimage validation
- Payment status tracking

#### Payment Service (`tests/unit/payment.test.js`)
- Cost calculation
- Payment validation
- Payment processing
- Refund handling

### Mocking

Tests use Jest mocks for external dependencies:

```javascript
const mockAuthService = {
  generateToken: jest.fn(),
  verifyToken: jest.fn(),
};
```

### Test Fixtures

Reusable test data in `tests/fixtures/test-data.js`:

```javascript
import { testUsers, testRentals, createTestPayment } from '../fixtures/test-data.js';
```

## Integration Tests

### Testing Flows

Integration tests verify complete workflows:

#### Authentication Flow (`tests/integration/auth-flow.test.js`)
1. Request challenge
2. Sign challenge with Nostr keys
3. Verify signature → Get JWT
4. Access protected routes
5. Token refresh
6. Logout

```javascript
test('should complete full auth cycle', async () => {
  const challenge = await requestChallenge(publicKey);
  const signature = await signChallenge(challenge);
  const token = await verifyAndLogin({ publicKey, challenge, signature });
  const profile = await getProfile(token);
  expect(profile.id).toBe(userId);
});
```

#### Payment Flow (`tests/integration/payment-flow.test.js`)
1. Create rental
2. Calculate cost
3. Generate invoice
4. Process payment
5. Verify payment
6. Complete rental

## E2E Tests with Playwright

### Test Structure

E2E tests simulate real user interactions:

```javascript
test('should login and view dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="input-email"]', 'admin@test.com');
  await page.click('[data-testid="button-login"]');
  await page.waitForURL('/admin/dashboard');
});
```

### Test Selectors

Use data-testid attributes for reliable element selection:

```html
<button data-testid="button-login">Login</button>
<input data-testid="input-email" />
```

### Common Patterns

```javascript
// Wait for element
await page.waitForSelector('[data-testid="loader"]', { state: 'hidden' });

// Fill form
await page.fill('[data-testid="input-email"]', 'test@example.com');

// Click button
await page.click('[data-testid="button-submit"]');

// Check visibility
await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

// Check text content
await expect(page.locator('h1')).toContainText('Dashboard');

// Get value
const value = await page.inputValue('[data-testid="input-email"]');
```

### Debugging E2E Tests

```bash
# Trace failed tests
npx playwright test --trace on

# View traces
npx playwright show-trace trace.zip

# Debug mode
npx playwright test --debug

# Generate HTML report
npx playwright show-report
```

## CI/CD Pipeline

### GitHub Actions

The pipeline runs on every PR and push:

```yaml
# .github/workflows/test.yml
- Unit Tests (multiple Node versions)
- Integration Tests
- E2E Tests
- Security Scans
- Coverage Upload
```

### Pipeline Flow

```
PR Created
  ↓
Lint Code
  ↓
Run Unit Tests (Node 18, 20, 22)
  ↓ All pass?
Run Integration Tests
  ↓ All pass?
Run E2E Tests
  ↓ All pass?
Upload Coverage to Codecov
  ↓
Run Security Scan (npm audit, Snyk)
  ↓
Quality Gate Checks
  ↓
Notify on Slack
```

### Local Pre-commit Tests

```bash
# Run before committing
npm run test:unit && npm run test:integration

# Or use pre-commit hook
git hook add pre-commit "npm run test:unit"
```

## Security Testing

### OWASP Top 10

Tests verify protection against:

- **SQL Injection**: Input validation tests
- **XSS**: Sanitization tests
- **CSRF**: Token validation tests
- **Authentication Bypass**: Auth flow tests
- **Authorization**: Route protection tests

### Running Security Scans

```bash
# npm audit
npm audit

# Snyk
npm run test:security

# Dependency check
npx npm-check-updates -u
```

## Performance Testing

### Load Testing

```bash
# With k6 (if installed)
k6 run tests/load/payment-flow.js

# Monitor metrics
curl http://localhost:9090/metrics
```

### Performance Monitoring

```bash
# Check API response times
npm run test:integration -- --verbose

# View Prometheus metrics
open http://localhost:9090
```

## Troubleshooting

### Common Issues

#### Tests timeout

```javascript
// Increase timeout
jest.setTimeout(15000);

// Or per test
test('slow test', async () => {
  // ...
}, 20000);
```

#### Database connection errors

```bash
# Check database is running
psql -U postgres -d bitrent_test

# Or use test fixtures
npm run test:unit
```

#### Playwright browser issues

```bash
# Reinstall browsers
npx playwright install

# Use headed mode to debug
npx playwright test --headed --debug
```

### Getting Help

- Check test output for detailed error messages
- Use `--verbose` flag for more details
- Enable debug logging: `DEBUG=* npm test`

## Best Practices

### Writing Tests

✅ **Do:**
- Test behavior, not implementation
- Use descriptive test names
- Keep tests focused and isolated
- Use fixtures for common data
- Mock external dependencies

❌ **Don't:**
- Skip error cases
- Use hardcoded values
- Test multiple concerns in one test
- Depend on test execution order

### Test Organization

```
tests/
├── unit/           # Single component tests
├── integration/    # Multi-component workflows
├── e2e/           # User journeys
├── fixtures/      # Test data
└── setup.js       # Global setup
```

### Performance

- Keep unit tests < 100ms each
- Keep integration tests < 500ms each
- Parallel execution for CI/CD
- Use test timeouts to catch hangs

## Continuous Improvement

### Monthly Reviews

1. Analyze coverage trends
2. Review flaky tests
3. Update test data
4. Optimize slow tests

### Feedback Loop

- Monitor production errors
- Add regression tests
- Update test fixtures
- Document lessons learned

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Playwright Documentation](https://playwright.dev/)
- [Codecov Documentation](https://docs.codecov.com/)

## Support

For questions or issues:
1. Check test output
2. Review test logs
3. Ask in team chat
4. Create an issue on GitHub
