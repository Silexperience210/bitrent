-- BitRent Database Schema
-- Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pubkey VARCHAR(64) UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_pubkey ON users(pubkey);
CREATE INDEX idx_users_is_admin ON users(is_admin);

-- Miners table
CREATE TABLE IF NOT EXISTS mineurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip INET NOT NULL UNIQUE,
  hashrate BIGINT NOT NULL,
  model VARCHAR(255) NOT NULL,
  price_per_hour_sats BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mineurs_status ON mineurs(status);
CREATE INDEX idx_mineurs_model ON mineurs(model);

-- Rentals table
CREATE TABLE IF NOT EXISTS rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mineur_id UUID NOT NULL REFERENCES mineurs(id) ON DELETE RESTRICT,
  user_pubkey VARCHAR(64) NOT NULL REFERENCES users(pubkey) ON DELETE CASCADE,
  duration_hours INTEGER NOT NULL,
  amount_sats BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending_payment',
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rentals_user_pubkey ON rentals(user_pubkey);
CREATE INDEX idx_rentals_mineur_id ON rentals(mineur_id);
CREATE INDEX idx_rentals_status ON rentals(status);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  invoice_hash VARCHAR(255) UNIQUE NOT NULL,
  bolt11 TEXT,
  amount_sats BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  confirmed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_rental_id ON payments(rental_id);
CREATE INDEX idx_payments_invoice_hash ON payments(invoice_hash);
CREATE INDEX idx_payments_status ON payments(status);

-- Challenges table (for Nostr auth)
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge VARCHAR(255) NOT NULL,
  pubkey VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_challenges_pubkey ON challenges(pubkey);
CREATE INDEX idx_challenges_expires_at ON challenges(expires_at);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mineurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Users: Can view own profile
CREATE POLICY users_view_own ON users
  FOR SELECT USING (auth.uid()::text = pubkey OR is_admin = TRUE);

-- Mineurs: Public read, admin write
CREATE POLICY mineurs_public_read ON mineurs
  FOR SELECT USING (TRUE);

CREATE POLICY mineurs_admin_write ON mineurs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE pubkey = auth.uid()::text AND is_admin = TRUE)
  );

CREATE POLICY mineurs_admin_update ON mineurs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE pubkey = auth.uid()::text AND is_admin = TRUE)
  );

-- Rentals: Users can view own, admins can view all
CREATE POLICY rentals_view_own ON rentals
  FOR SELECT USING (
    user_pubkey = auth.uid()::text OR 
    EXISTS (SELECT 1 FROM users WHERE pubkey = auth.uid()::text AND is_admin = TRUE)
  );

CREATE POLICY rentals_insert ON rentals
  FOR INSERT WITH CHECK (user_pubkey = auth.uid()::text);

-- Payments: Users can view own payments
CREATE POLICY payments_view_own ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rentals 
      WHERE rentals.id = payments.rental_id 
      AND rentals.user_pubkey = auth.uid()::text
    ) OR
    EXISTS (SELECT 1 FROM users WHERE pubkey = auth.uid()::text AND is_admin = TRUE)
  );

-- Challenges: Users can create their own
CREATE POLICY challenges_insert ON challenges
  FOR INSERT WITH CHECK (TRUE);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER users_update_timestamp
BEFORE UPDATE ON users FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER mineurs_update_timestamp
BEFORE UPDATE ON mineurs FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER rentals_update_timestamp
BEFORE UPDATE ON rentals FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payments_update_timestamp
BEFORE UPDATE ON payments FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Cleanup function for expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM challenges WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create initial admin user (replace with actual pubkey)
-- INSERT INTO users (pubkey, is_admin) VALUES ('YOUR_ADMIN_PUBKEY_HERE', TRUE);
