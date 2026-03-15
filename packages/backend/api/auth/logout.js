/**
 * POST /api/auth/logout
 * Logout user (mainly for frontend state management)
 */

import { handleCors } from '@/lib/cors.js';
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
    console.log('[AUTH] Logout for pubkey:', pubkey);

    // Token is automatically invalidated on client-side by removing it from localStorage
    // Server-side: in production, could add token to blacklist

    return response.sendSuccess(res, {
      success: true,
      message: 'Logged out successfully',
    }, 200);
  } catch (error) {
    console.error('[AUTH] Logout error:', error);
    return response.sendInternalError(res, 'Logout failed');
  }
}
