/**
 * Supabase Client for Vercel API Routes
 * Centralized database access
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Helper method to query challenges table
 */
export async function getChallenges() {
  return supabase.from('challenges').select('*');
}

/**
 * Helper method to insert challenge
 */
export async function insertChallenge(data) {
  return supabase.from('challenges').insert([data]);
}

/**
 * Helper method to delete challenge
 */
export async function deleteChallenge(id) {
  return supabase.from('challenges').delete().eq('id', id);
}

/**
 * Helper method to get user
 */
export async function getUser(pubkey) {
  return supabase.from('users').select('*').eq('pubkey', pubkey).single();
}

/**
 * Helper method to create user
 */
export async function createUser(data) {
  return supabase.from('users').insert([data]);
}

/**
 * Helper method to get mineurs
 */
export async function getMineurs(filters = {}) {
  let query = supabase.from('mineurs').select('*');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  return query.order('price_per_hour_sats', { ascending: true });
}

/**
 * Helper method to get miner by ID
 */
export async function getMinerById(id) {
  return supabase.from('mineurs').select('*').eq('id', id).single();
}

/**
 * Helper method to get rentals
 */
export async function getRentals(filters = {}) {
  let query = supabase.from('rentals').select('*');

  if (filters.user_pubkey) {
    query = query.eq('user_pubkey', filters.user_pubkey);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  return query.order('created_at', { ascending: false });
}

/**
 * Helper method to get rental by ID
 */
export async function getRentalById(id) {
  return supabase.from('rentals').select('*').eq('id', id).single();
}

/**
 * Helper method to create rental
 */
export async function createRental(data) {
  return supabase.from('rentals').insert([data]);
}

/**
 * Helper method to update rental
 */
export async function updateRental(id, data) {
  return supabase.from('rentals').update(data).eq('id', id);
}

export default { supabase };
