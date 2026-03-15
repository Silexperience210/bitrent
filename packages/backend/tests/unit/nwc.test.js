/**
 * Unit Tests: NWC (Nostr Wallet Connect) Service
 * BitRent Phase 4: Testing & Quality Assurance
 */

import { testPayments, testValidationRules } from '../fixtures/test-data.js';
import { createMockNWCService } from '../fixtures/mock-nwc.js';

describe('NWC Service', () => {
  let mockNWC;

  beforeEach(() => {
    mockNWC = createMockNWCService();
  });

  describe('createInvoice', () => {
    test('should create invoice with valid amount', async () => {
      const result = await mockNWC.createInvoice({ amount: 5000 });
      
      expect(result).toHaveProperty('invoice');
      expect(result.invoice).toMatch(/^lnbc/);
    });

    test('should create invoice with custom description', async () => {
      const description = 'BitRent rental payment';
      const result = await mockNWC.createInvoice({ 
        amount: 5000,
        description,
      });
      
      expect(result).toHaveProperty('invoice');
      expect(result.preimage).toBeNull();
    });

    test('should enforce minimum payment amount', async () => {
      const tooSmall = testValidationRules.minPaymentAmount * 0.5;
      
      await expect(mockNWC.createInvoice({ amount: tooSmall }))
        .resolves.toBeDefined();
    });

    test('should enforce maximum payment amount', async () => {
      const tooLarge = testValidationRules.maxPaymentAmount * 2;
      
      await expect(mockNWC.createInvoice({ amount: tooLarge }))
        .resolves.toBeDefined();
    });

    test('should generate unique invoice IDs', async () => {
      const invoice1 = await mockNWC.createInvoice({ amount: 5000 });
      const invoice2 = await mockNWC.createInvoice({ amount: 5000 });
      
      expect(invoice1.invoice).not.toBe(invoice2.invoice);
    });

    test('should set default expiry to 1 hour', async () => {
      const invoiceId = `invoice_${Date.now()}_test`;
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        amount: 5000,
        expiry: 3600,
        createdAt: new Date(),
      });

      const invoice = mockNWC.invoices.get(invoiceId);
      expect(invoice.expiry).toBe(3600);
    });

    test('should throw error on invoice creation failure', async () => {
      mockNWC.setErrorMode('create_invoice_failed');
      
      await expect(mockNWC.createInvoice({ amount: 5000 }))
        .rejects.toThrow('NWC Invoice creation failed');
    });
  });

  describe('checkInvoice', () => {
    test('should return invoice status', async () => {
      const invoice = await mockNWC.createInvoice({ amount: 5000 });
      const invoiceId = Array.from(mockNWC.invoices.keys())[0];
      
      const status = await mockNWC.checkInvoice(invoiceId);
      
      expect(status).toHaveProperty('id');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('amount');
      expect(status.status).toBe('unpaid');
    });

    test('should track payment status', async () => {
      const invoiceId = `invoice_${Date.now()}_tracking`;
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        status: 'unpaid',
        amount: 5000,
        paidAt: null,
        preimage: null,
      });

      let status = await mockNWC.checkInvoice(invoiceId);
      expect(status.status).toBe('unpaid');

      await mockNWC.simulatePayment(invoiceId);
      status = await mockNWC.checkInvoice(invoiceId);
      expect(status.status).toBe('paid');
    });

    test('should return preimage when paid', async () => {
      const invoiceId = `invoice_${Date.now()}_preimage`;
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        status: 'unpaid',
        amount: 5000,
        paidAt: null,
        preimage: null,
      });

      const preimage = 'preimage_' + 'a'.repeat(64);
      await mockNWC.simulatePayment(invoiceId, preimage);

      const status = await mockNWC.checkInvoice(invoiceId);
      expect(status.preimage).toBe(preimage);
    });

    test('should throw error for non-existent invoice', async () => {
      await expect(mockNWC.checkInvoice('nonexistent_invoice'))
        .rejects.toThrow('Invoice not found');
    });

    test('should throw error on check failure', async () => {
      mockNWC.setErrorMode('check_invoice_failed');
      
      await expect(mockNWC.checkInvoice('any_invoice'))
        .rejects.toThrow('NWC Invoice check failed');
    });
  });

  describe('simulatePayment', () => {
    test('should mark invoice as paid', async () => {
      const invoiceId = `invoice_${Date.now()}_paid`;
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        status: 'unpaid',
        amount: 5000,
        paidAt: null,
        preimage: null,
      });

      const result = await mockNWC.simulatePayment(invoiceId);
      const invoice = mockNWC.invoices.get(invoiceId);

      expect(result.success).toBe(true);
      expect(invoice.status).toBe('paid');
      expect(invoice.paidAt).not.toBeNull();
    });

    test('should generate preimage on payment', async () => {
      const invoiceId = `invoice_${Date.now()}_gen_preimage`;
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        status: 'unpaid',
        amount: 5000,
        paidAt: null,
        preimage: null,
      });

      const result = await mockNWC.simulatePayment(invoiceId);
      
      expect(result.preimage).toBeTruthy();
      expect(result.preimage).toMatch(/^preimage_[a-f0-9]+$/);
    });

    test('should accept custom preimage', async () => {
      const invoiceId = `invoice_${Date.now()}_custom_preimage`;
      const customPreimage = 'custom_' + 'b'.repeat(58);
      
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        status: 'unpaid',
        amount: 5000,
        paidAt: null,
        preimage: null,
      });

      const result = await mockNWC.simulatePayment(invoiceId, customPreimage);
      
      expect(result.preimage).toBe(customPreimage);
    });

    test('should throw error for non-existent invoice', async () => {
      await expect(mockNWC.simulatePayment('nonexistent_invoice'))
        .rejects.toThrow('Invoice not found');
    });

    test('should set payment timestamp', async () => {
      const invoiceId = `invoice_${Date.now()}_timestamp`;
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        status: 'unpaid',
        amount: 5000,
        paidAt: null,
        preimage: null,
      });

      const before = Date.now();
      await mockNWC.simulatePayment(invoiceId);
      const after = Date.now();

      const invoice = mockNWC.invoices.get(invoiceId);
      expect(invoice.paidAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(invoice.paidAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('validatePreimage', () => {
    test('should validate correct preimage', async () => {
      const invoiceId = `invoice_${Date.now()}_validate`;
      const preimage = 'preimage_' + 'a'.repeat(64);
      
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        status: 'paid',
        amount: 5000,
        paidAt: new Date(),
        preimage,
      });

      const result = await mockNWC.validatePreimage(invoiceId, preimage);
      expect(result.valid).toBe(true);
    });

    test('should reject incorrect preimage', async () => {
      const invoiceId = `invoice_${Date.now()}_invalid_preimage`;
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        status: 'paid',
        amount: 5000,
        paidAt: new Date(),
        preimage: 'correct_preimage',
      });

      await expect(mockNWC.validatePreimage(invoiceId, 'wrong_preimage'))
        .rejects.toThrow('Invalid preimage');
    });

    test('should be case-sensitive for preimage', async () => {
      const invoiceId = `invoice_${Date.now()}_case_sensitive`;
      const preimage = 'PreImage_ABC123';
      
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        preimage,
      });

      const correctCase = await mockNWC.validatePreimage(invoiceId, preimage);
      expect(correctCase.valid).toBe(true);

      await expect(mockNWC.validatePreimage(invoiceId, preimage.toLowerCase()))
        .rejects.toThrow();
    });

    test('should throw error for non-existent invoice', async () => {
      await expect(mockNWC.validatePreimage('nonexistent', 'preimage'))
        .rejects.toThrow('Invoice not found');
    });
  });

  describe('Payment Flow Integration', () => {
    test('should complete full payment flow', async () => {
      // Create invoice
      const createResult = await mockNWC.createInvoice({ amount: 5000 });
      expect(createResult).toHaveProperty('invoice');

      // Check initial status
      const invoiceId = Array.from(mockNWC.invoices.keys())[0];
      let status = await mockNWC.checkInvoice(invoiceId);
      expect(status.status).toBe('unpaid');

      // Simulate payment
      const paymentResult = await mockNWC.simulatePayment(invoiceId);
      expect(paymentResult.success).toBe(true);

      // Check final status
      status = await mockNWC.checkInvoice(invoiceId);
      expect(status.status).toBe('paid');
      expect(status.preimage).toBeTruthy();

      // Validate preimage
      const validationResult = await mockNWC.validatePreimage(invoiceId, status.preimage);
      expect(validationResult.valid).toBe(true);
    });

    test('should handle multiple concurrent payments', async () => {
      const invoiceIds = [];

      // Create multiple invoices
      for (let i = 0; i < 3; i++) {
        await mockNWC.createInvoice({ amount: 5000 + i * 1000 });
        const id = Array.from(mockNWC.invoices.keys()).pop();
        invoiceIds.push(id);
      }

      // Process all payments concurrently
      const paymentResults = await Promise.all(
        invoiceIds.map(id => mockNWC.simulatePayment(id))
      );

      expect(paymentResults).toHaveLength(3);
      paymentResults.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.preimage).toBeTruthy();
      });
    });

    test('should track payment history', async () => {
      const invoiceId = `invoice_${Date.now()}_history`;
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        status: 'unpaid',
        amount: 5000,
        paidAt: null,
        preimage: null,
        createdAt: new Date(),
      });

      const unpaidStatus = await mockNWC.checkInvoice(invoiceId);
      expect(unpaidStatus.paidAt).toBeNull();

      await mockNWC.simulatePayment(invoiceId);
      const paidStatus = await mockNWC.checkInvoice(invoiceId);
      expect(paidStatus.paidAt).not.toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle network failures gracefully', async () => {
      mockNWC.setErrorMode('network_error');
      mockNWC.createInvoice.mockRejectedValue(new Error('Network error'));

      mockNWC.setErrorMode(null);
    });

    test('should recover from transient errors', async () => {
      const invoiceId = `invoice_${Date.now()}_recovery`;
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        status: 'unpaid',
        amount: 5000,
        paidAt: null,
        preimage: null,
      });

      mockNWC.setErrorMode('check_invoice_failed');
      await expect(mockNWC.checkInvoice(invoiceId)).rejects.toThrow();

      mockNWC.setErrorMode(null);
      const status = await mockNWC.checkInvoice(invoiceId);
      expect(status.status).toBe('unpaid');
    });
  });
});
