/**
 * GET /api/client/rentals/[id] - Get rental details
 * PUT /api/client/rentals/[id] - Update rental
 * DELETE /api/client/rentals/[id] - Cancel rental
 */

import { handleCors } from '@/lib/cors.js';
import { getRentalById, updateRental } from '@/lib/supabase.js';
import * as authMiddleware from '@/lib/auth-middleware.js';
import * as response from '@/lib/response.js';

export default async function handler(req, res) {
  // Handle CORS
  if (await handleCors(req, res)) {
    return;
  }

  // Verify authentication
  const authResult = authMiddleware.verifyAuth(req);
  if (!authResult.authenticated) {
    return response.sendUnauthorized(res, authResult.error);
  }

  const pubkey = authResult.user.pubkey;
  const { id } = req.query;

  if (req.method === 'GET') {
    return handleGet(id, pubkey, res);
  } else if (req.method === 'PUT') {
    return handlePut(id, pubkey, req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(id, pubkey, res);
  } else {
    return response.sendError(res, 405, 'MethodNotAllowed', 'Method not allowed');
  }
}

async function handleGet(id, pubkey, res) {
  try {
    const { data: rental, error } = await getRentalById(id);

    if (error || !rental) {
      return response.sendNotFound(res, 'Rental not found');
    }

    // Check ownership
    if (rental.user_pubkey !== pubkey) {
      return response.sendForbidden(res, 'You do not own this rental');
    }

    return response.sendSuccess(res, rental, 200);
  } catch (error) {
    console.error('[CLIENT] Rental GET error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}

async function handlePut(id, pubkey, req, res) {
  try {
    const { data: rental, error } = await getRentalById(id);

    if (error || !rental) {
      return response.sendNotFound(res, 'Rental not found');
    }

    // Check ownership
    if (rental.user_pubkey !== pubkey) {
      return response.sendForbidden(res, 'You do not own this rental');
    }

    // Can only update certain fields and only if rental is pending
    if (rental.status !== 'pending_payment') {
      return response.sendError(res, 409, 'InvalidState', 'Cannot update rental in current state');
    }

    // Update allowed fields
    const updateData = {};
    if (req.body.duration_hours) {
      updateData.duration_hours = req.body.duration_hours;
      updateData.updated_at = new Date();
    }

    if (Object.keys(updateData).length === 0) {
      return response.sendValidationError(res, ['No valid fields to update']);
    }

    const { error: updateError } = await updateRental(id, updateData);

    if (updateError) {
      console.error('[CLIENT] Rental update error:', updateError);
      return response.sendInternalError(res, 'Failed to update rental');
    }

    console.log('[CLIENT] Rental updated:', id);

    return response.sendSuccess(res, { ...rental, ...updateData }, 200);
  } catch (error) {
    console.error('[CLIENT] Rental PUT error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}

async function handleDelete(id, pubkey, res) {
  try {
    const { data: rental, error } = await getRentalById(id);

    if (error || !rental) {
      return response.sendNotFound(res, 'Rental not found');
    }

    // Check ownership
    if (rental.user_pubkey !== pubkey) {
      return response.sendForbidden(res, 'You do not own this rental');
    }

    // Can only cancel pending rentals
    if (rental.status !== 'pending_payment') {
      return response.sendError(res, 409, 'InvalidState', 'Cannot cancel rental in current state');
    }

    // Update status to cancelled
    const { error: updateError } = await updateRental(id, {
      status: 'cancelled',
      updated_at: new Date(),
    });

    if (updateError) {
      console.error('[CLIENT] Rental cancellation error:', updateError);
      return response.sendInternalError(res, 'Failed to cancel rental');
    }

    console.log('[CLIENT] Rental cancelled:', id);

    return response.sendSuccess(res, { success: true, message: 'Rental cancelled' }, 200);
  } catch (error) {
    console.error('[CLIENT] Rental DELETE error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}
