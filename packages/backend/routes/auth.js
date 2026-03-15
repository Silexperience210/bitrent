/**
 * Authentication Routes
 * Nostr NIP-98 signature-based authentication
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database.js';
import config from '../config/env.js';
import { validate, schemas } from '../middleware/validation.js';
import { loginRateLimit } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import * as nostrAuth from '../services/nostr-auth.js';
import * as jwtUtils from '../utils/jwt.js';

const router = express.Router();

/**
 * POST /auth/nostr-challenge
 * Generate a challenge for Nostr signature verification
 * 
 * Request: { pubkey }
 * Response: { challenge, challenge_id, expires_at }
 */
router.post(
  '/nostr-challenge',
  loginRateLimit,
  validate(schemas.nostrChallenge),
  async (req, res, next) => {
    try {
      const { pubkey } = req.body;

      // Validate pubkey format
      if (!nostrAuth.isValidPubkey(pubkey)) {
        return res.status(400).json({
          error: 'InvalidPubkey',
          message: 'Invalid public key format. Must be 64 hex characters.',
        });
      }

      // Generate random challenge
      const challenge = nostrAuth.generateChallenge();
      const challengeId = uuidv4();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store challenge in database
      const { error } = await db.challenges().insert({
        id: challengeId,
        challenge,
        pubkey,
        expires_at: expiresAt,
        created_at: new Date(),
      });

      if (error) {
        console.error('[AUTH] Challenge insert error:', error);
        return res.status(500).json({
          error: 'InternalError',
          message: 'Failed to create challenge',
        });
      }

      console.log('[AUTH] Challenge created for pubkey:', pubkey);

      res.status(200).json({
        challenge,
        challenge_id: challengeId,
        expires_at: expiresAt.toISOString(),
        expires_in: 300, // seconds
      });
    } catch (error) {
      console.error('[AUTH] Challenge endpoint error:', error);
      next(error);
    }
  }
);

/**
 * POST /auth/nostr-verify
 * Verify Nostr signature and return JWT token
 * 
 * Request: { challenge, signature, pubkey, timestamp }
 * Response: { token, pubkey, is_admin, expires_in }
 */
router.post(
  '/nostr-verify',
  loginRateLimit,
  validate(schemas.nostrVerify),
  async (req, res, next) => {
    try {
      const { challenge, signature, pubkey, timestamp } = req.body;

      // Validate pubkey format
      if (!nostrAuth.isValidPubkey(pubkey)) {
        return res.status(400).json({
          error: 'InvalidPubkey',
          message: 'Invalid public key format',
        });
      }

      // Validate signature format
      if (!nostrAuth.isValidSignature(signature)) {
        return res.status(400).json({
          error: 'InvalidSignature',
          message: 'Invalid signature format',
        });
      }

      // Verify signature
      if (!nostrAuth.verifySignature(pubkey, challenge, signature, timestamp)) {
        return res.status(401).json({
          error: 'InvalidSignature',
          message: 'Signature verification failed',
        });
      }

      // Check if challenge exists and is not expired
      const { data: challengeData, error: challengeError } = await db.challenges()
        .select('*')
        .eq('challenge', challenge)
        .eq('pubkey', pubkey)
        .order('created_at', { ascending: false })
        .limit(1);

      if (challengeError || !challengeData || challengeData.length === 0) {
        console.warn('[AUTH] Challenge not found for pubkey:', pubkey);
        return res.status(401).json({
          error: 'ChallengeNotFound',
          message: 'Challenge not found or invalid',
        });
      }

      const challengeRecord = challengeData[0];

      // Check if challenge is expired
      if (new Date(challengeRecord.expires_at) < new Date()) {
        console.warn('[AUTH] Challenge expired for pubkey:', pubkey);
        return res.status(401).json({
          error: 'ChallengeExpired',
          message: 'Challenge has expired. Please request a new one.',
        });
      }

      // Check if user exists, create if not
      let user = null;
      const { data: existingUser, error: userError } = await db.users()
        .select('*')
        .eq('pubkey', pubkey)
        .single();

      if (userError && userError.code === 'PGRST116') {
        // User doesn't exist, create new user
        const isAdmin = pubkey === config.admin.nostrPubkey;
        const userId = uuidv4();

        const { error: insertError } = await db.users().insert({
          id: userId,
          pubkey,
          is_admin: isAdmin,
          created_at: new Date(),
          updated_at: new Date(),
        });

        if (insertError) {
          console.error('[AUTH] User insert error:', insertError);
          return res.status(500).json({
            error: 'InternalError',
            message: 'Failed to create user account',
          });
        }

        user = { pubkey, is_admin: isAdmin };
        console.log('[AUTH] New user created:', pubkey, 'is_admin:', isAdmin);
      } else if (userError) {
        console.error('[AUTH] User query error:', userError);
        return res.status(500).json({
          error: 'InternalError',
          message: 'Database error',
        });
      } else {
        user = existingUser;
      }

      // Generate JWT token
      const { token, expiresIn, expiresAt } = jwtUtils.createAccessToken(
        pubkey,
        user.is_admin
      );

      // Clear challenge after successful use
      await db.challenges().delete().eq('id', challengeRecord.id);

      console.log('[AUTH] Login successful for pubkey:', pubkey);

      res.status(200).json({
        token,
        pubkey,
        is_admin: user.is_admin,
        expires_in: expiresIn,
        expires_at: expiresAt,
      });
    } catch (error) {
      console.error('[AUTH] Verify endpoint error:', error);
      next(error);
    }
  }
);

/**
 * POST /auth/logout
 * Clear session (mainly for frontend state management)
 * 
 * Request: (with JWT header)
 * Response: { success: true }
 */
router.post('/logout', requireAuth, (req, res) => {
  try {
    const pubkey = req.user.pubkey;
    console.log('[AUTH] Logout for pubkey:', pubkey);

    // Token is automatically invalidated on client-side by removing it from localStorage
    // Server-side: in production, could add token to blacklist
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('[AUTH] Logout error:', error);
    res.status(500).json({
      error: 'InternalError',
      message: 'Logout failed',
    });
  }
});

/**
 * GET /auth/profile
 * Get current user profile
 * 
 * Request: (with JWT header)
 * Response: { pubkey, is_admin, created_at }
 */
router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const pubkey = req.user.pubkey;

    const { data: user, error } = await db.users()
      .select('pubkey, is_admin, created_at')
      .eq('pubkey', pubkey)
      .single();

    if (error || !user) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'User profile not found',
      });
    }

    res.status(200).json({
      pubkey: user.pubkey,
      is_admin: user.is_admin,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error('[AUTH] Profile endpoint error:', error);
    next(error);
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using implicit refresh (optional)
 * 
 * Request: (with JWT header)
 * Response: { token, expires_in }
 */
router.post('/refresh', requireAuth, (req, res) => {
  try {
    const pubkey = req.user.pubkey;
    const isAdmin = req.user.is_admin;

    // Create new token
    const { token, expiresIn, expiresAt } = jwtUtils.createAccessToken(
      pubkey,
      isAdmin
    );

    console.log('[AUTH] Token refreshed for pubkey:', pubkey);

    res.status(200).json({
      token,
      expires_in: expiresIn,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error('[AUTH] Refresh endpoint error:', error);
    res.status(500).json({
      error: 'InternalError',
      message: 'Token refresh failed',
    });
  }
});

export default router;
