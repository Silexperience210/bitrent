/**
 * Lightning Payment Webhook Handler
 * Receives payment confirmations from NWC/Lightning Network
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { invoice_hash, status, paid_at, amount_sats } = req.body;

    if (!invoice_hash || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update payment status in database
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .update({
        status: status === 'paid' ? 'confirmed' : status,
        confirmed_at: status === 'paid' ? new Date().toISOString() : null,
        metadata: {
          webhook_received_at: new Date().toISOString(),
          paid_at: paid_at
        }
      })
      .eq('invoice_hash', invoice_hash)
      .select();

    if (paymentError) {
      console.error('Payment update error:', paymentError);
      return res.status(500).json({ error: 'Failed to update payment' });
    }

    if (!paymentData || paymentData.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = paymentData[0];

    // If payment confirmed, activate rental
    if (status === 'paid') {
      const { error: rentalError } = await supabase
        .from('rentals')
        .update({ status: 'active' })
        .eq('id', payment.rental_id);

      if (rentalError) {
        console.error('Rental activation error:', rentalError);
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        action: 'PAYMENT_CONFIRMED',
        resource_type: 'payment',
        resource_id: payment.id,
        changes: { status: 'confirmed' },
        created_at: new Date().toISOString()
      });
    }

    res.status(200).json({
      status: 'ok',
      message: `Payment ${status}`,
      payment_id: payment.id
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
