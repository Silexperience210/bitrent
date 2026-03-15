# 🗄️ Setup Supabase Database for BitRent

Your Supabase project is ready! Now let's create the database schema.

## Quick Setup (2 minutes)

### Step 1: Go to Supabase SQL Editor

1. Open: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### Step 2: Copy & Execute Migrations

I'll provide you with the SQL migrations. **Execute them in order:**

**Just copy each block below and paste into Supabase SQL Editor, then click "Run"**

---

## Migration 1: Initial Schema

This creates all tables and enums.

```sql
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
  executed_at TIMESTAMP DEFAULT now(),
  execution_time_ms INTEGER,
  status VARCHAR(20) DEFAULT 'success'
);

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nostr_pubkey VARCHAR(64) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  role user_role DEFAULT 'user',
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  last_login TIMESTAMP
);

-- ============================================================================
-- MINEURS (MINERS) TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS mineurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  model VARCHAR(100),
  serial_number VARCHAR(100) UNIQUE,
  ip_address INET,
  hashrate BIGINT, -- in GH/s
  power_consumption INTEGER, -- in W
  status miner_status DEFAULT 'offline',
  owner_id UUID REFERENCES users(id),
  price_per_minute INTEGER, -- in Satoshis
  total_earnings BIGINT DEFAULT 0,
  uptime_percent DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  last_heartbeat TIMESTAMP
);

-- ============================================================================
-- RENTALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  miner_id UUID NOT NULL REFERENCES mineurs(id),
  client_id UUID NOT NULL REFERENCES users(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INTEGER,
  status rental_status DEFAULT 'pending',
  total_cost BIGINT, -- in Satoshis
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID REFERENCES rentals(id),
  amount_sats BIGINT NOT NULL,
  status payment_status DEFAULT 'pending',
  payment_hash VARCHAR(255) UNIQUE,
  invoice VARCHAR(1000),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- API KEYS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP
);

-- ============================================================================
-- WALLETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  wallet_type VARCHAR(50), -- 'nostr', 'lnurl', 'alby'
  address VARCHAR(255),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

-- Enable RLS on all tables (you should configure policies manually in dashboard)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mineurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- MIGRATION TRACKING RECORD
-- ============================================================================

INSERT INTO migration_history (version, filename, description, status) 
VALUES (1, '001_init_schema.sql', 'Initial database schema with all tables', 'success')
ON CONFLICT (version) DO NOTHING;
```

**👉 Copy this, paste in Supabase SQL Editor, and click "Run"**

---

## Migration 2: Performance Indexes

This creates indexes for fast queries.

```sql
-- BitRent Phase 3: Performance Indexes
-- Version: 1.0.0

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_nostr_pubkey ON users(nostr_pubkey);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Mineurs indexes
CREATE INDEX IF NOT EXISTS idx_mineurs_owner_id ON mineurs(owner_id);
CREATE INDEX IF NOT EXISTS idx_mineurs_status ON mineurs(status);
CREATE INDEX IF NOT EXISTS idx_mineurs_price_per_minute ON mineurs(price_per_minute);
CREATE INDEX IF NOT EXISTS idx_mineurs_created_at ON mineurs(created_at);

-- Rentals indexes
CREATE INDEX IF NOT EXISTS idx_rentals_miner_id ON rentals(miner_id);
CREATE INDEX IF NOT EXISTS idx_rentals_client_id ON rentals(client_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_start_time ON rentals(start_time);
CREATE INDEX IF NOT EXISTS idx_rentals_created_at ON rentals(created_at);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_rental_id ON payments(rental_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_hash ON payments(payment_hash);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- Wallets indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_wallet_type ON wallets(wallet_type);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

INSERT INTO migration_history (version, filename, description, status) 
VALUES (2, '002_add_performance_indexes.sql', 'Performance indexes', 'success')
ON CONFLICT (version) DO NOTHING;
```

**👉 Paste and run this**

---

## Migration 3: Row-Level Security Policies

This secures data access.

```sql
-- BitRent Phase 3: Row-Level Security (RLS)
-- Security policies for data isolation

-- Users: Can read own profile, admins can read all
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Mineurs: Public read, only owner can update
CREATE POLICY "Mineurs are public" ON mineurs
  FOR SELECT USING (true);

CREATE POLICY "Mineurs owner can update" ON mineurs
  FOR UPDATE USING (auth.uid() = owner_id);

-- Rentals: Users can see their own rentals
CREATE POLICY "Users can see own rentals" ON rentals
  FOR SELECT USING (auth.uid() = client_id OR auth.uid() IN (SELECT owner_id FROM mineurs WHERE id = miner_id));

-- Payments: Users can see own payments
CREATE POLICY "Users can see own payments" ON payments
  FOR SELECT USING (auth.uid() IN (SELECT client_id FROM rentals WHERE id = rental_id));

-- Audit logs: Admins only
CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- API keys: Users can only access their own
CREATE POLICY "Users can access own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

-- Wallets: Private to user
CREATE POLICY "Users can access own wallets" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Notifications: Private to user
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

INSERT INTO migration_history (version, filename, description, status) 
VALUES (3, '003_add_rls_policies.sql', 'Row-Level Security policies', 'success')
ON CONFLICT (version) DO NOTHING;
```

**👉 Paste and run this**

---

## After Setup

### Verify Everything

1. Go to **"Tables"** in Supabase left sidebar
2. You should see these tables:
   - ✅ users
   - ✅ mineurs
   - ✅ rentals
   - ✅ payments
   - ✅ audit_logs
   - ✅ api_keys
   - ✅ wallets
   - ✅ notifications
   - ✅ migration_history

3. Click each table to verify columns

### What's Next?

1. ✅ Database setup done
2. ⏳ Configure environment variables in Vercel
3. ⏳ Deploy frontend to Vercel
4. ⏳ Deploy backend to Vercel
5. ⏳ Test integration

---

## Need Help?

**Error: "Could not find the function public.exec_sql"?**
- This is normal. Just copy & paste the SQL directly in Supabase SQL Editor (not using Node.js)

**Error: "Duplicate object"?**
- This means the table/type already exists. That's okay, keep going.

**Tables not showing?**
- Refresh the page (F5)
- Or go to "SQL Editor" and run: `SELECT * FROM information_schema.tables;`

---

**When you've completed the migrations, let me know and we'll deploy to Vercel!** 🚀

