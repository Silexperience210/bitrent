# API Integration Guide

This guide explains how the frontend connects to the Vercel backend API.

## API Endpoints

### Authentication

#### `POST /api/auth/challenge`
Get a challenge for Nostr signing.

**Request:**
```json
{
  "pubkey": "abc123..."
}
```

**Response:**
```json
{
  "challenge": "random-challenge-string"
}
```

**Frontend Code:**
```javascript
const response = await api.post('/api/auth/challenge', { pubkey });
const challenge = response.challenge;
```

---

#### `POST /api/auth/verify`
Verify signed challenge and get JWT.

**Request:**
```json
{
  "pubkey": "abc123...",
  "challenge": "random-challenge",
  "signature": "signed-challenge"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "pubkey": "abc123...",
    "role": "user|admin",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Frontend Code:**
```javascript
const result = await auth.login('alby'); // Handles all above
```

---

#### `POST /api/auth/refresh`
Refresh expired JWT token.

**Request:**
```
Authorization: Bearer {expired_token}
```

**Response:**
```json
{
  "token": "new-jwt-token"
}
```

**Automatic:**
```javascript
// API client automatically refreshes before expiry
// Or call manually:
await auth.refreshToken();
```

---

### Miners (Public)

#### `GET /api/miners`
List all available miners.

**Query Parameters:**
- `status`: "available" | "maintenance"
- `model`: filter by model
- `limit`: 50
- `offset`: 0

**Response:**
```json
{
  "miners": [
    {
      "id": "miner-1",
      "model": "Antminer S19",
      "hashRate": 110,
      "power": 1450,
      "pricePerHour": 5000,
      "roi": 85,
      "status": "available",
      "location": "Iceland DC"
    }
  ],
  "total": 500
}
```

**Frontend Code:**
```javascript
const response = await api.get('/api/miners');
const miners = response.miners;
```

---

### Rentals (Authenticated)

#### `POST /api/rentals`
Create new rental.

**Request:**
```json
{
  "minerId": "miner-1",
  "durationHours": 24,
  "autoRenew": false
}
```

**Response:**
```json
{
  "rental": {
    "id": "rental-123",
    "minerId": "miner-1",
    "minerModel": "Antminer S19",
    "userPubkey": "abc123...",
    "startTime": "2024-01-01T00:00:00Z",
    "endTime": "2024-01-02T00:00:00Z",
    "durationHours": 24,
    "totalPrice": 120000,
    "status": "pending",
    "invoiceId": "inv-123"
  }
}
```

**Frontend Code:**
```javascript
const rental = await api.post('/api/rentals', {
  minerId: 'miner-1',
  durationHours: 24
});

// Show payment modal
showPaymentModal(rental.rental.id, rental.rental.totalPrice);
```

---

#### `GET /api/rentals`
List user's rentals.

**Response:**
```json
{
  "rentals": [
    {
      "id": "rental-123",
      "minerModel": "Antminer S19",
      "startTime": "2024-01-01T00:00:00Z",
      "endTime": "2024-01-02T00:00:00Z",
      "totalPrice": 120000,
      "status": "active",
      "hashrate": 110,
      "earnings": 5000
    }
  ]
}
```

**Frontend Code:**
```javascript
const response = await api.get('/api/rentals');
const rentals = response.rentals;
```

---

#### `GET /api/rentals/{id}`
Get rental details.

**Response:**
```json
{
  "rental": {
    "id": "rental-123",
    "minerModel": "Antminer S19",
    "status": "active",
    "hashrate": 110,
    "temperature": 65,
    "uptime": 99.5,
    "earnings": 5000,
    "startTime": "2024-01-01T00:00:00Z",
    "endTime": "2024-01-02T00:00:00Z"
  }
}
```

**Frontend Code:**
```javascript
const response = await api.get(`/api/rentals/${rentalId}`);
const rental = response.rental;
```

---

#### `POST /api/rentals/{id}/cancel`
Cancel active rental.

**Response:**
```json
{
  "success": true,
  "refund": 50000
}
```

**Frontend Code:**
```javascript
const result = await api.post(`/api/rentals/${rentalId}/cancel`, {});
Utils.showSuccess(`Refund: ${Utils.formatSats(result.refund)}`);
```

---

### Payments (Lightning)

#### `POST /api/payments/invoice`
Create Lightning invoice for rental.

**Request:**
```json
{
  "rentalId": "rental-123",
  "amount": 120000,
  "currency": "sat"
}
```

**Response:**
```json
{
  "id": "inv-123",
  "invoice": "lnbc1200...",
  "amount": 120000,
  "description": "Antminer S19 Rental - 24h",
  "expiresAt": "2024-01-01T01:00:00Z"
}
```

**Frontend Code:**
```javascript
const invoice = await payments.requestInvoice(rentalId, amount);
// Display QR code, invoice text, etc.
```

---

#### `GET /api/payments/{invoiceId}/status`
Check payment status (poll this).

**Response:**
```json
{
  "id": "inv-123",
  "status": "pending|paid|expired",
  "amount": 120000,
  "paidAt": "2024-01-01T00:30:00Z",
  "confirmations": 1
}
```

**Frontend Code:**
```javascript
payments.startPolling(invoiceId, (status) => {
  if (status.status === 'paid') {
    console.log('Payment complete!');
  }
});
```

---

#### `GET /api/payments/{invoiceId}/verify`
Verify payment (after paid).

**Response:**
```json
{
  "id": "inv-123",
  "paid": true,
  "amount": 120000,
  "rentalId": "rental-123"
}
```

**Frontend Code:**
```javascript
const result = await payments.verifyPayment(invoiceId);
if (result.paid) {
  // Rental is now active
}
```

---

#### `POST /api/payments/{invoiceId}/cancel`
Cancel invoice (before payment).

**Response:**
```json
{
  "success": true
}
```

---

### Admin Endpoints

#### `GET /api/admin/dashboard`
Get dashboard stats.

**Requires:** Admin role
**Response:**
```json
{
  "minerCount": 500,
  "activeRentals": 234,
  "totalRevenue": 2500000,
  "activeUsers": 156,
  "recentRentals": [...]
}
```

---

#### `GET /api/admin/miners`
List all miners (admin).

**Response:**
```json
{
  "miners": [...],
  "total": 500
}
```

---

#### `POST /api/admin/miners`
Create new miner.

**Request:**
```json
{
  "model": "Antminer S19",
  "hashRate": 110,
  "power": 1450,
  "pricePerHour": 5000,
  "location": "Iceland DC",
  "status": "available"
}
```

---

#### `PUT /api/admin/miners/{id}`
Update miner.

---

#### `DELETE /api/admin/miners/{id}`
Delete miner.

---

#### `GET /api/admin/rentals`
List all rentals.

---

#### `GET /api/admin/payments`
List all payments.

---

#### `GET /api/admin/users`
List all users.

---

## Error Handling

All API errors follow this format:

```json
{
  "error": "error_code",
  "message": "Human readable error",
  "details": {}
}
```

**Common Status Codes:**

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 400 | Invalid request | Show form errors |
| 401 | Unauthorized | Redirect to login |
| 403 | Forbidden | Show "access denied" |
| 404 | Not found | Show 404 error |
| 408 | Timeout | Retry with backoff |
| 422 | Validation error | Show field errors |
| 429 | Rate limited | Slow down requests |
| 500+ | Server error | Retry with backoff |

**Frontend Code:**
```javascript
try {
  const result = await api.post('/api/rentals', data);
} catch (error) {
  // error.status - HTTP code
  // error.message - Error message
  // error.data - Server response data

  switch (error.status) {
    case 401:
      auth.logout();
      break;
    case 422:
      // Show validation errors
      Object.entries(error.data.fields).forEach(([field, message]) => {
        showFieldError(field, message);
      });
      break;
    default:
      Utils.showError(error.getUserMessage());
  }
}
```

## Request Flow Examples

### Login Flow

```
1. User clicks "Login with Nostr"
   ↓
