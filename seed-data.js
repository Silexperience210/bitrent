#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
const envPath = path.join(__dirname, 'backend', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && !key.startsWith('#')) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function seedData() {
  console.log('🌱 Seeding BitRent database...\n');

  try {
    // 1. Create admin user
    console.log('👤 Creating admin user...');
    const adminUser = {
      pubkey_nostr: 'npub1qg6xqmq4c6e5q3wjk5c6e5q3wjk5c6e5q3wjk5c6e5q3wjk5c6e5q3wjk5c6e5',
      role: 'admin',
      metadata: {
        name: 'Admin',
        email: 'admin@bitrent.local',
        created_at: new Date().toISOString()
      }
    };

    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert([adminUser], { onConflict: 'pubkey_nostr' })
      .select();

    if (userError) {
      throw new Error(`Failed to create user: ${userError.message}`);
    }

    const adminUserId = userData[0].id;
    console.log(`✅ Admin user created: ${adminUserId}`);

    // 2. Create mineurs (miners)
    console.log('\n⚙️ Creating miners...');
    
    const miners = [];
    for (let i = 1; i <= 10; i++) {
      miners.push({
        owner_id: adminUserId,
        name: `Bitaxe #${i}`,
        ip_address: `192.168.1.${100 + i}`,
        port: 80,
        hashrate_specs: 100 - (i * 5),
        sats_per_minute: 500 - (i * 30),
        status: i <= 7 ? 'online' : 'offline',
        total_revenue_sats: 0,
        uptime_percentage: i <= 7 ? 95 + Math.random() * 5 : 0,
        metadata: {
          model: 'Bitaxe Ultra',
          firmware: '1.0.0',
          location: 'EU-DC-' + String.fromCharCode(65 + i)
        }
      });
    }

    const { data: minerData, error: minerError } = await supabase
      .from('mineurs')
      .insert(miners)
      .select();

    if (minerError) {
      throw new Error(`Failed to create miners: ${minerError.message}`);
    }

    console.log(`✅ ${minerData.length} miners created`);

    // 3. Summary
    console.log('\n📊 Database seeded successfully!');
    console.log('\nCreated:');
    console.log(`  - 1 admin user`);
    console.log(`  - 10 miners (${minerData.filter(m => m.status === 'online').length} online)`);
    console.log('\n🔑 Admin Pubkey (use for testing):');
    console.log(`  npub1qg6xqmq4c6e5q3wjk5c6e5q3wjk5c6e5q3wjk5c6e5q3wjk5c6e5q3wjk5c6e5`);
    console.log('\n💡 Next steps:');
    console.log('  1. Test the API with the test page');
    console.log('  2. Implement Nostr auth flow in frontend');
    console.log('  3. Create rental and payment flows');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
}

seedData();
