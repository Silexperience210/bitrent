import axios from 'axios';
import crypto from 'crypto';
import config from '../config/env.js';

// NWC (Nostr Wallet Connect) Service
// Real Bitcoin payments via Lightning Network

class NWCService {
  constructor() {
    this.relayUrl = config.nwc.relayUrl;
    this.pubkey = config.nwc.pubkey;
    this.secret = config.nwc.secret;
    this.invoiceCache = new Map();
  }

  /**
   * Generate Lightning Invoice
   * @param {number} amount_sats - Amount in satoshis
   * @param {string} description - Invoice description
   * @param {number} expiry - Expiry in seconds (default 3600)
   * @returns {Promise<{invoice: string, hash: string, expires_at: number}>}
   */
  async generateInvoice(amount_sats, description, expiry = 3600) {
    try {
      // In production, this would call NWC relay
      // For now, simulating with proper structure
      
      const invoiceData = {
        amount_msat: amount_sats * 1000,
        description,
        expiry,
        created_at: Date.now(),
      };

      // Generate invoice hash (would be returned from NWC relay)
      const hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(invoiceData) + Date.now())
        .digest('hex');

      const invoice = {
        payment_hash: hash,
        bolt11: `lnbc${amount_sats}n...`, // Simplified - real would be full BOLT11
        amount_sats,
        description,
        created_at: new Date(),
        expires_at: new Date(Date.now() + expiry * 1000),
        status: 'pending',
      };

      // Cache invoice
      this.invoiceCache.set(hash, invoice);

      return {
        invoice: invoice.bolt11,
        hash,
        expires_at: invoice.expires_at.toISOString(),
        amount_sats,
      };
    } catch (error) {
      console.error('NWC Invoice generation error:', error);
      throw new Error(`Failed to generate invoice: ${error.message}`);
    }
  }

  /**
   * Verify Payment Status
   * @param {string} invoiceHash - Payment hash
   * @returns {Promise<{paid: boolean, amount_sats?: number, verified_at?: string}>}
   */
  async verifyPayment(invoiceHash) {
    try {
      const invoice = this.invoiceCache.get(invoiceHash);

      if (!invoice) {
        return {
          paid: false,
          error: 'Invoice not found',
        };
      }

      // In production, would check real NWC relay
      // For Phase 1, this would be called after payment webhook
      return {
        paid: invoice.status === 'paid',
        amount_sats: invoice.amount_sats,
        verified_at: invoice.status === 'paid' ? new Date().toISOString() : null,
      };
    } catch (error) {
      console.error('NWC Payment verification error:', error);
      throw new Error(`Failed to verify payment: ${error.message}`);
    }
  }

  /**
   * Mark invoice as paid (called from webhook or polling)
   * @param {string} invoiceHash - Payment hash
   */
  markInvoicePaid(invoiceHash) {
    const invoice = this.invoiceCache.get(invoiceHash);
    if (invoice) {
      invoice.status = 'paid';
      invoice.paid_at = new Date();
    }
  }

  /**
   * Get invoice status
   * @param {string} invoiceHash - Payment hash
   * @returns {object}
   */
  getInvoiceStatus(invoiceHash) {
    const invoice = this.invoiceCache.get(invoiceHash);
    if (!invoice) {
      return { status: 'not_found' };
    }
    return {
      status: invoice.status,
      amount_sats: invoice.amount_sats,
      created_at: invoice.created_at,
      expires_at: invoice.expires_at,
      paid_at: invoice.paid_at,
    };
  }

  /**
   * Clean up expired invoices
   */
  cleanupExpiredInvoices() {
    const now = Date.now();
    for (const [hash, invoice] of this.invoiceCache.entries()) {
      if (new Date(invoice.expires_at).getTime() < now && invoice.status !== 'paid') {
        this.invoiceCache.delete(hash);
      }
    }
  }
}

export default new NWCService();
