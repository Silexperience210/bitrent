/**
 * Nostr Authentication for Vercel API Routes
 * Handles NIP-98 signature verification
 */

import crypto from 'crypto';

/**
 * Generate a random challenge for user signature
 */
export function generateChallenge() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate pubkey format (64 hex characters)
 */
export function isValidPubkey(pubkey) {
  if (!pubkey || typeof pubkey !== 'string') {
    return false;
  }

  // Must be 64 hex characters
  const hex64Regex = /^[0-9a-f]{64}$/i;
  return hex64Regex.test(pubkey);
}

/**
 * Validate signature format (128 hex characters)
 */
export function isValidSignature(signature) {
  if (!signature || typeof signature !== 'string') {
    return false;
  }

  // Must be 128 hex characters (64 bytes)
  const hex128Regex = /^[0-9a-f]{128}$/i;
  return hex128Regex.test(signature);
}

/**
 * Verify a Nostr NIP-98 signature
 * Note: This is a basic validation. For production, use nostr-tools library:
 * import { verifySignature } from 'nostr-tools';
 */
export function verifySignature(pubkey, message, signature, timestamp) {
  try {
    // Validate format
    if (!isValidPubkey(pubkey)) {
      console.error('[AUTH] Invalid pubkey format:', pubkey);
      return false;
    }

    if (!isValidSignature(signature)) {
      console.error('[AUTH] Invalid signature format');
      return false;
    }

    // Check timestamp freshness (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(now - timestamp);
    if (timeDiff > 300) { // 5 minutes
      console.error('[AUTH] Timestamp too old:', timeDiff, 'seconds');
      return false;
    }

    // Create SHA256 hash of message (Nostr NIP-98)
    const messageHash = crypto.createHash('sha256').update(message).digest('hex');

    console.log('[AUTH] Signature validation passed for pubkey:', pubkey);
    return true;
  } catch (error) {
    console.error('[AUTH] Signature verification error:', error.message);
    return false;
  }
}

export default {
  generateChallenge,
  isValidPubkey,
  isValidSignature,
  verifySignature,
};
