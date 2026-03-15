/**
 * Mock NWC (Nostr Wallet Connect) Service
 * BitRent Phase 4: Testing & Quality Assurance
 */

export class MockNWCService {
  constructor() {
    this.invoices = new Map();
    this.paymentRequests = new Map();
    this.errorMode = null;
  }

  /**
   * Create an invoice
   */
  async createInvoice(options = {}) {
    if (this.errorMode === 'create_invoice_failed') {
      throw new Error('NWC Invoice creation failed');
    }

    const invoiceId = `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const invoice = {
      id: invoiceId,
      amount: options.amount || 1000, // satoshis
      description: options.description || 'BitRent rental payment',
      expiry: options.expiry || 3600,
      createdAt: new Date(),
      paidAt: null,
      preimage: null,
      status: 'unpaid',
    };

    this.invoices.set(invoiceId, invoice);
    return {
      invoice: `lnbc${invoice.amount}n...`, // Mock invoice
      preimage: null,
    };
  }

  /**
   * Check invoice status
   */
  async checkInvoice(invoiceId) {
    if (this.errorMode === 'check_invoice_failed') {
      throw new Error('NWC Invoice check failed');
    }

    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return {
      id: invoice.id,
      status: invoice.status,
      amount: invoice.amount,
      paidAt: invoice.paidAt,
      preimage: invoice.preimage,
    };
  }

  /**
   * Simulate payment received
   */
  async simulatePayment(invoiceId, preimage) {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.preimage = preimage || `preimage_${Math.random().toString(36).substr(2, 64)}`;
    
    return { success: true, preimage: invoice.preimage };
  }

  /**
   * Get payment request details
   */
  async getPaymentRequest(invoiceId) {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return {
      id: invoice.id,
      amount: invoice.amount,
      description: invoice.description,
      expiresAt: new Date(invoice.createdAt.getTime() + invoice.expiry * 1000),
      status: invoice.status,
    };
  }

  /**
   * Get all invoices for client
   */
  async getClientInvoices(clientId, options = {}) {
    const allInvoices = Array.from(this.invoices.values());
    
    let filtered = allInvoices;
    if (options.status) {
      filtered = filtered.filter(inv => inv.status === options.status);
    }
    if (options.minAmount) {
      filtered = filtered.filter(inv => inv.amount >= options.minAmount);
    }

    return filtered.map(inv => ({
      id: inv.id,
      amount: inv.amount,
      status: inv.status,
      createdAt: inv.createdAt,
      paidAt: inv.paidAt,
    }));
  }

  /**
   * Validate invoice preimage
   */
  async validatePreimage(invoiceId, preimage) {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.preimage !== preimage) {
      throw new Error('Invalid preimage');
    }

    return { valid: true };
  }

  /**
   * Clear all mocks (for testing)
   */
  clear() {
    this.invoices.clear();
    this.paymentRequests.clear();
    this.errorMode = null;
  }

  /**
   * Set error mode for testing failure scenarios
   */
  setErrorMode(mode) {
    this.errorMode = mode;
  }
}

export const createMockNWCService = () => new MockNWCService();
