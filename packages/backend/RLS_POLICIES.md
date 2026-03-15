# BitRent Row-Level Security (RLS) Policies

Complete guide to row-level security implementation in BitRent.

## Overview

Row-Level Security (RLS) enforces fine-grained access control at the database level, ensuring users can only access data they're authorized to see.

## Security Model

### User Roles

```
User
├── admin: Full access to all data
└── user: Limited to own data

Miner Owner: Can see their mineurs and related rentals/payments
```

### Data Access Rules

| Table | Admin | User | Miner Owner |
|-------|-------|------|------------|
| users | VIEW ALL | VIEW OWN | N/A |
| mineurs | CRUD ALL | VIEW AVAILABLE | CRUD OWN |
| rentals | CRUD ALL | CRUD OWN | VIEW OWN MINEURS |
| payments | VIEW ALL | VIEW OWN | VIEW OWN MINEURS |
| audit_logs | VIEW ALL | VIEW OWN | N/A |
| analytics | VIEW ALL | VIEW ALL | VIEW ALL |

## Detailed Policies

### Users Table

**Policy: `users_select_own`**
- Users can view their own profile
- Admins can view all profiles

```sql
-- User sees their own profile
SELECT * FROM users WHERE pubkey_nostr = 'my_pubkey';

-- Admin sees all
SELECT * FROM users WHERE role = 'admin';
```

**Policy: `users_update_own`**
- Users can update their own profile
- Admins can update anyone

```sql
-- Update own profile
UPDATE users SET metadata = '{}' WHERE pubkey_nostr = 'my_pubkey';
```

### Mineurs Table

**Policies:**

1. **`mineurs_select_public`** - Everyone sees available mineurs
```sql
SELECT * FROM mineurs WHERE status IN ('online', 'offline');
```

2. **`mineurs_select_owner`** - Owner sees their mineurs
```sql
SELECT * FROM mineurs 
WHERE owner_id = (SELECT id FROM users WHERE pubkey_nostr = 'my_pubkey');
```

3. **`mineurs_select_admin`** - Admin sees all
```sql
SELECT * FROM mineurs;
```

4. **`mineurs_insert_owner`** - Owner can register mineurs
```sql
INSERT INTO mineurs (owner_id, name, ...) 
VALUES ((SELECT id FROM users WHERE pubkey_nostr = 'my_pubkey'), ...);
```

5. **`mineurs_update_owner`** - Owner can update their mineurs
```sql
UPDATE mineurs SET status = 'maintenance' 
WHERE owner_id = (SELECT id FROM users WHERE pubkey_nostr = 'my_pubkey');
```

### Rentals Table

**Policies:**

1. **`rentals_select_own`** - User sees their rentals
```sql
SELECT * FROM rentals 
WHERE user_id = (SELECT id FROM users WHERE pubkey_nostr = 'my_pubkey');
```

2. **`rentals_select_miner_owner`** - Miner owner sees rentals of their mineurs
```sql
SELECT * FROM rentals 
WHERE mineur_id IN (
  SELECT id FROM mineurs 
  WHERE owner_id = (SELECT id FROM users WHERE pubkey_nostr = 'my_pubkey')
);
```

3. **`rentals_insert_own`** - User can create rentals
```sql
INSERT INTO rentals (user_id, mineur_id, ...) 
VALUES ((SELECT id FROM users WHERE pubkey_nostr = 'my_pubkey'), ...);
```

### Payments Table

**Policies:**

1. **`payments_select_own`** - User sees their payments
```sql
SELECT * FROM payments 
WHERE rental_id IN (
  SELECT id FROM rentals 
  WHERE user_id = (SELECT id FROM users WHERE pubkey_nostr = 'my_pubkey')
);
```

2. **`payments_select_miner_owner`** - Miner owner sees payments for their mineurs
```sql
SELECT * FROM payments 
WHERE rental_id IN (
  SELECT r.id FROM rentals r
  WHERE r.mineur_id IN (
    SELECT id FROM mineurs
    WHERE owner_id = (SELECT id FROM users WHERE pubkey_nostr = 'my_pubkey')
  )
);
```

### Audit Logs Table

**Policies:**

1. **`audit_logs_select_own`** - User sees their audit logs
```sql
SELECT * FROM audit_logs 
WHERE user_id = (SELECT id FROM users WHERE pubkey_nostr = 'my_pubkey');
```

2. **`audit_logs_insert`** - Anyone can create audit logs
```sql
INSERT INTO audit_logs (user_id, action, ...) VALUES (...);
```

3. **`audit_logs_no_delete`** - No one can delete (append-only)
```sql
-- This will ALWAYS FAIL
DELETE FROM audit_logs WHERE id = 'some_id'; -- ❌ Denied
```

## Testing RLS Policies

### Enable RLS in your session

```sql
-- As admin, verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'mineurs', 'rentals', 'payments', 'audit_logs');

-- Output should show 'true' for all tables
```

### Test as Different Users

```sql
-- Login as user@example.com
-- Should only see own rentals
SELECT * FROM rentals;

-- Try to see another user's rental
SELECT * FROM rentals WHERE user_id != (SELECT id FROM auth.users());
-- ❌ Should return 0 rows

-- Try to update another user's rental
UPDATE rentals SET status = 'completed' WHERE user_id != (SELECT id FROM auth.users());
-- ❌ Should fail with permission error
```

### Disable RLS (Testing Only)

```sql
-- ⚠️ DANGEROUS: Only use in development!
ALTER TABLE rentals DISABLE ROW LEVEL SECURITY;

-- Re-enable when done
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
```

## Common RLS Patterns

### Pattern 1: User Owns Data

