/**
 * GET /api/admin/mineurs - List all mineurs
 * POST /api/admin/mineurs - Create new miner
 */

import { v4 as uuidv4 } from 'uuid';
import { handleCors } from '@/lib/cors.js';
import { supabase, getMineurs } from '@/lib/supabase.js';
import * as authMiddleware from '@/lib/auth-middleware.js';
import * as response from '@/lib/response.js';

export default async function handler(req, res) {
  // Handle CORS
  if (await handleCors(req, res)) {
    return;
  }

  // Verify authentication and admin role
  const authResult = authMiddleware.verifyAuth(req);
  if (!authResult.authenticated) {
    return response.sendUnauthorized(res, authResult.error);
  }

  if (!authMiddleware.verifyAdminRole(authResult)) {
    return response.sendForbidden(res, 'Admin access required');
  }

  if (req.method === 'GET') {
    return handleGet(res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return response.sendError(res, 405, 'MethodNotAllowed', 'Method not allowed');
  }
}

async function handleGet(res) {
  try {
    const { data: mineurs, error } = await getMineurs();

    if (error) {
      console.error('[ADMIN] Mineurs fetch error:', error);
      return response.sendInternalError(res, 'Failed to fetch mineurs');
    }

    return response.sendSuccess(res, mineurs || [], 200);
  } catch (error) {
    console.error('[ADMIN] Mineurs GET error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}

async function handlePost(req, res) {
  try {
    // Validate required fields
    const { name, ip, model, status, price_per_hour_sats } = req.body;

    const errors = [];
    if (!name) errors.push('name is required');
    if (!ip) errors.push('ip is required');
    if (!model) errors.push('model is required');
    if (!status) errors.push('status is required');
    if (!price_per_hour_sats || typeof price_per_hour_sats !== 'number' || price_per_hour_sats <= 0) {
      errors.push('price_per_hour_sats must be a positive number');
    }

    if (errors.length > 0) {
      return response.sendValidationError(res, errors);
    }

    // Create miner
    const minerId = uuidv4();
    const { error: createError } = await supabase.from('mineurs').insert([{
      id: minerId,
      name,
      ip,
      model,
      status,
      price_per_hour_sats,
      created_at: new Date(),
      updated_at: new Date(),
    }]);

    if (createError) {
      console.error('[ADMIN] Miner creation error:', createError);
      return response.sendInternalError(res, 'Failed to create miner');
    }

    console.log('[ADMIN] Miner created:', minerId);

    return response.sendSuccess(res, {
      id: minerId,
      name,
      ip,
      model,
      status,
      price_per_hour_sats,
    }, 201);
  } catch (error) {
    console.error('[ADMIN] Mineurs POST error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}
