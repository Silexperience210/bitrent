# Frontend Testing Checklist

## Pre-Testing Setup

- [ ] Backend API is running (`/api/health` returns 200)
- [ ] Frontend is running (`http://localhost:8000`)
- [ ] Nostr wallet (Alby) is installed
- [ ] Test account created in wallet
- [ ] Debug mode enabled (`localStorage.setItem('debug_mode', 'true')`)
- [ ] Browser console open (F12)
- [ ] Network tab open (to monitor API calls)

---

## Landing Page (`index.html`)

### Page Load
- [ ] Page loads without errors
- [ ] No console errors or warnings
- [ ] Navbar displays correctly
- [ ] Navigation links work
- [ ] Mobile layout responsive

### Authentication
- [ ] "Login with Nostr" button visible and clickable
- [ ] Login modal opens when clicked
- [ ] Modal shows wallet options (Alby, NIP-07)
- [ ] Modal closes on X button
- [ ] Modal closes on "Cancel" button

### Login Flow
- [ ] Click "Alby" wallet option
- [ ] Alby prompts for pubkey permission
- [ ] User approves (or denies)
- [ ] Loading spinner shows
- [ ] Challenge received from `/api/auth/challenge`
- [ ] Alby prompts to sign
- [ ] User approves signature
- [ ] Frontend calls `/api/auth/verify`
- [ ] JWT token received and stored
- [ ] Redirects to correct dashboard:
  - [ ] Admin → `/admin.html`
  - [ ] User → `/client.html`

### Error Handling
- [ ] If wallet not installed: Error message shown
- [ ] If user denies pubkey: Error message shown
- [ ] If user denies signature: Error message shown
- [ ] If backend returns error: Error message shown
- [ ] Retry button available
- [ ] Errors disappear after 5 seconds

### Already Logged In
- [ ] If already authenticated, redirects immediately
- [ ] No login modal shown
- [ ] Correct dashboard loaded

---

## Client Page (`client.html`)

### Page Load
- [ ] Redirects to login if not authenticated
- [ ] Navbar shows correctly
- [ ] User profile visible in navbar
- [ ] Logout button available

### Miners List
- [ ] List loads without errors
- [ ] All miners display
- [ ] Each miner shows:
  - [ ] Model name
  - [ ] Hash rate
  - [ ] Power consumption
  - [ ] Price/hour
  - [ ] ROI percentage
  - [ ] Location
  - [ ] Status badge
- [ ] Miners display in responsive grid

### Search & Filter
- [ ] Search by model name works
- [ ] Search by miner ID works
- [ ] Filter by status works (available/maintenance)
- [ ] Filter by model works
- [ ] Multiple filters work together
- [ ] Results update in real-time
- [ ] Empty state shown when no results

### Rental Creation
- [ ] Click "Rent Now" button
- [ ] Payment modal opens
- [ ] Modal shows miner info
- [ ] Modal shows total price
- [ ] QR code displays
- [ ] Invoice text displays
- [ ] Timer counts down correctly
- [ ] "Copy" button works
- [ ] "Open in Wallet" button works (opens lightning URI)

### Payment Flow
- [ ] Rental created via `/api/rentals` POST
- [ ] Invoice created via `/api/payments/invoice` POST
- [ ] Payment status polled every 2 seconds
- [ ] Invoice expires after 15 minutes
- [ ] User scans QR and pays in wallet
- [ ] Payment status updates to "paid"
- [ ] Modal shows success message
- [ ] Page reloads or redirects
- [ ] Rental now appears in "My Rentals"

### My Rentals List
- [ ] Shows user's active rentals
- [ ] Shows user's past rentals
- [ ] Each rental shows:
  - [ ] Miner model
  - [ ] Start time
  - [ ] End time
  - [ ] Total price
  - [ ] Status (active/pending/ended)
  - [ ] Estimated earnings (if active)
- [ ] Can click for more details
- [ ] Can cancel active rental

### Mobile Responsiveness
- [ ] Page responsive at 320px width
- [ ] Page responsive at 768px width
- [ ] Page responsive at 1200px width
- [ ] No horizontal scrolling
- [ ] Touch-friendly buttons
- [ ] Grid adapts to screen size

### Error Handling
- [ ] Network error shows message
- [ ] 401 unauthorized redirects to login
- [ ] 403 forbidden shows error
- [ ] 5xx errors show with retry option
- [ ] Failed payment shows retry button

---

## Admin Page (`admin.html`)

### Page Load
- [ ] Non-admins redirected to login
- [ ] Admin navbar shows "Admin Dashboard" link
- [ ] Sidebar displays with menu items
- [ ] Dashboard loads by default

### Authentication Check
- [ ] Check admin role before loading
- [ ] JWT token valid
- [ ] User can logout

