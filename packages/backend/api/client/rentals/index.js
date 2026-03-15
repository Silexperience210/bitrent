/**
 * GET /api/client/rentals - List user rentals
 * POST /api/client/rentals - Create new rental
 */

import { v4 as uuidv4 } from 'uuid';
import { handleCors } from '@/lib/cors.js';
import { getRentals, createRental, getMinerById } from '@/lib/supabase.js';
import * as authMiddleware from '@/lib/auth-middleware.js';
import { validateRentalRequest } from '@/lib/validation.js';
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

  if (req.method === 'GET') {
    return handleGet(pubkey, res);
  } else if (req.method === 'POST') {
    return handlePost(pubkey, req, res);
  } else {
    return response.sendError(res, 405, 'MethodNotAllowed', 'Method not allowed');
  }
}

async function handleGet(pubkey, res) {
  try {
    // Get user's rentals
    const { data: rentals, error } = await getRentals({ user_pubkey: pubkey });

    if (error) {
      console.error('[CLIENT] Rentals fetch error:', error);
      return response.sendInternalError(res, 'Failed to fetch rentals');
    }

    return response.sendSuccess(res, rentals || [], 200);
  } catch (error) {
    console.error('[CLIENT] Rentals GET error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}

async function handlePost(pubkey, req, res) {
  try {
    // Validate input
    const validation = validateRentalRequest(req.body);
    if (!validation.valid) {
      return response.sendValidationError(res, validation.errors);
    }

    const { miner_id, duration_hours } = req.body;

    // Check if miner exists
    const { data: miner, error: minerError } = await getMinerById(miner_id);
    if (minerError || !miner) {
      return response.sendNotFound(res, 'Miner not found');
    }

    // Calculate cost
    const totalCost = miner.price_per_hour_sats * duration_hours;

    // Create rental
    const rentalId = uuidv4();
    const { error: createError } = await createRental({
      id: rentalId,
      user_pubkey: pubkey,
      miner_id,
      duration_hours,
      total_cost_sats: totalCost,
      status: 'pending_payment',
      created_at: new Date(),
      updated_at: new Date(),
    });

    if (createError) {
      console.error('[CLIENT] Rental creation error:', createError);
      return response.sendInternalError(res, 'Failed to create rental');
    }

    console.log('[CLIENT] Rental created:', rentalId);

    return response.sendSuccess(res, {
      id: rentalId,
      miner_id,
      duration_hours,
      total_cost_sats: totalCost,
      status: 'pending_payment',
    }, 201);
  } catch (error) {
    console.error('[CLIENT] Rentals POST error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}
