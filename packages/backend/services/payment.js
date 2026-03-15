import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database.js';
import nwcService from './nwc.js';

class PaymentService {
  /**
   * Create payment invoice for rental
   * @param {string} rentalId - Rental ID
   * @param {number} amount_sats - Amount in satoshis
   * @param {object} rentalDetails - Rental details for description
   * @returns {Promise<object>}
   */
  async createPaymentInvoice(rentalId, amount_sats, rentalDetails) {
    try {
      // Generate invoice via NWC
      const invoiceData = await nwcService.generateInvoice(
        amount_sats,
        `BitRent Rental: ${rentalDetails.model} for ${rentalDetails.duration_hours}h`
      );

      // Store payment in database
      const { data, error } = await db.payments().insert({
        id: uuidv4(),
        rental_id: rentalId,
        invoice_hash: invoiceData.hash,
        amount_sats,
        status: 'pending',
        bolt11: invoiceData.invoice,
        created_at: new Date(),
        expires_at: invoiceData.expires_at,
      });

      if (error) throw error;

      return {
        success: true,
        invoice: invoiceData.invoice,
        hash: invoiceData.hash,
        amount_sats,
        expires_at: invoiceData.expires_at,
      };
    } catch (error) {
      console.error('Payment invoice creation error:', error);
      throw error;
    }
  }

  /**
   * Verify and confirm payment
   * @param {string} invoiceHash - Payment hash
   * @returns {Promise<{success: boolean, payment?: object}>}
   */
  async verifyAndConfirmPayment(invoiceHash) {
    try {
      // Check NWC payment status
      const paymentStatus = await nwcService.verifyPayment(invoiceHash);

      if (!paymentStatus.paid) {
        return {
          success: false,
          error: 'Payment not yet confirmed',
          status: 'pending',
        };
      }

      // Update payment in database
      const { data, error } = await db.payments()
        .update({
          status: 'confirmed',
          confirmed_at: new Date(),
        })
        .eq('invoice_hash', invoiceHash);

      if (error) throw error;

      // Get rental and update its status
      const { data: paymentData } = await db.payments()
        .select('rental_id')
        .eq('invoice_hash', invoiceHash)
        .single();

      if (paymentData?.rental_id) {
        await db.rentals()
          .update({
            status: 'active',
            started_at: new Date(),
          })
          .eq('id', paymentData.rental_id);
      }

      return {
        success: true,
        payment: data?.[0],
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      throw error;
    }
  }

  /**
   * Get payment status
   * @param {string} invoiceHash - Payment hash
   * @returns {Promise<object>}
   */
  async getPaymentStatus(invoiceHash) {
    try {
      const { data, error } = await db.payments()
        .select('*')
        .eq('invoice_hash', invoiceHash)
        .single();

      if (error) throw error;

      return {
        status: data?.status || 'not_found',
        amount_sats: data?.amount_sats,
        created_at: data?.created_at,
        confirmed_at: data?.confirmed_at,
      };
    } catch (error) {
      console.error('Get payment status error:', error);
      throw error;
    }
  }

  /**
   * Cancel payment/rental if not paid
   * @param {string} rentalId - Rental ID
   * @returns {Promise<{success: boolean}>}
   */
  async cancelRentalPayment(rentalId) {
    try {
      // Get payment associated with rental
      const { data: payment } = await db.payments()
        .select('invoice_hash')
        .eq('rental_id', rentalId)
        .eq('status', 'pending')
        .single();

      if (payment) {
        // Mark payment as cancelled
        await db.payments()
          .update({ status: 'cancelled' })
          .eq('invoice_hash', payment.invoice_hash);
      }

      // Cancel rental
      await db.rentals()
        .update({ status: 'cancelled' })
        .eq('id', rentalId);

      return { success: true };
    } catch (error) {
      console.error('Cancel rental payment error:', error);
      throw error;
    }
  }

  /**
   * Get payment history
   * @param {string} userPubkey - User's Nostr pubkey
   * @param {number} limit - Limit results
   * @returns {Promise<object[]>}
   */
  async getPaymentHistory(userPubkey, limit = 50) {
    try {
      const { data, error } = await db.payments()
        .select(`
          *,
          rentals:rental_id (
            id,
            mineur_id,
            duration_hours,
            mineurs:mineur_id (
              model,
              hashrate
            )
          )
        `)
        .eq('rentals.user_pubkey', userPubkey)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get payment history error:', error);
      throw error;
    }
  }
}

export default new PaymentService();
