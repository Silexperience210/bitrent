/**
 * POST /api/auth/verify
 * Verify Nostr signature and return JWT token
 */

import { v4 as uuidv4 } from 'uuid';
import { handleCors } from '@/lib/cors.js';
import { supabase, getUser, createUser, deleteChallenge } from '@/lib/supabase.js';
import * as nostrAuth from '@/lib/nostr-auth.js';
import * as jwtLib from '@/lib/jwt.js';
import { validateVerifyRequest } from '@/lib/validation.js';
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
    const validation = validateVerifyRequest(req.body);
    if (!validation.valid) {
      return response.sendValidationError(res, validation.errors);
    }

    const { challenge, signature, pubkey, timestamp } = req.body;

    // Verify signature
    if (!nostrAuth.verifySignature(pubkey, challenge, signature, timestamp)) {
      return response.sendUnauthorized(res, 'Signature verification failed');
    }

    // Check if challenge exists and is not expired
    const { data: challengeData, error: challengeError } = await supabase
      .from('challenges')
      .select('*')
      .eq('challenge', challenge)
      .eq('pubkey', pubkey)
      .order('created_at', { ascending: false })
      .limit(1);

    if (challengeError || !challengeData || challengeData.length === 0) {
      console.warn('[AUTH] Challenge not found for pubkey:', pubkey);
      return response.sendUnauthorized(res, 'Challenge not found or invalid');
    }

    const challengeRecord = challengeData[0];

    // Check if challenge is expired
    if (new Date(challengeRecord.expires_at) < new Date()) {
      console.warn('[AUTH] Challenge expired for pubkey:', pubkey);
      return response.sendUnauthorized(res, 'Challenge has expired. Please request a new one.');
    }

    // Check if user exists, create if not
    let user = null;
    const { data: existingUser, error: userError } = await getUser(pubkey);

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create new user
      const adminPubkey = process.env.ADMIN_NOSTR_PUBKEY;
      const isAdmin = pubkey === adminPubkey;
      const userId = uuidv4();

      const { error: insertError } = await createUser({
        id: userId,
        pubkey,
        is_admin: isAdmin,
        created_at: new Date(),
        updated_at: new Date(),
      });

      if (insertError) {
        console.error('[AUTH] User insert error:', insertError);
        return response.sendInternalError(res, 'Failed to create user account');
      }

      user = { pubkey, is_admin: isAdmin };
      console.log('[AUTH] New user created:', pubkey, 'is_admin:', isAdmin);
    } else if (userError) {
      console.error('[AUTH] User query error:', userError);
      return response.sendInternalError(res, 'Database error');
    } else {
      user = existingUser;
    }

    // Generate JWT token
    const { token, expiresIn, expiresAt } = jwtLib.createAccessToken(
      pubkey,
      user.is_admin
    );

    // Clear challenge after successful use
    await deleteChallenge(challengeRecord.id);

    console.log('[AUTH] Login successful for pubkey:', pubkey);

    return response.sendSuccess(res, {
      token,
      pubkey,
      is_admin: user.is_admin,
      expires_in: expiresIn,
      expires_at: expiresAt,
    }, 200);
  } catch (error) {
    console.error('[AUTH] Verify endpoint error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}
