# 🔐 NWC Credentials - Test Environment

**Status:** Active for testing

## Connection String
```
nostr+walletconnect://2e2cf8774e55305e1f2b3b83151a6507f98e38456126953ebce42ba6b8a12bb9?relay=wss://relay.getalby.com/v1&secret=d94a5a5ed0bcc7323fc0f3aaf41bcf621cf4c8f1b88c1505abbea54754b418c2
```

## Details
- **Pubkey:** `2e2cf8774e55305e1f2b3b83151a6507f98e38456126953ebce42ba6b8a12bb9`
- **Relay:** `wss://relay.getalby.com/v1`
- **Secret:** `d94a5a5ed0bcc7323fc0f3aaf41bcf621cf4c8f1b88c1505abbea54754b418c2`
- **Wallet:** GetAlby

## Usage
- For generating real Lightning invoices
- For processing actual Bitcoin payments
- Tests on rent-miner.html payment flow

## Integration
Set in `.env` as:
```
NWC_CONNECTION_STRING=nostr+walletconnect://2e2cf8774e55305e1f2b3b83151a6507f98e38456126953ebce42ba6b8a12bb9?relay=wss://relay.getalby.com/v1&secret=d94a5a5ed0bcc7323fc0f3aaf41bcf621cf4c8f1b88c1505abbea54754b418c2
```

Or in Vercel dashboard:
- Go to Settings → Environment Variables
- Add `NWC_CONNECTION_STRING` with this value
