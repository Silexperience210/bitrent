# BitRent Database Performance Tuning Guide

Comprehensive guide to optimizing database queries and performance.

## Performance Metrics

### Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Query Response Time (p95) | < 100ms | - |
| Write Latency | < 50ms | - |
| Index Size | < 10MB | - |
| Connection Pool Utilization | 60-80% | - |
| Cache Hit Ratio | > 99% | - |

## Query Optimization

### 1. Identify Slow Queries

#### Using EXPLAIN ANALYZE

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT r.*, u.pubkey_nostr, m.name
FROM rentals r
JOIN users u ON r.user_id = u.id
JOIN mineurs m ON r.mineur_id = m.id
WHERE r.user_id = 'user-123'
AND r.status = 'active';

-- Output shows:
-- - Seq Scan (bad) vs Index Scan (good)
-- - Rows planned vs rows actually returned
-- - Execution time
```

#### Enable Query Logging

```sql
-- Log all slow queries (> 500ms)
ALTER SYSTEM SET log_min_duration_statement = 500;
SELECT pg_reload_conf();

-- Check logs
tail -f /var/log/postgresql/postgresql.log | grep "duration:"
```

### 2. Index Optimization

#### Current Indexes

```sql
-- View all indexes
SELECT * FROM pg_indexes WHERE tablename NOT LIKE 'pg_%';

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

#### Add Missing Indexes

```sql
-- Before (full table scan):
EXPLAIN ANALYZE
SELECT * FROM rentals WHERE created_at > '2026-03-01' AND status = 'completed';
-- Seq Scan on rentals (slow)

-- Add index
CREATE INDEX idx_rentals_completed_date ON rentals(created_at DESC) 
WHERE status = 'completed';

-- After (index scan):
-- Index Scan using idx_rentals_completed_date (fast!)
```

#### Index Best Practices

```sql
-- ✅ GOOD: Composite index following query patterns
CREATE INDEX idx_rentals_user_status_date ON rentals(user_id, status, created_at DESC);

-- Query that benefits:
SELECT * FROM rentals 
WHERE user_id = 'user-123' AND status = 'active' 
ORDER BY created_at DESC LIMIT 10;
-- Uses single index for filter AND sort

-- ❌ BAD: Wrong column order
CREATE INDEX idx_rentals_status_user ON rentals(status, user_id);
-- Query doesn't benefit because it filters by user_id first

-- ✅ GOOD: Partial index for active records
CREATE INDEX idx_rentals_active ON rentals(user_id, created_at DESC)
WHERE status IN ('active', 'pending');
-- Smaller index, faster lookups

-- ❌ BAD: Index on low-cardinality column
CREATE INDEX idx_rentals_status ON rentals(status);
-- Boolean/enum columns rarely benefit from indexing
```

#### Analyze Index Performance

```sql
-- Find unused indexes (remove them!)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE 'pg_toast%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Drop unused indexes
DROP INDEX idx_name;
```

### 3. Query Patterns

#### Pattern 1: User's Recent Rentals

```sql
-- ❌ SLOW: No index
SELECT * FROM rentals 
WHERE user_id = 'user-123' 
ORDER BY created_at DESC 
LIMIT 10;

-- ✅ FAST: With index
CREATE INDEX idx_user_created ON rentals(user_id, created_at DESC);

-- Now query uses index for both filter and sort
```

#### Pattern 2: Revenue Reports

```sql
-- ❌ SLOW: Calculates for all rows
SELECT 
  SUM(total_sats) as total_revenue,
  COUNT(*) as rental_count
FROM rentals
WHERE status = 'completed' AND created_at > '2026-01-01';

-- ✅ FASTER: Pre-calculated in analytics_daily view
SELECT SUM(total_sats_revenue) as total_revenue
FROM analytics_daily
WHERE date >= '2026-01-01';

-- Or batch calculate overnight
-- ✅ FASTEST: Materialized view (if supported)
CREATE MATERIALIZED VIEW mv_daily_revenue AS
SELECT DATE(created_at) as date, SUM(total_sats) as revenue
FROM rentals
WHERE status = 'completed'
GROUP BY DATE(created_at);

REFRESH MATERIALIZED VIEW mv_daily_revenue;
```

#### Pattern 3: Active Mineurs

```sql
-- ❌ SLOW: Checks all mineurs
SELECT * FROM mineurs 
WHERE status IN ('online', 'offline')
AND uptime_percentage > 90;

-- ✅ FAST: Partial index on frequently queried subset
CREATE INDEX idx_mineurs_available ON mineurs(uptime_percentage DESC)
WHERE status IN ('online', 'offline');

-- Query can use index
SELECT * FROM mineurs 
WHERE status IN ('online', 'offline')
AND uptime_percentage > 90;
```

## Connection Pooling

### Current Configuration

```toml
# supabase/config.toml
[db]
pool_mode = "transaction"
max_pool_size = 15
default_pool_size = 10
```

### Monitor Pool Usage

```sql
-- View active connections
SELECT 
  pid,
  usename,
  application_name,
  state,
  query_start,
  LEFT(query, 80) as query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start DESC;

-- Count by state
SELECT state, COUNT(*) FROM pg_stat_activity GROUP BY state;
```

### Adjust Pool Size

```sql
-- If max_pool_size exceeded
-- Error: sorry, too many clients already

-- Check current settings
SHOW max_connections;  -- Usually 100-200

-- For Supabase, increase via dashboard
-- Settings → Database → Connection Pool
```

### Connection Best Practices