```sql
-- User can only see/update own data
CREATE POLICY user_own ON table_name
  FOR ALL USING (user_id = auth.uid());
```

### Pattern 2: Public Read, Private Write

```sql
-- Everyone can read (specific conditions)
CREATE POLICY public_read ON table_name
  FOR SELECT USING (published = true);

-- Only owner can write
CREATE POLICY owner_write ON table_name
  FOR INSERT, UPDATE, DELETE 
  USING (owner_id = auth.uid());
```

### Pattern 3: Admin Override

```sql
-- Admins can do anything
CREATE POLICY admin_all ON table_name
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );
```

### Pattern 4: Shared Access (Teams)

```sql
-- User sees data they or their team can access
CREATE POLICY team_access ON table_name
  FOR SELECT USING (
    owner_id = auth.uid() 
    OR team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );
```

## Performance Implications

### Index Usage with RLS

RLS policies should leverage indexes for performance:

```sql
-- ✅ GOOD: Uses index
SELECT * FROM rentals 
WHERE user_id = auth.uid() AND status = 'active';
-- Uses: idx_rentals_user_status_created

-- ❌ BAD: Full table scan (policy check on all rows)
SELECT * FROM rentals 
WHERE EXTRACT(MONTH FROM created_at) = 3;
-- RLS checks all rows before applying WHERE clause
```

### Query Optimization Tips

1. **Always filter by user_id first**
```sql
-- ✅ GOOD: Filters by user_id
SELECT * FROM rentals WHERE user_id = (SELECT id FROM ...) AND status = 'active';

-- ❌ BAD: Doesn't explicitly use user_id
SELECT * FROM rentals WHERE status = 'active';
```

2. **Use specific columns**
```sql
-- ✅ GOOD: Only needed columns
SELECT id, status, total_sats FROM rentals WHERE user_id = (SELECT id FROM ...);

-- ❌ BAD: Fetches all columns
SELECT * FROM rentals WHERE user_id = (SELECT id FROM ...);
```

3. **Leverage partitioning**
```sql
-- If table is partitioned by user_id, RLS queries are faster
SELECT * FROM rentals WHERE user_id = (SELECT id FROM ...) AND created_at > '2026-03-01';
```

## Debugging RLS Issues

### Check Active Policies

```sql
-- List all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('users', 'mineurs', 'rentals', 'payments');
```

### Test a Specific Policy

```sql
-- Check if user can see a specific row
SET LOCAL ROLE authenticated;
SET LOCAL app.current_user_id = 'user123';

SELECT * FROM rentals WHERE id = 'rental_id';
-- If 0 rows returned, RLS is blocking access
```

### Enable Audit Logging

```sql
-- Log all RLS denials in PostgreSQL logs
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 0;
SELECT pg_reload_conf();

-- Check logs for "policy" keyword
tail -f /var/log/postgresql/postgresql.log | grep policy
```

## Common Issues and Solutions

### Issue 1: "Permission Denied" When Querying Own Data

**Cause:** Auth context not properly set

**Solution:** 
```javascript
// Make sure auth session is active
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  console.error('Not authenticated');
  return;
}

// Then query will work
const { data } = await supabase
  .from('rentals')
  .select('*');
```

### Issue 2: Admin Can't See All Data

**Cause:** Policy not checking for admin role

**Solution:**
```sql
-- Fix: Add admin check
CREATE POLICY admin_can_see_all ON rentals
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
```

### Issue 3: Performance Degradation After RLS

**Cause:** Missing indexes, poor policy logic

**Solution:**
```sql
-- 1. Check query plan
EXPLAIN ANALYZE
SELECT * FROM rentals WHERE user_id = auth.uid();

-- 2. Add missing indexes
CREATE INDEX idx_rentals_user_rls ON rentals(user_id, status)
WHERE status IN ('active', 'pending');

-- 3. Optimize policy (avoid subqueries)
-- ❌ BAD: Subquery in policy
CREATE POLICY users_own ON table_name
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE pubkey = ...));

-- ✅ GOOD: Use auth context
CREATE POLICY users_own ON table_name
  FOR SELECT USING (user_id = auth.uid());
```

## Migration to RLS

### Enable Gradually

```sql
-- 1. Create policies but don't enable RLS yet
CREATE POLICY rental_users_select ON rentals FOR SELECT ...;

-- 2. Test with specific role
SET ROLE authenticated;
SELECT COUNT(*) FROM rentals;

-- 3. Enable RLS
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

-- 4. Monitor logs for issues
tail -f /var/log/postgresql/postgresql.log
```

### Rollback if Issues

```sql
-- Disable RLS (temporary)
ALTER TABLE rentals DISABLE ROW LEVEL SECURITY;

-- Fix policy issues
DROP POLICY rental_users_select ON rentals;
CREATE POLICY rental_users_select ON rentals FOR SELECT ...;

-- Re-enable
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
```

## Best Practices

✅ **DO:**
- Use auth context (`auth.uid()`) instead of app context
- Create separate policies for different operations (SELECT, INSERT, UPDATE, DELETE)
- Include admin override policies
- Index on columns used in RLS policies
- Test policies with multiple user roles
- Log all RLS denials
- Document why each policy exists
- Review policies monthly

❌ **DON'T:**
- Use complex logic in policies (move to application)
- Have policies that depend on application state
- Forget to test edge cases
- Create overly broad policies ("everyone can access")
- Use SECURITY DEFINER on functions with RLS
- Disable RLS without good reason
- Forget to update RLS when schema changes

## See Also

- [MIGRATIONS.md](./MIGRATIONS.md) - How RLS is created
- [PERFORMANCE_TUNING.md](./PERFORMANCE_TUNING.md) - Optimize RLS queries
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Table structure
