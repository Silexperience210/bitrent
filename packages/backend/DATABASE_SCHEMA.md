# BitRent Database Schema Documentation

## Overview

BitRent uses PostgreSQL (via Supabase) with Row Level Security (RLS) for data protection.

## Tables

### 1. `users`

Stores user profiles and authentication data.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique user ID |
| `pubkey` | VARCHAR(64) | UNIQUE, NOT NULL | Nostr public key (hex) |
| `is_admin` | BOOLEAN | DEFAULT FALSE | Admin role flag |
| `created_at` | TIMESTAMP | NOT NULL | Registration timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- `idx_users_pubkey` - Fast lookup by public key
- `idx_users_is_admin` - Filter admins

**RLS Policies:**
- Users can view own profile
- Admins can view all profiles

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "pubkey": "abcd1234...ef",
  "is_admin": false,
  "created_at": "2024-01-01T10:00:00Z"
}
```

---

### 2. `mineurs` (Miners)

Stores mining hardware configuration and pricing.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique miner ID |
| `ip` | INET | UNIQUE, NOT NULL | Miner IP address |
| `hashrate` | BIGINT | NOT NULL | Hash rate (hashes/sec) |
| `model` | VARCHAR(255) | NOT NULL | Device model (e.g., "Bitaxe") |
| `price_per_hour_sats` | BIGINT | NOT NULL | Hourly rental price |
| `status` | VARCHAR(20) | DEFAULT 'active' | active/inactive/maintenance |
| `created_at` | TIMESTAMP | NOT NULL | Registration timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- `idx_mineurs_status` - Filter active miners
- `idx_mineurs_model` - Filter by device type

**RLS Policies:**
- Public read (anyone can see active miners)
- Admin only write/update/delete

**Status Values:**
- `active` - Available for rent
- `inactive` - Temporarily unavailable
- `maintenance` - Under maintenance

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "ip": "192.168.1.100",
  "hashrate": 1000000000,
  "model": "Bitaxe",
  "price_per_hour_sats": 100,
  "status": "active"
}
```

---

### 3. `rentals`

Stores rental agreements and duration.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique rental ID |
| `mineur_id` | UUID | FK → mineurs | Rented miner |
| `user_pubkey` | VARCHAR(64) | FK → users | Renting user |
| `duration_hours` | INTEGER | NOT NULL | Rental length |
| `amount_sats` | BIGINT | NOT NULL | Total price |
| `status` | VARCHAR(20) | DEFAULT 'pending_payment' | Rental state |
| `started_at` | TIMESTAMP | - | Actual start time |
| `ended_at` | TIMESTAMP | - | Actual end time |
| `created_at` | TIMESTAMP | NOT NULL | Request timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Last update |

**Indexes:**
- `idx_rentals_user_pubkey` - User's rentals
- `idx_rentals_mineur_id` - Miner's rentals
- `idx_rentals_status` - Filter active rentals

**RLS Policies:**
- Users can view own rentals
- Admins can view all

**Status Values:**
- `pending_payment` - Awaiting invoice payment
- `active` - Payment confirmed, mining in progress
- `completed` - Rental period ended successfully
- `cancelled` - Cancelled by user or admin

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "mineur_id": "550e8400-e29b-41d4-a716-446655440001",
  "user_pubkey": "efgh5678...ijkl",
  "duration_hours": 24,
  "amount_sats": 2400,
  "status": "active",
  "started_at": "2024-01-01T12:00:00Z"
}
```

---

### 4. `payments`

Tracks Lightning Network payments.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique payment ID |
| `rental_id` | UUID | FK → rentals | Associated rental |
| `invoice_hash` | VARCHAR(255) | UNIQUE, NOT NULL | Lightning invoice hash |
| `bolt11` | TEXT | - | BOLT11 invoice string |
| `amount_sats` | BIGINT | NOT NULL | Payment amount |
| `status` | VARCHAR(20) | DEFAULT 'pending' | Payment state |
| `confirmed_at` | TIMESTAMP | - | Confirmation timestamp |
| `expires_at` | TIMESTAMP | NOT NULL | Invoice expiry |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Last update |

**Indexes:**
- `idx_payments_rental_id` - Rental's payments
- `idx_payments_invoice_hash` - Look up by hash
- `idx_payments_status` - Filter pending

**RLS Policies:**
- Users can view own payments
- Admins can view all

**Status Values:**
- `pending` - Awaiting payment
- `confirmed` - Payment received
- `cancelled` - Invoice expired or cancelled

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "rental_id": "550e8400-e29b-41d4-a716-446655440002",
  "invoice_hash": "abc123def456...",
  "bolt11": "lnbc2400n...",
  "amount_sats": 2400,
  "status": "confirmed",
  "confirmed_at": "2024-01-01T12:05:00Z",
  "expires_at": "2024-01-01T13:00:00Z"
}
```

