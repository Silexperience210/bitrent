import { createClient } from '@supabase/supabase-js';
import config from './env.js';

let supabaseClient = null;

export const initDatabase = () => {
  try {
    supabaseClient = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );
    console.log('Database initialized: Supabase connected');
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

export const getDatabase = () => {
  if (!supabaseClient) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return supabaseClient;
};

// Export for use in modules
export const db = {
  users: () => getDatabase().from('users'),
  mineurs: () => getDatabase().from('mineurs'),
  rentals: () => getDatabase().from('rentals'),
  payments: () => getDatabase().from('payments'),
  challenges: () => getDatabase().from('challenges'),
};

export default {
  initDatabase,
  getDatabase,
  db,
};
