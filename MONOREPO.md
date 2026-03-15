# Monorepo Guide - BitRent

## Structure

```
bitrent/
├── packages/
│   ├── frontend/          # Vercel frontend
│   │   ├── public/
│   │   ├── libs/
│   │   ├── index.html
│   │   ├── admin.html
│   │   ├── client.html
│   │   ├── package.json
│   │   └── ...
│   │
│   └── backend/           # Vercel serverless
│       ├── api/           # API routes (HTTP handlers)
│       ├── lib/           # Shared libraries
│       ├── models/        # Data models
│       ├── services/      # Business logic
│       ├── middleware/    # Express middleware
│       ├── utils/         # Utilities
│       ├── migrations/    # Database migrations
│       ├── tests/         # Jest + Playwright tests
│       ├── package.json
│       └── ...
│
├── .github/               # GitHub Actions CI/CD
├── package.json           # Root workspace config
├── README.md             # Project overview
├── MONOREPO.md           # This file
└── .gitignore            # Git ignore rules

```

## Commands

### Root Level (Both Packages)

```bash
# Install all dependencies
npm install

# Run dev servers in both (parallel)
npm run dev

# Build both
npm run build

# Run tests in both
npm run test

# Lint both
npm run lint
```

### Frontend Only

```bash
# Navigate to frontend
cd packages/frontend

# Or use workspace flag
npm run dev --workspace=packages/frontend
npm run build --workspace=packages/frontend
npm test --workspace=packages/frontend
```

### Backend Only

```bash
# Navigate to backend
cd packages/backend

# Or use workspace flag
npm run dev --workspace=packages/backend
npm run build --workspace=packages/backend
npm test --workspace=packages/backend
npm run migrations:up --workspace=packages/backend
```

## Shared Dependencies

If both frontend and backend use the same library (e.g., lodash), install at root:

```bash
npm install lodash -w
```

Package-specific:

```bash
npm install express --workspace=packages/backend
npm install chart.js --workspace=packages/frontend
```

## Git Workflow

```bash
# Clone repository
git clone https://github.com/Silexperience210/bitrent.git
cd bitrent

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes in either package or both
# Edit packages/frontend/... or packages/backend/...

# Stage and commit
git add .
git commit -m "feat: add amazing feature"

# Push to GitHub
git push origin feature/amazing-feature

# Open PR on GitHub
```

## Deployment

### Frontend to Vercel

Option 1: Using Vercel CLI
```bash
cd packages/frontend
vercel deploy --prod
```

Option 2: Connect GitHub → Vercel dashboard
- Set root directory to `packages/frontend`
- Build command: `npm run build`
- Output directory: `dist` (or `public` for static)

### Backend to Vercel

Option 1: Using Vercel CLI
```bash
cd packages/backend
vercel deploy --prod
```

Option 2: Connect GitHub → Vercel dashboard
- Set root directory to `packages/backend`
- Build command: `npm run build`
- Output directory: `.vercel/output`

### CI/CD Pipeline

GitHub Actions automatically:
1. Runs tests on PR
2. Builds both packages
3. Lints code
4. Checks coverage

See `.github/workflows/` for configs.

## Environment Variables

### Frontend (packages/frontend/.env.local)

```
VITE_API_URL=https://your-backend.vercel.app
VITE_NWC_RELAY=wss://relay.getalby.com/v1
VITE_ADMIN_PUBKEY=your-admin-key
```

### Backend (packages/backend/.env)

```
# Supabase
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...

# Auth
JWT_SECRET=your-secret
JWT_EXPIRY=7d
ADMIN_PUBKEYS=pubkey1,pubkey2

# Payments
NWC_CONNECTION_STRING=nostr+walletconnect://...
NWC_RELAY=wss://relay.getalby.com/v1

# Server
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
```

## Testing Strategy

### Unit Tests
```bash
npm test -- --testPathPattern=services
npm test -- --testPathPattern=libs
```

### Integration Tests
```bash
npm test -- --testPathPattern=api
npm test -- --testPathPattern=routes
```

### E2E Tests
```bash
npm run test:e2e --workspace=packages/backend
```

### Coverage
```bash
npm test -- --coverage --coverage-directory=coverage/
```

## Performance Tips

1. **Use workspace flag for speed:**
   ```bash
   npm install express --workspace=packages/backend
   ```
   Instead of navigating to subdirectory.

2. **Parallel execution:**
   ```bash
   npm run build --workspaces --if-present
   ```

3. **Cache dependencies:**
   ```bash
   npm ci  # Use lock file instead of install
   ```

## Troubleshooting

### Dependencies not installing
```bash
rm -rf node_modules package-lock.json
npm install
```

### Workspace not recognized
```bash
# Verify package.json has correct structure
cat package.json | grep -A 5 "workspaces"

# Reinstall
npm install
```

### Port conflicts
- Frontend: Default 5173 (Vite)
- Backend: Default 3000 (Node)

Change in `.env` or run on different ports:
```bash
PORT=3001 npm run backend
VITE_PORT=5174 npm run frontend
```

## File Structure Best Practices

### Add new backend API endpoint:
```
packages/backend/api/routes/new-feature.js
packages/backend/lib/services/new-feature-service.js
packages/backend/models/new-feature.js
packages/backend/tests/api/new-feature.test.js
```

### Add new frontend page:
```
packages/frontend/public/new-page.html
packages/frontend/libs/new-page-lib.js
packages/frontend/public/styles/new-page.css
```

## Version Management

**Root version** (package.json):
- Increment on major releases
- Referenced in README, CI/CD

**Package versions** (packages/*/package.json):
- Can vary independently
- Use semantic versioning

To bump version:
```bash
npm version minor
git push
```

## Resources

- **Node.js Workspaces:** https://docs.npmjs.com/cli/v7/using-npm/workspaces
- **Vercel Monorepo:** https://vercel.com/docs/concepts/monorepos
- **GitHub Actions:** https://docs.github.com/en/actions

---

**Monorepo maintained by Silexperience210**
