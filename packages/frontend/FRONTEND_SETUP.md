# Frontend Setup Guide

## Project Structure

```
bitaxe-renting/
├── public/
│   ├── index.html          # Landing page + login
│   ├── admin.html          # Admin dashboard
│   ├── client.html         # Marketplace for users
│   ├── js/
│   │   ├── config.js       # Configuration & environment
│   │   ├── api-client.js   # API client with JWT management
│   │   ├── nostr-auth.js   # Nostr authentication (NIP-98)
│   │   ├── nwc-payments.js # Lightning payment handling
│   │   └── utils.js        # Helper functions
│   ├── css/
│   │   ├── main.css        # Global styles & variables
│   │   └── modern.css      # Component styles
│   └── components/
│       ├── navbar.html     # Navigation bar
│       ├── login-modal.html # Login modal
│       └── payment-modal.html # Payment modal
```

## Development Setup

### Prerequisites

- Node.js 16+ (for local development)
- Modern browser with Web Crypto API support
- Nostr wallet (Alby recommended for testing)

### Environment Variables

Create a `.env` file in the project root:

```bash
# API Configuration
API_URL=http://localhost:3000  # Development
# API_URL=https://api.bitrent.dev  # Production

# Debug Mode
DEBUG=true  # Set to false in production
```

### Local Development

```bash
# Start a simple HTTP server
python3 -m http.server 8000

# Or use Node.js
npx http-server

# Visit http://localhost:8000
```

### Production Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
VITE_API_URL=https://api.bitrent.dev
```

## Architecture

### API Client (`js/api-client.js`)

Central HTTP client with:
- Automatic JWT token management
- Request retry with exponential backoff
- Request/response interceptors
- Error standardization
- Timeout handling

**Usage:**

```javascript
// GET request
const miners = await api.get('/api/miners');

// POST request with JWT
const rental = await api.post('/api/rentals', {
  minerId: 'id123',
  duration: 24
});

// Manual retry
api.retry(config);
```

### Nostr Authentication (`js/nostr-auth.js`)

Handles Nostr login via NIP-98:

1. Gets public key from wallet
2. Requests challenge from backend
3. Signs challenge with wallet
4. Exchanges signature for JWT
5. Manages token refresh

**Supported Wallets:**
- Alby (browser extension)
- NIP-07 (generic extension)
- NIP-46 (remote signer - planned)

**Usage:**

```javascript
// Check if authenticated
if (auth.isAuthenticated()) {
  console.log('User is logged in');
}

// Get user info
const user = auth.getUser(); // { pubkey, role, exp }

// Check if admin
if (auth.isAdmin()) {
  window.location.href = '/admin.html';
}

// Logout
auth.logout();
```

### Payment Handling (`js/nwc-payments.js`)

Manages Lightning Network payments via NWC:

1. Requests invoice from backend
2. Displays QR code
3. Polls for payment status
4. Verifies payment received

**Usage:**

```javascript
// Request invoice
const invoice = await payments.requestInvoice(rentalId, amount);

// Display QR code
const qrImage = await payments.generateQRCode(invoice);

// Poll for payment
payments.startPolling(invoiceId, (status) => {
  if (status.status === 'paid') {
    console.log('Payment received!');
  }
});

// Check remaining time
console.log(payments.getRemainingTimeString()); // "14:30"
```

### Utilities (`js/utils.js`)

Helper functions for formatting, validation, and UX:

```javascript
// Currency formatting
Utils.formatSats(100000);        // "100,000 sats"
Utils.formatSats(1000000);       // "0.01 BTC"
Utils.parseSats("0.01 BTC");     // 1000000

// Date formatting
Utils.formatDate(new Date());    // "Today at 2:30 PM"
Utils.getRelativeTime(date);     // "2 hours ago"

// Validation
Utils.isValidEmail(email);
Utils.isValidPubkey(pubkey);
Utils.isValidInvoice(invoice);

// Notifications
Utils.showSuccess('Payment received!');
Utils.showError('Failed to create rental');
Utils.showInfo('Processing...');

// Confirmation
const confirmed = await Utils.showConfirmation('Delete this rental?');

// Debounce/throttle
const debouncedSearch = Utils.debounce(search, 300);
```

## Component System

### Navbar Component

```html
<!-- Loads from components/navbar.html -->
<div id="navbar-container"></div>

<!-- Load with: -->
<script>
  const res = await fetch('components/navbar.html');
  const html = await res.text();
  document.getElementById('navbar-container').innerHTML = html;
</script>
```

Features:
- Auto-updates based on auth state
- Shows login button when logged out
- Shows user profile when logged in
- Shows admin link for admins
- Logout functionality

### Login Modal Component

```html
<div id="login-modal-container"></div>

