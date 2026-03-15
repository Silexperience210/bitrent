# BitRent Backup and Restore Guide

Complete guide for backing up and restoring the BitRent database.

## Overview

BitRent uses Supabase's managed PostgreSQL database with automated and manual backup strategies.

## Backup Strategies

### 1. Automated Daily Backups (Supabase)

Supabase automatically creates daily backups stored in multiple regions.

**Features:**
- ✅ Daily automated backups
- ✅ 30-day retention period
- ✅ Point-in-time recovery (PITR) available
- ✅ Geographically redundant storage
- ✅ Encrypted at rest

**Accessing in Supabase Dashboard:**
1. Go to Project Settings → Backups
2. View available backups and restoration dates
3. Click "Restore" to restore to a specific point in time

### 2. Manual Backups (Scripted)

Use the provided backup script for additional control and archival.

```bash
cd scripts
./backup.sh ./.backups
```

**What's Included:**
- Complete database schema
- All table data
- Functions, triggers, and views
- Configuration settings

**What's Excluded:**
- Auth users (managed by Supabase)
- Realtime subscriptions
- Storage buckets (use Supabase API)

## Setting Up Automated Backups

### Prerequisites

```bash
# Install PostgreSQL client tools
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# Download from https://www.postgresql.org/download/windows/
```

### Configuration

Create `.env` file with database credentials:

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_DB_HOST=your-project.supabase.co
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your_secure_password
SUPABASE_DB_NAME=postgres
SUPABASE_DB_PORT=5432
```

### Cron Job for Daily Backups

#### Linux/macOS
```bash
# Add to crontab (runs daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * cd /path/to/bitrent-backend && ./scripts/backup.sh ./.backups >> ./scripts/backup.log 2>&1
```

#### Windows (Task Scheduler)
```powershell
# Create task to run backup.sh daily
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
$action = New-ScheduledTaskAction -Execute "bash" -Argument "C:\path\to\scripts\backup.sh"
Register-ScheduledTask -TaskName "BitRent Database Backup" -Trigger $trigger -Action $action
```

## Creating a Manual Backup

### Full Database Backup

```bash
cd scripts
./backup.sh

# Output:
# ✓ Backup completed: ./.backups/bitrent_backup_20260315_020000.sql.gz
# ✓ Backup verified (Size: 45.2M)
```

### Backup Location

```
./.backups/
├── bitrent_backup_20260315_020000.sql.gz    # Compressed dump
├── bitrent_backup_20260315_020000.report     # Metadata
└── backup.log                                 # Execution log
```

### Backup Size Expectations

| Database Age | Approximate Size |
|--------------|------------------|
| Day 1 (init) | 1-2 MB |
| Week 1 (test) | 5-10 MB |
| Month 1 (test) | 15-25 MB |
| Production (1M rentals) | 100-150 MB |

## Restoring from Backup

### Option 1: Using Supabase Dashboard (Easiest)

1. Navigate to Project Settings → Backups
2. Select desired backup date
3. Click "Restore"
4. Select "Restore to a new database" or "Restore to current database"
5. Confirm and wait for restoration

**Time to Restore:** 5-15 minutes depending on database size

### Option 2: Using Restore Script

```bash
cd scripts

# List available backups
ls -lh ./.backups/bitrent_backup_*.sql*

# Restore from specific backup
./restore.sh ./.backups/bitrent_backup_20260315_020000.sql.gz

# Will prompt for confirmation:
# ⚠️  WARNING: This will OVERWRITE the current database!
# Are you sure you want to restore? Type 'yes' to confirm:

# Or force restore without confirmation
./restore.sh ./.backups/bitrent_backup_20260315_020000.sql.gz --force
```

### Option 3: Manual Restore with psql

```bash
# Decompress backup if needed
gunzip -c bitrent_backup_20260315_020000.sql.gz > bitrent_backup.sql

# Restore
export PGPASSWORD="your_password"
psql -h your-project.supabase.co \
     -p 5432 \
     -U postgres \
     -d postgres \
     --ssl-mode=require \
     -f bitrent_backup.sql

unset PGPASSWORD
```

## Point-in-Time Recovery (PITR)

Restore database to any point within the last 7 days.

### Via Supabase Dashboard

1. Settings → Backups
2. Click "Create a point-in-time recovery"
3. Select desired date and time
4. Click "Create Recovery"
5. Wait for new database to be created

### Via API

```javascript
// Using Supabase management API (requires admin token)
const adminApi = 'https://api.supabase.com/v1';
const projectId = 'your-project-id';
const adminToken = 'your-admin-token';

const response = await fetch(
  `${adminApi}/projects/${projectId}/db/restore`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      backup_id: 'specific_backup_id',
      restore_point_in_time: '2026-03-14T14:30:00Z'
    })
  }
);
```

## Disaster Recovery Procedures

### Scenario 1: Accidental Data Deletion

**Response Time:** < 5 minutes

```bash
# 1. Identify when deletion occurred
# 2. Restore database to 1 hour before deletion
# 3. Export affected data
# 4. Restore latest backup
# 5. Manually merge critical data
```

### Scenario 2: Corrupted Database

**Response Time:** < 15 minutes

```bash
# 1. Check backup.log for any errors
# 2. Restore from latest known good backup
# 3. Verify data integrity
# 4. Test application connections
# 5. Monitor for errors

