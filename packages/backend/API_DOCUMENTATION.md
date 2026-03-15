# BitRent API Documentation

## Base URL

```
http://localhost:3000  (development)
https://api.bitrent.com (production)
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

Get a token via `/auth/nostr-verify` after signing a challenge.

## Response Format

All responses are JSON.

**Success Response (200):**
```json
{
  "data": {}
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "stack": "stack trace (only in development)"
}
```

---

## 🔐 Authentication Endpoints

### POST /auth/nostr-challenge
Generate a challenge for Nostr signature verification.

**Request:**
```json
{
  "pubkey": "abcd1234..."
}
```

**Response:**
```json
{
  "challenge": "random_hex_string",
  "challenge_id": "uuid",
  "expires_at": "2024-01-01T12:00:00Z"
}
```

### POST /auth/nostr-verify
Verify Nostr signature and receive JWT token.

**Request:**
```json
{
  "pubkey": "abcd1234...",
  "message": "challenge_message",
  "sig": "signature_hex"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "pubkey": "abcd1234...",
  "is_admin": false
}
```

**Errors:**
- 401: Invalid signature
- 401: Challenge expired

### POST /auth/logout
Logout (clears client-side token).

**Response:**
```json
{
  "success": true,
  "message": "Logged out"
}
```

---

## 📊 Client Endpoints

### GET /client/mineurs
List available miners for rent.

**Query Parameters:**
- None

**Response:**
```json
[
  {
    "id": "uuid",
    "model": "Bitaxe",
    "hashrate": 1000000,
    "ip": "192.168.1.100",
    "price_per_hour_sats": 100,
    "status": "active"
  }
]
```

### GET /client/mineurs/:id
Get specific miner details with current status.

**Response:**
```json
{
  "id": "uuid",
  "model": "Bitaxe",
  "hashrate": 1000000,
  "ip": "192.168.1.100",
  "price_per_hour_sats": 100,
  "status": "active",
  "current_status": {
    "hashrate": 999500,
    "temperature": 45.2,
    "uptime": 3600,
    "power": 25.5,
    "efficiency": 40000
  }
}
```

### POST /client/rentals
Create new rental (requires auth).

**Request:**
```json
{
  "mineur_id": "uuid",
  "duration_hours": 24
}
```

**Response:**
```json
{
  "rental_id": "uuid",
  "miner": {
    "id": "uuid",
    "model": "Bitaxe",
    "hashrate": 1000000,
    "ip": "192.168.1.100"
  },
  "duration_hours": 24,
  "amount_sats": 2400,
  "status": "pending_payment",
  "payment": {
    "invoice": "lnbc2400n...",
    "hash": "invoice_hash",
    "expires_at": "2024-01-01T13:00:00Z",
    "amount_sats": 2400
  }
}
```

**Errors:**
- 401: Authentication required
- 404: Miner not found
- 400: Miner not available

### GET /client/rentals/:id
Get rental status (requires auth).

**Response:**
```json
{
  "id": "uuid",
  "mineur_id": "uuid",
  "status": "active",
  "duration_hours": 24,
  "amount_sats": 2400,
  "started_at": "2024-01-01T01:00:00Z",
  "payments": [
    {
      "invoice_hash": "hash",
      "status": "confirmed",
      "amount_sats": 2400
    }
  ]
}
```

### GET /client/rentals
Get active rentals (requires auth).

**Response:**
```json
[
  {
    "id": "uuid",
    "status": "active",
    "amount_sats": 2400,
    "mineurs": {
      "model": "Bitaxe",
      "hashrate": 1000000
    }
  }
]
```

### GET /client/rentals/history
Get rental history (requires auth).

**Query Parameters:**
- `limit`: Number of results (default: 50)

**Response:**
```json
[
  {
    "id": "uuid",
    "status": "completed",
    "amount_sats": 2400,
    "started_at": "2024-01-01T01:00:00Z",
    "ended_at": "2024-01-02T01:00:00Z"
  }
]
```

### POST /client/rentals/:id/verify-payment
Verify payment and activate rental (requires auth).

**Response:**
```json
{
  "status": "success",
  "rental": {
    "status": "active",
    "started_at": "2024-01-01T12:00:00Z"
  }
}
```

Or if payment pending:
```json
{
  "status": "pending",
  "message": "Payment not yet confirmed"
}
```

### POST /client/rentals/:id/cancel
Cancel pending rental (requires auth).

**Response:**
```json
{
  "success": true
}
```

---

## 🔧 Admin Endpoints

All admin endpoints require authentication + admin role.

### GET /admin/mineurs
List all miners.

**Response:** Same as `/client/mineurs` but shows all including inactive.

### POST /admin/mineurs
Add new miner.

**Request:**
```json
{
  "ip": "192.168.1.100",
  "hashrate": 1000000,
  "model": "Bitaxe",
  "price_per_hour_sats": 100
}
```

**Response:**
```json
{
  "id": "uuid",
  "ip": "192.168.1.100",
  "hashrate": 1000000,
  "model": "Bitaxe",
  "price_per_hour_sats": 100,
  "status": "active"
}
```

### PUT /admin/mineurs/:id
Update miner.

**Request:** (any fields to update)
```json
{
  "price_per_hour_sats": 120,
  "status": "maintenance"
}
```

### DELETE /admin/mineurs/:id
Delete miner.

**Response:**
```json
{
  "success": true,
  "id": "uuid"
}
```

**Errors:**
- 400: Cannot delete miner with active rentals

### GET /admin/mineurs/:id/status
Get miner real-time status from Bitaxe.

**Response:**
```json
{
  "hashrate": 999500,
  "temperature": 45.2,
  "uptime": 3600,
  "power": 25.5,
  "efficiency": 40000
}
```

### GET /admin/mineurs/:id/metrics
Get miner metrics.

**Response:**
```json
{
  "current_hashrate": 999500,
  "average_hashrate": 999000,
  "shares_accepted": 1000,
  "shares_rejected": 5,
  "difficulty": 100
}
```

### GET /admin/mineurs/:id/stats
Get miner rental statistics.

**Response:**
```json
{
  "active_rentals": 2,
  "completed_rentals": 45,
  "total_revenue_sats": 450000,
  "total_rentals": 47
}
```

### GET /admin/rentals
List all active rentals.

**Response:**
```json
[
  {
    "id": "uuid",
    "user_pubkey": "abcd1234...",
    "status": "active",
    "amount_sats": 2400,
    "mineurs": {
      "model": "Bitaxe"
    }
  }
]
```

### GET /admin/stats
Get platform statistics.

**Response:**
```json
{
  "miners": {
    "total": 10,
    "active": 8
  },
  "rentals": {
    "active": 5,
    "completed": 150
  },
  "revenue": {
    "total_sats": 150000,
    "confirmed_payments": 120
  }
}
```

---

## 💰 Payment Endpoints

### GET /payments/status/:invoice_hash
Check payment status.

**Response:**
```json
{
  "status": "pending",
  "amount_sats": 2400,
  "created_at": "2024-01-01T12:00:00Z",
  "confirmed_at": null
}
```

Or when paid:
```json
{
  "status": "confirmed",
  "amount_sats": 2400,
  "confirmed_at": "2024-01-01T12:05:00Z"
}
```

### POST /payments/webhook
NWC webhook for payment confirmation (optional).

**Request:**
```json
{
  "invoice_hash": "hash",
  "status": "paid"
}
```

**Response:**
```json
{
  "received": true
}
```

---

## ❤️ Health Endpoints

### GET /health
Check server and database health.

**Response (OK):**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Response (Error):**
```json
{
  "status": "error",
  "database": "disconnected",
  "error": "Connection refused"
}
```

### GET /health/readiness
Kubernetes readiness check.

**Response (Ready):**
```json
{
  "ready": true
}
```

**Response (Not Ready):**
```json
{
  "ready": false
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (auth required) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |
| 503 | Service Unavailable (DB down) |

---

## Rate Limiting

- 100 requests per 15 minutes per IP
- Returns 429 if exceeded

---

## WebSocket (Future)

Real-time miner status updates coming in Phase 1.5:
- `/ws/mineurs/:id` - Real-time miner metrics
- `/ws/rentals/:id` - Real-time rental updates
