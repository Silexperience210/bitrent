-- BitRent Phase 3: Database Views for Analytics and Reporting
-- Supabase PostgreSQL
-- Version: 5.0.0
-- Date: 2026-03-15

-- ============================================================================
-- OPERATIONAL VIEWS
-- ============================================================================

-- Active rentals summary
DROP VIEW IF EXISTS v_active_rentals CASCADE;
CREATE VIEW v_active_rentals AS
SELECT 
  r.id,
  r.user_id,
  u.pubkey_nostr as user_pubkey,
  r.mineur_id,
  m.name as miner_name,
  m.ip_address,
  m.sats_per_minute,
  r.start_time,
  r.end_time,
  r.duration_minutes,
  r.total_sats,
  r.status,
  EXTRACT(EPOCH FROM (r.end_time - NOW())) / 60 as remaining_minutes,
  r.created_at,
  r.updated_at
FROM rentals r
JOIN users u ON r.user_id = u.id
JOIN mineurs m ON r.mineur_id = m.id
WHERE r.status IN ('active', 'pending');

-- Pending payments
DROP VIEW IF EXISTS v_pending_payments CASCADE;
CREATE VIEW v_pending_payments AS
SELECT 
  p.id,
  p.rental_id,
  p.invoice_hash,
  p.amount_sats,
  p.status,
  EXTRACT(EPOCH FROM (p.expires_at - NOW())) / 60 as minutes_until_expiry,
  r.user_id,
  u.pubkey_nostr,
  r.mineur_id,
  m.name as miner_name,
  p.created_at,
  p.expires_at
FROM payments p
JOIN rentals r ON p.rental_id = r.id
JOIN users u ON r.user_id = u.id
JOIN mineurs m ON r.mineur_id = m.id
WHERE p.status IN ('pending', 'confirmed');

-- Available mineurs (not currently rented)
DROP VIEW IF EXISTS v_available_mineurs CASCADE;
CREATE VIEW v_available_mineurs AS
SELECT DISTINCT
  m.id,
  m.owner_id,
  u.pubkey_nostr as owner_pubkey,
  m.name,
  m.ip_address,
  m.port,
  m.hashrate_specs,
  m.sats_per_minute,
  m.status,
  m.total_revenue_sats,
  m.uptime_percentage,
  m.last_checked,
  m.created_at
FROM mineurs m
JOIN users u ON m.owner_id = u.id
LEFT JOIN rentals r ON m.id = r.mineur_id AND r.status IN ('active', 'pending')
WHERE m.status IN ('online', 'offline')
AND r.id IS NULL
ORDER BY m.total_revenue_sats DESC, m.uptime_percentage DESC;

-- ============================================================================
-- REVENUE VIEWS
-- ============================================================================

-- Revenue by miner
DROP VIEW IF EXISTS v_revenue_by_miner CASCADE;
CREATE VIEW v_revenue_by_miner AS
SELECT 
  m.id,
  m.name,
  m.ip_address,
  u.pubkey_nostr as owner_pubkey,
  COUNT(r.id) as total_rentals,
  COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_rentals,
  COALESCE(SUM(CASE WHEN r.status = 'completed' THEN r.total_sats ELSE 0 END), 0) as total_revenue_sats,
  COALESCE(AVG(CASE WHEN r.status = 'completed' THEN r.duration_minutes ELSE NULL END), 0) as avg_rental_duration,
  m.uptime_percentage,
  m.last_checked,
  m.created_at
FROM mineurs m
JOIN users u ON m.owner_id = u.id
LEFT JOIN rentals r ON m.id = r.mineur_id
GROUP BY m.id, u.id
ORDER BY total_revenue_sats DESC;

-- Revenue by user
DROP VIEW IF EXISTS v_revenue_by_user CASCADE;
CREATE VIEW v_revenue_by_user AS
SELECT 
  u.id,
  u.pubkey_nostr,
  COUNT(r.id) as total_rentals,
  COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_rentals,
  COUNT(CASE WHEN r.status = 'active' THEN 1 END) as active_rentals,
  COALESCE(SUM(CASE WHEN r.status = 'completed' THEN r.total_sats ELSE 0 END), 0) as total_sats_spent,
  COALESCE(SUM(r.duration_minutes), 0) as total_rental_minutes,
  u.created_at,
  MAX(r.created_at) as last_rental_date
FROM users u
LEFT JOIN rentals r ON u.id = r.user_id
GROUP BY u.id
ORDER BY total_sats_spent DESC;

-- ============================================================================
-- TOP PERFORMERS VIEWS
-- ============================================================================

-- Top mineurs by usage
DROP VIEW IF EXISTS v_top_mineurs_by_usage CASCADE;
CREATE VIEW v_top_mineurs_by_usage AS
SELECT 
  m.id,
  m.name,
  m.ip_address,
  COUNT(r.id) as rental_count,
  SUM(r.duration_minutes) as total_rental_minutes,
  SUM(r.total_sats) as total_revenue,
  m.uptime_percentage,
  ROUND(100.0 * COUNT(r.id) / NULLIF(
    (SELECT COUNT(*) FROM rentals WHERE status != 'cancelled'), 0
  ), 2) as usage_percentage,
  m.last_checked
FROM mineurs m
LEFT JOIN rentals r ON m.id = r.mineur_id AND r.status != 'cancelled'
GROUP BY m.id
ORDER BY rental_count DESC, total_revenue DESC
LIMIT 50;

