#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

// Read migration
const migrationPath = path.join(__dirname, 'packages', 'backend', 'migrations', '001_init_schema.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Executing migration on Supabase...');
console.log(`📍 Project: ${SUPABASE_URL}`);

// Execute via Supabase REST API
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

(async () => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({ query: migrationSQL })
    });

    const data = await response.json();

    if (response.status >= 200 && response.status < 300) {
      console.log('✅ Migration executed successfully!');
      console.log('\n📊 Verify tables in Supabase:');
      console.log('1. Go to: https://taxudennjzcmjqcsgesn.supabase.co');
      console.log('2. Click "Tables" in left sidebar');
      console.log('3. You should see these 9 tables:');
      console.log('   ✓ users');
      console.log('   ✓ mineurs');
      console.log('   ✓ rentals');
      console.log('   ✓ payments');
      console.log('   ✓ audit_logs');
      console.log('   ✓ analytics_daily');
      console.log('   ✓ admin_settings');
      console.log('   ✓ challenges');
      console.log('   ✓ migration_history');
      process.exit(0);
    } else {
      console.error('❌ Migration failed:', response.status);
      console.error(data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
