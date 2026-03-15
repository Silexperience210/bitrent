/**
 * POST /api/auth/refresh
 * Refresh access token
 */

import { handleCors } from '@/lib/cors.js';
import * as jwtLib from '@/lib/jwt.js';
import * as authMiddleware from '@/lib/auth-middleware.js';
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
    // Verify authentication
    const authResult = authMiddleware.verifyAuth(req);
    if (!authResult.authenticated) {
      return response.sendUnauthorized(res, authResult.error);
    }

    const pubkey = authResult.user.pubkey;
    const isAdmin = authResult.user.is_admin;

    // Create new token
    const { token, expiresIn, expiresAt } = jwtLib.createAccessToken(pubkey, isAdmin);

    console.log('[AUTH] Token refreshed for pubkey:', pubkey);

    return response.sendSuccess(res, {
      token,
      expires_in: expiresIn,
      expires_at: expiresAt,
    }, 200);
  } catch (error) {
    console.error('[AUTH] Refresh endpoint error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}
