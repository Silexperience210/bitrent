/**
 * Nostr Protocol Constants
 * NIP references and configuration
 */

/**
 * Nostr Event Kinds
 * https://github.com/nostr-protocol/nips/blob/master/01.md
 */
export const EVENT_KIND = {
  TEXT_NOTE: 1,
  RECOMMEND_RELAY: 2,
  CONTACT_LIST: 3,
  ENCRYPTED_DM: 4,
  EVENT_DELETION: 5,
};

/**
 * NIP-98 Authentication Standard
 * https://github.com/nostr-protocol/nips/blob/master/98.md
 */
export const NIP_98 = {
  KIND: 27235, // HTTP Auth event kind
};

/**
 * NIP-07 Browser Extension Standard
 * For nostr wallet connect and extension signing
 */
export const NIP_07 = {
  PROVIDER: 'nostr',
};

/**
 * Common Nostr Relay URLs
 */
export const RELAYS = {
  NOSTR_BAND: 'wss://relay.nostr.band',
  PURPLEPAG: 'wss://purplepag.es',
  NOSTR_NOW: 'wss://nostr.now.show',
  LUNY_RELAY: 'wss://relay.lunykitchen.info',
};

/**
 * Supported Nostr Wallet Types
 */
export const WALLET_TYPES = {
  ALBY: 'alby',
  AMBER: 'amber',
  NOSTR_CONNECT: 'nip46',
  NWC: 'nwc',
  EXTENSION: 'nip07',
};

/**
 * Authentication Challenge Configuration
 */
export const CHALLENGE_CONFIG = {
  LENGTH: 32, // bytes
  EXPIRY: 300, // 5 minutes in seconds
  TIMESTAMP_TOLERANCE: 300, // 5 minutes for timestamp validation
};

/**
 * JWT Configuration
 */
export const JWT_CONFIG = {
  ALGORITHM: 'HS256',
  EXPIRY: '24h',
  REFRESH_EXPIRY: '30d',
  ISSUER: 'bitrent',
};

/**
 * Public Key Validation
 */
export const PUBKEY_RULES = {
  LENGTH: 64, // hex characters
  FORMAT: /^[0-9a-f]{64}$/i, // hexadecimal
};

/**
 * Signature Validation
 */
export const SIGNATURE_RULES = {
  LENGTH: 128, // hex characters (64 bytes)
  FORMAT: /^[0-9a-f]{128}$/i, // hexadecimal
};

/**
 * Error Messages
 */
export const ERRORS = {
  INVALID_PUBKEY: 'Invalid public key format',
  INVALID_SIGNATURE: 'Invalid signature format',
  SIGNATURE_VERIFICATION_FAILED: 'Signature verification failed',
  CHALLENGE_EXPIRED: 'Challenge has expired',
  CHALLENGE_NOT_FOUND: 'Challenge not found',
  TIMESTAMP_INVALID: 'Timestamp is invalid or too old',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Token is invalid',
  NO_WALLET: 'No Nostr wallet detected',
  WALLET_PERMISSION_DENIED: 'Wallet permission denied',
};

export default {
  EVENT_KIND,
  NIP_98,
  NIP_07,
  RELAYS,
  WALLET_TYPES,
  CHALLENGE_CONFIG,
  JWT_CONFIG,
  PUBKEY_RULES,
  SIGNATURE_RULES,
  ERRORS,
};
