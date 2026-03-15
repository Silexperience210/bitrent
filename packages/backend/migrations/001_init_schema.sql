-- BitRent Phase 3: Initial Database Schema
-- Supabase PostgreSQL
-- Version: 1.0.0
-- Date: 2026-03-15

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "inet";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Miner status
DO $$ BEGIN
  CREATE TYPE miner_status AS ENUM ('online', 'offline', 'maintenance');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Rental status
DO $$ BEGIN
  CREATE TYPE rental_status AS ENUM ('pending', 'active', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Payment status
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'confirmed', 'failed', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- MIGRATION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS migration_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version INTEGER NOT NULL UNIQUE,
  filename VARCHAR(255) NOT NULL,
  description TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_time_ms INTEGER,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT
);

CREATE INDEX idx_migration_history_version ON migration_history(version DESC);

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pubkey_nostr TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT pubkey_not_empty CHECK (length(pubkey_nostr) > 0)
);

CREATE INDEX idx_users_pubkey ON users(pubkey_nostr);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ============================================================================
-- MINEURS (MINERS) TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS mineurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  ip_address INET NOT NULL UNIQUE,
  port INTEGER DEFAULT 80,
  hashrate_specs NUMERIC NOT NULL,
  sats_per_minute INTEGER NOT NULL,
  status miner_status DEFAULT 'offline',
  total_revenue_sats BIGINT DEFAULT 0,
  uptime_percentage NUMERIC DEFAULT 0,
  last_checked TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT hashrate_positive CHECK (hashrate_specs > 0),
  CONSTRAINT sats_per_minute_positive CHECK (sats_per_minute > 0),
  CONSTRAINT uptime_valid CHECK (uptime_percentage >= 0 AND uptime_percentage <= 100)
);

CREATE INDEX idx_mineurs_owner_id ON mineurs(owner_id);
CREATE INDEX idx_mineurs_status ON mineurs(status);
CREATE INDEX idx_mineurs_status_created ON mineurs(status, created_at DESC);
CREATE INDEX idx_mineurs_ip_address ON mineurs(ip_address);

-- ============================================================================
-- RENTALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mineur_id UUID NOT NULL REFERENCES mineurs(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  sats_per_minute INTEGER NOT NULL,
  total_sats BIGINT NOT NULL,
  status rental_status DEFAULT 'pending',
  invoice_hash TEXT UNIQUE,
  payment_verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT sats_positive CHECK (total_sats > 0),
  CONSTRAINT times_valid CHECK (start_time < end_time),
  CONSTRAINT sats_per_minute_positive CHECK (sats_per_minute > 0)
);

CREATE INDEX idx_rentals_user_id ON rentals(user_id);
CREATE INDEX idx_rentals_mineur_id ON rentals(mineur_id);
CREATE INDEX idx_rentals_status ON rentals(status);
CREATE INDEX idx_rentals_user_status_created ON rentals(user_id, status, created_at DESC);
CREATE INDEX idx_rentals_mineur_status ON rentals(mineur_id, status);
CREATE INDEX idx_rentals_invoice_hash ON rentals(invoice_hash);
CREATE INDEX idx_rentals_created_at ON rentals(created_at DESC);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  invoice_hash TEXT UNIQUE NOT NULL,
  amount_sats BIGINT NOT NULL,
  status payment_status DEFAULT 'pending',
  wallet_pubkey TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT amount_positive CHECK (amount_sats > 0),
  CONSTRAINT expiry_in_future CHECK (expires_at > created_at),
  CONSTRAINT attempts_non_negative CHECK (attempts >= 0)
);

CREATE INDEX idx_payments_rental_id ON payments(rental_id);
CREATE INDEX idx_payments_invoice_hash ON payments(invoice_hash);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_status_created ON payments(status, created_at DESC);
CREATE INDEX idx_payments_expires_at ON payments(expires_at);

-- ============================================================================
-- AUDIT LOGS TABLE (Append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================================================
-- ANALYTICS DAILY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_daily (
  date DATE PRIMARY KEY,
  total_rentals INTEGER DEFAULT 0,
  total_sats_revenue BIGINT DEFAULT 0,
  active_mineurs INTEGER DEFAULT 0,
  avg_rental_duration NUMERIC DEFAULT 0,
  uptime_avg NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_daily_date ON analytics_daily(date DESC);

-- ============================================================================
-- ADMIN SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_settings_updated_at ON admin_settings(updated_at DESC);

-- ============================================================================
-- CHALLENGES TABLE (for Nostr auth)
-- ============================================================================

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge VARCHAR(255) NOT NULL,
  pubkey_nostr TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_challenges_pubkey ON challenges(pubkey_nostr);
CREATE INDEX idx_challenges_expires_at ON challenges(expires_at);

-- ============================================================================
-- INSERT MIGRATION RECORD
-- ============================================================================

INSERT INTO migration_history (version, filename, description, status)
VALUES (1, '001_init_schema.sql', 'Initial database schema with all core tables', 'success')
ON CONFLICT (version) DO NOTHING;
