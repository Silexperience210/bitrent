/**
 * Database Service Layer
 * Provides ORM-like methods for querying the database
 * Uses Supabase client for PostgreSQL access
 */

const { createClient } = require('@supabase/supabase-js');

class Database {
  constructor(supabaseUrl, supabaseKey) {
    this.client = createClient(supabaseUrl, supabaseKey);
    this.url = supabaseUrl;
  }

  /**
   * Execute a raw SQL query
   */
  async query(sql, params = []) {
    try {
      const { data, error } = await this.client.rpc('exec_sql', { 
        sql,
        params: JSON.stringify(params)
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Query error:', error);
      return { data: null, error };
    }
  }

  /**
   * Users model
   */
  users = {
    findByPubkey: async (pubkey) => {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('pubkey_nostr', pubkey)
        .single();
      return { data, error };
    },

    findById: async (id) => {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },

    create: async (pubkey, role = 'user', metadata = {}) => {
      const { data, error } = await this.client
        .from('users')
        .insert({
          pubkey_nostr: pubkey,
          role,
          metadata
        })
        .select()
        .single();
      return { data, error };
    },

    updateRole: async (userId, role) => {
      const { data, error } = await this.client
        .from('users')
        .update({ role })
        .eq('id', userId)
        .select()
        .single();
      return { data, error };
    },

    list: async (limit = 100, offset = 0) => {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return { data, error };
    },

    count: async () => {
      const { count, error } = await this.client
        .from('users')
        .select('*', { count: 'exact', head: true });
      return { count, error };
    }
  };

  /**
   * Mineurs (Miners) model
   */
  mineurs = {
    findById: async (id) => {
      const { data, error } = await this.client
        .from('mineurs')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },

    listAvailable: async (limit = 50, offset = 0) => {
      const { data, error } = await this.client
        .from('v_available_mineurs')
        .select('*')
        .range(offset, offset + limit - 1);
      return { data, error };
    },

    listByOwner: async (ownerId, limit = 50, offset = 0) => {
      const { data, error } = await this.client
        .from('mineurs')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return { data, error };
    },

    create: async (ownerId, minerData) => {
      const { data, error } = await this.client
        .from('mineurs')
        .insert({
          owner_id: ownerId,
          ...minerData
        })
        .select()
        .single();
      return { data, error };
    },

    update: async (id, updates) => {
      const { data, error } = await this.client
        .from('mineurs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    updateRevenue: async (id, amount) => {
      const { data, error } = await this.client.rpc(
        'update_miner_revenue',
        { miner_id: id, amount }
      );
      return { data, error };
    },

    listByStatus: async (status, limit = 50, offset = 0) => {
      const { data, error } = await this.client
        .from('mineurs')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return { data, error };
    },

    getPerformance: async (id) => {
      const { data, error } = await this.client
        .from('v_miner_performance')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    }
  };

  /**
   * Rentals model
   */
  rentals = {
    findById: async (id) => {
      const { data, error } = await this.client
        .from('rentals')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },

    findActive: async (userId, limit = 50, offset = 0) => {
      const { data, error } = await this.client
        .from('rentals')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return { data, error };
    },

    findByUser: async (userId, limit = 50, offset = 0) => {
      const { data, error } = await this.client
        .from('v_user_rental_history')
        .select('*')
        .eq('user_id', userId)
        .range(offset, offset + limit - 1);
      return { data, error };
    },

    findByMiner: async (minerId, limit = 50, offset = 0) => {
      const { data, error } = await this.client
        .from('rentals')
        .select('*')
        .eq('mineur_id', minerId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return { data, error };
    },

    create: async (userId, minerId, rentalData) => {
      const { data, error } = await this.client
        .from('rentals')
        .insert({
          user_id: userId,
          mineur_id: minerId,
          ...rentalData
        })
        .select()
        .single();
      return { data, error };
    },

    update: async (id, updates) => {
      const { data, error } = await this.client
        .from('rentals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    complete: async (id) => {
      return this.rentals.update(id, { status: 'completed' });
    },

    cancel: async (id, reason = null) => {
      return this.rentals.update(id, {
        status: 'cancelled',
        metadata: { cancelled_reason: reason }
      });
    },

    getActive: async (limit = 100) => {
      const { data, error } = await this.client
        .from('v_active_rentals')
        .select('*')
        .limit(limit);
      return { data, error };
    },

    getStatusSummary: async () => {
      const { data, error } = await this.client
        .from('v_rental_status_summary')
        .select('*');
      return { data, error };
    }
  };

  /**
   * Payments model
   */
  payments = {
    findById: async (id) => {
      const { data, error } = await this.client
        .from('payments')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },

    findByInvoice: async (invoiceHash) => {
      const { data, error } = await this.client
        .from('payments')
        .select('*')
        .eq('invoice_hash', invoiceHash)
        .single();
      return { data, error };
    },

    findByRental: async (rentalId) => {
      const { data, error } = await this.client
        .from('payments')
        .select('*')
        .eq('rental_id', rentalId)
        .single();
      return { data, error };
    },

    create: async (rentalId, paymentData) => {
      const { data, error } = await this.client
        .from('payments')
        .insert({
          rental_id: rentalId,
          ...paymentData
        })
        .select()
        .single();
      return { data, error };
    },

    update: async (id, updates) => {
      const { data, error } = await this.client
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    verify: async (invoiceHash, walletPubkey = null) => {
      return this.payments.update(
        invoiceHash,
        {
          status: 'confirmed',
          wallet_pubkey: walletPubkey
        }
      );
    },

    getPending: async (limit = 100) => {
      const { data, error } = await this.client
        .from('v_pending_payments')
        .select('*')
        .limit(limit);
      return { data, error };
    },

    getStatusSummary: async () => {
      const { data, error } = await this.client
        .from('v_payment_status_summary')
        .select('*');
      return { data, error };
    }
  };

  /**
   * Analytics model
   */
  analytics = {
    getRevenueByDay: async (startDate, endDate) => {
      const { data, error } = await this.client
        .from('v_daily_revenue')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
      return { data, error };
    },

    getTopMineurs: async (limit = 10) => {
      const { data, error } = await this.client
        .from('v_top_mineurs_by_usage')
        .select('*')
        .limit(limit);
      return { data, error };
    },

    getTopUsers: async (limit = 10) => {
      const { data, error } = await this.client
        .from('v_top_users_by_spending')
        .select('*')
        .limit(limit);
      return { data, error };
    },

    getUserStats: async (userId) => {
      const { data, error } = await this.client
        .from('v_user_statistics')
        .select('*')
        .eq('id', userId)
        .single();
      return { data, error };
    },

    getRevenueByMiner: async (minerId) => {
      const { data, error } = await this.client
        .from('v_revenue_by_miner')
        .select('*')
        .eq('id', minerId)
        .single();
      return { data, error };
    },

    getRevenueByUser: async (userId) => {
      const { data, error } = await this.client
        .from('v_revenue_by_user')
        .select('*')
        .eq('id', userId)
        .single();
      return { data, error };
    },

    getDailyStats: async (date = null) => {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const { data, error } = await this.client
        .from('analytics_daily')
        .select('*')
        .eq('date', targetDate)
        .single();
      return { data, error };
    },

    calculateDailyStats: async (date = null) => {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const { data, error } = await this.client.rpc(
        'calculate_daily_analytics',
        { target_date: targetDate }
      );
      return { data, error };
    }
  };

  /**
   * Audit Logs model
   */
  auditLogs = {
    log: async (userId, action, resourceType, resourceId, changes = null, ipAddress = null) => {
      const { data, error } = await this.client
        .from('audit_logs')
        .insert({
          user_id: userId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          changes,
          ip_address: ipAddress
        })
        .select()
        .single();
      return { data, error };
    },

    findByUser: async (userId, limit = 100, offset = 0) => {
      const { data, error } = await this.client
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return { data, error };
    },

    findByResource: async (resourceType, resourceId, limit = 100) => {
      const { data, error } = await this.client
        .from('audit_logs')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data, error };
    }
  };

  /**
   * Challenges model (for Nostr auth)
   */
  challenges = {
    create: async (pubkey, challengeString, expiresAt) => {
      const { data, error } = await this.client
        .from('challenges')
        .insert({
          pubkey_nostr: pubkey,
          challenge: challengeString,
          expires_at: expiresAt
        })
        .select()
        .single();
      return { data, error };
    },

    findByPubkey: async (pubkey) => {
      const { data, error } = await this.client
        .from('challenges')
        .select('*')
        .eq('pubkey_nostr', pubkey)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      return { data, error };
    },

    delete: async (id) => {
      const { data, error } = await this.client
        .from('challenges')
        .delete()
        .eq('id', id);
      return { data, error };
    }
  };
}

// Create and export a singleton instance
const dbInstance = new Database(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = {
  Database,
  db: dbInstance,
  createDatabase: (url, key) => new Database(url, key)
};