-- Top users by spending
DROP VIEW IF EXISTS v_top_users_by_spending CASCADE;
CREATE VIEW v_top_users_by_spending AS
SELECT 
  u.id,
  u.pubkey_nostr,
  COUNT(DISTINCT r.id) as rental_count,
  SUM(r.total_sats) as total_spent,
  SUM(r.duration_minutes) as total_minutes,
  ROUND(100.0 * SUM(r.total_sats) / NULLIF(
    (SELECT SUM(total_sats) FROM rentals WHERE status = 'completed'), 1
  ), 2) as spending_percentage,
  u.created_at
FROM users u
LEFT JOIN rentals r ON u.id = r.user_id AND r.status != 'cancelled'
GROUP BY u.id
ORDER BY total_spent DESC
LIMIT 100;

-- ============================================================================
-- OPERATIONAL METRICS VIEWS
-- ============================================================================

-- Miner performance metrics
DROP VIEW IF EXISTS v_miner_performance CASCADE;
CREATE VIEW v_miner_performance AS
SELECT 
  m.id,
  m.name,
  m.status,
  m.uptime_percentage,
  m.total_revenue_sats,
  EXTRACT(EPOCH FROM (NOW() - m.last_checked)) / 3600 as hours_since_last_check,
  COUNT(r.id) as active_rental_count,
  SUM(CASE WHEN r.status = 'active' THEN r.sats_per_minute ELSE 0 END) as current_earning_sats_per_minute,
  m.last_checked,
  m.updated_at
FROM mineurs m
LEFT JOIN rentals r ON m.id = r.mineur_id AND r.status = 'active'
GROUP BY m.id
ORDER BY m.uptime_percentage DESC;

-- Payment status summary
DROP VIEW IF EXISTS v_payment_status_summary CASCADE;
CREATE VIEW v_payment_status_summary AS
SELECT 
  p.status,
  COUNT(*) as count,
  COALESCE(SUM(p.amount_sats), 0) as total_sats,
  MIN(p.created_at) as oldest,
  MAX(p.created_at) as newest,
  AVG(p.amount_sats) as avg_sats
FROM payments p
GROUP BY p.status
ORDER BY count DESC;

-- Rental status summary
DROP VIEW IF EXISTS v_rental_status_summary CASCADE;
CREATE VIEW v_rental_status_summary AS
SELECT 
  r.status,
  COUNT(*) as count,
  COALESCE(SUM(r.total_sats), 0) as total_sats,
  COALESCE(AVG(r.duration_minutes), 0) as avg_duration,
  MIN(r.created_at) as oldest,
  MAX(r.created_at) as newest
FROM rentals r
GROUP BY r.status
ORDER BY count DESC;

-- ============================================================================
-- TIME-SERIES VIEWS FOR CHARTS
-- ============================================================================

-- Daily revenue trend
DROP VIEW IF EXISTS v_daily_revenue CASCADE;
CREATE VIEW v_daily_revenue AS
SELECT 
  DATE(r.created_at) as date,
  COUNT(*) as rental_count,
  COALESCE(SUM(CASE WHEN r.status = 'completed' THEN r.total_sats ELSE 0 END), 0) as completed_revenue,
  COALESCE(SUM(r.total_sats), 0) as total_sats,
  COALESCE(AVG(r.duration_minutes), 0) as avg_duration
FROM rentals r
GROUP BY DATE(r.created_at)
ORDER BY date DESC;

-- Hourly usage trend (last 7 days)
DROP VIEW IF EXISTS v_hourly_usage CASCADE;
CREATE VIEW v_hourly_usage AS
SELECT 
  DATE_TRUNC('hour', r.created_at) as hour,
  COUNT(*) as rental_count,
  COUNT(DISTINCT r.user_id) as unique_users,
  COUNT(DISTINCT r.mineur_id) as unique_mineurs,
  COALESCE(SUM(r.total_sats), 0) as total_sats
FROM rentals r
WHERE r.created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', r.created_at)
ORDER BY hour DESC;

-- ============================================================================
-- USER ACTIVITY VIEWS
-- ============================================================================

-- User rental history
DROP VIEW IF EXISTS v_user_rental_history CASCADE;
CREATE VIEW v_user_rental_history AS
SELECT 
  r.id,
  r.user_id,
  u.pubkey_nostr,
  r.mineur_id,
  m.name as miner_name,
  r.status,
  r.start_time,
  r.end_time,
  r.duration_minutes,
  r.total_sats,
  r.created_at,
  CASE 
    WHEN r.status = 'completed' THEN EXTRACT(EPOCH FROM (r.end_time - r.start_time)) / 60
    WHEN r.status = 'active' THEN EXTRACT(EPOCH FROM (NOW() - r.start_time)) / 60
    ELSE NULL 
  END as actual_duration_minutes
FROM rentals r
JOIN users u ON r.user_id = u.id
JOIN mineurs m ON r.mineur_id = m.id
ORDER BY r.created_at DESC;

-- User statistics
DROP VIEW IF EXISTS v_user_statistics CASCADE;
CREATE VIEW v_user_statistics AS
SELECT 
  u.id,
  u.pubkey_nostr,
  u.created_at,
  COUNT(DISTINCT r.id) as total_rentals,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'completed') as completed_rentals,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'active') as active_rentals,
  COALESCE(SUM(r.total_sats), 0) as total_sats_spent,
  COALESCE(AVG(r.total_sats), 0) as avg_rental_cost,
  MAX(r.created_at) as last_rental_date,
  EXTRACT(DAY FROM (NOW() - u.created_at)) as days_since_signup
FROM users u
LEFT JOIN rentals r ON u.id = r.user_id
GROUP BY u.id;

-- ============================================================================
-- INSERT MIGRATION RECORD
-- ============================================================================

INSERT INTO migration_history (version, filename, description, status)
VALUES (5, '005_create_views.sql', 'Database views for analytics, reporting, and operational queries', 'success')
ON CONFLICT (version) DO NOTHING;
