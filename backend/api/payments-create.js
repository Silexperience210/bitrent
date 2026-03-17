/**
 * POST /api/payments
 * Create a payment invoice for a rental
 * Requires: Authorization header with JWT token
 */
import { verifyToken } from '../lib/jwt.js';
import { getRentalById, createPayment } from '../lib/supabase.js';
import { nwcClient } from '../lib/nwc.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid authorization header',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    const { rental_id, amount_sats } = req.body;

    if (!rental_id || !amount_sats) {
      return res.status(400).json({
        error: 'Missing required fields: rental_id, amount_sats',
        code: 'MISSING_FIELDS'
      });
    }

    // Verify rental exists
    const rental = await getRentalById(rental_id);
    if (!rental) {
      return res.status(404).json({
        error: 'Rental not found',
        code: 'RENTAL_NOT_FOUND'
      });
    }

    // Create Lightning invoice
    const invoice = await nwcClient.createInvoice(
      amount_sats,
      `BitRent rental ${rental_id}`
    );

    // Create payment record in database
    const payment = await createPayment(rental_id, amount_sats, invoice.payment_request);

    res.status(201).json({
      status: 'ok',
      data: {
        payment_id: payment.id,
        amount_sats: payment.amount_sats,
        invoice: invoice.payment_request,
        payment_hash: invoice.payment_hash,
        expires_at: invoice.expires_at,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      error: 'Failed to create payment',
      code: 'PAYMENT_ERROR',
      message: error.message
    });
  }
}