### Dashboard Section
- [ ] Stats cards load:
  - [ ] Total Miners count
  - [ ] Active Rentals count
  - [ ] Total Revenue (in sats)
  - [ ] Active Users count
- [ ] Recent rentals table displays
- [ ] All data is real from backend

### Miners Section
- [ ] Click "Miners" in sidebar
- [ ] Miners table displays
- [ ] Shows columns: Model, Hash Rate, Power, Price, Status, Actions
- [ ] "Add Miner" button available
- [ ] Click "Add Miner" shows form
- [ ] Form fields visible:
  - [ ] Model input
  - [ ] Hash Rate input
  - [ ] Power input
  - [ ] Price input
  - [ ] Location input
  - [ ] Status dropdown
- [ ] Can submit form
- [ ] POST to `/api/admin/miners` works
- [ ] New miner appears in table
- [ ] Edit button available (if implemented)
- [ ] Delete button available (if implemented)

### Rentals Section
- [ ] Click "Rentals" in sidebar
- [ ] Table displays all rentals
- [ ] Shows columns: Miner, User, Amount, Status, Duration, Actions
- [ ] Can filter by status
- [ ] Can view rental details
- [ ] Can cancel rental (if active)

### Payments Section
- [ ] Click "Payments" in sidebar
- [ ] Payment history displays
- [ ] Shows columns: Invoice ID, User, Amount, Status, Created
- [ ] Filters available (paid/pending/expired)
- [ ] Payment details visible

### Users Section
- [ ] Click "Users" in sidebar
- [ ] User list displays
- [ ] Shows columns: Public Key, Rentals, Total Spent, Joined, Actions
- [ ] Can search by pubkey
- [ ] Can view user details
- [ ] Can ban/unban user (if implemented)

### Settings Section
- [ ] Click "Settings" in sidebar
- [ ] Settings form displays
- [ ] Maintenance mode toggle visible
- [ ] Can save settings
- [ ] Settings persist

### Sidebar Navigation
- [ ] All menu items click-able
- [ ] Active section highlighted
- [ ] Mobile: Menu toggles/scrolls
- [ ] Desktop: Sidebar always visible

---

## API Communication

### API Client
- [ ] Requests include `Content-Type: application/json`
- [ ] Authenticated requests include JWT header
- [ ] Request timeout is 30 seconds
- [ ] Timeouts retry with exponential backoff
- [ ] Max 3 retry attempts
- [ ] Response errors standardized

### Endpoints Tested
- [ ] `POST /api/auth/challenge` returns challenge
- [ ] `POST /api/auth/verify` returns JWT
- [ ] `GET /api/miners` returns miners list
- [ ] `POST /api/rentals` creates rental
- [ ] `POST /api/payments/invoice` creates invoice
- [ ] `GET /api/payments/{id}/status` returns status
- [ ] `GET /api/rentals` returns user rentals
- [ ] `GET /api/admin/dashboard` returns stats
- [ ] `GET /api/admin/miners` returns all miners
- [ ] `POST /api/admin/miners` creates miner
- [ ] All 401 responses redirect to login
- [ ] All 403 responses show error
- [ ] All 5xx responses retry

### Error Handling
- [ ] Network error caught and shown
- [ ] 400 error shows input validation message
- [ ] 401 clears token and redirects
- [ ] 403 shows "not authorized"
- [ ] 404 shows "not found"
- [ ] 408 timeout retries
- [ ] 422 validation error shows field errors
- [ ] 429 rate limit shows "slow down"
- [ ] 5xx server error shows with retry

---

## UI/UX

### Visual Design
- [ ] Dark theme applies correctly
- [ ] Light theme available (optional)
- [ ] Colors match brand
- [ ] Spacing consistent
- [ ] Typography readable
- [ ] Icons clear and understandable

### Interactive Elements
- [ ] Buttons highlight on hover
- [ ] Buttons disable during loading
- [ ] Links underline on hover
- [ ] Form inputs focus with border
- [ ] Modals have proper z-index
- [ ] Dropdowns close on outside click
- [ ] Tabs switch sections

### Notifications
- [ ] Success message appears
- [ ] Error message appears
- [ ] Info message appears
- [ ] Messages auto-dismiss after 5s
- [ ] Multiple messages stack

### Loading States
- [ ] Loading spinner shows during API calls
- [ ] Button text changes to "Loading..."
- [ ] Buttons disabled during load
- [ ] Skeleton loaders show (if implemented)
- [ ] Clear "Loading..." message

### Accessibility
- [ ] All buttons have labels
- [ ] Form inputs have labels
- [ ] Links have descriptive text
- [ ] Images have alt text
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Contrast ratio sufficient

---

## Session Management

### Token Storage
- [ ] JWT stored in localStorage
- [ ] Pubkey stored in localStorage
- [ ] User data stored in localStorage
- [ ] Data cleared on logout
- [ ] Data persists on page reload

