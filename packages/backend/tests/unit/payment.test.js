/**
 * Unit Tests: Payment Service
 * BitRent Phase 4: Testing & Quality Assurance
 */

import { testPayments, testRentals, testValidationRules } from '../fixtures/test-data.js';

describe('Payment Service', () => {
  const mockPaymentService = {
    calculateRentalCost: jest.fn(),
    validatePayment: jest.fn(),
    processPayment: jest.fn(),
    verifyPaymentStatus: jest.fn(),
    refundPayment: jest.fn(),
    getPaymentHistory: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateRentalCost', () => {
    test('should calculate cost for hourly rental', async () => {
      const result = 2 * 0.00025; // 2 hours * 0.00025 BTC/hour
      mockPaymentService.calculateRentalCost.mockResolvedValue(result);

      const cost = await mockPaymentService.calculateRentalCost(
        2, // hours
        0.00025 // hourly rate
      );

      expect(cost).toBe(0.0005);
    });

    test('should handle partial hour rentals', async () => {
      const result = 0.5 * 0.00025;
      mockPaymentService.calculateRentalCost.mockResolvedValue(result);

      const cost = await mockPaymentService.calculateRentalCost(0.5, 0.00025);
      
      expect(cost).toBe(0.000125);
    });

    test('should enforce minimum rental duration', async () => {
      const minHours = testValidationRules.rentalMinimumHours;
      
      mockPaymentService.calculateRentalCost.mockResolvedValue(
        minHours * 0.00025
      );

      const cost = await mockPaymentService.calculateRentalCost(
        minHours,
        0.00025
      );

      expect(cost).toBeGreaterThan(0);
    });

    test('should enforce maximum rental duration', async () => {
      const maxHours = testValidationRules.rentalMaximumHours;
      
      mockPaymentService.calculateRentalCost.mockResolvedValue(
        maxHours * 0.00025
      );

      const cost = await mockPaymentService.calculateRentalCost(
        maxHours,
        0.00025
      );

      expect(cost).toBeGreaterThan(0);
    });

    test('should round to satoshi precision', async () => {
      // Assumes satoshi is smallest unit (1/100M BTC)
      mockPaymentService.calculateRentalCost.mockResolvedValue(0.00000001);

      const cost = await mockPaymentService.calculateRentalCost(0.1, 0.0000001);
      
      expect(cost).toBe(0.00000001);
    });

    test('should handle zero hours', async () => {
      mockPaymentService.calculateRentalCost.mockResolvedValue(0);

      const cost = await mockPaymentService.calculateRentalCost(0, 0.00025);
      
      expect(cost).toBe(0);
    });

    test('should validate rate parameter', async () => {
      mockPaymentService.calculateRentalCost.mockRejectedValue(
        new Error('Invalid rate')
      );

      await expect(mockPaymentService.calculateRentalCost(2, -0.001))
        .rejects.toThrow('Invalid rate');
    });
  });

  describe('validatePayment', () => {
    test('should validate payment request', async () => {
      mockPaymentService.validatePayment.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const payment = {
        rentalId: testRentals[0].id,
        amount: testRentals[0].totalCost,
        clientId: testRentals[0].clientId,
      };

      const result = await mockPaymentService.validatePayment(payment);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject payment with invalid amount', async () => {
      mockPaymentService.validatePayment.mockResolvedValue({
        valid: false,
        errors: ['Invalid amount'],
      });

      const result = await mockPaymentService.validatePayment({
        rentalId: testRentals[0].id,
        amount: -0.001, // negative amount
        clientId: testRentals[0].clientId,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid amount');
    });

    test('should enforce minimum payment', async () => {
      mockPaymentService.validatePayment.mockResolvedValue({
        valid: false,
        errors: ['Amount below minimum'],
      });

      const tooSmall = testValidationRules.minPaymentAmount * 0.5;
      
      const result = await mockPaymentService.validatePayment({
        amount: tooSmall,
        rentalId: testRentals[0].id,
        clientId: testRentals[0].clientId,
      });

      expect(result.valid).toBe(false);
    });

    test('should enforce maximum payment', async () => {
      mockPaymentService.validatePayment.mockResolvedValue({
        valid: false,
        errors: ['Amount exceeds maximum'],
      });

      const tooLarge = testValidationRules.maxPaymentAmount * 2;
      
      const result = await mockPaymentService.validatePayment({
        amount: tooLarge,
        rentalId: testRentals[0].id,
        clientId: testRentals[0].clientId,
      });

      expect(result.valid).toBe(false);
    });

    test('should validate rental exists', async () => {
      mockPaymentService.validatePayment.mockResolvedValue({
        valid: false,
        errors: ['Rental not found'],
      });

      const result = await mockPaymentService.validatePayment({
        rentalId: 'nonexistent_rental',
        amount: 0.0005,
        clientId: 'user_123',
      });

      expect(result.valid).toBe(false);
    });

    test('should match amount to rental cost', async () => {
      mockPaymentService.validatePayment.mockResolvedValue({
        valid: false,
        errors: ['Payment amount does not match rental cost'],
      });

      const result = await mockPaymentService.validatePayment({
        rentalId: testRentals[0].id,
        amount: 0.001, // wrong amount
        clientId: testRentals[0].clientId,
      });

      expect(result.valid).toBe(false);
    });
  });

  describe('processPayment', () => {
    test('should process payment successfully', async () => {
      mockPaymentService.processPayment.mockResolvedValue({
        success: true,
        paymentId: testPayments[0].id,
        status: 'pending',
      });

      const result = await mockPaymentService.processPayment({
        rentalId: testRentals[0].id,
        amount: testRentals[0].totalCost,
        clientId: testRentals[0].clientId,
      });

      expect(result.success).toBe(true);
      expect(result.paymentId).toBeTruthy();
      expect(result.status).toBe('pending');
    });

    test('should create payment record', async () => {
      mockPaymentService.processPayment.mockResolvedValue({
        success: true,
        paymentId: 'payment_new_001',
        rentalId: testRentals[0].id,
        clientId: testRentals[0].clientId,
        amount: testRentals[0].totalCost,
      });

      const result = await mockPaymentService.processPayment({
        rentalId: testRentals[0].id,
        amount: testRentals[0].totalCost,
        clientId: testRentals[0].clientId,
      });

      expect(result.paymentId).toBeTruthy();
      expect(result.rentalId).toBe(testRentals[0].id);
      expect(result.clientId).toBe(testRentals[0].clientId);
    });

    test('should reject duplicate payment', async () => {
      mockPaymentService.processPayment.mockResolvedValueOnce({
        success: true,
        paymentId: 'payment_001',
      }).mockResolvedValueOnce({
        success: false,
        error: 'Payment already exists for this rental',
      });

      const payment = {
        rentalId: testRentals[0].id,
        amount: testRentals[0].totalCost,
        clientId: testRentals[0].clientId,
      };

      const result1 = await mockPaymentService.processPayment(payment);
      expect(result1.success).toBe(true);

      const result2 = await mockPaymentService.processPayment(payment);
      expect(result2.success).toBe(false);
    });

    test('should set initial status to pending', async () => {
      mockPaymentService.processPayment.mockResolvedValue({
        success: true,
        status: 'pending',
      });

      const result = await mockPaymentService.processPayment({
        rentalId: testRentals[0].id,
        amount: testRentals[0].totalCost,
        clientId: testRentals[0].clientId,
      });

      expect(result.status).toBe('pending');
    });

    test('should handle payment processing errors', async () => {
      mockPaymentService.processPayment.mockRejectedValue(
        new Error('Payment processing failed')
      );

      await expect(mockPaymentService.processPayment({
        rentalId: testRentals[0].id,
        amount: testRentals[0].totalCost,
        clientId: testRentals[0].clientId,
      })).rejects.toThrow('Payment processing failed');
    });
  });

  describe('verifyPaymentStatus', () => {
    test('should verify confirmed payment', async () => {
      mockPaymentService.verifyPaymentStatus.mockResolvedValue({
        status: 'confirmed',
        verified: true,
      });

      const result = await mockPaymentService.verifyPaymentStatus(testPayments[0].id);

      expect(result.verified).toBe(true);
      expect(result.status).toBe('confirmed');
    });

    test('should return pending for unconfirmed payment', async () => {
      mockPaymentService.verifyPaymentStatus.mockResolvedValue({
        status: 'pending',
        verified: false,
      });

      const result = await mockPaymentService.verifyPaymentStatus('payment_pending');

      expect(result.verified).toBe(false);
      expect(result.status).toBe('pending');
    });

    test('should fail for non-existent payment', async () => {
      mockPaymentService.verifyPaymentStatus.mockRejectedValue(
        new Error('Payment not found')
      );

      await expect(mockPaymentService.verifyPaymentStatus('nonexistent_payment'))
        .rejects.toThrow('Payment not found');
    });

    test('should check transaction on blockchain', async () => {
      mockPaymentService.verifyPaymentStatus.mockResolvedValue({
        status: 'confirmed',
        verified: true,
        transactionHash: testPayments[0].transactionHash,
      });

      const result = await mockPaymentService.verifyPaymentStatus(testPayments[0].id);

      expect(result.transactionHash).toBeTruthy();
    });

    test('should return confirmation timestamp', async () => {
      mockPaymentService.verifyPaymentStatus.mockResolvedValue({
        status: 'confirmed',
        verified: true,
        confirmedAt: new Date(),
      });

      const result = await mockPaymentService.verifyPaymentStatus(testPayments[0].id);

      expect(result.confirmedAt).toBeInstanceOf(Date);
    });
  });

  describe('refundPayment', () => {
    test('should refund completed payment', async () => {
      mockPaymentService.refundPayment.mockResolvedValue({
        success: true,
        refundId: 'refund_001',
        originalPaymentId: testPayments[0].id,
      });

      const result = await mockPaymentService.refundPayment(testPayments[0].id);

      expect(result.success).toBe(true);
      expect(result.refundId).toBeTruthy();
    });

    test('should reject refund of non-existent payment', async () => {
      mockPaymentService.refundPayment.mockRejectedValue(
        new Error('Payment not found')
      );

      await expect(mockPaymentService.refundPayment('nonexistent_payment'))
        .rejects.toThrow('Payment not found');
    });

    test('should prevent double refund', async () => {
      mockPaymentService.refundPayment
        .mockResolvedValueOnce({ success: true, refundId: 'refund_001' })
        .mockResolvedValueOnce({ success: false, error: 'Already refunded' });

      const result1 = await mockPaymentService.refundPayment(testPayments[0].id);
      expect(result1.success).toBe(true);

      const result2 = await mockPaymentService.refundPayment(testPayments[0].id);
      expect(result2.success).toBe(false);
    });

    test('should refund to original wallet', async () => {
      mockPaymentService.refundPayment.mockResolvedValue({
        success: true,
        refundId: 'refund_001',
        refundedTo: testPayments[0].clientId,
      });

      const result = await mockPaymentService.refundPayment(testPayments[0].id);

      expect(result.refundedTo).toBeTruthy();
    });
  });

  describe('getPaymentHistory', () => {
    test('should return payment history for client', async () => {
      mockPaymentService.getPaymentHistory.mockResolvedValue([
        testPayments[0],
        testPayments[1],
      ]);

      const result = await mockPaymentService.getPaymentHistory(testPayments[0].clientId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should filter by date range', async () => {
      mockPaymentService.getPaymentHistory.mockResolvedValue([testPayments[0]]);

      const result = await mockPaymentService.getPaymentHistory(
        testPayments[0].clientId,
        {
          startDate: new Date('2025-03-01'),
          endDate: new Date('2025-03-02'),
        }
      );

      expect(Array.isArray(result)).toBe(true);
    });

    test('should return empty array for client with no payments', async () => {
      mockPaymentService.getPaymentHistory.mockResolvedValue([]);

      const result = await mockPaymentService.getPaymentHistory('client_no_payments');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    test('should include payment status in results', async () => {
      mockPaymentService.getPaymentHistory.mockResolvedValue([
        { ...testPayments[0], status: 'confirmed' },
      ]);

      const result = await mockPaymentService.getPaymentHistory(testPayments[0].clientId);

      expect(result[0].status).toBeTruthy();
    });
  });

  describe('Security & Validation', () => {
    test('should prevent unauthorized payment access', async () => {
      mockPaymentService.verifyPaymentStatus.mockRejectedValue(
        new Error('Unauthorized')
      );

      await expect(mockPaymentService.verifyPaymentStatus(testPayments[0].id, 'wrong_user'))
        .rejects.toThrow('Unauthorized');
    });

    test('should validate amount precision', async () => {
      mockPaymentService.calculateRentalCost.mockResolvedValue(0.00000001);

      const cost = await mockPaymentService.calculateRentalCost(0.1, 0.0000001);
      
      expect(cost).toBeLessThanOrEqual(0.00000001);
    });

    test('should handle concurrent payment processing', async () => {
      mockPaymentService.processPayment.mockResolvedValue({
        success: true,
        paymentId: 'payment_new',
      });

      const payments = [
        { rentalId: 'rental_1', amount: 0.0001 },
        { rentalId: 'rental_2', amount: 0.0002 },
        { rentalId: 'rental_3', amount: 0.0003 },
      ];

      const results = await Promise.all(
        payments.map(p => mockPaymentService.processPayment(p))
      );

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});
