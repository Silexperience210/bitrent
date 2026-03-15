#!/usr/bin/env node

/**
 * Database Setup Script
 * Executes all SQL migrations directly via Supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY required in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function executeSql(sql) {
  try {
    // Use raw SQL via Supabase RPC or direct query
    const { data, error } = await supabase.rpc('exec', { sql_text: sql });
    
    if (error) {
      console.error(`Error executing SQL: ${error.message}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Exception: ${error.message}`);
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');

  const migrationsDir = path.join(__dirname, '../migrations');
  const files = [
    '001_init_schema.sql',
    '002_add_performance_indexes.sql',
    '003_add_rls_policies.sql',
    '004_add_triggers_functions.sql',
    '005_create_views.sql'
  ];

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${file} (not found)`);
      continue;
    }

    console.log(`📄 Running ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    const success = await executeSql(sql);
    
    if (success) {
      console.log(`✅ ${file} completed\n`);
    } else {
      console.log(`❌ ${file} failed - skipping\n`);
    }
  }

  console.log('✨ Database setup complete!');
  console.log('\nTo verify:');
  console.log('1. Go to Supabase dashboard');
  console.log('2. Check "Tables" in the left sidebar');
  console.log('3. You should see: users, mineurs, rentals, payments, audit_logs, etc.');
}

setupDatabase().catch(console.error);
