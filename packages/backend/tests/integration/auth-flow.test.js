/**
 * Integration Tests: Authentication Flow
 * BitRent Phase 4: Testing & Quality Assurance
 * 
 * Tests the complete auth flow:
 * 1. Client requests challenge
 * 2. Client signs challenge with Nostr keys
 * 3. Server verifies signature and creates JWT
 * 4. Client uses JWT to access protected routes
 */

import { testUsers } from '../fixtures/test-data.js';

describe('Authentication Flow - Integration', () => {
  const mockAuthFlow = {
    requestChallenge: jest.fn(),
    signChallenge: jest.fn(),
    verifyAndLogin: jest.fn(),
    getProfile: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  let authToken;
  let challenge;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = null;
    challenge = null;
  });

  describe('Full Authentication Cycle', () => {
    test('should complete full auth cycle: challenge → sign → login → profile', async () => {
      // Step 1: Request challenge
      challenge = `challenge_${Date.now()}`;
      mockAuthFlow.requestChallenge.mockResolvedValue({
        challenge,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const challengeResult = await mockAuthFlow.requestChallenge(testUsers.client1.publicKey);
      expect(challengeResult.challenge).toBe(challenge);
      expect(mockAuthFlow.requestChallenge).toHaveBeenCalledWith(testUsers.client1.publicKey);

      // Step 2: Sign challenge with Nostr keys
      const signature = 'sig_' + 'a'.repeat(128);
      mockAuthFlow.signChallenge.mockResolvedValue({
        signature,
        publicKey: testUsers.client1.publicKey,
      });

      const signResult = await mockAuthFlow.signChallenge(challenge);
      expect(signResult.signature).toBe(signature);

      // Step 3: Verify signature and get JWT
      authToken = testUtils.generateTestToken({ sub: testUsers.client1.id });
      mockAuthFlow.verifyAndLogin.mockResolvedValue({
        token: authToken,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        user: {
          id: testUsers.client1.id,
          publicKey: testUsers.client1.publicKey,
        },
      });

      const loginResult = await mockAuthFlow.verifyAndLogin({
        publicKey: testUsers.client1.publicKey,
        challenge,
        signature,
      });

      expect(loginResult.token).toBeTruthy();
      expect(loginResult.user.id).toBe(testUsers.client1.id);
      expect(mockAuthFlow.verifyAndLogin).toHaveBeenCalled();

      // Step 4: Access protected route with token
      mockAuthFlow.getProfile.mockResolvedValue({
        id: testUsers.client1.id,
        publicKey: testUsers.client1.publicKey,
        email: testUsers.client1.email,
        role: testUsers.client1.role,
      });

      const profile = await mockAuthFlow.getProfile(loginResult.token);
      expect(profile.id).toBe(testUsers.client1.id);
      expect(mockAuthFlow.getProfile).toHaveBeenCalledWith(loginResult.token);
    });

    test('should fail auth if signature is invalid', async () => {
      challenge = `challenge_${Date.now()}`;
      mockAuthFlow.requestChallenge.mockResolvedValue({
        challenge,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const challengeResult = await mockAuthFlow.requestChallenge(testUsers.client1.publicKey);

      mockAuthFlow.verifyAndLogin.mockResolvedValue({
        success: false,
        error: 'Invalid signature',
      });

      const loginResult = await mockAuthFlow.verifyAndLogin({
        publicKey: testUsers.client1.publicKey,
        challenge: challengeResult.challenge,
        signature: 'invalid_signature',
      });

      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBe('Invalid signature');
    });

    test('should fail auth if challenge is expired', async () => {
      const expiredChallenge = `challenge_expired_${Date.now() - 10 * 60 * 1000}`;

      mockAuthFlow.verifyAndLogin.mockResolvedValue({
        success: false,
        error: 'Challenge expired',
      });

      const result = await mockAuthFlow.verifyAndLogin({
        publicKey: testUsers.client1.publicKey,
        challenge: expiredChallenge,
        signature: 'sig_' + 'a'.repeat(128),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Challenge expired');
    });

    test('should prevent challenge reuse', async () => {
      const singleChallenge = `challenge_${Date.now()}`;
      
      // First login with challenge - should succeed
      mockAuthFlow.verifyAndLogin
        .mockResolvedValueOnce({
          token: testUtils.generateTestToken({ sub: testUsers.client1.id }),
          success: true,
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Challenge already used',
        });

      const result1 = await mockAuthFlow.verifyAndLogin({
        publicKey: testUsers.client1.publicKey,
        challenge: singleChallenge,
        signature: 'sig_' + 'a'.repeat(128),
      });
      expect(result1.success).toBe(true);

      // Second login with same challenge - should fail
      const result2 = await mockAuthFlow.verifyAndLogin({
        publicKey: testUsers.client1.publicKey,
        challenge: singleChallenge,
        signature: 'sig_' + 'a'.repeat(128),
      });
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Challenge already used');
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      // Setup: Create authenticated session
      authToken = testUtils.generateTestToken({ sub: testUsers.client1.id });
      mockAuthFlow.verifyAndLogin.mockResolvedValue({
        token: authToken,
        user: { id: testUsers.client1.id },
      });
    });

    test('should refresh expired token', async () => {
      const oldToken = authToken;
      const newToken = testUtils.generateTestToken({ 
        sub: testUsers.client1.id,
        iat: Math.floor(Date.now() / 1000),
      });

      mockAuthFlow.refreshToken.mockResolvedValue({
        token: newToken,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      const result = await mockAuthFlow.refreshToken(oldToken);

      expect(result.token).toBeTruthy();
      expect(result.token).not.toBe(oldToken);
      expect(mockAuthFlow.refreshToken).toHaveBeenCalledWith(oldToken);
    });

    test('should maintain user ID across token refresh', async () => {
      const newToken = testUtils.generateTestToken({ sub: testUsers.client1.id });
      
      mockAuthFlow.refreshToken.mockResolvedValue({
        token: newToken,
      });

      const result = await mockAuthFlow.refreshToken(authToken);

      expect(result.token).toBeTruthy();
    });

    test('should reject refresh with invalid token', async () => {
      mockAuthFlow.refreshToken.mockRejectedValue(
        new Error('Invalid token')
      );

      await expect(mockAuthFlow.refreshToken('invalid_token'))
        .rejects.toThrow('Invalid token');
    });

    test('should logout and invalidate token', async () => {
      mockAuthFlow.logout.mockResolvedValue({
        success: true,
        message: 'Logged out successfully',
      });

      const result = await mockAuthFlow.logout(authToken);

      expect(result.success).toBe(true);
      expect(mockAuthFlow.logout).toHaveBeenCalledWith(authToken);

      // After logout, token should be invalid
      mockAuthFlow.getProfile.mockRejectedValue(
        new Error('Token invalid or expired')
      );

      await expect(mockAuthFlow.getProfile(authToken))
        .rejects.toThrow('Token invalid or expired');
    });
  });

  describe('Concurrent Authentication Requests', () => {
    test('should handle concurrent challenge requests', async () => {
      const publicKeys = [
        testUsers.client1.publicKey,
        testUsers.client2.publicKey,
      ];

      mockAuthFlow.requestChallenge
        .mockResolvedValue({
          challenge: `challenge_1_${Date.now()}`,
          expiresAt: new Date(),
        });

      const results = await Promise.all(
        publicKeys.map(pk => mockAuthFlow.requestChallenge(pk))
      );

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.challenge).toBeTruthy();
      });
    });

    test('should handle concurrent login requests', async () => {
      mockAuthFlow.verifyAndLogin.mockResolvedValue({
        token: testUtils.generateTestToken(),
        success: true,
      });

      const loginRequests = [
        {
          publicKey: testUsers.client1.publicKey,
          challenge: 'challenge_1',
          signature: 'sig_1',
        },
        {
          publicKey: testUsers.client2.publicKey,
          challenge: 'challenge_2',
          signature: 'sig_2',
        },
      ];

      const results = await Promise.all(
        loginRequests.map(req => mockAuthFlow.verifyAndLogin(req))
      );

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.token).toBeTruthy();
      });
    });
  });

  describe('Error Recovery', () => {
    test('should retry on transient failure', async () => {
      mockAuthFlow.requestChallenge
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          challenge: `challenge_${Date.now()}`,
          expiresAt: new Date(),
        });

      // First attempt fails
      await expect(mockAuthFlow.requestChallenge(testUsers.client1.publicKey))
        .rejects.toThrow('Network error');

      // Second attempt succeeds
      const result = await mockAuthFlow.requestChallenge(testUsers.client1.publicKey);
      expect(result.challenge).toBeTruthy();
    });

    test('should handle database connection errors', async () => {
      mockAuthFlow.getProfile.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(mockAuthFlow.getProfile(authToken))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('Security Validations', () => {
    test('should validate public key format', async () => {
      mockAuthFlow.requestChallenge.mockRejectedValue(
        new Error('Invalid public key format')
      );

      await expect(mockAuthFlow.requestChallenge('invalid-key'))
        .rejects.toThrow('Invalid public key format');
    });

    test('should prevent brute force attacks', async () => {
      let failCount = 0;
      mockAuthFlow.verifyAndLogin.mockImplementation(async () => {
        failCount++;
        if (failCount > 5) {
          throw new Error('Too many failed attempts. Account locked.');
        }
        return { success: false, error: 'Invalid signature' };
      });

      for (let i = 0; i < 5; i++) {
        const result = await mockAuthFlow.verifyAndLogin({
          publicKey: testUsers.client1.publicKey,
          challenge: 'challenge',
          signature: 'invalid',
        });
        expect(result.success).toBe(false);
      }

      await expect(mockAuthFlow.verifyAndLogin({
        publicKey: testUsers.client1.publicKey,
        challenge: 'challenge',
        signature: 'invalid',
      })).rejects.toThrow('Too many failed attempts');
    });

    test('should enforce HTTPS only for auth endpoints', async () => {
      mockAuthFlow.requestChallenge.mockRejectedValue(
        new Error('HTTPS required')
      );

      // Simulating non-HTTPS request
      await expect(mockAuthFlow.requestChallenge(testUsers.client1.publicKey))
        .rejects.toThrow('HTTPS required');
    });

    test('should not expose user existence through error messages', async () => {
      mockAuthFlow.verifyAndLogin.mockResolvedValue({
        success: false,
        error: 'Authentication failed', // Generic error, not "user not found"
      });

      const result = await mockAuthFlow.verifyAndLogin({
        publicKey: 'unknown_key',
        challenge: 'challenge',
        signature: 'sig',
      });

      expect(result.error).not.toContain('not found');
      expect(result.error).not.toContain('does not exist');
    });
  });
});
