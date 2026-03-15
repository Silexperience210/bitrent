import config from './config.js';

/**
 * BitRent API Client
 * Replaces localStorage calls with real API calls
 */

class BitRentAPI {
  constructor() {
    this.baseUrl = config.API_BASE_URL;
    this.token = localStorage.getItem(config.JWT_TOKEN_KEY);
    this.pubkey = localStorage.getItem(config.JWT_PUBKEY_KEY);
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
          message: data.error || 'API Error',
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

  async getNostrChallenge(pubkey) {
    return this.request('/auth/nostr-challenge', {
      method: 'POST',
      body: JSON.stringify({ pubkey }),
    });
  }

  async verifyNostrSignature(pubkey, message, sig) {
    const result = await this.request('/auth/nostr-verify', {
      method: 'POST',
      body: JSON.stringify({ pubkey, message, sig }),
    });

    // Store token
    localStorage.setItem(config.JWT_TOKEN_KEY, result.token);
    localStorage.setItem(config.JWT_PUBKEY_KEY, result.pubkey);
    localStorage.setItem(config.ADMIN_PUBKEY_KEY, result.is_admin);

    this.token = result.token;
    this.pubkey = result.pubkey;

    return result;
  }

  async logout() {
    localStorage.removeItem(config.JWT_TOKEN_KEY);
    localStorage.removeItem(config.JWT_PUBKEY_KEY);
    localStorage.removeItem(config.ADMIN_PUBKEY_KEY);
    this.token = null;
    this.pubkey = null;

    return this.request('/auth/logout', { method: 'POST' });
  }

  // ============ CLIENT ENDPOINTS ============

  // Miners
  async getAvailableMiners() {
    return this.request('/client/mineurs');
  }

  async getMinerDetails(minerId) {
    return this.request(`/client/mineurs/${minerId}`);
  }

  // Rentals
  async createRental(minerId, durationHours) {
    return this.request('/client/rentals', {
      method: 'POST',
      body: JSON.stringify({
        mineur_id: minerId,
        duration_hours: durationHours,
      }),
    });
  }

  async getRentalStatus(rentalId) {
    return this.request(`/client/rentals/${rentalId}`);
  }

  async getActiveRentals() {
    return this.request('/client/rentals');
  }

  async getRentalHistory(limit = 50) {
    return this.request(`/client/rentals/history?limit=${limit}`);
  }

  async verifyRentalPayment(rentalId) {
    return this.request(`/client/rentals/${rentalId}/verify-payment`, {
      method: 'POST',
    });
  }

  async cancelRental(rentalId) {
    return this.request(`/client/rentals/${rentalId}/cancel`, {
      method: 'POST',
    });
  }

  // Payments
  async checkPaymentStatus(invoiceHash) {
    return this.request(`/payments/status/${invoiceHash}`);
  }

  // ============ ADMIN ENDPOINTS ============

  // Miners Management
  async getAllMiners() {
    return this.request('/admin/mineurs');
  }

  async addMiner(minerData) {
    return this.request('/admin/mineurs', {
      method: 'POST',
      body: JSON.stringify(minerData),
    });
  }

  async updateMiner(minerId, updates) {
    return this.request(`/admin/mineurs/${minerId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteMiner(minerId) {
    return this.request(`/admin/mineurs/${minerId}`, {
      method: 'DELETE',
    });
  }

  async getMinerStatus(minerId) {
    return this.request(`/admin/mineurs/${minerId}/status`);
  }

  async getMinerMetrics(minerId) {
    return this.request(`/admin/mineurs/${minerId}/metrics`);
  }

  async getMinerStats(minerId) {
    return this.request(`/admin/mineurs/${minerId}/stats`);
  }

  // Rentals Management
  async getAllRentals() {
    return this.request('/admin/rentals');
  }

  // Statistics
  async getPlatformStats() {
    return this.request('/admin/stats');
  }

  // ============ HEALTH CHECK ============

  async healthCheck() {
    return this.request('/health');
  }

  async checkReadiness() {
    return this.request('/health/readiness');
  }
}

// Create singleton instance
const apiClient = new BitRentAPI();

export default apiClient;
