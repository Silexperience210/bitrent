/**
 * POST /api/auth/challenge
 * Generate a challenge for Nostr signature verification
 */

import { v4 as uuidv4 } from 'uuid';
import { handleCors } from '@/lib/cors.js';
import { supabase, insertChallenge } from '@/lib/supabase.js';
import * as nostrAuth from '@/lib/nostr-auth.js';
import { validateChallengeRequest } from '@/lib/validation.js';
import * as response from '@/lib/response.js';

export default async function handler(req, res) {
  // Handle CORS
  if (await handleCors(req, res)) {
    return;
  }

  // Method check
  if (req.method !== 'POST') {
    return response.sendError(res, 405, 'MethodNotAllowed', 'Method not allowed');
  }

  try {
    // Validate input
    const validation = validateChallengeRequest(req.body);
    if (!validation.valid) {
      return response.sendValidationError(res, validation.errors);
    }

    const { pubkey } = req.body;

    // Generate challenge
    const challenge = nostrAuth.generateChallenge();
    const challengeId = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store challenge in database
    const { error } = await insertChallenge({
      id: challengeId,
      challenge,
      pubkey,
      expires_at: expiresAt,
      created_at: new Date(),
    });

    if (error) {
      console.error('[AUTH] Challenge insert error:', error);
      return response.sendInternalError(res, 'Failed to create challenge');
    }

    console.log('[AUTH] Challenge created for pubkey:', pubkey);

    return response.sendSuccess(res, {
      challenge,
      challenge_id: challengeId,
      expires_at: expiresAt.toISOString(),
      expires_in: 300, // seconds
    }, 200);
  } catch (error) {
    console.error('[AUTH] Challenge endpoint error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}
