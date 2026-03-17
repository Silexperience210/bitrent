/**
 * CLEANUP SCRIPT: Remove all fake seed data from Supabase
 * 
 * This script removes:
 * - All seeded miners (10 fake Bitaxe units)
 * - All fake rentals
 * - All fake payments
 * - Keep only production/real data
 */

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

async function cleanupFakeData() {
  console.log('🧹 Starting cleanup of fake seed data...\n');

  try {
    // 1. List all miners
    const { data: miners, error: minerError } = await supabase
      .from('mineurs')
      .select('id, name, ip_address, status');

    if (minerError) throw minerError;

    console.log(`📊 Found ${miners.length} miners in database:`);
    miners.forEach(m => {
      console.log(`  - ${m.name} (${m.ip_address}) - Status: ${m.status}`);
    });
    console.log();

    // 2. Delete fake miners (seeded ones)
    // Fake miners have IPs like 192.168.1.10X (test network)
    const fakeMiners = miners.filter(m => 
      m.ip_address.startsWith('192.168.1.')
    );

    if (fakeMiners.length > 0) {
      console.log(`🗑️  Deleting ${fakeMiners.length} fake seeded miners...`);
      
      for (const miner of fakeMiners) {
        // First delete rentals for this miner
        const { error: rentalDeleteError } = await supabase
          .from('rentals')
          .delete()
          .eq('miner_id', miner.id);

        if (rentalDeleteError) {
          console.warn(`⚠️  Failed to delete rentals for ${miner.name}:`, rentalDeleteError);
        } else {
          console.log(`   ✓ Deleted rentals for ${miner.name}`);
        }

        // Delete the miner
        const { error: minerDeleteError } = await supabase
          .from('mineurs')
          .delete()
          .eq('id', miner.id);

        if (minerDeleteError) {
          console.warn(`⚠️  Failed to delete ${miner.name}:`, minerDeleteError);
        } else {
          console.log(`   ✓ Deleted ${miner.name}`);
        }
      }
      console.log();
    }

    // 3. Delete fake payments (not linked to real miners)
    const { data: payments, error: paymentError } = await supabase
      .from('payments')
      .select('id, rental_id, amount_sats');

    if (paymentError) {
      console.warn('⚠️  Failed to fetch payments:', paymentError);
    } else if (payments.length > 0) {
      console.log(`🗑️  Deleting ${payments.length} fake payments...`);
      
      const { error: deletePaymentError } = await supabase
        .from('payments')
        .delete()
        .gt('id', '0'); // Delete all (since they're all fake)

      if (deletePaymentError) {
        console.warn('⚠️  Failed to delete payments:', deletePaymentError);
      } else {
        console.log(`   ✓ Deleted all fake payments\n`);
      }
    }

    // 4. Summary
    console.log('✅ Cleanup complete!\n');
    console.log('📋 Summary:');
    console.log(`  - Fake miners deleted: ${fakeMiners.length}`);
    console.log(`  - Database is now empty and ready for real hardware\n`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

cleanupFakeData();
