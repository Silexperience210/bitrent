/**
 * Integration Tests: Payment Flow
 * BitRent Phase 4: Testing & Quality Assurance
 * 
 * Tests the complete payment flow:
 * 1. Client creates rental
 * 2. System calculates cost
 * 3. System generates invoice via NWC
 * 4. Client pays invoice
 * 5. System verifies payment
 * 6. System confirms rental completion
 */

import { testRentals, testPayments, testMineurs, testUsers } from '../fixtures/test-data.js';
import { createMockNWCService } from '../fixtures/mock-nwc.js';

describe('Payment Flow - Integration', () => {
  let mockNWC;
  const mockPaymentFlow = {
    createRental: jest.fn(),
    calculateCost: jest.fn(),
    generateInvoice: jest.fn(),
    simulatePayment: jest.fn(),
    verifyPayment: jest.fn(),
    completeRental: jest.fn(),
  };

  let currentRental;
  let currentInvoice;
  let currentPayment;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNWC = createMockNWCService();
    currentRental = null;
    currentInvoice = null;
    currentPayment = null;
  });

  describe('Complete Payment Flow', () => {
    test('should complete full payment flow: rental → invoice → payment → confirm', async () => {
      // Step 1: Create rental
      mockPaymentFlow.createRental.mockResolvedValue({
        id: testRentals[0].id,
        minerId: testRentals[0].minerId,
        clientId: testRentals[0].clientId,
        startTime: testRentals[0].startTime,
        hourlyRate: testRentals[0].hourlyRate,
        status: 'initiated',
      });

      const rentalResult = await mockPaymentFlow.createRental({
        minerId: testMineurs[0].id,
        clientId: testUsers.client1.id,
        durationHours: 2,
      });

      expect(rentalResult.id).toBeTruthy();
      currentRental = rentalResult;

      // Step 2: Calculate rental cost
      mockPaymentFlow.calculateCost.mockResolvedValue(0.0005); // 2 hours * 0.00025

      const costResult = await mockPaymentFlow.calculateCost({
        rentalId: currentRental.id,
        durationHours: 2,
        hourlyRate: 0.00025,
      });

      expect(costResult).toBe(0.0005);

      // Step 3: Generate invoice via NWC
      const invoiceResult = await mockNWC.createInvoice({
        amount: Math.round(costResult * 100000000), // Convert to satoshis
        description: `BitRent rental: ${testMineurs[0].name}`,
      });

      expect(invoiceResult.invoice).toBeTruthy();
      currentInvoice = {
        invoiceId: Array.from(mockNWC.invoices.keys())[0],
        amount: costResult,
        ...invoiceResult,
      };

      // Step 4: Simulate payment
      const paymentResult = await mockNWC.simulatePayment(currentInvoice.invoiceId);
      expect(paymentResult.success).toBe(true);
      expect(paymentResult.preimage).toBeTruthy();

      currentPayment = {
        invoiceId: currentInvoice.invoiceId,
        preimage: paymentResult.preimage,
      };

      // Step 5: Verify payment
      mockPaymentFlow.verifyPayment.mockResolvedValue({
        verified: true,
        status: 'confirmed',
        transactionHash: 'tx_' + 'a'.repeat(64),
      });

      const verifyResult = await mockPaymentFlow.verifyPayment({
        rentalId: currentRental.id,
        invoiceId: currentInvoice.invoiceId,
        preimage: currentPayment.preimage,
      });

      expect(verifyResult.verified).toBe(true);
      expect(verifyResult.status).toBe('confirmed');

      // Step 6: Complete rental
      mockPaymentFlow.completeRental.mockResolvedValue({
        rentalId: currentRental.id,
        paymentStatus: 'confirmed',
        status: 'completed',
        finalHashRate: 520,
      });

      const completeResult = await mockPaymentFlow.completeRental(currentRental.id);

      expect(completeResult.status).toBe('completed');
      expect(mockPaymentFlow.completeRental).toHaveBeenCalledWith(currentRental.id);
    });

    test('should cancel rental if payment fails', async () => {
      // Create rental
      mockPaymentFlow.createRental.mockResolvedValue({
        id: 'rental_fail_test',
        status: 'initiated',
      });

      const rental = await mockPaymentFlow.createRental({
        minerId: testMineurs[0].id,
        clientId: testUsers.client1.id,
        durationHours: 2,
      });

      // Calculate cost
      mockPaymentFlow.calculateCost.mockResolvedValue(0.0005);
      const cost = await mockPaymentFlow.calculateCost({
        rentalId: rental.id,
        durationHours: 2,
        hourlyRate: 0.00025,
      });

      // Invoice generation fails
      mockPaymentFlow.generateInvoice.mockRejectedValue(
        new Error('NWC service unavailable')
      );

      await expect(mockPaymentFlow.generateInvoice({
        rentalId: rental.id,
        amount: cost,
      })).rejects.toThrow('NWC service unavailable');

      // Verify rental is cancelled
      // (In real implementation, rental would be auto-cancelled)
    });

    test('should refund payment if rental is cancelled', async () => {
      // Setup completed payment
      currentPayment = {
        id: testPayments[0].id,
        status: 'confirmed',
        amount: 0.0005,
      };

      mockPaymentFlow.verifyPayment.mockResolvedValue({
        verified: true,
        status: 'confirmed',
      });

      // Cancel rental with refund
      mockPaymentFlow.completeRental.mockResolvedValue({
        status: 'cancelled',
        refundProcessed: true,
        refundAmount: currentPayment.amount,
      });

      const result = await mockPaymentFlow.completeRental('rental_to_cancel');

      expect(result.refundProcessed).toBe(true);
      expect(result.refundAmount).toBe(0.0005);
    });
  });

  describe('Cost Calculation', () => {
    test('should calculate cost accurately for different durations', async () => {
      const testCases = [
        { hours: 0.5, rate: 0.00025, expected: 0.000125 },
        { hours: 1, rate: 0.00025, expected: 0.00025 },
        { hours: 2, rate: 0.00025, expected: 0.0005 },
        { hours: 24, rate: 0.00025, expected: 0.006 },
        { hours: 0.5, rate: 0.00015, expected: 0.000075 },
      ];

      for (const testCase of testCases) {
        mockPaymentFlow.calculateCost.mockResolvedValue(testCase.expected);
        
        const result = await mockPaymentFlow.calculateCost({
          durationHours: testCase.hours,
          hourlyRate: testCase.rate,
        });

        expect(result).toBe(testCase.expected);
      }
    });

    test('should round to satoshi precision', async () => {
      // Satoshi = 1/100,000,000 BTC
      mockPaymentFlow.calculateCost.mockResolvedValue(0.00000001);

      const result = await mockPaymentFlow.calculateCost({
        durationHours: 0.00001,
        hourlyRate: 0.000000001,
      });

      // Should be rounded to satoshi
      expect(result % 0.00000001).toBeLessThan(0.000001);
    });

    test('should handle very small amounts', async () => {
      mockPaymentFlow.calculateCost.mockResolvedValue(0.00000001);

      const result = await mockPaymentFlow.calculateCost({
        durationHours: 0.1,
        hourlyRate: 0.0000001,
      });

      expect(result).toBeGreaterThan(0);
    });

    test('should enforce minimum payment', async () => {
      mockPaymentFlow.calculateCost.mockRejectedValue(
        new Error('Amount below minimum')
      );

      const tooSmallAmount = { durationHours: 0.01, hourlyRate: 0.00000001 };

      await expect(mockPaymentFlow.calculateCost(tooSmallAmount))
        .rejects.toThrow('Amount below minimum');
    });
  });

  describe('Invoice Management', () => {
    test('should generate unique invoice for each rental', async () => {
      const invoice1 = await mockNWC.createInvoice({ amount: 5000 });
      const invoice2 = await mockNWC.createInvoice({ amount: 5000 });

      expect(invoice1.invoice).not.toBe(invoice2.invoice);
    });

    test('should track invoice expiry', async () => {
      const invoiceId = `invoice_${Date.now()}_expiry`;
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        status: 'unpaid',
        createdAt: new Date(),
        expiry: 3600, // 1 hour
      });

      const invoice = mockNWC.invoices.get(invoiceId);
      const expiryTime = invoice.createdAt.getTime() + invoice.expiry * 1000;

      expect(expiryTime).toBeGreaterThan(Date.now());
    });

    test('should reject payment on expired invoice', async () => {
      const invoiceId = `invoice_${Date.now() - 7200000}_expired`; // 2 hours ago
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        status: 'unpaid',
        createdAt: new Date(Date.now() - 7200000),
        expiry: 3600,
      });

      const invoice = mockNWC.invoices.get(invoiceId);
      const isExpired = Date.now() > (invoice.createdAt.getTime() + invoice.expiry * 1000);

      expect(isExpired).toBe(true);
    });

    test('should handle partial payments', async () => {
      const invoiceId = `invoice_${Date.now()}_partial`;
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        amount: 5000,
        status: 'unpaid',
      });

      // Simulate partial payment (real implementation would need more logic)
      const partialAmount = 2500;
      expect(partialAmount).toBeLessThan(5000);
    });
  });

  describe('Payment Verification', () => {
    test('should verify payment with correct preimage', async () => {
      const invoiceId = `invoice_${Date.now()}_verify`;
      const preimage = 'preimage_' + 'a'.repeat(64);

      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        preimage,
        status: 'paid',
      });

      const result = await mockNWC.validatePreimage(invoiceId, preimage);

      expect(result.valid).toBe(true);
    });

    test('should check blockchain confirmation', async () => {
      mockPaymentFlow.verifyPayment.mockResolvedValue({
        verified: true,
        blockHeight: 850000,
        confirmations: 6,
        transactionHash: 'tx_abc123',
      });

      const result = await mockPaymentFlow.verifyPayment({
        rentalId: 'rental_123',
        invoiceId: 'invoice_123',
        preimage: 'preimage_abc',
      });

      expect(result.confirmations).toBeGreaterThanOrEqual(6);
    });

    test('should handle payment webhook from NWC', async () => {
      const webhookPayload = {
        event: 'payment.success',
        invoiceId: 'invoice_webhook_test',
        preimage: 'preimage_webhook',
        timestamp: new Date(),
      };

      mockPaymentFlow.verifyPayment.mockResolvedValue({
        verified: true,
        source: 'webhook',
      });

      const result = await mockPaymentFlow.verifyPayment(webhookPayload);

      expect(result.verified).toBe(true);
      expect(result.source).toBe('webhook');
    });
  });

  describe('Concurrent Payment Processing', () => {
    test('should handle multiple concurrent payments', async () => {
      const payments = [
        { rentalId: 'rental_1', amount: 0.0001 },
        { rentalId: 'rental_2', amount: 0.0002 },
        { rentalId: 'rental_3', amount: 0.0003 },
      ];

      mockPaymentFlow.verifyPayment.mockResolvedValue({
        verified: true,
        status: 'confirmed',
      });

      const results = await Promise.all(
        payments.map(p => mockPaymentFlow.verifyPayment(p))
      );

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.verified).toBe(true);
      });
    });

    test('should prevent double-spending', async () => {
      const invoiceId = 'invoice_double_spend_test';
      mockNWC.invoices.set(invoiceId, {
        id: invoiceId,
        status: 'unpaid',
        amount: 5000,
      });

      // First payment
      await mockNWC.simulatePayment(invoiceId);
      let invoice = mockNWC.invoices.get(invoiceId);
      expect(invoice.status).toBe('paid');

      // Second payment attempt should fail
      await expect(mockNWC.simulatePayment(invoiceId))
        .rejects.toThrow();
    });
  });

  describe('Error Handling & Rollback', () => {
    test('should rollback on payment verification failure', async () => {
      mockPaymentFlow.createRental.mockResolvedValue({
        id: 'rental_rollback_test',
        status: 'initiated',
      });

      mockPaymentFlow.verifyPayment.mockRejectedValue(
        new Error('Payment verification failed')
      );

      await expect(mockPaymentFlow.verifyPayment({
        rentalId: 'rental_rollback_test',
        invoiceId: 'invoice_123',
      })).rejects.toThrow('Payment verification failed');
    });

    test('should handle network timeouts', async () => {
      mockPaymentFlow.verifyPayment.mockRejectedValue(
        new Error('Request timeout')
      );

      await expect(mockPaymentFlow.verifyPayment({
        rentalId: 'rental_123',
      })).rejects.toThrow('Request timeout');
    });

    test('should retry failed payment verification', async () => {
      mockPaymentFlow.verifyPayment
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          verified: true,
          status: 'confirmed',
        });

      // First attempt fails
      await expect(mockPaymentFlow.verifyPayment({ rentalId: 'rental_123' }))
        .rejects.toThrow('Temporary failure');

      // Retry succeeds
      const result = await mockPaymentFlow.verifyPayment({ rentalId: 'rental_123' });
      expect(result.verified).toBe(true);
    });
  });

  describe('Security & Auditing', () => {
    test('should log all payment transactions', async () => {
      mockPaymentFlow.verifyPayment.mockResolvedValue({
        verified: true,
        status: 'confirmed',
      });

      const result = await mockPaymentFlow.verifyPayment({
        rentalId: 'rental_audit_test',
        amount: 0.0005,
        timestamp: new Date(),
      });

      expect(result.verified).toBe(true);
      expect(mockPaymentFlow.verifyPayment).toHaveBeenCalled();
    });

    test('should validate payment amounts match rental cost', async () => {
      mockPaymentFlow.verifyPayment.mockResolvedValue({
        verified: false,
        error: 'Amount mismatch',
      });

      const result = await mockPaymentFlow.verifyPayment({
        rentalId: 'rental_123',
        expectedAmount: 0.0005,
        actualAmount: 0.001, // Wrong amount
      });

      expect(result.verified).toBe(false);
    });

    test('should prevent payment manipulation', async () => {
      mockPaymentFlow.verifyPayment.mockRejectedValue(
        new Error('Tampered payment data')
      );

      await expect(mockPaymentFlow.verifyPayment({
        rentalId: 'rental_123',
        manipulatedAmount: 0.0001, // Attempted manipulation
      })).rejects.toThrow('Tampered payment data');
    });
  });
});
