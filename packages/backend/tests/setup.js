/**
 * Test Setup & Global Configuration
 * BitRent Phase 4: Testing & Quality Assurance
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-12345678901234567890';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

// Global test utilities
global.testUtils = {
  /**
   * Generate a test JWT token
   */
  generateTestToken: (payload = {}) => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify({
      sub: 'test-user-id',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...payload,
    }));
    const signature = btoa('test-signature');
    return `${header}.${body}.${signature}`;
  },

  /**
   * Generate a test Nostr public key
   */
  generateTestPublicKey: () => {
    return 'npub1' + 'a'.repeat(58); // Mock Nostr public key
  },

  /**
   * Generate a test Nostr private key
   */
  generateTestPrivateKey: () => {
    return 'nsec1' + 'b'.repeat(58); // Mock Nostr private key
  },

  /**
   * Generate a test rental ID
   */
  generateTestRentalId: () => {
    return 'rental_' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Generate a test payment ID
   */
  generateTestPaymentId: () => {
    return 'payment_' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Delay execution (useful for async tests)
   */
  delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Create mock request context
   */
  createMockReq: (overrides = {}) => ({
    method: 'GET',
    url: '/',
    headers: {},
    params: {},
    query: {},
    body: {},
    user: { id: 'test-user-id', publicKey: 'npub1test' },
    ...overrides,
  }),

  /**
   * Create mock response context
   */
  createMockRes: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      statusCode: 200,
    };
    return res;
  },

  /**
   * Create mock next function
   */
  createMockNext: () => jest.fn(),
};

// Suppress console output during tests
const originalError = console.error;
const originalLog = console.log;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.log = originalLog;
  console.warn = originalWarn;
});

// Global afterEach hook to clear all mocks
afterEach(() => {
  jest.clearAllMocks();
});

// Set test timeout
jest.setTimeout(10000);
