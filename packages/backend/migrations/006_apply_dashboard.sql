-- BitRent Migration 006 — version durcie pour application via le SQL editor
-- (2026-06-11). Identique à 006_security_improvements.sql, plus :
--   * pré-nettoyage des doublons pending/active (sinon les index UNIQUE échouent)
--   * insert migration_history tolérant si la table n'existe pas

-- 0. Pré-nettoyage : si plusieurs rentals pending/active existent pour un même
--    mineur (races historiques), on garde la plus récente et on clôt les autres.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY mineur_id, status ORDER BY created_at DESC
  ) AS rn
  FROM rentals
  WHERE status IN ('pending', 'active')
)
UPDATE rentals SET status = 'completed', updated_at = now()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 1. ip_address pour le rate-limit par IP (le fix code c3c8afb tolère son absence,
--    cette colonne RÉACTIVE le rate-limiting)
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

CREATE INDEX IF NOT EXISTS idx_challenges_ip_address
  ON challenges(ip_address)
  WHERE ip_address IS NOT NULL;

-- 2. Une seule location ACTIVE par mineur (anti-race au niveau DB)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_rental_per_miner
  ON rentals(mineur_id)
  WHERE status = 'active';

-- 3. Une seule location PENDING par mineur
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_rental_per_miner
  ON rentals(mineur_id)
  WHERE status = 'pending';

-- 4. invoice_hash unique quand présent
CREATE UNIQUE INDEX IF NOT EXISTS idx_rentals_invoice_hash_notnull
  ON rentals(invoice_hash)
  WHERE invoice_hash IS NOT NULL;

-- 5. Index lookups locations actives
CREATE INDEX IF NOT EXISTS idx_rentals_active_miner
  ON rentals(mineur_id, user_id)
  WHERE status = 'active';

-- 6. Trace de migration (tolère l'absence de migration_history)
DO $$ BEGIN
  INSERT INTO migration_history (version, filename, description, status)
  VALUES (6, '006_security_improvements.sql',
    'Add ip_address to challenges, race-condition constraints on rentals, partial indexes',
    'success')
  ON CONFLICT (version) DO NOTHING;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
