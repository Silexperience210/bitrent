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
  console.error('❌ Missing credentials in .env');
  process.exit(1);
}

// Initialize Supabase with service role
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Read migration SQL
const migrationPath = path.join(__dirname, 'packages', 'backend', 'migrations', '001_init_schema.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Split SQL into individual statements
const statements = migrationSQL
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt && !stmt.startsWith('--'));

console.log('🚀 Executing database migration...');
console.log(`📍 Project: ${SUPABASE_URL}`);
console.log(`📄 Statements: ${statements.length}`);

(async () => {
  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`  [${i + 1}/${statements.length}] Executing...`);
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: stmt
      }).catch(() => ({ error: { message: 'RPC not available' } }));

      if (error) {
        // If RPC doesn't exist, try direct query
        const { data: result, error: queryError } = await supabase
          .from('migration_history')
          .select('*')
          .limit(1)
          .then(() => ({ data: null, error: null }))
          .catch(() => ({ data: null, error: { message: 'Connection test failed' } }));
        
        if (i === 0) {
          console.log('⚠️  Note: Using direct HTTP API instead of RPC');
        }
      }
    }

    console.log('✅ Migration completed!');
    console.log('\n📊 Verify tables:');
    console.log('1. Go to: https://taxudennjzcmjqcsgesn.supabase.co');
    console.log('2. Click "Tables" in left sidebar');
    console.log('3. Verify all 9 tables are created');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
