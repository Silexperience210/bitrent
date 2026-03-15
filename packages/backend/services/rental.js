import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database.js';
import paymentService from './payment.js';

class RentalService {
  /**
   * Create new rental
   * @param {string} userPubkey - User's Nostr pubkey
   * @param {string} mineurId - Miner ID
   * @param {number} durationHours - Duration in hours
   * @returns {Promise<object>}
   */
  async createRental(userPubkey, mineurId, durationHours) {
    try {
      // Get miner details
      const { data: miner, error: minerError } = await db.mineurs()
        .select('*')
        .eq('id', mineurId)
        .single();

      if (minerError || !miner) {
        throw new Error('Miner not found');
      }

      if (miner.status !== 'active') {
        throw new Error('Miner is not available');
      }

      // Calculate total cost
      const total_sats = miner.price_per_hour_sats * durationHours;

      // Create rental record
      const rentalId = uuidv4();
      const { data: rental, error: rentalError } = await db.rentals()
        .insert({
          id: rentalId,
          mineur_id: mineurId,
          user_pubkey: userPubkey,
          duration_hours: durationHours,
          amount_sats: total_sats,
          status: 'pending_payment',
          created_at: new Date(),
        });

      if (rentalError) throw rentalError;

      // Create payment invoice
      const paymentInvoice = await paymentService.createPaymentInvoice(
        rentalId,
        total_sats,
        {
          model: miner.model,
          duration_hours: durationHours,
        }
      );

      return {
        rental_id: rentalId,
        miner: {
          id: miner.id,
          model: miner.model,
          hashrate: miner.hashrate,
          ip: miner.ip,
        },
        duration_hours: durationHours,
        amount_sats: total_sats,
        status: 'pending_payment',
        payment: paymentInvoice,
      };
    } catch (error) {
      console.error('Create rental error:', error);
      throw error;
    }
  }

  /**
   * Get rental details
   * @param {string} rentalId - Rental ID
   * @returns {Promise<object>}
   */
  async getRentalDetails(rentalId) {
    try {
      const { data: rental, error } = await db.rentals()
        .select(`
          *,
          mineurs:mineur_id (
            id,
            model,
            hashrate,
            ip,
            price_per_hour_sats
          ),
          payments:id (
            *
          )
        `)
        .eq('id', rentalId)
        .single();

      if (error) throw error;

      return rental;
    } catch (error) {
      console.error('Get rental details error:', error);
      throw error;
    }
  }

  /**
   * Get active rentals for user
   * @param {string} userPubkey - User's Nostr pubkey
   * @returns {Promise<object[]>}
   */
  async getActiveRentals(userPubkey) {
    try {
      const { data: rentals, error } = await db.rentals()
        .select(`
          *,
          mineurs:mineur_id (
            id,
            model,
            hashrate,
            ip
          )
        `)
        .eq('user_pubkey', userPubkey)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return rentals || [];
    } catch (error) {
      console.error('Get active rentals error:', error);
      throw error;
    }
  }

  /**
   * Get rental history
   * @param {string} userPubkey - User's Nostr pubkey
   * @param {number} limit - Limit results
   * @returns {Promise<object[]>}
   */
  async getRentalHistory(userPubkey, limit = 50) {
    try {
      const { data: rentals, error } = await db.rentals()
        .select(`
          *,
          mineurs:mineur_id (
            id,
            model,
            hashrate
          )
        `)
        .eq('user_pubkey', userPubkey)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return rentals || [];
    } catch (error) {
      console.error('Get rental history error:', error);
      throw error;
    }
  }

  /**
   * Complete rental
   * @param {string} rentalId - Rental ID
   * @returns {Promise<{success: boolean}>}
   */
  async completeRental(rentalId) {
    try {
      const { error } = await db.rentals()
        .update({
          status: 'completed',
          ended_at: new Date(),
        })
        .eq('id', rentalId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Complete rental error:', error);
      throw error;
    }
  }

  /**
   * Cancel rental
   * @param {string} rentalId - Rental ID
   * @returns {Promise<{success: boolean}>}
   */
  async cancelRental(rentalId) {
    try {
      // Get rental first
      const { data: rental } = await db.rentals()
        .select('status')
        .eq('id', rentalId)
        .single();

      if (rental?.status === 'active') {
        throw new Error('Cannot cancel active rental');
      }

      // Cancel rental and associated payment
      await db.rentals()
        .update({ status: 'cancelled' })
        .eq('id', rentalId);

      await paymentService.cancelRentalPayment(rentalId);

      return { success: true };
    } catch (error) {
      console.error('Cancel rental error:', error);
      throw error;
    }
  }

  /**
   * Get stats by miner
   * @param {string} mineurId - Miner ID
   * @returns {Promise<object>}
   */
  async getMinerStats(mineurId) {
    try {
      const { data: rentals, error } = await db.rentals()
        .select('id, status, duration_hours, amount_sats')
        .eq('mineur_id', mineurId);

      if (error) throw error;

      const active = rentals?.filter((r) => r.status === 'active').length || 0;
      const completed = rentals?.filter((r) => r.status === 'completed').length || 0;
      const totalRevenue = rentals?.reduce((sum, r) => {
        if (r.status === 'completed' || r.status === 'active') {
          return sum + r.amount_sats;
        }
        return sum;
      }, 0) || 0;

      return {
        active_rentals: active,
        completed_rentals: completed,
        total_revenue_sats: totalRevenue,
        total_rentals: rentals?.length || 0,
      };
    } catch (error) {
      console.error('Get miner stats error:', error);
      throw error;
    }
  }
}

export default new RentalService();
