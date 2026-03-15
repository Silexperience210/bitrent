/**
 * PUT /api/admin/mineurs/[id] - Update miner
 * DELETE /api/admin/mineurs/[id] - Delete miner
 */

import { handleCors } from '@/lib/cors.js';
import { supabase, getMinerById } from '@/lib/supabase.js';
import * as authMiddleware from '@/lib/auth-middleware.js';
import { validateMinerUpdateRequest } from '@/lib/validation.js';
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

  const { id } = req.query;

  if (req.method === 'PUT') {
    return handlePut(id, req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(id, res);
  } else {
    return response.sendError(res, 405, 'MethodNotAllowed', 'Method not allowed');
  }
}

async function handlePut(id, req, res) {
  try {
    // Check if miner exists
    const { data: miner, error: getError } = await getMinerById(id);

    if (getError || !miner) {
      return response.sendNotFound(res, 'Miner not found');
    }

    // Validate update fields
    const validation = validateMinerUpdateRequest(req.body);
    if (!validation.valid) {
      return response.sendValidationError(res, validation.errors);
    }

    // Build update object
    const updateData = { updated_at: new Date() };

    if (req.body.status) {
      updateData.status = req.body.status;
    }
    if (req.body.price_per_hour_sats !== undefined) {
      updateData.price_per_hour_sats = req.body.price_per_hour_sats;
    }
    if (req.body.name) {
      updateData.name = req.body.name;
    }
    if (req.body.ip) {
      updateData.ip = req.body.ip;
    }
    if (req.body.model) {
      updateData.model = req.body.model;
    }

    // Update miner
    const { error: updateError } = await supabase
      .from('mineurs')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('[ADMIN] Miner update error:', updateError);
      return response.sendInternalError(res, 'Failed to update miner');
    }

    console.log('[ADMIN] Miner updated:', id);

    return response.sendSuccess(res, { ...miner, ...updateData }, 200);
  } catch (error) {
    console.error('[ADMIN] Miner PUT error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}

async function handleDelete(id, res) {
  try {
    // Check if miner exists
    const { data: miner, error: getError } = await getMinerById(id);

    if (getError || !miner) {
      return response.sendNotFound(res, 'Miner not found');
    }

    // Delete miner
    const { error: deleteError } = await supabase
      .from('mineurs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[ADMIN] Miner deletion error:', deleteError);
      return response.sendInternalError(res, 'Failed to delete miner');
    }

    console.log('[ADMIN] Miner deleted:', id);

    return response.sendSuccess(res, { success: true, message: 'Miner deleted' }, 200);
  } catch (error) {
    console.error('[ADMIN] Miner DELETE error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}