2. Frontend shows wallet selection
   ↓
3. User selects wallet (Alby)
   ↓
4. Frontend calls: auth.login('alby')
   ↓
5. Frontend → GET public key from wallet
   ↓
6. Frontend → POST /api/auth/challenge { pubkey }
   ← Backend returns challenge
   ↓
7. Frontend → Wallet signs challenge
   ← Wallet returns signature
   ↓
8. Frontend → POST /api/auth/verify { pubkey, challenge, signature }
   ← Backend returns JWT + user
   ↓
9. Frontend stores JWT in localStorage
   ↓
10. Frontend checks user.role
    - If admin → Redirect to /admin.html
    - If user → Redirect to /client.html
```

### Rental & Payment Flow

```
1. User views miner and clicks "Rent Now"
   ↓
2. Frontend shows payment modal
   ↓
3. Frontend → POST /api/rentals { minerId, durationHours }
   ← Backend returns rental object with invoiceId
   ↓
4. Frontend → POST /api/payments/invoice { rentalId, amount }
   ← Backend returns Lightning invoice + QR code
   ↓
5. Frontend displays QR code to user
   ↓
6. User scans QR with Lightning wallet and pays
   ↓
7. Frontend → Polls GET /api/payments/{invoiceId}/status every 2s
   ← Status changes to "paid"
   ↓
8. Frontend → POST /api/payments/{invoiceId}/verify
   ← Confirms payment
   ↓
9. Rental becomes active, user can see miner stats
```

## Request Headers

All requests include:

```http
GET /api/miners HTTP/1.1
Host: api.bitrent.dev
Content-Type: application/json
Authorization: Bearer eyJhbGc...
```

The API client automatically adds:
- `Content-Type: application/json`
- `Authorization: Bearer {token}` (if authenticated)

## Response Headers

Expected from backend:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1704067200
```

## Rate Limiting

The API enforces rate limits. Frontend should:
- Respect `X-RateLimit-*` headers
- Implement exponential backoff on 429 responses
- Show user friendly message on rate limit

## CORS Configuration

Frontend must be allowed by backend:

```
Origin: https://bitrent.dev
Allow-Methods: GET, POST, PUT, DELETE
Allow-Headers: Content-Type, Authorization
Allow-Credentials: true
```

## Testing the API

### Using curl

```bash
# Get challenge
curl -X POST http://localhost:3000/api/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"pubkey":"abc123..."}'

# Verify challenge
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "pubkey":"abc123...",
    "challenge":"xyz...",
    "signature":"sig..."
  }'

# Get miners
curl http://localhost:3000/api/miners
```

### Using JavaScript Console

```javascript
// Get miners
const miners = await api.get('/api/miners');
console.log(miners);

// Create rental
const rental = await api.post('/api/rentals', {
  minerId: 'miner-1',
  durationHours: 24
});
console.log(rental);
```

## Deployment Notes

### Environment Variables

Set these in Vercel:

```
API_URL=https://api.bitrent.dev
DEBUG=false
```

### CORS Setup

Backend must allow frontend domain:

```javascript
// In backend .env
FRONTEND_URL=https://bitrent.dev
ALLOWED_ORIGINS=https://bitrent.dev,https://www.bitrent.dev
```

### SSL/TLS

- ✅ All API calls use HTTPS in production
- ✅ Tokens never sent in URL parameters
- ✅ Mixed content (HTTP) blocked

---

**Need help?** Check the backend documentation or contact support.
