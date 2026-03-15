/**
 * JWT Token Utilities
 * High-level JWT token management
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/env.js';

/**
 * Create an access token
 * @param {string} pubkey - User's Nostr public key
 * @param {boolean} isAdmin - Whether user is admin
 * @returns {Object} Token and metadata
 */
export function createAccessToken(pubkey, isAdmin = false) {
  const token = jwt.sign(
    {
      pubkey,
      is_admin: isAdmin,
      type: 'access',
    },
    config.jwt.secret,
    {
      expiresIn: '24h',
      subject: pubkey,
      issuer: 'bitrent',
      jti: crypto.randomBytes(16).toString('hex'), // Unique ID for revocation
    }
  );

  return {
    token,
    expiresIn: 86400, // 24 hours in seconds
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create a refresh token
 * @param {string} pubkey - User's Nostr public key
 * @returns {Object} Refresh token and metadata
 */
export function createRefreshToken(pubkey) {
  const token = jwt.sign(
    {
      pubkey,
      type: 'refresh',
    },
    config.jwt.secret,
    {
      expiresIn: '30d',
      subject: pubkey,
      issuer: 'bitrent',
      jti: crypto.randomBytes(16).toString('hex'),
    }
  );

  return {
    token,
    expiresIn: 2592000, // 30 days in seconds
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Verify and decode a token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token or null if invalid
 */
export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    return decoded;
  } catch (error) {
    console.error('[JWT] Verification error:', error.message);
    return null;
  }
}

/**
 * Decode token without verification (unsafe - only for inspection)
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token or null if invalid
 */
export function decodeToken(token) {
  try {
    const decoded = jwt.decode(token, { complete: true });
    return decoded;
  } catch (error) {
    console.error('[JWT] Decode error:', error.message);
    return null;
  }
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired
 */
export function isTokenExpired(token) {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.payload.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return decoded.payload.exp < now;
  } catch (error) {
    return true;
  }
}

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {number|null} Unix timestamp or null
 */
export function getTokenExpiration(token) {
  try {
    const decoded = jwt.decode(token, { complete: true });
    return decoded?.payload.exp || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get time until token expires
 * @param {string} token - JWT token
 * @returns {number} Seconds until expiration, or -1 if expired
 */
export function getTimeUntilExpiration(token) {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.payload.exp) {
      return -1;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeLeft = decoded.payload.exp - now;
    return Math.max(timeLeft, -1);
  } catch (error) {
    return -1;
  }
}

export default {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  getTimeUntilExpiration,
};
