/**
 * Rate Limiting Middleware
 * Protects against brute force and DDoS attacks
 */

import { db } from '../config/database.js';

/**
 * In-memory rate limit store (for development)
 * In production, use Redis or database
 */
const rateLimitStore = new Map();

/**
 * Rate limit by IP address (for login attempts)
 * Max 5 login attempts per 15 minutes
 */
export const loginRateLimit = async (req, res, next) => {
  try {
    const ip = getClientIP(req);
    const key = `login:${ip}`;
    const limit = 5;
    const windowMs = 15 * 60 * 1000; // 15 minutes

    const now = Date.now();
    const attempts = rateLimitStore.get(key) || [];

    // Filter out old attempts
    const recentAttempts = attempts.filter(time => now - time < windowMs);

    if (recentAttempts.length >= limit) {
      return res.status(429).json({
        error: 'TooManyRequests',
        message: 'Too many login attempts. Please try again later.',
        retryAfter: Math.ceil((recentAttempts[0] + windowMs - now) / 1000)
      });
    }

    // Record this attempt
    recentAttempts.push(now);
    rateLimitStore.set(key, recentAttempts);

    next();
  } catch (error) {
    console.error('[RATE_LIMIT] Login rate limit error:', error);
    // On error, allow request to proceed
    next();
  }
};

/**
 * Rate limit by pubkey (for authenticated API requests)
 * Max 10 requests per minute per pubkey
 */
export const pubkeyRateLimit = async (req, res, next) => {
  try {
    // Skip if not authenticated
    if (!req.user || !req.user.pubkey) {
      return next();
    }

    const pubkey = req.user.pubkey;
    const key = `pubkey:${pubkey}`;
    const limit = 60; // 60 requests
    const windowMs = 60 * 1000; // per minute

    const now = Date.now();
    const requests = rateLimitStore.get(key) || [];

    // Filter out old requests
    const recentRequests = requests.filter(time => now - time < windowMs);

    if (recentRequests.length >= limit) {
      return res.status(429).json({
        error: 'TooManyRequests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }

    // Record this request
    recentRequests.push(now);
    rateLimitStore.set(key, recentRequests);

    next();
  } catch (error) {
    console.error('[RATE_LIMIT] Pubkey rate limit error:', error);
    next();
  }
};

/**
 * General API rate limit
 * Max 100 requests per minute per IP
 */
export const apiRateLimit = async (req, res, next) => {
  try {
    const ip = getClientIP(req);
    const key = `api:${ip}`;
    const limit = 100;
    const windowMs = 60 * 1000; // 1 minute

    const now = Date.now();
    const requests = rateLimitStore.get(key) || [];

    // Filter out old requests
    const recentRequests = requests.filter(time => now - time < windowMs);

    if (recentRequests.length >= limit) {
      return res.status(429).json({
        error: 'TooManyRequests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }

    // Record this request
    recentRequests.push(now);
    rateLimitStore.set(key, recentRequests);

    next();
  } catch (error) {
    console.error('[RATE_LIMIT] API rate limit error:', error);
    next();
  }
};

/**
 * Cleanup expired rate limit entries
 * Call this periodically (e.g., every 5 minutes)
 */
export const cleanupRateLimits = () => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  for (const [key, timestamps] of rateLimitStore.entries()) {
    const recentTimestamps = timestamps.filter(time => now - time < maxAge);
    
    if (recentTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, recentTimestamps);
    }
  }

  console.log('[RATE_LIMIT] Cleanup completed. Entries:', rateLimitStore.size);
};

/**
 * Get client IP address from request
 * Handles proxies (X-Forwarded-For, etc.)
 */
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const cf = req.headers['cf-connecting-ip'];
  if (cf) {
    return cf;
  }

  return req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
}

// Cleanup rate limits every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);

export default {
  loginRateLimit,
  pubkeyRateLimit,
  apiRateLimit,
  cleanupRateLimits,
};