### Token Refresh
- [ ] Token refresh scheduled on login
- [ ] Token refresh happens every 12 hours
- [ ] Token refresh before making request if near expiry
- [ ] New token stored after refresh
- [ ] Failed refresh redirects to login

### Logout
- [ ] Logout button works
- [ ] All storage cleared
- [ ] Navbar updated
- [ ] Redirects to login page
- [ ] Subsequent API calls fail with 401

### Session Timeout
- [ ] Session expires after 24 hours
- [ ] Expired session redirects to login
- [ ] Warning shown before expiry (optional)

---

## Performance

### Load Time
- [ ] Landing page loads < 2 seconds
- [ ] Client page loads < 2 seconds
- [ ] Admin page loads < 3 seconds
- [ ] API responses < 1 second
- [ ] No blocking operations

### Network
- [ ] Check network tab for API calls
- [ ] No duplicate requests
- [ ] Requests use compression
- [ ] Requests use HTTPS (production)
- [ ] No failed requests

### Resources
- [ ] JavaScript file < 500KB total
- [ ] CSS files < 100KB total
- [ ] No unused imports/libraries
- [ ] Console has no warnings
- [ ] No memory leaks (use Chrome DevTools)

---

## Browser Compatibility

### Desktop Browsers
- [ ] Chrome 90+ ✅
- [ ] Firefox 88+ ✅
- [ ] Safari 14+ ✅
- [ ] Edge 90+ ✅

### Mobile Browsers
- [ ] iOS Safari 14+ ✅
- [ ] Chrome Mobile 90+ ✅
- [ ] Firefox Mobile 88+ ✅
- [ ] Samsung Internet 14+ ✅

### Features
- [ ] Web Crypto API available
- [ ] localStorage available
- [ ] fetch API available
- [ ] AbortSignal available

---

## Security

### Data Protection
- [ ] JWT never logged to console
- [ ] Pubkey never sent in URL
- [ ] Sensitive data not stored in cookies
- [ ] HTTPS enforced (production)
- [ ] No inline scripts (if possible)

### Authentication
- [ ] JWT validated before use
- [ ] Signature verified by backend
- [ ] Challenge unique per login
- [ ] Challenge expires after 5 minutes
- [ ] Admin pages check role

### CORS
- [ ] Frontend can call backend
- [ ] Credentials included in requests
- [ ] No cross-origin errors
- [ ] CORS headers present

---

## Edge Cases

### Network Issues
- [ ] Works with slow connection (3G)
- [ ] Handles offline (shows error)
- [ ] Handles timeout (retries)
- [ ] Handles connection drop (error message)

### Invalid Data
- [ ] Invalid email caught
- [ ] Invalid pubkey caught
- [ ] Invalid amount caught
- [ ] Empty fields caught
- [ ] XSS attempts blocked

### Race Conditions
- [ ] Multiple rapid clicks handled
- [ ] Double-submit prevented
- [ ] Payment received twice handled
- [ ] Concurrent requests safe

### User Actions
- [ ] Back button works correctly
- [ ] Page refresh keeps session
- [ ] Multiple tabs synchronized (optional)
- [ ] Session survives tab close

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] No console errors
- [ ] No console warnings
- [ ] Build process works
- [ ] Environment variables set

### Deployment
- [ ] Code pushed to GitHub
- [ ] Vercel deployment triggered
- [ ] Build completes successfully
- [ ] No build errors
- [ ] Production URL accessible

### Post-Deployment
- [ ] Production site loads
- [ ] All pages accessible
- [ ] API calls work
- [ ] Login works
- [ ] Payments work
- [ ] Admin pages accessible
- [ ] HTTPS working
- [ ] SSL certificate valid

### Monitoring
- [ ] Error tracking setup (Sentry, etc.)
- [ ] Logs available
- [ ] Uptime monitoring setup
- [ ] Performance metrics tracked
- [ ] User analytics setup

---

## Sign-Off

**Tested By:** _________________

**Date:** _________________

**Build Version:** _________________

**Notes:**

```
[Add any issues or observations here]
```

---

## Common Issues & Solutions

### Issue: "Wallet not found"
- Solution: Install Alby or NIP-07 extension, refresh page

### Issue: "API connection failed"
- Solution: Verify backend running, check API_URL, check CORS

### Issue: "JWT token expired"
- Solution: Logout and login again, check backend token expiry

### Issue: "Payment not received"
- Solution: Check invoice hasn't expired, verify wallet payment, check backend

### Issue: "Admin page blank"
- Solution: Check user role is admin, verify backend /api/admin/* working

### Issue: "Slow page load"
- Solution: Check network tab, verify API response times, clear cache

---

**Done!** All checks passed? Ready to ship! 🚀
