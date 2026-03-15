/**
 * JWT Token Management for Vercel API Routes
 * Handles creation and verification of JWT tokens
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

/**
 * Create JWT access token
 */
export function createAccessToken(pubkey, isAdmin = false) {
  const payload = {
    pubkey,
    is_admin: isAdmin,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    subject: pubkey,
    issuer: 'bitrent-api',
    algorithm: 'HS256',
  });

  const decoded = jwt.decode(token);

  return {
    token,
    expiresIn: decoded.exp - Math.floor(Date.now() / 1000),
    expiresAt: new Date(decoded.exp * 1000),
  };
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'bitrent-api',
      algorithms: ['HS256'],
    });

    return {
      valid: true,
      user: {
        pubkey: decoded.pubkey,
        is_admin: decoded.is_admin,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader) {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

export default {
  createAccessToken,
  verifyToken,
  extractToken,
};
