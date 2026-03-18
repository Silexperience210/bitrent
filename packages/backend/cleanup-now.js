#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanup() {
  console.log('🧹 Nettoyage de Supabase en cours...\n');

  try {
    // Delete payments
    console.log('Suppression des payments...');
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (paymentsError) {
      console.log(`  ⚠️  Error: ${paymentsError.message}`);
    } else {
      console.log('  ✅ Payments supprimés');
    }

    // Delete rentals
    console.log('Suppression des rentals...');
    const { error: rentalsError } = await supabase
      .from('rentals')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (rentalsError) {
      console.log(`  ⚠️  Error: ${rentalsError.message}`);
    } else {
      console.log('  ✅ Rentals supprimés');
    }

    // Delete mineurs
    console.log('Suppression des mineurs...');
    const { error: mineursError } = await supabase
      .from('mineurs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (mineursError) {
      console.log(`  ⚠️  Error: ${mineursError.message}`);
    } else {
      console.log('  ✅ Mineurs supprimés');
    }

    // Delete users
    console.log('Suppression des users...');
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (usersError) {
      console.log(`  ⚠️  Error: ${usersError.message}`);
    } else {
      console.log('  ✅ Users supprimés');
    }

    console.log('\n✅ Nettoyage complet!');
    console.log('\n🔄 Refresh ton browser pour voir les changements');
    console.log('   Admin: 0 mineurs');
    console.log('   Rent: Aucun mineur disponible');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

cleanup();
