# BitRent Phase 3: Quick Start Guide

Fast-track setup for BitRent database implementation.

## 5-Minute Setup

### 1. Prerequisites
```bash
# Node.js and npm
node --version  # v18+
npm --version   # v8+

# PostgreSQL client (for backups)
brew install postgresql  # macOS
sudo apt-get install postgresql-client  # Linux
```

### 2. Environment Setup
```bash
# Create .env file
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_HOST=your-project.supabase.co
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your_password
SUPABASE_DB_NAME=postgres
SUPABASE_DB_PORT=5432
EOF

# Load environment
export $(cat .env | xargs)
```

### 3. Apply Migrations
```bash
cd migrations
npm install @supabase/supabase-js
node migration-runner.js up

# Expected output: ✅ 5 migrations applied successfully
```

### 4. Verify Installation
```bash
# Check migration status
node migration-runner.js status

# Should show all 5 migrations as ✅ Applied
```

## Testing the Setup (10 minutes)

### Test 1: Create a Test User
```javascript
const { db } = require('./services/database');

const { data: user } = await db.users.create(
  'test_pubkey_12345',
  'user'
);
console.log('Created user:', user.id);
```

### Test 2: List Available Mineurs
```javascript
const { data: mineurs } = await db.mineurs.listAvailable();
console.log(`Found ${mineurs.length} available mineurs`);
```

### Test 3: Create a Rental
```javascript
const { data: rental } = await db.rentals.create(
  userId,
  minerId,
  {
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 24*60*60*1000).toISOString(),
    sats_per_minute: 10
  }
);
console.log('Created rental:', rental.id);
```

### Test 4: Get Analytics
```javascript
const { data: stats } = await db.analytics.getUserStats(userId);
console.log('User stats:', stats);
```

## Common Tasks

### Create Backup
```bash
cd scripts
./backup.sh ./.backups
# Output: ✓ Backup completed: ./backups/bitrent_backup_*.sql.gz
```

### Restore from Backup
```bash
cd scripts
./restore.sh ./backups/bitrent_backup_latest.sql.gz
# Prompts for confirmation, then restores
```

### Check Database Health
```sql
-- Via Supabase SQL Editor
SELECT schemaname, COUNT(*) as objects 
FROM pg_tables 
GROUP BY schemaname;

SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_rentals FROM rentals;
```

### View Migration History
```bash
node migrations/migration-runner.js status
```

## File Structure

```
bitrent-backend/
├── migrations/
│   ├── 001_init_schema.sql
│   ├── 002_add_performance_indexes.sql
│   ├── 003_add_rls_policies.sql
│   ├── 004_add_triggers_functions.sql
│   ├── 005_create_views.sql
│   └── migration-runner.js
├── services/
│   └── database.js (ORM layer)
├── scripts/
│   ├── backup.sh
│   └── restore.sh
├── supabase/
│   └── config.toml
└── [documentation files]
```

## Quick Reference

### ORM Methods

```javascript
// Users
await db.users.findByPubkey(pubkey)
await db.users.create(pubkey, 'user')

// Mineurs
await db.mineurs.listAvailable()
await db.mineurs.create(ownerId, data)

// Rentals
await db.rentals.create(userId, minerId, data)
await db.rentals.findActive(userId)

// Payments
await db.payments.create(rentalId, data)
await db.payments.verify(invoiceHash)

// Analytics
await db.analytics.getRevenueByDay(start, end)
await db.analytics.getTopMineurs(10)
```

### Views

```sql
-- Revenue
SELECT * FROM v_revenue_by_miner;
SELECT * FROM v_revenue_by_user;

-- Performance
SELECT * FROM v_miner_performance;
SELECT * FROM v_top_mineurs_by_usage;

-- Operational
SELECT * FROM v_active_rentals;
SELECT * FROM v_pending_payments;

-- Analytics
SELECT * FROM v_daily_revenue;
SELECT * FROM analytics_daily;
```

## Troubleshooting

### Migration Fails

```bash
# 1. Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# 2. Test connection
psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d postgres -c "SELECT 1"

# 3. Check migration status
node migrations/migration-runner.js status

# 4. Run again
node migrations/migration-runner.js up
```

### Permission Denied on Queries

```javascript
// Make sure auth is initialized
const { data: session } = await supabase.auth.getSession();
if (!session) {
  // Login first
  await supabase.auth.signInWithPassword(...);
}

// RLS might be blocking
// Check RLS_POLICIES.md for policy details
```

### Backup Fails

```bash
# Check database credentials
echo $SUPABASE_DB_PASSWORD

# Test psql connection
psql -h $SUPABASE_DB_HOST \
     -U $SUPABASE_DB_USER \
     -d postgres \
     -c "SELECT 1"

# Try backup again
cd scripts && ./backup.sh
```

## Documentation Map

| Document | Purpose | Read Time |
|----------|---------|-----------|
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Table structure | 10 min |
| [MIGRATIONS.md](./MIGRATIONS.md) | How to run migrations | 15 min |
| [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) | Backup procedures | 15 min |
| [RLS_POLICIES.md](./RLS_POLICIES.md) | Security model | 20 min |
| [PERFORMANCE_TUNING.md](./PERFORMANCE_TUNING.md) | Query optimization | 20 min |
| [ANALYTICS_GUIDE.md](./ANALYTICS_GUIDE.md) | Analytics & reports | 15 min |
| [PHASE3_IMPLEMENTATION_SUMMARY.md](./PHASE3_IMPLEMENTATION_SUMMARY.md) | Complete overview | 10 min |

## Next Steps

1. ✅ Apply migrations
2. ✅ Test ORM methods
3. ✅ Create first backup
4. → Read [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for details
5. → Integrate with API (Phase 4)
6. → Setup analytics dashboard (Phase 4)

## Support

- 📖 Read the relevant guide above
- 🔍 Check [PERFORMANCE_TUNING.md](./PERFORMANCE_TUNING.md) for slow queries
- 🔐 Check [RLS_POLICIES.md](./RLS_POLICIES.md) for permission issues
- 💾 Check [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) for backup issues
- 📊 Check [ANALYTICS_GUIDE.md](./ANALYTICS_GUIDE.md) for reporting

---

**Ready to go!** You now have a production-ready database. Next: Phase 4 API Integration.
