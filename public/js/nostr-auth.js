/**
 * nostr-auth.js - Nostr Authentication (NIP-98)
 * Handles Nostr wallet connections and JWT token exchange
 */

class NostrAuth {
  constructor(apiClient = api) {
    this.api = apiClient;
    this.config = CONFIG;
    this.wallet = null;
    this.pubkey = null;
    this.user = null;
    this.initialized = false;

    this.init();
  }

  /**
   * Initialize authentication
   */
  init() {
    if (this.initialized) return;

    // Check if already authenticated
    if (this.api.isAuthenticated() && this.api.isTokenValid()) {
      this.restoreSession();
    }

    this.initialized = true;
  }

  /**
   * Restore existing session from localStorage
   */
  restoreSession() {
    const token = this.api.getToken();
    const pubkey = localStorage.getItem(
      this.config.AUTH.PUBKEY_STORAGE_KEY
    );
    const user = localStorage.getItem(
      this.config.AUTH.USER_STORAGE_KEY
    );

    if (token && pubkey) {
      this.pubkey = pubkey;
      if (user) {
        this.user = JSON.parse(user);
      }
      return true;
    }

    return false;
  }

  /**
   * Get available wallets
   */
  async getAvailableWallets() {
    const wallets = [];

    // Check for Alby
    if (window.nostr && window.nostr.isAlby) {
      wallets.push({
        id: 'alby',
        name: 'Alby',
        available: true,
      });
    }

    // Check for NIP-07 (browser extension)
    if (window.nostr) {
      wallets.push({
        id: 'nip07',
        name: 'NIP-07 Extension',
        available: true,
      });
    }

    // NIP-46 (remote signer) is always available
    wallets.push({
      id: 'nip46',
      name: 'NIP-46 Remote Signer',
      available: true,
    });

    return wallets;
  }

  /**
   * Connect to wallet and authenticate
   */
  async login(walletId) {
    try {
      console.log('[Auth] Logging in with wallet:', walletId);

      // Get wallet instance
      const wallet = await this.getWallet(walletId);
      if (!wallet) {
        throw new Error(`Wallet ${walletId} not available`);
      }

      // Get user's public key
      const pubkey = await this.getPubkey(wallet);
      console.log('[Auth] Got pubkey:', pubkey);

      // Request challenge from backend
      const challengeRes = await this.api.post(
        '/api/auth/challenge',
        { pubkey }
      );

      if (!challengeRes.challenge) {
        throw new Error('Failed to get challenge');
      }

      console.log('[Auth] Got challenge');

      // Sign challenge with wallet
      const signature = await this.signChallenge(
        wallet,
        challengeRes.challenge
      );

      // Exchange for JWT
      const authRes = await this.api.post(
        '/api/auth/verify',
        {
          pubkey,
          challenge: challengeRes.challenge,
          signature,
        },
        { skipAuth: true }
      );

      if (!authRes.token) {
        throw new Error('Failed to get JWT token');
      }

      // Store credentials
      this.api.setToken(authRes.token);
      this.pubkey = pubkey;
      this.wallet = walletId;

      localStorage.setItem(
        this.config.AUTH.PUBKEY_STORAGE_KEY,
        pubkey
      );

      // Store user info if provided
      if (authRes.user) {
        this.user = authRes.user;
        localStorage.setItem(
          this.config.AUTH.USER_STORAGE_KEY,
          JSON.stringify(authRes.user)
        );
      }

      console.log('[Auth] Login successful');

      // Schedule token refresh
      this.scheduleTokenRefresh();

      return {
        success: true,
        pubkey,
        user: authRes.user,
        role: authRes.user?.role || 'user',
      };
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      throw error;
    }
  }

  /**
   * Get wallet instance
   */
  async getWallet(walletId) {
    if (walletId === 'alby' && window.nostr?.isAlby) {
      return window.nostr;
    }

    if (walletId === 'nip07' && window.nostr) {
      return window.nostr;
    }

    if (walletId === 'nip46') {
      return await this.initNIP46();
    }

    return null;
  }

  /**
   * Get public key from wallet
   */
  async getPubkey(wallet) {
    if (!wallet) {
      throw new Error('No wallet');
    }

    try {
      const pubkey = await wallet.getPublicKey();
      if (!pubkey) {
        throw new Error('Failed to get public key');
      }
      return pubkey;
    } catch (error) {
      console.error('[Auth] Failed to get pubkey:', error);
      throw error;
    }
  }

