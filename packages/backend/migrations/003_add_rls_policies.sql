-- BitRent Phase 3: Row-Level Security (RLS) Policies
-- Supabase PostgreSQL
-- Version: 3.0.0
-- Date: 2026-03-15

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mineurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY users_select_own ON users
  FOR SELECT USING (
    (SELECT pubkey_nostr FROM auth.users() LIMIT 1) = users.pubkey_nostr
    OR
    role = 'admin'
  );

-- Users can update their own profile
CREATE POLICY users_update_own ON users
  FOR UPDATE USING (
    (SELECT pubkey_nostr FROM auth.users() LIMIT 1) = users.pubkey_nostr
  )
  WITH CHECK (
    (SELECT pubkey_nostr FROM auth.users() LIMIT 1) = users.pubkey_nostr
  );

-- Only admins can view all users
CREATE POLICY users_select_admin ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.role = 'admin'
      AND u.pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- Only admins can insert new users
CREATE POLICY users_insert_admin ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.role = 'admin'
      AND u.pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- ============================================================================
-- MINEURS TABLE POLICIES
-- ============================================================================

-- Everyone can view available mineurs
CREATE POLICY mineurs_select_public ON mineurs
  FOR SELECT USING (
    status IN ('online', 'offline')
  );

-- Miner owner can view their mineurs
CREATE POLICY mineurs_select_owner ON mineurs
  FOR SELECT USING (
    owner_id = (
      SELECT id FROM users
      WHERE pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- Admins can view all mineurs
CREATE POLICY mineurs_select_admin ON mineurs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE role = 'admin'
      AND pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- Miner owner can insert their mineurs
CREATE POLICY mineurs_insert_owner ON mineurs
  FOR INSERT WITH CHECK (
    owner_id = (
      SELECT id FROM users
      WHERE pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- Miner owner can update their mineurs
CREATE POLICY mineurs_update_owner ON mineurs
  FOR UPDATE USING (
    owner_id = (
      SELECT id FROM users
      WHERE pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  )
  WITH CHECK (
    owner_id = (
      SELECT id FROM users
      WHERE pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- Admins can update all mineurs
CREATE POLICY mineurs_update_admin ON mineurs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE role = 'admin'
      AND pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- ============================================================================
-- RENTALS TABLE POLICIES
-- ============================================================================

-- Users can view their own rentals
CREATE POLICY rentals_select_own ON rentals
  FOR SELECT USING (
    user_id = (
      SELECT id FROM users
      WHERE pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- Miner owners can view rentals of their mineurs
CREATE POLICY rentals_select_miner_owner ON rentals
  FOR SELECT USING (
    mineur_id IN (
      SELECT id FROM mineurs
      WHERE owner_id = (
        SELECT id FROM users
        WHERE pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
      )
    )
  );

-- Admins can view all rentals
CREATE POLICY rentals_select_admin ON rentals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE role = 'admin'
      AND pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- Users can insert rentals
CREATE POLICY rentals_insert_own ON rentals
  FOR INSERT WITH CHECK (
    user_id = (
      SELECT id FROM users
      WHERE pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- Users can update their own rentals
CREATE POLICY rentals_update_own ON rentals
  FOR UPDATE USING (
    user_id = (
      SELECT id FROM users
      WHERE pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  )
  WITH CHECK (
    user_id = (
      SELECT id FROM users
      WHERE pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- ============================================================================
-- PAYMENTS TABLE POLICIES
-- ============================================================================

-- Users can view their own payments
CREATE POLICY payments_select_own ON payments
  FOR SELECT USING (
    rental_id IN (
      SELECT id FROM rentals
      WHERE user_id = (
        SELECT id FROM users
        WHERE pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
      )
    )
  );

-- Miner owners can view payments for their mineurs
CREATE POLICY payments_select_miner_owner ON payments
  FOR SELECT USING (
    rental_id IN (
      SELECT r.id FROM rentals r
      WHERE r.mineur_id IN (
        SELECT id FROM mineurs
        WHERE owner_id = (
          SELECT id FROM users
          WHERE pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
        )
      )
    )
  );

-- Admins can view all payments
CREATE POLICY payments_select_admin ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE role = 'admin'
      AND pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- Users can insert payments for their rentals
CREATE POLICY payments_insert_own ON payments
  FOR INSERT WITH CHECK (
    rental_id IN (
      SELECT id FROM rentals
      WHERE user_id = (
        SELECT id FROM users
        WHERE pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
      )
    )
  );

-- ============================================================================
-- AUDIT_LOGS TABLE POLICIES (Append-only)
-- ============================================================================

-- Users can view audit logs for their actions
CREATE POLICY audit_logs_select_own ON audit_logs
  FOR SELECT USING (
    user_id = (
      SELECT id FROM users
      WHERE pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- Admins can view all audit logs
CREATE POLICY audit_logs_select_admin ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE role = 'admin'
      AND pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- Anyone can insert audit logs
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT WITH CHECK (TRUE);

-- Audit logs cannot be deleted (append-only)
CREATE POLICY audit_logs_no_delete ON audit_logs
  FOR DELETE USING (FALSE);

-- ============================================================================
-- ANALYTICS_DAILY TABLE POLICIES
-- ============================================================================

-- Everyone can view analytics
CREATE POLICY analytics_daily_select ON analytics_daily
  FOR SELECT USING (TRUE);

-- Only admins can insert/update analytics
CREATE POLICY analytics_daily_insert_admin ON analytics_daily
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE role = 'admin'
      AND pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

CREATE POLICY analytics_daily_update_admin ON analytics_daily
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE role = 'admin'
      AND pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- ============================================================================
-- ADMIN_SETTINGS TABLE POLICIES
-- ============================================================================

-- Everyone can view admin settings
CREATE POLICY admin_settings_select ON admin_settings
  FOR SELECT USING (TRUE);

-- Only admins can modify admin settings
CREATE POLICY admin_settings_modify_admin ON admin_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE role = 'admin'
      AND pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

CREATE POLICY admin_settings_update_admin ON admin_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE role = 'admin'
      AND pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- ============================================================================
-- CHALLENGES TABLE POLICIES
-- ============================================================================

-- Anyone can create challenges
CREATE POLICY challenges_insert ON challenges
  FOR INSERT WITH CHECK (TRUE);

-- Anyone can view challenges
CREATE POLICY challenges_select ON challenges
  FOR SELECT USING (TRUE);

-- Admins can delete challenges
CREATE POLICY challenges_delete_admin ON challenges
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE role = 'admin'
      AND pubkey_nostr = (SELECT pubkey_nostr FROM auth.users() LIMIT 1)
    )
  );

-- ============================================================================
-- INSERT MIGRATION RECORD
-- ============================================================================

INSERT INTO migration_history (version, filename, description, status)
VALUES (3, '003_add_rls_policies.sql', 'Row-level security policies for data isolation', 'success')
ON CONFLICT (version) DO NOTHING;