# Command:
./restore.sh ./.backups/bitrent_backup_latest.sql.gz --force
```

### Scenario 3: Complete Database Failure

**Response Time:** < 30 minutes

```bash
# 1. Check Supabase status page
# 2. Restore from Supabase PITR (if < 7 days old)
# 3. Or restore from manual backup in external storage
# 4. Verify all tables and relationships
# 5. Re-run migrations if needed

# Verify integrity after restore:
psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d postgres -c "
  SELECT 
    schemaname,
    COUNT(*) as table_count
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  GROUP BY schemaname;
"
```

## Backup Verification

### Automated Verification

The backup script includes automatic verification:

```bash
# Check file size (should be > 1MB for production)
ls -lh ./.backups/bitrent_backup_*.sql.gz

# Check backup log
tail -f scripts/backup.log
```

### Manual Verification

```bash
# Decompress and check
gunzip -t bitrent_backup_20260315_020000.sql.gz

# Peek at first few lines
gunzip -c bitrent_backup_20260315_020000.sql.gz | head -50

# Should see PostgreSQL header:
# -- PostgreSQL database dump
# SET statement_timeout = 0;
```

### Test Restore

```bash
# 1. Create test database
createdb bitrent_test

# 2. Restore backup to test database
export PGPASSWORD="password"
gunzip -c bitrent_backup_latest.sql.gz | \
  psql -h localhost -U postgres -d bitrent_test

# 3. Run verification queries
psql -d bitrent_test -c "
  SELECT COUNT(*) as users FROM users;
  SELECT COUNT(*) as rentals FROM rentals;
  SELECT COUNT(*) as payments FROM payments;
"

# 4. Clean up
dropdb bitrent_test
```

## Backup Retention Policy

| Backup Type | Retention | Purpose |
|-------------|-----------|---------|
| Hourly (Supabase PITR) | 7 days | Recent recovery |
| Daily (Automated) | 30 days | Compliance |
| Weekly (Manual) | 90 days | Long-term archive |
| Monthly (Manual) | 1 year | Regulatory |

## External Backup Storage

### S3 Storage (Recommended)

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure

# Upload backup to S3
aws s3 cp bitrent_backup_latest.sql.gz \
  s3://bitrent-backups/$(date +%Y/%m)/backup.sql.gz \
  --storage-class GLACIER

# Restore from S3
aws s3 cp \
  s3://bitrent-backups/2026/03/backup.sql.gz \
  - | gunzip | psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d postgres
```

### Google Cloud Storage

```bash
# Upload to GCS
gsutil cp bitrent_backup_latest.sql.gz \
  gs://bitrent-backups/$(date +%Y/%m)/backup.sql.gz

# Restore from GCS
gsutil cp gs://bitrent-backups/2026/03/backup.sql.gz - | \
  gunzip | psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d postgres
```

## Monitoring Backup Health

### Create Monitoring Alert

```sql
-- Query to check if backups are running
SELECT 
  DATE(executed_at) as backup_date,
  COUNT(*) as backup_count,
  MAX(executed_at) as latest_backup
FROM pg_backup_history
GROUP BY DATE(executed_at)
ORDER BY backup_date DESC
LIMIT 7;
```

### Check Backup Log

```bash
# Recent backups
tail -20 scripts/backup.log

# Check for errors
grep -i "error\|failed" scripts/backup.log

# Check completion rate
grep "completed successfully" scripts/backup.log | wc -l
```

## Troubleshooting

### Backup Fails with "Connection Timeout"

```bash
# Solution 1: Check environment variables
echo $SUPABASE_DB_HOST
echo $SUPABASE_DB_USER

# Solution 2: Test connection
psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d postgres -c "SELECT 1"

# Solution 3: Increase timeout
export PGCONNECT_TIMEOUT=30
./backup.sh
```

### Restore Fails with "Role Does Not Exist"

```bash
# The restored backup references roles that don't exist
# Solution: Edit SQL file and replace role names

# View roles in backup
grep "SET ROLE" bitrent_backup.sql | sort | uniq

# Replace with correct role
sed -i 's/old_role/postgres/g' bitrent_backup.sql

# Try restore again
./restore.sh bitrent_backup.sql --force
```

### Backup File is Too Small

```bash
# Might indicate incomplete backup
# Check process didn't terminate early

pg_dump --version
# Should be PostgreSQL 12+

# Try again with verbose output
pg_dump -v ... > backup.sql
```

## Best Practices

✅ **DO:**
- Create daily automated backups
- Test restore procedures monthly
- Keep backups in multiple locations
- Archive monthly backups long-term
- Monitor backup logs for errors
- Document recovery procedures
- Update passwords after restores in production

❌ **DON'T:**
- Store backups next to database
- Use same password as production
- Restore to production without testing
- Leave backup files unencrypted in transit
- Ignore backup errors
- Delete old backups without archiving

## Recovery Time Objectives (RTO/RPO)

| Scenario | RTO | RPO | Method |
|----------|-----|-----|--------|
| Last 7 days | 15 min | 1 hour | Supabase PITR |
| Last 30 days | 30 min | 1 day | Manual backup |
| Older | 1 hour | 1 week | Archive storage |

## See Also

- [MIGRATIONS.md](./MIGRATIONS.md) - Database schema changes
- [PERFORMANCE_TUNING.md](./PERFORMANCE_TUNING.md) - Query optimization
- [RLS_POLICIES.md](./RLS_POLICIES.md) - Security configuration
