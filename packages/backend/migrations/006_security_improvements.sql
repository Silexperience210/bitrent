-- BitRent Migration 006: Security Improvements
-- Date: 2026-03-17

-- ============================================================================
-- 1. Add ip_address to challenges table for IP-based rate limiting
-- ============================================================================

ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

CREATE INDEX IF NOT EXISTS idx_challenges_ip_address
  ON challenges(ip_address)
  WHERE ip_address IS NOT NULL;

-- ============================================================================
-- 2. Partial unique index: prevent concurrent active rentals on same miner
--    Blocks race conditions at DB level (two users clicking at same time)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_rental_per_miner
  ON rentals(mineur_id)
  WHERE status = 'active';

-- ============================================================================
-- 3. Partial unique index: one pending rental per miner
--    (prevents creating a new rental while one is waiting for payment)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_rental_per_miner
  ON rentals(mineur_id)
  WHERE status = 'pending';

-- ============================================================================
-- 4. Make invoice_hash NOT NULL with a partial unique index
--    (was nullable UNIQUE which caused issues)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_rentals_invoice_hash_notnull
  ON rentals(invoice_hash)
  WHERE invoice_hash IS NOT NULL;

-- ============================================================================
-- 5. Partial index on active rentals for fast lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_rentals_active_miner
  ON rentals(mineur_id, user_id)
  WHERE status = 'active';

-- ============================================================================
-- Migration record
-- ============================================================================

INSERT INTO migration_history (version, filename, description, status)
VALUES (6, '006_security_improvements.sql',
  'Add ip_address to challenges, race-condition constraints on rentals, partial indexes',
  'success')
ON CONFLICT (version) DO NOTHING;
