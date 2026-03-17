/**
 * POST /api/mineurs/discovery
 * Discover miners on network (runs health check across all miners)
 */

import { handleCors } from '@/lib/cors.js';
import { supabase, getMineurs } from '@/lib/supabase.js';
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
    // Optional authentication
    const authResult = authMiddleware.optionalAuth(req);

    // Get all miners
    const { data: mineurs, error: minerError } = await supabase
      .from('mineurs')
      .select('*');

    if (minerError) {
      console.error('[DISCOVERY] Miners fetch error:', minerError);
      return response.sendInternalError(res, 'Failed to fetch miners');
    }

    if (!mineurs || mineurs.length === 0) {
      return response.sendSuccess(res, {
        discovered: [],
        offline: [],
        total: 0,
        online: 0,
      }, 200);
    }

    // Check health for each miner
    const results = await Promise.allSettled(
      mineurs.map(async (miner) => {
        try {
          const healthUrl = `http://${miner.ip_address}:80/api/system/status`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          const res = await fetch(healthUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
          });

          clearTimeout(timeout);

          if (res.ok) {
            const data = await res.json();
            return {
              ...miner,
              status: 'online',
              last_seen: new Date(),
              health: data,
            };
          } else {
            return {
              ...miner,
              status: 'offline',
              last_seen: new Date(),
            };
          }
        } catch (error) {
          return {
            ...miner,
            status: 'offline',
            last_seen: new Date(),
            error: error.message,
          };
        }
      })
    );

    // Process results
    const discovered = [];
    const offline = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        if (result.value.status === 'online') {
          discovered.push(result.value);
        } else {
          offline.push(result.value);
        }
      }
    });

    // Update miner statuses in database
    for (const miner of discovered) {
      await supabase
        .from('mineurs')
        .update({ status: 'online', last_seen: new Date() })
        .eq('id', miner.id);
    }

    for (const miner of offline) {
      await supabase
        .from('mineurs')
        .update({ status: 'offline', last_seen: new Date() })
        .eq('id', miner.id);
    }

    return response.sendSuccess(res, {
      discovered: discovered.map((m) => ({
        id: m.id,
        name: m.name,
        ip_address: m.ip_address,
        status: m.status,
        hashrate: m.hashrate,
        health: m.health,
      })),
      offline: offline.map((m) => ({
        id: m.id,
        name: m.name,
        ip_address: m.ip_address,
        status: m.status,
        hashrate: m.hashrate,
      })),
      total: mineurs.length,
      online: discovered.length,
    }, 200);
  } catch (error) {
    console.error('[DISCOVERY] Error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}