```javascript
// ✅ GOOD: Reuse connection in transaction
const { data, error } = await supabase
  .from('rentals')
  .insert(rentalData)
  .select();

// ❌ BAD: Don't open/close for each query
for (let i = 0; i < 1000; i++) {
  await supabase.from('analytics_daily').select('*'); // 1000 connections!
}

// ✅ GOOD: Batch queries
const results = await Promise.all(
  userIds.map(id => 
    supabase.from('users').select('*').eq('id', id)
  )
);
```

## Table Statistics

### Update Statistics

```sql
-- PostgreSQL uses statistics for query planning
-- Manual update
ANALYZE users;
ANALYZE mineurs;
ANALYZE rentals;
ANALYZE payments;

-- Automatic (enabled by default)
-- Runs every hour
```

### Check Statistics

```sql
-- View table statistics
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

## Caching Strategy

### Query Result Caching

```javascript
// ✅ Cache static/slow-changing data
const mineurs = await redis.get('mineurs_available');
if (!mineurs) {
  const { data } = await supabase
    .from('mineurs')
    .select('*')
    .eq('status', 'online');
  
  // Cache for 1 hour
  await redis.set('mineurs_available', JSON.stringify(data), 'EX', 3600);
}
```

### Cache Invalidation

```javascript
// Invalidate cache on data change
async function createRental(rentalData) {
  const { data } = await supabase
    .from('rentals')
    .insert(rentalData)
    .select();
  
  // Invalidate related caches
  await redis.del('user_rentals_' + userId);
  await redis.del('miner_active_rentals_' + minerId);
  await redis.del('analytics_daily_' + today);
  
  return data;
}
```

## View Performance

### Use Views for Complex Queries

```sql
-- ❌ Complex JOIN in application
const rentalDetails = `
  SELECT r.*, u.pubkey_nostr, m.name, p.status
  FROM rentals r
  JOIN users u ON r.user_id = u.id
  JOIN mineurs m ON r.mineur_id = m.id
  LEFT JOIN payments p ON r.id = p.rental_id
  WHERE r.user_id = $1
`;

-- ✅ Use view
CREATE VIEW v_user_rentals_details AS
SELECT r.*, u.pubkey_nostr, m.name, p.status
FROM rentals r
JOIN users u ON r.user_id = u.id
JOIN mineurs m ON r.mineur_id = m.id
LEFT JOIN payments p ON r.id = p.rental_id;

-- Query is simpler and reuses prepared statement
SELECT * FROM v_user_rentals_details WHERE user_id = $1;
```

### Check View Performance

```sql
-- Views add minimal overhead
-- But monitor underlying table scans
EXPLAIN ANALYZE
SELECT * FROM v_active_rentals WHERE user_id = 'user-123';

-- Should show index scans on underlying tables
```

## Partitioning Strategy

### Current Approach

For < 1M rows, no partitioning needed. When rentals table exceeds 1M rows:

```sql
-- Partition rentals by year
CREATE TABLE rentals_2025 PARTITION OF rentals
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE rentals_2026 PARTITION OF rentals
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Benefits:
-- - Faster queries on specific year
-- - Faster deletes (drop partition)
-- - Better index usage
```

## Monitoring and Alerts

### Key Metrics to Monitor

```sql
-- 1. Slow queries
SELECT 
  query,
  mean_time,
  calls,
  max_time
FROM pg_stat_statements
WHERE mean_time > 100  -- > 100ms average
ORDER BY mean_time DESC
LIMIT 10;

-- 2. Index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_blks_read,
  idx_blks_hit,
  ROUND(100 * idx_blks_hit / (idx_blks_hit + idx_blks_read)::float, 2) as cache_hit_ratio
FROM pg_statio_user_indexes
WHERE idx_blks_read > 0
ORDER BY cache_hit_ratio;

-- 3. Table size growth
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_live_tup as rows
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Setup Alerts

```javascript
// Alert if query takes too long
const SLOW_QUERY_THRESHOLD = 5000; // 5 seconds

async function executeQuery(sql, params) {
  const startTime = Date.now();
  const result = await supabase.rpc('execute_query', { sql, params });
  const duration = Date.now() - startTime;
  
  if (duration > SLOW_QUERY_THRESHOLD) {
    await sendAlert(`Slow query detected: ${sql} took ${duration}ms`);
  }
  
  return result;
}
```

## Load Testing

### Simulate Production Load

```bash
# Using pgbench
pgbench -c 10 -j 2 -T 60 -U postgres -d bitrent_test

# Results:
# tps = X transactions per second
# Should handle > 100 TPS
```

### Test Key Queries

```sql
-- Test 1: List user's rentals (most frequent)
EXPLAIN ANALYZE
SELECT * FROM rentals 
WHERE user_id = 'user-123' 
ORDER BY created_at DESC 
LIMIT 10;

-- Test 2: Revenue report (batch)
EXPLAIN ANALYZE
SELECT DATE(created_at), SUM(total_sats) 
FROM rentals
WHERE status = 'completed'
GROUP BY DATE(created_at);

-- Test 3: Miner utilization (real-time)
EXPLAIN ANALYZE
SELECT COUNT(*) FROM rentals 
WHERE mineur_id = 'miner-456' 
AND status = 'active';
```

## Optimization Checklist

- [ ] Run ANALYZE on all tables
- [ ] Check for missing indexes (idx_scan = 0)
- [ ] Verify index column order matches queries
- [ ] Add partial indexes for common filters
- [ ] Check query plans (EXPLAIN ANALYZE)
- [ ] Test slow query log
- [ ] Verify connection pool settings
- [ ] Monitor table growth
- [ ] Check cache hit ratios
- [ ] Test with production-like load
- [ ] Document all optimizations
- [ ] Monitor post-optimization

## See Also

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Table structure and indexes
- [MIGRATIONS.md](./MIGRATIONS.md) - Index creation
- [RLS_POLICIES.md](./RLS_POLICIES.md) - Security considerations in performance
