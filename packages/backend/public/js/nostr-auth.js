/**
 * Nostr Authentication Client Library
 * Handles wallet connection, challenge signing, and login flow
 */

const NostrAuth = {
  // Configuration
  config: {
    apiUrl: window.location.origin + '/api',
    challengeExpiry: 300, // 5 minutes
  },

  // State
  state: {
    pubkey: null,
    token: null,
    isAdmin: false,
    walletType: null,
  },

  /**
   * Initialize authentication system
   */
  async init() {
    console.log('[NostrAuth] Initializing...');
    
    // Check if already logged in
    const token = this.getToken();
    if (token) {
      await this.verifyToken(token);
    }

    // Setup event listeners
    this.setupEventListeners();
  },

  /**
   * Setup UI event listeners
   */
  setupEventListeners() {
    // Login button
    const loginBtn = document.getElementById('nostr-login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.openLoginModal());
    }

    // Logout button
    const logoutBtn = document.getElementById('nostr-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    // Wallet connect buttons (in modal)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('wallet-option')) {
        const walletType = e.target.dataset.wallet;
        this.connectWallet(walletType);
      }
    });
  },

  /**
   * Open login modal
   */
  openLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  },

  /**
   * Close login modal
   */
  closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  },

  /**
   * Connect to Nostr wallet and login
   * @param {string} walletType - Type of wallet (alby, amber, nip46, etc.)
   */
  async connectWallet(walletType) {
    try {
      console.log('[NostrAuth] Connecting wallet:', walletType);
      this.updateStatus('Connecting wallet...');

      // Get pubkey from wallet
      let pubkey = null;

      if (walletType === 'alby') {
        pubkey = await this.connectAlby();
      } else if (walletType === 'nip07') {
        pubkey = await this.connectNIP07();
      } else if (walletType === 'amber') {
        pubkey = await this.connectAmber();
      } else {
        throw new Error(`Unsupported wallet: ${walletType}`);
      }

      if (!pubkey) {
        throw new Error('Failed to get public key from wallet');
      }

      this.state.walletType = walletType;
      this.state.pubkey = pubkey;

      // Proceed with login
      await this.login(pubkey);
    } catch (error) {
      console.error('[NostrAuth] Wallet connection error:', error);
      this.showError(error.message || 'Failed to connect wallet');
    }
  },

  /**
   * Connect to Alby wallet
   */
  async connectAlby() {
    if (!window.nostr) {
      throw new Error('Alby wallet not installed. Please install it from getalby.com');
    }

    try {
      const pubkey = await window.nostr.getPublicKey();
      return pubkey;
    } catch (error) {
      throw new Error(`Alby connection failed: ${error.message}`);
    }
  },

  /**
   * Connect via NIP-07 (browser extension)
   */
  async connectNIP07() {
    if (!window.nostr) {
      throw new Error('No Nostr wallet extension detected. Please install one.');
    }

    try {
      const pubkey = await window.nostr.getPublicKey();
      return pubkey;
    } catch (error) {
      throw new Error(`NIP-07 connection failed: ${error.message}`);
    }
  },

  /**
   * Connect to Amber (Android)
   */
  async connectAmber() {
    throw new Error('Amber wallet support coming soon');
  },

  /**
   * Login with Nostr signature
   * @param {string} pubkey - User's public key
   */
  async login(pubkey) {
    try {
      this.updateStatus('Requesting challenge...');

      // Step 1: Get challenge
      const challengeResponse = await fetch(`${this.config.apiUrl}/auth/nostr-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pubkey }),
      });

      if (!challengeResponse.ok) {
        const error = await challengeResponse.json();
        throw new Error(error.message || 'Failed to get challenge');
      }

      const { challenge, challenge_id } = await challengeResponse.json();
      console.log('[NostrAuth] Challenge received:', challenge_id);

      // Step 2: Sign challenge
      this.updateStatus('Signing challenge with wallet...');
      const signature = await this.signChallenge(challenge, pubkey);

      // Step 3: Verify signature and get token
      this.updateStatus('Verifying signature...');
      const timestamp = Math.floor(Date.now() / 1000);

      const verifyResponse = await fetch(`${this.config.apiUrl}/auth/nostr-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge,
          signature,
          pubkey,
          timestamp,
        }),
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.message || 'Signature verification failed');
      }

      const { token, is_admin } = await verifyResponse.json();

      // Step 4: Store token and update state
      this.setToken(token);
      this.state.pubkey = pubkey;
      this.state.isAdmin = is_admin;
      this.state.token = token;

      console.log('[NostrAuth] Login successful!', { pubkey, is_admin });

      // Update UI
      this.updateUI();
      this.closeLoginModal();
      this.showSuccess('Logged in successfully!');

      // Dispatch event for other parts of the app
      window.dispatchEvent(new CustomEvent('nostr:login', { detail: { pubkey, is_admin } }));
    } catch (error) {
      console.error('[NostrAuth] Login error:', error);
      this.showError(error.message || 'Login failed');
    }
  },

  /**
   * Sign challenge with wallet
   * @param {string} challenge - Challenge to sign
   * @param {string} pubkey - User's pubkey
   */
  async signChallenge(challenge, pubkey) {
    if (!window.nostr) {
      throw new Error('Wallet not available');
    }

    try {
      const signature = await window.nostr.signMessage(challenge);
      return signature;
    } catch (error) {
      // Some wallets might need different signing method
      throw new Error(`Signature failed: ${error.message}`);
    }
  },

  /**
   * Verify token is still valid
   * @param {string} token - JWT token
   */
  async verifyToken(token) {
    try {
      const response = await fetch(`${this.config.apiUrl}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        this.state.pubkey = data.pubkey;
        this.state.isAdmin = data.is_admin;
        this.state.token = token;
        this.updateUI();
        console.log('[NostrAuth] Token verified');
        return true;
      } else {
        // Token invalid
        this.clearToken();
        return false;
      }
    } catch (error) {
      console.error('[NostrAuth] Token verification error:', error);
      this.clearToken();
      return false;
    }
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      // Call logout endpoint
      const token = this.getToken();
      if (token) {
        await fetch(`${this.config.apiUrl}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }

      // Clear state
      this.clearToken();
      this.state.pubkey = null;
      this.state.token = null;
      this.state.isAdmin = false;

      // Update UI
      this.updateUI();
      this.showSuccess('Logged out');

      // Dispatch event
      window.dispatchEvent(new CustomEvent('nostr:logout'));
    } catch (error) {
      console.error('[NostrAuth] Logout error:', error);
      // Clear anyway
      this.clearToken();
      this.updateUI();
    }
  },

  /**
   * Get JWT token from storage
   */
  getToken() {
    return localStorage.getItem('bitrent_token');
  },

  /**
   * Store JWT token
   * @param {string} token - JWT token
   */
  setToken(token) {
    localStorage.setItem('bitrent_token', token);
  },

  /**
   * Clear JWT token
   */
  clearToken() {
    localStorage.removeItem('bitrent_token');
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return !!this.state.pubkey && !!this.getToken();
  },

  /**
   * Get current pubkey
   */
  getPubkey() {
    return this.state.pubkey;
  },

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.state.isAdmin;
  },

  /**
   * Update UI based on login state
   */
  updateUI() {
    const loginBtn = document.getElementById('nostr-login-btn');
    const logoutBtn = document.getElementById('nostr-logout-btn');
    const userDisplay = document.getElementById('nostr-user-display');

    if (this.isLoggedIn()) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (userDisplay) {
        const shortPubkey = this.state.pubkey.substring(0, 8) + '...';
        userDisplay.textContent = `${shortPubkey}${this.state.isAdmin ? ' (Admin)' : ''}`;
        userDisplay.style.display = 'inline-block';
      }

      // Hide admin routes if not admin
      if (!this.state.isAdmin) {
        const adminLinks = document.querySelectorAll('[data-require-admin]');
        adminLinks.forEach(link => link.style.display = 'none');
      }
    } else {
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (userDisplay) userDisplay.style.display = 'none';

      // Hide admin routes
      const adminLinks = document.querySelectorAll('[data-require-admin]');
      adminLinks.forEach(link => link.style.display = 'none');
    }
  },

  /**
   * Update status message in modal
   * @param {string} message - Status message
   */
  updateStatus(message) {
    const statusEl = document.getElementById('login-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.display = 'block';
    }
  },

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    console.error('[NostrAuth]', message);
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }

    // Also show in alert if element not found
    if (!errorEl) {
      alert('Error: ' + message);
    }
  },

  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    console.log('[NostrAuth]', message);
    const successEl = document.getElementById('login-success');
    if (successEl) {
      successEl.textContent = message;
      successEl.style.display = 'block';
      setTimeout(() => {
        successEl.style.display = 'none';
      }, 3000);
    }
  },
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NostrAuth.init());
} else {
  NostrAuth.init();
}
