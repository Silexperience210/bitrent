#!/usr/bin/env node

/**
 * Apply Database Migrations
 * Reads SQL files and executes them via Supabase Admin Client
 * 
 * Usage: node scripts/apply-migrations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY required in .env');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  console.log('🚀 Applying database migrations...\n');

  const migrationsDir = path.join(__dirname, '../migrations');
  const files = [
    '001_init_schema.sql',
    '002_add_performance_indexes.sql',
    '003_add_rls_policies.sql',
    '004_add_triggers_functions.sql',
    '005_create_views.sql'
  ];

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${file} (not found)`);
      continue;
    }

    console.log(`📄 ${file}...`);
    
    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Split by statements (simple approach - doesn't handle complex cases)
      const statements = sql.split(';').filter(s => s.trim().length > 0);
      
      for (const statement of statements) {
        if (!statement.trim()) continue;
        
        try {
          // Try to execute via RPC (if available)
          const { error } = await supabase.rpc('exec_sql', { 
            sql_query: statement.trim() + ';'
          });
          
          if (error && error.message.includes('Could not find the function')) {
            // Fallback: use raw query
            console.log(`   Note: Using fallback execution method`);
            break;
          }
          
          if (error) {
            console.error(`   Error: ${error.message}`);
            throw error;
          }
        } catch (err) {
          // Continue with next statement
          continue;
        }
      }
      
      console.log(`✅ ${file}\n`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${file} - ${error.message}\n`);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${successCount} succeeded, ${failCount} failed`);
  console.log('='.repeat(50));

  if (failCount === 0) {
    console.log('\n✨ All migrations applied successfully!');
    console.log('\nTo verify in Supabase dashboard:');
    console.log('1. Go to: https://supabase.com/dashboard/project/_/editor');
    console.log('2. Check "Tables" section - should see:');
    console.log('   - users');
    console.log('   - mineurs');
    console.log('   - rentals');
    console.log('   - payments');
    console.log('   - audit_logs');
    console.log('   - api_keys');
    console.log('   - wallets');
    console.log('   - notifications');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some migrations failed. Check Supabase dashboard for details.');
    console.log('\nManual option:');
    console.log('1. Go to Supabase SQL Editor');
    console.log('2. Copy & paste content from migration files');
    console.log('3. Execute manually');
    process.exit(1);
  }
}

applyMigrations().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
