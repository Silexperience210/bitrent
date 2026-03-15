/**
 * JWT Token Storage & Management
 * Secure storage and automatic refresh of JWT tokens
 */

const JWTStorage = {
  config: {
    storageKey: 'bitrent_token',
    refreshKey: 'bitrent_refresh_token',
    apiUrl: window.location.origin + '/api',
    refreshThreshold: 5 * 60, // Refresh 5 mins before expiry
  },

  /**
   * Initialize JWT storage system
   */
  init() {
    console.log('[JWT] Initializing JWT storage...');
    
    // Check if token needs refresh
    this.setupAutoRefresh();
  },

  /**
   * Store access token
   * @param {string} token - JWT token
   */
  setAccessToken(token) {
    try {
      localStorage.setItem(this.config.storageKey, token);
      console.log('[JWT] Access token stored');
      this.setupAutoRefresh();
    } catch (error) {
      console.error('[JWT] Failed to store token:', error);
    }
  },

  /**
   * Store refresh token
   * @param {string} token - Refresh token
   */
  setRefreshToken(token) {
    try {
      localStorage.setItem(this.config.refreshKey, token);
      console.log('[JWT] Refresh token stored');
    } catch (error) {
      console.error('[JWT] Failed to store refresh token:', error);
    }
  },

  /**
   * Get access token
   * @returns {string|null} JWT token or null
   */
  getAccessToken() {
    return localStorage.getItem(this.config.storageKey);
  },

  /**
   * Get refresh token
   * @returns {string|null} Refresh token or null
   */
  getRefreshToken() {
    return localStorage.getItem(this.config.refreshKey);
  },

  /**
   * Clear all tokens
   */
  clearTokens() {
    localStorage.removeItem(this.config.storageKey);
    localStorage.removeItem(this.config.refreshKey);
    console.log('[JWT] Tokens cleared');
  },

  /**
   * Check if token exists
   * @returns {boolean}
   */
  hasToken() {
    return !!this.getAccessToken();
  },

  /**
   * Decode token (without verification)
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded payload or null
   */
  decodeToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      console.error('[JWT] Decode error:', error);
      return null;
    }
  },

  /**
   * Get token expiration time
   * @param {string} token - JWT token
   * @returns {number|null} Unix timestamp or null
   */
  getTokenExpiration(token) {
    const decoded = this.decodeToken(token);
    return decoded?.exp ? decoded.exp * 1000 : null; // Convert to milliseconds
  },

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean}
   */
  isTokenExpired(token) {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;
    
    return Date.now() > expiration;
  },

  /**
   * Get time until token expires (in seconds)
   * @param {string} token - JWT token
   * @returns {number} Seconds until expiry, or -1 if expired
   */
  getTimeUntilExpiry(token) {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return -1;

    const timeLeft = Math.round((expiration - Date.now()) / 1000);
    return Math.max(timeLeft, -1);
  },

  /**
   * Check if token needs refresh
   * @param {string} token - JWT token
   * @returns {boolean}
   */
  needsRefresh(token) {
    const timeLeft = this.getTimeUntilExpiry(token);
    return timeLeft > 0 && timeLeft < this.config.refreshThreshold;
  },

  /**
   * Refresh token from server
   * @returns {boolean} True if refresh successful
   */
  async refreshToken() {
    try {
      const token = this.getAccessToken();
      if (!token) {
        console.warn('[JWT] No token to refresh');
        return false;
      }

      console.log('[JWT] Refreshing token...');

      const response = await fetch(`${this.config.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[JWT] Refresh failed:', response.status);
        this.clearTokens();
        window.dispatchEvent(new CustomEvent('jwt:expired'));
        return false;
      }

      const data = await response.json();
      if (data.token) {
        this.setAccessToken(data.token);
        console.log('[JWT] Token refreshed successfully');
        window.dispatchEvent(new CustomEvent('jwt:refreshed'));
        return true;
      }

      return false;
    } catch (error) {
      console.error('[JWT] Refresh error:', error);
      return false;
    }
  },

  /**
   * Setup automatic token refresh
   */
  setupAutoRefresh() {
    // Clear existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    const token = this.getAccessToken();
    if (!token) {
      console.log('[JWT] No token for auto-refresh');
      return;
    }

    const timeLeft = this.getTimeUntilExpiry(token);
    console.log('[JWT] Token expires in', timeLeft, 'seconds');

    // Check token every minute
    this.refreshInterval = setInterval(async () => {
      const currentToken = this.getAccessToken();
      if (!currentToken) {
        clearInterval(this.refreshInterval);
        return;
      }

      if (this.needsRefresh(currentToken)) {
        await this.refreshToken();
      }
    }, 60 * 1000); // Check every minute
  },

  /**
   * Get authorization header for API requests
   * @returns {string|null} Authorization header value or null
   */
  getAuthHeader() {
    const token = this.getAccessToken();
    return token ? `Bearer ${token}` : null;
  },

  /**
   * Get public key from token
   * @returns {string|null}
   */
  getPubkey() {
    const token = this.getAccessToken();
    const decoded = this.decodeToken(token);
    return decoded?.pubkey || null;
  },

  /**
   * Check if user is admin from token
   * @returns {boolean}
   */
  isAdmin() {
    const token = this.getAccessToken();
    const decoded = this.decodeToken(token);
    return decoded?.is_admin === true;
  },

  /**
   * Get token info for debugging
   * @returns {Object}
   */
  getTokenInfo() {
    const token = this.getAccessToken();
    if (!token) return { hasToken: false };

    const decoded = this.decodeToken(token);
    const expiration = this.getTokenExpiration(token);
    const timeLeft = this.getTimeUntilExpiry(token);

    return {
      hasToken: true,
      pubkey: decoded?.pubkey,
      is_admin: decoded?.is_admin,
      issued_at: decoded?.iat ? new Date(decoded.iat * 1000) : null,
      expires_at: expiration ? new Date(expiration) : null,
      time_left_seconds: timeLeft,
      is_expired: this.isTokenExpired(token),
      needs_refresh: this.needsRefresh(token),
    };
  },

  /**
   * Cleanup on page unload
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },
};

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => JWTStorage.init());
} else {
  JWTStorage.init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => JWTStorage.destroy());
