/**
 * GET /api/payments/check-status?rental_id=ID
 * Check payment status for a rental
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

    const rentalId = req.query.rental_id;

    if (!rentalId) {
      return response.sendValidationError(res, ['rental_id query parameter is required']);
    }

    // Get latest payment for rental
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('rental_id', rentalId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (paymentError || !payment) {
      return response.sendNotFound(res, 'Payment not found');
    }

    // In production, check actual Lightning payment via NWC
    // For now, just return the status from DB

    return response.sendSuccess(res, {
      id: payment.id,
      rental_id: payment.rental_id,
      amount_sats: payment.amount_sats,
      status: payment.status,
      bolt11: payment.bolt11,
      payment_hash: payment.payment_hash,
      created_at: payment.created_at,
      confirmed_at: payment.confirmed_at,
    }, 200);
  } catch (error) {
    console.error('[CHECK_STATUS] Error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}