---

### 5. `challenges`

Temporary Nostr auth challenge storage.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Challenge ID |
| `challenge` | VARCHAR(255) | NOT NULL | Random challenge string |
| `pubkey` | VARCHAR(64) | NOT NULL | User's Nostr pubkey |
| `expires_at` | TIMESTAMP | NOT NULL | Expiry (5 min) |
| `created_at` | TIMESTAMP | NOT NULL | Creation time |

**Indexes:**
- `idx_challenges_pubkey` - Find user's challenges
- `idx_challenges_expires_at` - Cleanup expired

**RLS Policies:**
- Anyone can create
- Admin cleanup only

**Lifetime:** 5 minutes, auto-deleted after use or expiry

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "challenge": "abc123def456...",
  "pubkey": "efgh5678...ijkl",
  "expires_at": "2024-01-01T12:05:00Z"
}
```

---

## Relationships

```
users
  ├── rentals (1 user → many rentals)
  └── payments (via rentals)

mineurs
  ├── rentals (1 miner → many rentals)
  └── (monitor in real-time via Bitaxe API)

rentals
  ├── payments (1 rental → 1 payment)
  └── mineurs (belongs to)

payments
  └── rentals (belongs to)

challenges
  └── users (for auth)
```

---

## Row Level Security (RLS)

RLS ensures users only see their own data:

### Users Table
```sql
-- Can view own profile or admin can view all
SELECT * FROM users WHERE pubkey = auth.uid() OR is_admin;
```

### Mineurs Table
```sql
-- Public read
SELECT * FROM mineurs;

-- Admin write
INSERT INTO mineurs ... 
WHERE EXISTS (SELECT 1 FROM users WHERE is_admin);
```

### Rentals Table
```sql
-- Users see own, admins see all
SELECT * FROM rentals 
WHERE user_pubkey = auth.uid() OR is_admin;
```

### Payments Table
```sql
-- Users see their payments, admins see all
SELECT * FROM payments 
WHERE rental_id IN (
  SELECT id FROM rentals WHERE user_pubkey = auth.uid()
) OR is_admin;
```

---

## Migrations

### Initial Schema (Phase 1)
File: `models/schema.sql`

To apply:
1. Supabase → SQL Editor
2. New Query
3. Paste schema.sql contents
4. Execute

### Future Migrations (Phase 1.5+)

```sql
-- Add new columns
ALTER TABLE rentals ADD COLUMN notes TEXT;

-- Add new indexes
CREATE INDEX idx_rentals_created_at ON rentals(created_at);

-- Create new tables as needed
CREATE TABLE rental_history AS ...
```

---

## Maintenance

### Automatic Cleanup
- Challenges expire after 5 minutes (auto-cleanup via cron)
- Payments expire based on Lightning invoice timeout

### Backup Strategy
- Automated daily backups in Supabase
- Manual backup before major changes
- Test restore procedure monthly

### Monitoring Queries

**Total users:**
```sql
SELECT COUNT(*) FROM users;
```

**Active rentals:**
```sql
SELECT COUNT(*) FROM rentals WHERE status = 'active';
```

**Revenue:**
```sql
SELECT SUM(amount_sats) FROM payments WHERE status = 'confirmed';
```

**Miner utilization:**
```sql
SELECT 
  m.model,
  COUNT(r.id) as active_rentals,
  SUM(r.amount_sats) as revenue
FROM mineurs m
LEFT JOIN rentals r ON r.mineur_id = m.id AND r.status = 'active'
GROUP BY m.id;
```

---

## Performance Tuning

### Query Optimization
- Indexes on foreign keys
- Indexes on frequently filtered columns
- Use LIMIT for pagination

### Connection Pooling
- Supabase handles pooling
- Max 10 concurrent connections per project (scale if needed)

### Caching (Future)
- Redis cache for miner stats
- Cache popular mineurs list
- Cache user profiles

---

## Data Retention

| Table | Retention | Notes |
|-------|-----------|-------|
| users | Forever | Keep historical data |
| mineurs | Forever | Keep audit trail |
| rentals | Forever | Financial records |
| payments | Forever | Accounting/compliance |
| challenges | 5 minutes | Auto-delete |

---

## Disaster Recovery

1. **Backup Location:** Supabase managed backups
2. **Restore Time:** Point-in-time restore available
3. **RTO:** < 1 hour (Supabase SLA)
4. **RPO:** Last hourly backup

Test restore monthly in test environment.
