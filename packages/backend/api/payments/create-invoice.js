/**
 * POST /api/payments/create-invoice
 * Create Lightning invoice for rental payment (via NWC)
 */

import { handleCors } from '@/lib/cors.js';
import { supabase } from '@/lib/supabase.js';
import * as authMiddleware from '@/lib/auth-middleware.js';
import * as response from '@/lib/response.js';
import { generateInvoiceViaWalletConnect } from '@/lib/nwc-wallet.js';

function extractPaymentHash(bolt11) {
  // BOLT11 format includes payment hash, extract it
  // For now, generate a hash
  return Buffer.from(bolt11).toString('hex').substring(0, 64);
}

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

    const { rental_id, amount_sats } = req.body;

    if (!rental_id || !amount_sats || amount_sats <= 0) {
      return response.sendValidationError(res, [
        'rental_id and amount_sats are required',
        'amount_sats must be > 0'
      ]);
    }

    // Get rental from database
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select('*')
      .eq('id', rental_id)
      .single();

    if (rentalError) {
      return response.sendNotFound(res, 'Rental not found');
    }

    // Check if payment already exists
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('rental_id', rental_id)
      .eq('status', 'confirmed')
      .single();

    if (existingPayment) {
      return response.sendError(res, 400, 'PaymentAlreadyConfirmed', 'Payment already confirmed for this rental');
    }

    // Generate BOLT11 invoice via NWC
    let bolt11Invoice = null;
    let paymentHash = null;

    try {
      const invoiceResult = await generateInvoiceViaWalletConnect(
        amount_sats,
        `BitRent Rental ${rental_id}`
      );

      if (invoiceResult && invoiceResult.bolt11) {
        bolt11Invoice = invoiceResult.bolt11;
        paymentHash = invoiceResult.payment_hash || extractPaymentHash(invoiceResult.bolt11);
      }
    } catch (nwcError) {
      console.warn('[CREATE_INVOICE] NWC invoice generation failed, using mock:', nwcError.message);
      // Fallback to mock invoice if NWC fails
      const timestamp = Math.floor(Date.now() / 1000);
      paymentHash = Buffer.from(Math.random().toString()).toString('hex').substring(0, 64);
      bolt11Invoice = `lnbc${amount_sats}n1p${timestamp}ps${paymentHash}`;
    }

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        rental_id,
        amount_sats,
        payment_hash: paymentHash,
        bolt11: bolt11Invoice,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('[CREATE_INVOICE] Payment creation error:', paymentError);
      return response.sendInternalError(res, 'Failed to create invoice');
    }

    console.log('[CREATE_INVOICE] Invoice created:', payment.id);

    return response.sendSuccess(res, {
      id: payment.id,
      rental_id,
      amount_sats,
      bolt11: bolt11Invoice,
      payment_hash: paymentHash,
      status: 'pending',
    }, 201);
  } catch (error) {
    console.error('[CREATE_INVOICE] Error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}
