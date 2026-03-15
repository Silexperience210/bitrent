/**
 * Authentication Middleware for Vercel API Routes
 * Handles JWT verification
 */

import * as jwtLib from './jwt.js';

/**
 * Verify JWT token from request
 */
export function verifyAuth(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return {
      authenticated: false,
      error: 'Missing Authorization header',
    };
  }

  const token = jwtLib.extractToken(authHeader);

  if (!token) {
    return {
      authenticated: false,
      error: 'Invalid Authorization header format',
    };
  }

  const result = jwtLib.verifyToken(token);

  if (!result.valid) {
    return {
      authenticated: false,
      error: result.error || 'Invalid token',
    };
  }

  return {
    authenticated: true,
    user: result.user,
  };
}

/**
 * Verify admin role
 */
export function verifyAdminRole(authResult) {
  if (!authResult.authenticated) {
    return false;
  }

  return authResult.user.is_admin === true;
}

/**
 * Optional JWT verification (doesn't fail if missing)
 */
export function optionalAuth(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return {
      authenticated: false,
      user: null,
    };
  }

  const token = jwtLib.extractToken(authHeader);

  if (!token) {
    return {
      authenticated: false,
      user: null,
    };
  }

  const result = jwtLib.verifyToken(token);

  if (!result.valid) {
    return {
      authenticated: false,
      user: null,
    };
  }

  return {
    authenticated: true,
    user: result.user,
  };
}

export default {
  verifyAuth,
  verifyAdminRole,
  optionalAuth,
};
