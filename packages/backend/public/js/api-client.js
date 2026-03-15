/**
 * BitRent API Client (Vercel API Routes)
 * Updated for /api/* endpoints
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
const JWT_TOKEN_KEY = 'bitrent-jwt-token';
const JWT_PUBKEY_KEY = 'bitrent-pubkey';
const ADMIN_PUBKEY_KEY = 'bitrent-is-admin';

class BitRentAPI {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = this.getToken();
    this.pubkey = this.getPubkey();
  }

  getToken() {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(JWT_TOKEN_KEY);
  }

  getPubkey() {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(JWT_PUBKEY_KEY);
  }

  setToken(token, pubkey, isAdmin) {
    if (typeof localStorage === 'undefined') return;
    if (token) {
      localStorage.setItem(JWT_TOKEN_KEY, token);
      localStorage.setItem(JWT_PUBKEY_KEY, pubkey);
      localStorage.setItem(ADMIN_PUBKEY_KEY, isAdmin ? 'true' : 'false');
    } else {
      localStorage.removeItem(JWT_TOKEN_KEY);
      localStorage.removeItem(JWT_PUBKEY_KEY);
      localStorage.removeItem(ADMIN_PUBKEY_KEY);
    }
    this.token = token;
    this.pubkey = pubkey;
  }

  /**
   * Generic fetch wrapper
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.message || data.error || 'API Error',
          data,
        };
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ============ AUTH ENDPOINTS ============

  /**
   * POST /api/auth/challenge
   * Generate a challenge for Nostr signature verification
   */
  async getNostrChallenge(pubkey) {
    return this.request('/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ pubkey }),
    });
  }

  /**
   * POST /api/auth/verify
   * Verify Nostr signature and get JWT token
   */
  async verifyNostrSignature(challenge, signature, pubkey, timestamp) {
    const result = await this.request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ challenge, signature, pubkey, timestamp }),
    });

    // Store token
    this.setToken(result.token, result.pubkey, result.is_admin);

    return result;
  }

  /**
   * GET /api/auth/profile
   * Get current user profile
   */
  async getProfile() {
    return this.request('/auth/profile', { method: 'GET' });
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token
   */
  async refreshToken() {
    const result = await this.request('/auth/refresh', { method: 'POST' });
    this.setToken(result.token, this.pubkey, this.pubkey ? true : false);
    return result;
  }

  /**
   * POST /api/auth/logout
   * Logout user
   */
  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Logout API call failed, clearing local token anyway');
    }
    this.setToken(null);
  }

  // ============ CLIENT ENDPOINTS ============

  /**
   * GET /api/client/mineurs
   * List available miners
   */
  async getAvailableMiners() {
    return this.request('/client/mineurs', { method: 'GET' });
  }

  /**
   * POST /api/client/rentals
   * Create new rental
   */
  async createRental(minerId, durationHours) {
    return this.request('/client/rentals', {
      method: 'POST',
      body: JSON.stringify({
        miner_id: minerId,
        duration_hours: durationHours,
      }),
    });
  }

  /**
   * GET /api/client/rentals
   * Get user's active rentals
   */
  async getActiveRentals() {
    return this.request('/client/rentals', { method: 'GET' });
  }

  /**
   * GET /api/client/rentals/[id]
   * Get rental details
   */
  async getRentalStatus(rentalId) {
    return this.request(`/client/rentals/${rentalId}`, { method: 'GET' });
  }

  /**
   * PUT /api/client/rentals/[id]
   * Update rental
   */
  async updateRental(rentalId, updates) {
    return this.request(`/client/rentals/${rentalId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * DELETE /api/client/rentals/[id]
   * Cancel rental
   */
  async cancelRental(rentalId) {
    return this.request(`/client/rentals/${rentalId}`, { method: 'DELETE' });
  }

  // ============ PAYMENTS ENDPOINTS ============

  /**
   * POST /api/payments/verify
   * Verify payment and activate rental
   */
  async verifyPayment(rentalId, paymentHash, invoice) {
    return this.request('/payments/verify', {
      method: 'POST',
      body: JSON.stringify({
        rental_id: rentalId,
        payment_hash: paymentHash,
        invoice,
      }),
    });
  }

  // ============ ADMIN ENDPOINTS ============

  /**
   * GET /api/admin/mineurs
   * List all miners
   */
  async getAllMiners() {
    return this.request('/admin/mineurs', { method: 'GET' });
  }

  /**
   * POST /api/admin/mineurs
   * Create new miner
   */
  async addMiner(minerData) {
    return this.request('/admin/mineurs', {
      method: 'POST',
      body: JSON.stringify(minerData),
    });
  }

  /**
   * PUT /api/admin/mineurs/[id]
   * Update miner
   */
  async updateMiner(minerId, updates) {
    return this.request(`/admin/mineurs/${minerId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * DELETE /api/admin/mineurs/[id]
   * Delete miner
   */
  async deleteMiner(minerId) {
    return this.request(`/admin/mineurs/${minerId}`, { method: 'DELETE' });
  }

  /**
   * GET /api/admin/stats
   * Get platform statistics
   */
  async getPlatformStats() {
    return this.request('/admin/stats', { method: 'GET' });
  }

  // ============ HEALTH CHECK ============

  /**
   * GET /api/health
   * Health check endpoint
   */
  async healthCheck() {
    return this.request('/health', { method: 'GET' });
  }
}

// Create singleton instance
const apiClient = new BitRentAPI();

export default apiClient;
