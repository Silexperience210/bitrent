# 📋 BitRent - Todo List & Roadmap

**Last Updated:** 2026-03-17 12:00 UTC  
**Current Phase:** MVP Complete - Moving to Real Implementation  
**Priority Level:** Critical Path First

---

## 🔴 CRITICAL - Block All (Must Do Before Beta)

### Nostr Authentication
- [ ] Install nostr-tools properly in frontend
- [ ] Implement NIP-07 wallet detection (Alby, NIP-07 browser extension)
- [ ] Create wallet selection modal
- [ ] Implement signature generation for auth-challenge
- [ ] Add auth token storage in localStorage
- [ ] Add token refresh logic
- [ ] Test with real Alby wallet

### Lightning Payments (NWC)
- [ ] Parse NWC_CONNECTION_STRING properly
- [ ] Test NWC connection with real wallet
- [ ] Generate real Lightning invoices
- [ ] Add QR code display for payment
- [ ] Implement payment verification
- [ ] Add webhook handler for payment confirmation
- [ ] Test with real Lightning testnet

### Real Database Usage
- [ ] Connect Supabase client to backend
- [ ] Implement actual SELECT queries (not mock data)
- [ ] Test INSERT for new users
- [ ] Test INSERT for new rentals
- [ ] Test INSERT for payment records
- [ ] Verify RLS policies work
- [ ] Test UPDATE and DELETE operations

### User Authentication Flow (Complete)
- [ ] POST /api/auth-challenge returns real challenge
- [ ] POST /api/auth-verify validates Nostr signature
- [ ] JWT token generation and return
- [ ] Authorization header on all API calls
- [ ] Token validation middleware
- [ ] 401 responses for invalid tokens

---

## 🟡 HIGH PRIORITY - Next Session

### Rental Management
- [ ] POST /api/rentals creates real rental record
- [ ] Check miner availability before creating rental
- [ ] Calculate rental cost properly
- [ ] Store rental in database
- [ ] GET /api/rentals returns real user rentals
- [ ] PUT /api/rentals/[id] to update status
- [ ] Add rental timeout logic

### Payment System
- [ ] Real NWC invoice generation
- [ ] Invoice QR code generation
- [ ] Payment status polling
- [ ] Webhook for payment confirmation
- [ ] Update rental status when paid
- [ ] Refund logic for cancelled rentals
- [ ] Payment history tracking

### Admin Features
- [ ] Real miner CRUD (Create/Read/Update/Delete)
- [ ] Miner status management
- [ ] Add/remove miners from rentable pool
- [ ] View all active rentals
- [ ] View payment history
- [ ] Manual payment verification
- [ ] User management interface

### Data Validation
- [ ] Input validation on all forms
- [ ] Backend validation for all API inputs
- [ ] Error responses with proper HTTP codes
- [ ] User-friendly error messages
- [ ] Prevent duplicate submissions

---

## 🟢 MEDIUM PRIORITY - Week 2

### Security Implementation
- [ ] CORS headers configured
- [ ] CSRF protection on forms
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection on outputs
- [ ] Rate limiting (10 req/min per user)
- [ ] DDoS protection
- [ ] API key management for admin

### Error Handling & Monitoring
- [ ] Sentry error tracking setup
- [ ] Winston logging implementation
- [ ] Performance monitoring
- [ ] Error alerting
- [ ] Payment failure alerts
- [ ] System health dashboard

### Testing
- [ ] Unit tests for auth logic (Jest)
- [ ] Unit tests for payment logic (Jest)
- [ ] Integration tests for API endpoints
- [ ] E2E tests for full rental flow (Playwright)
- [ ] Wallet compatibility matrix
- [ ] Lightning network testing

### Documentation
- [ ] OpenAPI/Swagger spec for API
- [ ] User guide for renting process
- [ ] Admin guide for management
- [ ] Developer setup guide
- [ ] API authentication docs
- [ ] Troubleshooting guide

---

## 🔵 LOW PRIORITY - Polish & Features

### UI/UX
- [ ] Loading spinners for async operations
- [ ] Success/error toast notifications
- [ ] Better form validation feedback
- [ ] Mobile responsiveness testing
- [ ] Accessibility (WCAG 2.1)
- [ ] Dark mode verification

