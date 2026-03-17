# ⚡ NWC Setup - Lightning Payments

## Status
✅ **NWC Credentials Saved & Integrated**

## What Was Configured

### GetAlby Wallet Connection
```
NWC_CONNECTION_STRING=nostr+walletconnect://2e2cf8774e55305e1f2b3b83151a6507f98e38456126953ebce42ba6b8a12bb9?relay=wss://relay.getalby.com/v1&secret=d94a5a5ed0bcc7323fc0f3aaf41bcf621cf4c8f1b88c1505abbea54754b418c2
```

## Files Updated

### Backend
- ✅ `packages/backend/.env` - NWC_CONNECTION_STRING added
- ✅ `packages/backend/lib/nwc-wallet.js` - New NWC integration library
- ✅ `packages/backend/api/payments/create-invoice.js` - Updated to use real NWC

### Memory
- ✅ `memory/NWC_CREDENTIALS.md` - Credentials stored for reference

## How It Works Now

### 1. User Creates Rental
```
User selects miner → Sets duration/pool → Enters Bitcoin address → Reviews cost
```

### 2. Click "⚡ Proceed to Payment"
```
Frontend → POST /api/payments/create-invoice
Backend → Calls NWC to generate BOLT11 invoice
Response → Real Lightning invoice (or mock if NWC fails)
```

### 3. Display QR Code
```
Frontend receives BOLT11 invoice
Generates QR code via qrcodejs
User scans with Lightning wallet (GetAlby, BlueWallet, etc.)
```

### 4. Payment Verification
```
Frontend checks status every 5 seconds
When payment received → Mining starts automatically
Revenue goes to client's Bitcoin address
```

## Testing Payment Flow

### Current Status
- ✅ QR code generation - **WORKING**
- ✅ Invoice display - **WORKING**
- ⏳ Real NWC integration - **READY (needs test)**
- ⏳ Webhook verification - **TODO**

### To Test Payments
1. Go to: https://workspace-omega-opal.vercel.app/rent-miner.html
2. Create a rental
3. Click "⚡ Proceed to Payment"
4. Scan QR code with Lightning wallet
5. Complete payment in wallet
6. Check status confirmation

## GetAlby Wallet Details
- **Type:** Nostr Wallet Connect (NWC)
- **Relay:** wss://relay.getalby.com/v1
- **Pubkey:** 2e2cf8774e55305e1f2b3b83151a6507f98e38456126953ebce42ba6b8a12bb9
- **Status:** Active for testing

## Next Steps

### For Production
1. ✅ NWC connection configured
2. ⏳ Test with real GetAlby wallet
3. ⏳ Implement webhook for payment confirmation
4. ⏳ Add timeout + retry logic for failed payments
5. ⏳ Monitor actual Bitcoin transactions

### For Testing
1. Use mock invoices in development
2. Manual payment confirmation in test mode
3. Use actual GetAlby for end-to-end testing

## Environment Variable Setup

### Local (.env)
```
NWC_CONNECTION_STRING=nostr+walletconnect://2e2cf8774e55305e1f2b3b83151a6507f98e38456126953ebce42ba6b8a12bb9?relay=wss://relay.getalby.com/v1&secret=d94a5a5ed0bcc7323fc0f3aaf41bcf621cf4c8f1b88c1505abbea54754b418c2
```

### Vercel Dashboard
1. Go to: https://vercel.com/dashboard
2. Select: `workspace-omega-opal` project
3. Settings → Environment Variables
4. Add `NWC_CONNECTION_STRING` with the value above
5. Redeploy