  /**
   * Sign challenge with wallet
   */
  async signChallenge(wallet, challenge) {
    if (!wallet) {
      throw new Error('No wallet');
    }

    try {
      // Create authentication event (NIP-98)
      const event = {
        kind: 27235, // HTTP Auth event
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['u', window.location.origin + '/api/auth/verify'],
          ['method', 'POST'],
        ],
        content: challenge,
      };

      // Sign event
      const signedEvent = await wallet.signEvent(event);
      if (!signedEvent.sig) {
        throw new Error('Failed to sign event');
      }

      return signedEvent.sig;
    } catch (error) {
      console.error('[Auth] Failed to sign challenge:', error);
      throw error;
    }
  }

  /**
   * Initialize NIP-46 remote signer
   */
  async initNIP46() {
    // This would require user to provide their NIP-46 connection string
    // For now, we'll throw an error
    throw new Error(
      'NIP-46 not yet implemented. Use browser extension instead.'
    );
  }

  /**
   * Logout
   */
  logout() {
    console.log('[Auth] Logging out');

    // Clear tokens
    this.api.clearToken();

    // Clear local data
    localStorage.removeItem(
      this.config.AUTH.PUBKEY_STORAGE_KEY
    );
    localStorage.removeItem(
      this.config.AUTH.USER_STORAGE_KEY
    );

    // Clear instance data
    this.pubkey = null;
    this.wallet = null;
    this.user = null;

    // Cancel token refresh
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Redirect to login
    window.location.href = '/index.html';
  }

  /**
   * Check if authenticated
   */
  isAuthenticated() {
    return this.api.isAuthenticated() && this.api.isTokenValid();
  }

  /**
   * Get current user
   */
  getUser() {
    return this.api.getCurrentUser();
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.api.isAdmin();
  }

  /**
   * Schedule automatic token refresh
   */
  scheduleTokenRefresh() {
    // Refresh every 12 hours
    const refreshInterval = this.config.AUTH.TOKEN_REFRESH_INTERVAL;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      this.refreshToken();
    }, refreshInterval);
  }

  /**
   * Manually refresh token
   */
  async refreshToken() {
    try {
      console.log('[Auth] Refreshing token');

      if (!this.isAuthenticated()) {
        console.log('[Auth] Not authenticated, skipping refresh');
        return false;
      }

      const success = await this.api.refreshToken();

      if (success) {
        console.log('[Auth] Token refreshed');
        this.scheduleTokenRefresh();
      }

      return success;
    } catch (error) {
      console.error('[Auth] Token refresh failed:', error);
      this.logout();
      return false;
    }
  }

  /**
   * Get user profile from backend
   */
  async getProfile() {
    try {
      const response = await this.api.get('/api/auth/profile');
      return response.user;
    } catch (error) {
      console.error('[Auth] Failed to get profile:', error);
      return null;
    }
  }

  /**
   * Get session info
   */
  getSession() {
    if (!this.isAuthenticated()) {
      return null;
    }

    return {
      pubkey: this.pubkey,
      wallet: this.wallet,
      user: this.user,
      isAdmin: this.isAdmin(),
      tokenExpiresAt: this.getTokenExpiryTime(),
    };
  }

  /**
   * Get token expiry time
   */
  getTokenExpiryTime() {
    const user = this.api.getCurrentUser();
    if (!user || !user.exp) {
      return null;
    }

    return new Date(user.exp * 1000);
  }

  /**
   * Check if token is about to expire (within 1 hour)
   */
  isTokenExpiringSoon() {
    const expiryTime = this.getTokenExpiryTime();
    if (!expiryTime) return false;

    const oneHourFromNow = Date.now() + 60 * 60 * 1000;
    return expiryTime.getTime() < oneHourFromNow;
  }

  /**
   * Get remaining token time
   */
  getTokenTimeRemaining() {
    const expiryTime = this.getTokenExpiryTime();
    if (!expiryTime) return 0;

    return Math.max(0, expiryTime.getTime() - Date.now());
  }

  /**
   * Cleanup on unload
   */
  destroy() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  }
}

/**
 * Create singleton instance
 */
const auth = new NostrAuth(api);

/**
 * Setup token refresh on page visibility
 */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && auth.isAuthenticated()) {
      // Refresh token when page becomes visible
      if (auth.isTokenExpiringSoon()) {
        auth.refreshToken();
      }
    }
  });

  // Cleanup on unload
  window.addEventListener('unload', () => {
    auth.destroy();
  });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NostrAuth, auth };
}
