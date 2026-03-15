/**
 * POST /api/payments/verify
 * Verify payment and activate rental
 */

import { handleCors } from '@/lib/cors.js';
import { getRentalById, updateRental, supabase } from '@/lib/supabase.js';
import * as authMiddleware from '@/lib/auth-middleware.js';
import * as nwc from '@/lib/nwc.js';
import { validatePaymentVerifyRequest } from '@/lib/validation.js';
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

  // Verify authentication
  const authResult = authMiddleware.verifyAuth(req);
  if (!authResult.authenticated) {
    return response.sendUnauthorized(res, authResult.error);
  }

  try {
    // Validate input
    const validation = validatePaymentVerifyRequest(req.body);
    if (!validation.valid) {
      return response.sendValidationError(res, validation.errors);
    }

    const { rental_id, payment_hash, invoice } = req.body;
    const pubkey = authResult.user.pubkey;

    // Get rental
    const { data: rental, error: rentalError } = await getRentalById(rental_id);

    if (rentalError || !rental) {
      return response.sendNotFound(res, 'Rental not found');
    }

    // Check ownership
    if (rental.user_pubkey !== pubkey) {
      return response.sendForbidden(res, 'You do not own this rental');
    }

    // Check rental status
    if (rental.status !== 'pending_payment') {
      return response.sendError(res, 409, 'InvalidState', 'Rental is not awaiting payment');
    }

    // Verify payment
    const paymentResult = await nwc.verifyPayment(invoice, payment_hash);

    if (!paymentResult.valid || !paymentResult.paid) {
      console.error('[PAYMENTS] Payment verification failed:', payment_hash);
      return response.sendError(res, 402, 'PaymentFailed', 'Payment verification failed');
    }

    // Calculate end time
    const endTime = new Date(new Date(rental.created_at).getTime() + rental.duration_hours * 60 * 60 * 1000);

    // Update rental status
    const { error: updateError } = await updateRental(rental_id, {
      status: 'active',
      payment_hash,
      paid_at: new Date(),
      end_time: endTime,
      updated_at: new Date(),
    });

    if (updateError) {
      console.error('[PAYMENTS] Rental update error:', updateError);
      return response.sendInternalError(res, 'Failed to activate rental');
    }

    console.log('[PAYMENTS] Payment verified for rental:', rental_id);

    // Record payment in database
    await supabase.from('payments').insert([{
      rental_id,
      payment_hash,
      amount_sats: rental.total_cost_sats,
      status: 'confirmed',
      created_at: new Date(),
    }]);

    return response.sendSuccess(res, {
      success: true,
      rental_id,
      status: 'active',
      end_time: endTime.toISOString(),
      message: 'Payment verified and rental activated',
    }, 200);
  } catch (error) {
    console.error('[PAYMENTS] Verify endpoint error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}
