/**
 * GET /api/auth/profile
 * Get current user profile
 */

import { handleCors } from '@/lib/cors.js';
import { getUser } from '@/lib/supabase.js';
import * as authMiddleware from '@/lib/auth-middleware.js';
import * as response from '@/lib/response.js';

export default async function handler(req, res) {
  // Handle CORS
  if (await handleCors(req, res)) {
    return;
  }

  // Method check
  if (req.method !== 'GET') {
    return response.sendError(res, 405, 'MethodNotAllowed', 'Method not allowed');
  }

  try {
    // Verify authentication
    const authResult = authMiddleware.verifyAuth(req);
    if (!authResult.authenticated) {
      return response.sendUnauthorized(res, authResult.error);
    }

    const pubkey = authResult.user.pubkey;

    // Get user profile
    const { data: user, error } = await getUser(pubkey);

    if (error || !user) {
      return response.sendNotFound(res, 'User profile not found');
    }

    return response.sendSuccess(res, {
      pubkey: user.pubkey,
      is_admin: user.is_admin,
      created_at: user.created_at,
    }, 200);
  } catch (error) {
    console.error('[AUTH] Profile endpoint error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}
