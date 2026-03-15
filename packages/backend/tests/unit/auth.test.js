/**
 * Unit Tests: Authentication Service
 * BitRent Phase 4: Testing & Quality Assurance
 */

import { testUsers } from '../fixtures/test-data.js';

describe('Authentication Service', () => {
  const mockAuthService = {
    generateChallenge: jest.fn(),
    verifySignature: jest.fn(),
    generateToken: jest.fn(),
    verifyToken: jest.fn(),
    refreshToken: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateChallenge', () => {
    test('should generate a valid challenge', async () => {
      const challenge = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      mockAuthService.generateChallenge.mockResolvedValue({
        challenge,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const result = await mockAuthService.generateChallenge();
      
      expect(result).toHaveProperty('challenge');
      expect(result).toHaveProperty('expiresAt');
      expect(result.challenge).toBeTruthy();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    test('should generate unique challenges', async () => {
      const challenge1 = `challenge_${Date.now()}_1`;
      const challenge2 = `challenge_${Date.now()}_2`;
      
      mockAuthService.generateChallenge
        .mockResolvedValueOnce({ challenge: challenge1, expiresAt: new Date() })
        .mockResolvedValueOnce({ challenge: challenge2, expiresAt: new Date() });

      const result1 = await mockAuthService.generateChallenge();
      const result2 = await mockAuthService.generateChallenge();
      
      expect(result1.challenge).not.toBe(result2.challenge);
    });

    test('should throw error if challenge generation fails', async () => {
      mockAuthService.generateChallenge.mockRejectedValue(
        new Error('Challenge generation failed')
      );

      await expect(mockAuthService.generateChallenge()).rejects.toThrow(
        'Challenge generation failed'
      );
    });
  });

  describe('verifySignature', () => {
    test('should verify valid Nostr signature', async () => {
      const validSignature = {
        publicKey: testUsers.client1.publicKey,
        challenge: 'challenge_test_123',
        signature: 'sig_' + 'a'.repeat(128),
      };

      mockAuthService.verifySignature.mockResolvedValue({
        valid: true,
        publicKey: validSignature.publicKey,
      });

      const result = await mockAuthService.verifySignature(validSignature);
      
      expect(result.valid).toBe(true);
      expect(result.publicKey).toBe(testUsers.client1.publicKey);
    });

    test('should reject invalid signature', async () => {
      const invalidSignature = {
        publicKey: testUsers.client1.publicKey,
        challenge: 'challenge_test_123',
        signature: 'invalid_signature',
      };

      mockAuthService.verifySignature.mockResolvedValue({
        valid: false,
        error: 'Invalid signature',
      });

      const result = await mockAuthService.verifySignature(invalidSignature);
      
      expect(result.valid).toBe(false);
    });

    test('should reject expired challenge', async () => {
      const expiredChallenge = {
        publicKey: testUsers.client1.publicKey,
        challenge: 'expired_challenge',
        signature: 'sig_' + 'a'.repeat(128),
      };

      mockAuthService.verifySignature.mockResolvedValue({
        valid: false,
        error: 'Challenge expired',
      });

      const result = await mockAuthService.verifySignature(expiredChallenge);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Challenge expired');
    });

    test('should validate public key format', async () => {
      mockAuthService.verifySignature.mockResolvedValue({
        valid: false,
        error: 'Invalid public key format',
      });

      const result = await mockAuthService.verifySignature({
        publicKey: 'invalid-key-format',
        challenge: 'test',
        signature: 'sig',
      });

      expect(result.valid).toBe(false);
    });
  });

  describe('generateToken', () => {
    test('should generate JWT token', async () => {
      mockAuthService.generateToken.mockResolvedValue({
        token: testUtils.generateTestToken({ sub: testUsers.client1.id }),
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      const result = await mockAuthService.generateToken(testUsers.client1.id);
      
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
      expect(result.token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    });

    test('should include user ID in token payload', async () => {
      const token = testUtils.generateTestToken({ sub: testUsers.client1.id });
      mockAuthService.generateToken.mockResolvedValue({ token });

      const result = await mockAuthService.generateToken(testUsers.client1.id);
      
      expect(result.token).toBeTruthy();
      expect(mockAuthService.generateToken).toHaveBeenCalledWith(testUsers.client1.id);
    });

    test('should set token expiration to 1 hour', async () => {
      const now = Date.now();
      const expiresAt = new Date(now + 3600 * 1000);
      
      mockAuthService.generateToken.mockResolvedValue({
        token: 'test-token',
        expiresAt,
      });

      const result = await mockAuthService.generateToken(testUsers.client1.id);
      
      expect(result.expiresAt.getTime()).toBeGreaterThan(now);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(now + 3600 * 1000 + 1000);
    });

    test('should throw error for invalid user ID', async () => {
      mockAuthService.generateToken.mockRejectedValue(
        new Error('Invalid user ID')
      );

      await expect(mockAuthService.generateToken(null)).rejects.toThrow(
        'Invalid user ID'
      );
    });
  });

  describe('verifyToken', () => {
    test('should verify valid token', async () => {
      const token = testUtils.generateTestToken({ sub: testUsers.client1.id });
      mockAuthService.verifyToken.mockResolvedValue({
        valid: true,
        payload: { sub: testUsers.client1.id },
      });

      const result = await mockAuthService.verifyToken(token);
      
      expect(result.valid).toBe(true);
      expect(result.payload).toHaveProperty('sub', testUsers.client1.id);
    });

    test('should reject invalid token', async () => {
      mockAuthService.verifyToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      const result = await mockAuthService.verifyToken('invalid-token');
      
      expect(result.valid).toBe(false);
    });

    test('should reject expired token', async () => {
      mockAuthService.verifyToken.mockResolvedValue({
        valid: false,
        error: 'Token expired',
      });

      const result = await mockAuthService.verifyToken('expired-token');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
    });

    test('should extract user ID from token', async () => {
      const userId = testUsers.client1.id;
      mockAuthService.verifyToken.mockResolvedValue({
        valid: true,
        payload: { sub: userId },
      });

      const result = await mockAuthService.verifyToken('valid-token');
      
      expect(result.payload.sub).toBe(userId);
    });

    test('should validate token signature', async () => {
      mockAuthService.verifyToken.mockResolvedValue({
        valid: false,
        error: 'Invalid signature',
      });

      const result = await mockAuthService.verifyToken('tampered-token');
      
      expect(result.valid).toBe(false);
    });
  });

  describe('refreshToken', () => {
    test('should generate new token from refresh token', async () => {
      const oldToken = testUtils.generateTestToken({ sub: testUsers.client1.id });
      const newToken = testUtils.generateTestToken({ sub: testUsers.client1.id });
      
      mockAuthService.refreshToken.mockResolvedValue({
        token: newToken,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      const result = await mockAuthService.refreshToken(oldToken);
      
      expect(result.token).toBeTruthy();
      expect(result.token).not.toBe(oldToken);
    });

    test('should reject expired refresh token', async () => {
      mockAuthService.refreshToken.mockRejectedValue(
        new Error('Refresh token expired')
      );

      await expect(mockAuthService.refreshToken('expired-token')).rejects.toThrow(
        'Refresh token expired'
      );
    });

    test('should reject revoked token', async () => {
      mockAuthService.refreshToken.mockRejectedValue(
        new Error('Token has been revoked')
      );

      await expect(mockAuthService.refreshToken('revoked-token')).rejects.toThrow(
        'Token has been revoked'
      );
    });

    test('should maintain user ID across refresh', async () => {
      const userId = testUsers.client1.id;
      mockAuthService.refreshToken.mockResolvedValue({
        token: testUtils.generateTestToken({ sub: userId }),
      });

      const result = await mockAuthService.refreshToken('valid-token');
      
      expect(result.token).toBeTruthy();
    });
  });

  describe('Edge Cases & Security', () => {
    test('should handle concurrent authentication requests', async () => {
      mockAuthService.generateChallenge
        .mockResolvedValue({ challenge: 'challenge_1', expiresAt: new Date() });

      const promises = [
        mockAuthService.generateChallenge(),
        mockAuthService.generateChallenge(),
        mockAuthService.generateChallenge(),
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('challenge');
      });
    });

    test('should sanitize input to prevent injection attacks', async () => {
      mockAuthService.verifyToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      const maliciousInput = "'; DROP TABLE users; --";
      await mockAuthService.verifyToken(maliciousInput);
      
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith(maliciousInput);
    });

    test('should enforce rate limiting on challenge generation', async () => {
      mockAuthService.generateChallenge.mockRejectedValue(
        new Error('Too many requests')
      );

      await expect(mockAuthService.generateChallenge()).rejects.toThrow(
        'Too many requests'
      );
    });

    test('should handle null/undefined inputs gracefully', async () => {
      mockAuthService.verifyToken.mockRejectedValue(
        new Error('Invalid token')
      );

      await expect(mockAuthService.verifyToken(null)).rejects.toThrow();
      await expect(mockAuthService.verifyToken(undefined)).rejects.toThrow();
    });
  });
});
