import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper functions for common operations
export async function getMiners() {
  const { data, error } = await supabase
    .from('mineurs')
    .select('*')
    .eq('status', 'online');
  
  if (error) throw error;
  return data || [];
}

export async function getMinerById(id) {
  const { data, error } = await supabase
    .from('mineurs')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createRental(miner_id, client_id, start_time) {
  const { data, error } = await supabase
    .from('rentals')
    .insert([{
      miner_id,
      client_id,
      start_time,
      status: 'active'
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getRentalById(id) {
  const { data, error } = await supabase
    .from('rentals')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createPayment(rental_id, amount_sats, invoice) {
  const { data, error } = await supabase
    .from('payments')
    .insert([{
      rental_id,
      amount_sats,
      invoice,
      status: 'pending'
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updatePaymentStatus(payment_id, status, paid_at = null) {
  const { data, error } = await supabase
    .from('payments')
    .update({ status, paid_at })
    .eq('id', payment_id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getUserByNostrPubkey(nostr_pubkey) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('nostr_pubkey', nostr_pubkey)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createUser(nostr_pubkey, display_name = '') {
  const { data, error } = await supabase
    .from('users')
    .insert([{
      nostr_pubkey,
      display_name,
      role: 'user',
      verified: false
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function logAudit(user_id, action, resource_type, resource_id, details = {}) {
  const { error } = await supabase
    .from('audit_logs')
    .insert([{
      user_id,
      action,
      resource_type,
      resource_id,
      details
    }]);
  
  if (error) console.error('Audit log error:', error);
}
