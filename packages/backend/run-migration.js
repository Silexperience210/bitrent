#!/usr/bin/env node

/**
 * Run database migration on Supabase
 * Usage: node run-migration.js <SERVICE_KEY>
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://taxudennjzcmjqcsgesn.supabase.co';
const SERVICE_KEY = process.argv[2];

if (!SERVICE_KEY) {
  console.error('❌ Error: SERVICE_KEY required');
  console.error('Usage: node run-migration.js <SERVICE_KEY>');
  process.exit(1);
}

// Read migration file
const migrationPath = path.join(__dirname, 'migrations', '001_init_schema.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📦 Executing migration on Supabase...');
console.log(`🔗 URL: ${SUPABASE_URL}`);
console.log(`📄 File: ${migrationPath}`);
console.log(`⏱️  Lines: ${migrationSQL.split('\n').length}`);

// Parse URL
const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, SUPABASE_URL);
const options = {
  hostname: url.hostname,
  port: 443,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'apikey': SERVICE_KEY,
  }
};

const payload = JSON.stringify({
  query: migrationSQL
});

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`\n✅ Status: ${res.statusCode}`);
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✨ Migration executed successfully!');
      console.log('\n📊 Next steps:');
      console.log('1. Check Supabase dashboard: https://taxudennjzcmjqcsgesn.supabase.co');
      console.log('2. Go to "Tables" sidebar');
      console.log('3. Verify all 9 tables are created:');
      console.log('   - users');
      console.log('   - mineurs');
      console.log('   - rentals');
      console.log('   - payments');
      console.log('   - audit_logs');
      console.log('   - analytics_daily');
      console.log('   - admin_settings');
      console.log('   - challenges');
      console.log('   - migration_history');
      process.exit(0);
    } else {
      console.error('❌ Migration failed');
      try {
        const error = JSON.parse(data);
        console.error('Error:', error);
      } catch {
        console.error('Response:', data);
      }
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
  process.exit(1);
});

req.write(payload);
req.end();
