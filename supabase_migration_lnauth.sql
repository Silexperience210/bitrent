-- Migration: lnauth_sessions table for LNURL-auth
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

CREATE TABLE IF NOT EXISTS lnauth_sessions (
  k1            char(64)     PRIMARY KEY,          -- 32-byte random challenge (hex)
  lnauth_key    varchar(66)  DEFAULT NULL,         -- 33-byte compressed wallet pubkey (hex), set after auth
  authenticated boolean      NOT NULL DEFAULT false,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  expires_at    timestamptz  NOT NULL
);

-- Auto-cleanup via RLS or cron; index speeds up expiry queries
CREATE INDEX IF NOT EXISTS idx_lnauth_sessions_expires ON lnauth_sessions (expires_at);

-- No RLS needed (service key only, never exposed to browser)
ALTER TABLE lnauth_sessions DISABLE ROW LEVEL SECURITY;
