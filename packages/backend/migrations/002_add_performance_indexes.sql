-- BitRent Phase 3: Performance Optimization Indexes
-- Supabase PostgreSQL
-- Version: 2.0.0
-- Date: 2026-03-15

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Fast filtering of active rentals by user and status
CREATE INDEX IF NOT EXISTS idx_rentals_user_status_time 
ON rentals(user_id, status, start_time DESC)
INCLUDE (total_sats, mineur_id);

-- Revenue queries
CREATE INDEX IF NOT EXISTS idx_rentals_revenue_by_mineur
ON rentals(mineur_id, status, created_at DESC)
WHERE status IN ('active', 'completed');

CREATE INDEX IF NOT EXISTS idx_rentals_revenue_by_user
ON rentals(user_id, status, created_at DESC)
WHERE status IN ('active', 'completed');

-- Payment lookups with status
CREATE INDEX IF NOT EXISTS idx_payments_status_expiry
ON payments(status, expires_at DESC);

-- Time-range queries
CREATE INDEX IF NOT EXISTS idx_rentals_time_range
ON rentals(start_time, end_time);

-- Analytics queries
CREATE INDEX IF NOT EXISTS idx_rentals_daily
ON rentals(DATE(created_at), status);

CREATE INDEX IF NOT EXISTS idx_payments_daily
ON payments(DATE(created_at), status);

-- Miner utilization queries
CREATE INDEX IF NOT EXISTS idx_rentals_mineur_time
ON rentals(mineur_id, start_time DESC, end_time DESC)
WHERE status IN ('active', 'pending');

-- ============================================================================
-- PARTIAL INDEXES (Performance optimization)
-- ============================================================================

-- Only index active payments (smaller index, faster queries)
CREATE INDEX IF NOT EXISTS idx_payments_pending
ON payments(status, expires_at)
WHERE status IN ('pending', 'confirmed');

-- Only index active rentals
CREATE INDEX IF NOT EXISTS idx_rentals_active
ON rentals(mineur_id, user_id, status)
WHERE status IN ('active', 'pending');

-- Only index active mineurs
CREATE INDEX IF NOT EXISTS idx_mineurs_active
ON mineurs(owner_id, status)
WHERE status IN ('online', 'offline');

-- ============================================================================
-- FOREIGN KEY INDEXES (Already created by PK, but explicit for clarity)
-- ============================================================================

-- Ensure efficient join paths
CREATE INDEX IF NOT EXISTS idx_rentals_fk_user
ON rentals(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rentals_fk_mineur
ON rentals(mineur_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_fk_rental
ON payments(rental_id, created_at DESC);

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

-- Update statistics for better query planning
ANALYZE users;
ANALYZE mineurs;
ANALYZE rentals;
ANALYZE payments;
ANALYZE audit_logs;
ANALYZE analytics_daily;

-- ============================================================================
-- INSERT MIGRATION RECORD
-- ============================================================================

INSERT INTO migration_history (version, filename, description, status)
VALUES (2, '002_add_performance_indexes.sql', 'Performance optimization with composite and partial indexes', 'success')
ON CONFLICT (version) DO NOTHING;
