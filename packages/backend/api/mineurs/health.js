/**
 * GET /api/mineurs/health?id=MINER_ID
 * Check health of a specific miner
 */

import { handleCors } from '@/lib/cors.js';
import { supabase } from '@/lib/supabase.js';
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
    // Optional authentication
    const authResult = authMiddleware.optionalAuth(req);

    // Get miner ID from query
    const minerId = req.query.id;

    if (!minerId) {
      return response.sendValidationError(res, ['id query parameter is required']);
    }

    // Get miner from database
    const { data: miner, error: minerError } = await supabase
      .from('mineurs')
      .select('*')
      .eq('id', minerId)
      .single();

    if (minerError) {
      return response.sendNotFound(res, 'Miner not found');
    }

    // Check health via HTTP to actual device
    try {
      const healthUrl = `http://${miner.ip_address}:80/api/system/status`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const healthRes = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });

      clearTimeout(timeout);

      if (healthRes.ok) {
        const healthData = await healthRes.json();

        // Update status in database
        await supabase
          .from('mineurs')
          .update({ status: 'online', last_seen: new Date() })
          .eq('id', minerId);

        return response.sendSuccess(res, {
          id: miner.id,
          name: miner.name,
          ip_address: miner.ip_address,
          status: 'online',
          hashrate: miner.hashrate,
          health: healthData,
          last_seen: new Date(),
        }, 200);
      } else {
        // Mark offline
        await supabase
          .from('mineurs')
          .update({ status: 'offline', last_seen: new Date() })
          .eq('id', minerId);

        return response.sendSuccess(res, {
          id: miner.id,
          name: miner.name,
          ip_address: miner.ip_address,
          status: 'offline',
          error: `HTTP ${healthRes.status}`,
          last_seen: new Date(),
        }, 200);
      }
    } catch (error) {
      // Mark offline
      await supabase
        .from('mineurs')
        .update({ status: 'offline', last_seen: new Date() })
        .eq('id', minerId);

      return response.sendSuccess(res, {
        id: miner.id,
        name: miner.name,
        ip_address: miner.ip_address,
        status: 'offline',
        error: error.message,
        last_seen: new Date(),
      }, 200);
    }
  } catch (error) {
    console.error('[HEALTH] Error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}