### Advanced Features
- [ ] Rental scheduling (book future times)
- [ ] Miner comparison tool
- [ ] Historical analytics dashboard
- [ ] Email notifications
- [ ] SMS alerts
- [ ] Referral program

### Performance
- [ ] Database query optimization
- [ ] Caching strategy (Redis)
- [ ] CDN setup for static assets
- [ ] Image optimization
- [ ] Bundle size reduction
- [ ] Load time optimization

### Scaling
- [ ] Auto-scaling configuration
- [ ] Database connection pooling
- [ ] Rate limiter caching
- [ ] Session management
- [ ] Background job queue
- [ ] Backup strategy

---

## 📅 Session Checklist Format

### Before Starting
- [ ] Read LESSONS_LEARNED.md (refresh on what we learned)
- [ ] Check MEMORY.md for project context
- [ ] Review GitHub commits since last session
- [ ] List current blockers

### During Session
- [ ] Pick one critical task from CRITICAL section
- [ ] Implement feature completely (no partial work)
- [ ] Write tests immediately
- [ ] Deploy to Vercel
- [ ] Test in production
- [ ] Update git commits

### After Session
- [ ] Mark completed items as [x]
- [ ] Update MEMORY.md with progress
- [ ] Document any new blockers
- [ ] Clean up git branches
- [ ] Push final changes

---

## 🎯 Success Criteria

### For Beta (Week 1)
```
✅ Real Nostr authentication
✅ Real Lightning payments working
✅ Database storing actual data
✅ Full rental creation flow
✅ E2E test passing
```

### For Production (Week 2)
```
✅ All security implemented
✅ Error tracking working
✅ Admin dashboard complete
✅ User testing completed
✅ Go-live checklist signed off
```

---

## 📊 Progress Tracking

| Item | Status | Session | Notes |
|------|--------|---------|-------|
| MVP Frontend | ✅ Done | #1 | HTML/CSS/JS static site |
| MVP Backend | ✅ Done | #1 | Vercel serverless API |
| MVP Database | ✅ Done | #1 | Supabase configured |
| Nostr Auth | ⏳ Blocked | #2 | Needs wallet integration |
| Lightning Payments | ⏳ Blocked | #2 | Needs NWC real setup |
| Real DB Usage | ⏳ Blocked | #2 | Needs Supabase queries |
| Security | ⏳ Blocked | #3 | Waiting for real flows |
| Testing | ⏳ Blocked | #3 | Can't test without real auth |
| Monitoring | ⏳ Blocked | #3 | Need production baseline |

---

## 🚨 Known Issues to Fix

1. **Mocked Endpoints**
   - `/api/mineurs` returns demo data (3 miners)
   - `/api/rentals` returns empty array
   - `/api/payments` not implemented
   - Auth endpoints not validating signatures

2. **Frontend Not Calling Real APIs**
   - Uses fetch() but with hardcoded demo data
   - No error handling for failed requests
   - No loading states while fetching

3. **No User Persistence**
   - No login/logout flow
   - No user account creation
   - No session management

4. **No Real Payment Processing**
   - No NWC connection
   - No Lightning invoices
   - No payment webhooks

---

## 💬 Meeting Notes Template

When starting next session, copy this:

```markdown
## Session #2 - [Date]

### Goals
- [ ] Goal 1
- [ ] Goal 2
- [ ] Goal 3

### Completed
- ✅ 
- ✅ 

### Blocked By
- 🚨 Issue 1
- 🚨 Issue 2

### Next Session
- [ ] Task 1
- [ ] Task 2
```

---

## 🎓 Quick Reference

**What's Done:**
- Static website
- API endpoints
- Database schema
- Git/GitHub setup

**What's Needed:**
- Real Nostr auth
- Real Lightning payments
- Real database queries
- Error handling

**How to Know You're Done:**
- Can rent a miner with real Nostr wallet
- Can pay with real Lightning
- Rental shows in database
- Payment confirmed and tracked

---

**Keep this updated! Update after every session. This is your roadmap.** 🗺️
