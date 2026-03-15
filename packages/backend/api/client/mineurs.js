/**
 * GET /api/client/mineurs
 * List available miners
 */

import { handleCors } from '@/lib/cors.js';
import { getMineurs } from '@/lib/supabase.js';
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
    // Optional authentication (users can browse without auth)
    const authResult = authMiddleware.optionalAuth(req);

    // Get active mineurs
    const { data: mineurs, error } = await getMineurs({ status: 'active' });

    if (error) {
      console.error('[CLIENT] Mineurs fetch error:', error);
      return response.sendInternalError(res, 'Failed to fetch mineurs');
    }

    return response.sendSuccess(res, mineurs || [], 200);
  } catch (error) {
    console.error('[CLIENT] Mineurs endpoint error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}
