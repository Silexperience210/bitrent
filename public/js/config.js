/**
 * config.js - Environment & Configuration
 * Centralized configuration for API endpoints, features, and environment variables
 */

const CONFIG = {
  // API Configuration
  API: {
    BASE_URL: getApiBaseUrl(),
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // exponential backoff
  },

  // Auth Configuration
  AUTH: {
    JWT_STORAGE_KEY: 'bitrent_jwt',
    PUBKEY_STORAGE_KEY: 'bitrent_pubkey',
    USER_STORAGE_KEY: 'bitrent_user',
    TOKEN_REFRESH_INTERVAL: 12 * 60 * 60 * 1000, // 12 hours
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Nostr Configuration
  NOSTR: {
    CHALLENGE_LENGTH: 32,
    SUPPORTED_WALLETS: ['alby', 'nip07', 'nip46'],
    WALLET_NAMES: {
      alby: 'Alby',
      nip07: 'NIP-07 Wallet',
      nip46: 'NIP-46 Remote Signer',
    },
  },

  // NWC Configuration
  NWC: {
    POLL_INTERVAL: 2000, // 2 seconds
    INVOICE_TIMEOUT: 15 * 60 * 1000, // 15 minutes
    QR_CODE_SIZE: 300,
  },

  // UI Configuration
  UI: {
    DARK_MODE: true,
    ANIMATION_ENABLED: true,
    TOAST_DURATION: 5000, // 5 seconds
    LOADING_MIN_DISPLAY: 300, // show spinner at least 300ms
  },

  // Feature Flags
  FEATURES: {
    REAL_PAYMENTS: true,
    REAL_AUTH: true,
    ADMIN_PROTECTION: true,
    ERROR_LOGGING: true,
  },

  // Rate Limiting
  RATE_LIMIT: {
    LOGIN_ATTEMPTS: 5,
    LOGIN_WINDOW: 5 * 60 * 1000, // 5 minutes
    API_REQUESTS_PER_SECOND: 10,
  },

  // Environment
  ENV: getEnvironment(),
  DEBUG: isDebugMode(),
};

/**
 * Determine API base URL from environment
 */
function getApiBaseUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000';
  }

  const isDev = window.location.hostname === 'localhost';
  const isStaging = window.location.hostname.includes('staging');

  if (isDev) {
    return process.env.API_URL || 'http://localhost:3000';
  }

  if (isStaging) {
    return process.env.API_URL || 'https://api-staging.bitrent.dev';
  }

  // Production
  return process.env.API_URL || 'https://api.bitrent.dev';
}

/**
 * Determine current environment
 */
function getEnvironment() {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV || 'development';
  }

  if (window.location.hostname === 'localhost') {
    return 'development';
  }

  if (window.location.hostname.includes('staging')) {
    return 'staging';
  }

  return 'production';
}

/**
 * Check if debug mode is enabled
 */
function isDebugMode() {
  if (typeof window === 'undefined') {
    return process.env.DEBUG === 'true';
  }

  return (
    localStorage.getItem('debug_mode') === 'true' ||
    window.location.search.includes('debug=1')
  );
}

/**
 * Log config info if debug mode
 */
function logConfig() {
  if (CONFIG.DEBUG) {
    console.log('[CONFIG] Environment:', CONFIG.ENV);
    console.log('[CONFIG] API Base URL:', CONFIG.API.BASE_URL);
    console.log('[CONFIG] Debug Mode: ON');
  }
}

// Log on load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', logConfig);
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