<script>
  // Show modal
  showLoginModal();
</script>
```

Features:
- Wallet selection (Alby, NIP-07, etc.)
- Loading states
- Error messages
- Auto-redirect based on role

### Payment Modal Component

```html
<div id="payment-modal-container"></div>

<script>
  // Show payment modal
  showPaymentModal(rentalId, amountInSats);
</script>
```

Features:
- QR code display
- Invoice copying
- Timer countdown
- Payment status polling
- Error handling with retry

## State Management

### Session Storage

```javascript
// Auth storage
localStorage.getItem('bitrent_jwt');      // JWT token
localStorage.getItem('bitrent_pubkey');   // User pubkey
localStorage.getItem('bitrent_user');     // User object
```

### Token Management

Tokens automatically refresh before expiry:

```javascript
// Check token validity
api.isTokenValid();     // true/false
api.getCurrentUser();   // { pubkey, role, exp }

// Manual refresh
await auth.refreshToken();

// Get expiry info
auth.getTokenExpiryTime();  // Date object
auth.getTokenTimeRemaining(); // milliseconds
```

## Error Handling

### API Errors

```javascript
try {
  const result = await api.post('/api/rentals', data);
} catch (error) {
  // error.status  - HTTP status code
  // error.message - Error message
  // error.data    - Response data
  // error.type    - Error type (API_ERROR, TIMEOUT, etc.)

  const userMsg = error.getUserMessage();
  Utils.showError(userMsg);
}
```

### Standard Error Messages

| Status | Message |
|--------|---------|
| 400 | Invalid request. Please check your input. |
| 401 | Your session expired. Please login again. |
| 403 | You do not have permission. |
| 408 | Request timeout. Please try again. |
| 422 | Invalid data. Please check your input. |
| 5xx | Server error. Please try again later. |

## Styling System

### CSS Variables

```css
/* Colors */
--primary: #f7931a;
--secondary: #1a1a1a;
--success: #10b981;
--danger: #ef4444;

/* Spacing */
--spacing-4: 1rem;
--spacing-6: 1.5rem;
--spacing-8: 2rem;

/* Responsive */
@media (max-width: 768px) {
  /* Mobile overrides */
}
```

### Usage

```html
<!-- Button variants -->
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-danger">Danger</button>
<button class="btn btn-outline">Outline</button>

<!-- Sizes -->
<button class="btn btn-sm">Small</button>
<button class="btn btn-lg">Large</button>

<!-- Loading state -->
<button class="btn btn-primary loading">Loading...</button>

<!-- Cards -->
<div class="card">
  <div class="card-header">
    <h2 class="card-title">Title</h2>
  </div>
  <div class="card-content">Content</div>
</div>

<!-- Forms -->
<div class="form-group">
  <label>Email</label>
  <input type="email" />
</div>

<!-- Alerts -->
<div class="alert alert-success">Success!</div>
<div class="alert alert-error">Error occurred</div>
```

## Performance Optimization

### Loading Indicators

Always show loading state for long operations:

```javascript
Utils.setButtonLoading(button, true);  // Show spinner
// ... do work ...
Utils.setButtonLoading(button, false); // Hide spinner
```

### Request Caching

API client automatically retries failed requests with exponential backoff:

```javascript
// Automatic retry on network error
// Delay: 1s, 2s, 4s
```

### Mobile Optimization

- Responsive grid system
- Touch-friendly buttons (44px minimum)
- Optimized for slow networks
- Lazy loading support

## Testing Checklist

See `FRONTEND_CHECKLIST.md` for comprehensive testing guide.

## Troubleshooting

### "Nostr provider not found"
- Install Alby or NIP-07 extension
- Refresh page after installing
- Check browser console for errors

### "API connection failed"
- Verify backend is running
- Check API_URL in config.js
- Verify CORS headers are set

### "JWT token invalid"
- Logout and login again
- Check token expiry time
- Verify backend /api/auth/verify is working

### "Payment not received"
- Verify invoice hasn't expired
- Check backend wallet connection
- Verify NWC service status

## Security Considerations

- ✅ Tokens stored in localStorage (cleared on logout)
- ✅ JWTs validated on each request
- ✅ HTTPS required in production
- ✅ CSP headers recommended
- ✅ No sensitive data in URLs
- ✅ CORS properly configured

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Next Steps

1. Follow `API_INTEGRATION.md` for backend connection
2. Follow `NOSTR_LOGIN.md` for authentication setup
3. Use `FRONTEND_CHECKLIST.md` for testing
4. Deploy to Vercel or similar

---

**Questions?** Check the backend README or contact support.
