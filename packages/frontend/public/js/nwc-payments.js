/**
 * nwc-payments.js - NWC Payment Processing
 * Handles Lightning invoice display, QR generation, and payment verification
 */

class NWCPayments {
  constructor(apiClient = api) {
    this.api = apiClient;
    this.config = CONFIG;
    this.currentInvoice = null;
    this.pollingTimer = null;
    this.pollInterval = this.config.NWC.POLL_INTERVAL;
  }

  /**
   * Request invoice from backend
   */
  async requestInvoice(rentalId, amount) {
    try {
      console.log('[NWC] Requesting invoice:', {
        rentalId,
        amount,
      });

      const response = await this.api.post(
        '/api/payments/invoice',
        {
          rentalId,
          amount,
          currency: 'sat',
        }
      );

      if (!response.invoice) {
        throw new Error('No invoice in response');
      }

      this.currentInvoice = {
        ...response,
        createdAt: Date.now(),
        expiresAt:
          Date.now() +
          this.config.NWC.INVOICE_TIMEOUT,
      };

      console.log('[NWC] Invoice received:', response.id);

      return this.currentInvoice;
    } catch (error) {
      console.error('[NWC] Failed to request invoice:', error);
      throw error;
    }
  }

  /**
   * Generate QR code for invoice
   */
  async generateQRCode(invoice, size = 300) {
    try {
      // Use QR code library (qrcode.min.js expected in libs)
      if (typeof QRCode === 'undefined') {
        console.warn(
          '[NWC] QRCode library not loaded'
        );
        return null;
      }

      const canvas = document.createElement('canvas');
      new QRCode({
        text: invoice.invoice,
        width: size,
        height: size,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
        useSVG: false,
      }).makeCode(canvas);

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('[NWC] Failed to generate QR:', error);
      return null;
    }
  }

  /**
   * Start polling for payment status
   */
  startPolling(invoiceId, callback) {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }

    console.log('[NWC] Starting payment polling:', invoiceId);

    // Poll immediately
    this.pollPaymentStatus(invoiceId, callback);

    // Then poll at interval
    this.pollingTimer = setInterval(() => {
      this.pollPaymentStatus(invoiceId, callback);
    }, this.pollInterval);
  }

  /**
   * Check payment status
   */
  async pollPaymentStatus(invoiceId, callback) {
    try {
      const response = await this.api.get(
        `/api/payments/${invoiceId}/status`
      );

      console.log('[NWC] Payment status:', response.status);

      // Call callback with status
      if (callback) {
        callback(response);
      }

      // Stop polling if paid
      if (response.status === 'paid') {
        this.stopPolling();
        return response;
      }

      // Stop polling if expired
      if (response.status === 'expired') {
        this.stopPolling();
        return response;
      }

      return response;
    } catch (error) {
      console.error('[NWC] Failed to check payment:', error);

      // Call callback with error
      if (callback) {
        callback({
          status: 'error',
          error: error.message,
        });
      }

      return null;
    }
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollingTimer) {
      console.log('[NWC] Stopping payment polling');
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Format invoice amount
   */
  formatAmount(sats) {
    if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(8)} BTC`;
    }
    if (sats >= 1000) {
      return `${(sats / 1000).toFixed(3)} mBTC`;
    }
    return `${sats.toLocaleString()} sats`;
  }

  /**
   * Calculate remaining time for invoice
   */
  getRemainingTime(invoiceId) {
    if (!this.currentInvoice) {
      return 0;
    }

    const remaining = Math.max(
      0,
      this.currentInvoice.expiresAt - Date.now()
    );

    return remaining;
  }

  /**
   * Get remaining time as formatted string
   */
  getRemainingTimeString() {
    const remaining = this.getRemainingTime();
    if (remaining <= 0) {
      return 'Expired';
    }

    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    return `${secs}s`;
  }

  /**
   * Check if invoice has expired
   */
  hasExpired() {
    if (!this.currentInvoice) {
      return false;
    }

    return Date.now() > this.currentInvoice.expiresAt;
  }

  /**
   * Copy invoice to clipboard
   */
  async copyInvoiceToClipboard() {
    if (!this.currentInvoice) {
      throw new Error('No invoice');
    }

    try {
      await navigator.clipboard.writeText(
        this.currentInvoice.invoice
      );
      return true;
    } catch (error) {
      console.error('[NWC] Failed to copy:', error);
      return false;
    }
  }

  /**
   * Open invoice in external wallet
   */
  openInWallet() {
    if (!this.currentInvoice) {
      throw new Error('No invoice');
    }

    const lnurl = `lightning:${this.currentInvoice.invoice}`;
    window.location.href = lnurl;
  }

  /**
   * Get invoice details
   */
  getInvoiceDetails() {
    if (!this.currentInvoice) {
      return null;
    }

    return {
      id: this.currentInvoice.id,
      invoice: this.currentInvoice.invoice,
      amount: this.currentInvoice.amount,
      description: this.currentInvoice.description,
      expiresAt: new Date(this.currentInvoice.expiresAt),
      status: this.hasExpired() ? 'expired' : 'pending',
    };
  }

  /**
   * Verify payment was received
   */
  async verifyPayment(invoiceId) {
    try {
      const response = await this.api.get(
        `/api/payments/${invoiceId}/verify`
      );

      if (response.paid) {
        console.log('[NWC] Payment verified');
        this.stopPolling();
      }

      return response;
    } catch (error) {
      console.error('[NWC] Verification failed:', error);
      throw error;
    }
  }

  /**
   * Retry failed payment
   */
  async retryPayment(invoiceId) {
    try {
      console.log('[NWC] Retrying payment:', invoiceId);

      const response = await this.api.post(
        `/api/payments/${invoiceId}/retry`,
        {}
      );

      if (response.invoice) {
        this.currentInvoice = {
          ...response,
          createdAt: Date.now(),
          expiresAt:
            Date.now() +
            this.config.NWC.INVOICE_TIMEOUT,
        };
      }

      return response;
    } catch (error) {
      console.error('[NWC] Retry failed:', error);
      throw error;
    }
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(invoiceId) {
    try {
      console.log('[NWC] Cancelling invoice:', invoiceId);

      const response = await this.api.post(
        `/api/payments/${invoiceId}/cancel`,
        {}
      );

      this.stopPolling();
      this.currentInvoice = null;

      return response;
    } catch (error) {
      console.error('[NWC] Cancel failed:', error);
      throw error;
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(limit = 10) {
    try {
      const response = await this.api.get(
        `/api/payments/history?limit=${limit}`
      );

      return response.payments || [];
    } catch (error) {
      console.error('[NWC] Failed to get history:', error);
      return [];
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopPolling();
    this.currentInvoice = null;
  }
}

/**
 * Create singleton instance
 */
const payments = new NWCPayments(api);

/**
 * Cleanup on unload
 */
if (typeof window !== 'undefined') {
  window.addEventListener('unload', () => {
    payments.destroy();
  });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NWCPayments, payments };
}
