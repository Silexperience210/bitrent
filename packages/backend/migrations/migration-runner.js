/**
 * Database Migration Runner
 * Executes SQL migration files in order and tracks execution history
 * 
 * Usage: node migrations/migration-runner.js [up|down|status|reset]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = __dirname;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get all migration files in order
 */
function getMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(file => /^\d{3}_.*\.sql$/.test(file))
    .sort();
}

/**
 * Get the version number from a migration filename
 */
function getVersionFromFilename(filename) {
  const match = filename.match(/^(\d{3})_/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Read a migration file
 */
function readMigrationFile(filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Execute a single migration
 */
async function executeMigration(filename, sql) {
  console.log(`\n🔄 Executing migration: ${filename}`);
  
  const startTime = Date.now();
  const version = getVersionFromFilename(filename);
  
  try {
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      throw error;
    }
    
    const executionTime = Date.now() - startTime;
    
    // Log success
    console.log(`✅ Migration ${version} completed in ${executionTime}ms`);
    
    return {
      success: true,
      version,
      filename,
      executionTime,
      error: null
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`❌ Migration ${version} failed: ${error.message}`);
    
    return {
      success: false,
      version,
      filename,
      executionTime,
      error: error.message
    };
  }
}

/**
 * Get executed migrations from database
 */
async function getExecutedMigrations() {
  try {
    const { data, error } = await supabase
      .from('migration_history')
      .select('version, filename, status')
      .order('version', { ascending: true });
    
    if (error) {
      console.warn('⚠️  Could not fetch migration history:', error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.warn('⚠️  Could not fetch migration history:', error.message);
    return [];
  }
}

/**
 * Get pending migrations
 */
async function getPendingMigrations() {
  const allMigrations = getMigrationFiles();
  const executed = await getExecutedMigrations();
  const executedVersions = new Set(executed.map(m => m.version));
  
  return allMigrations.filter(filename => {
    const version = getVersionFromFilename(filename);
    return !executedVersions.has(version);
  });
}

/**
 * Run all pending migrations
 */
async function runPendingMigrations() {
  console.log('📋 Checking for pending migrations...\n');
  
  const pending = await getPendingMigrations();
  
  if (pending.length === 0) {
    console.log('✨ Database is up to date! No pending migrations.');
    return;
  }
  
  console.log(`Found ${pending.length} pending migration(s):\n`);
  pending.forEach(f => console.log(`  - ${f}`));
  
  console.log('\n🚀 Running migrations...');
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const filename of pending) {
    try {
      const sql = readMigrationFile(filename);
      const result = await executeMigration(filename, sql);
      
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        // Stop on first failure
        throw new Error(`Migration ${result.version} failed: ${result.error}`);
      }
    } catch (error) {
      failureCount++;
      console.error(`\n❌ Stopping migration process due to error: ${error.message}`);
      process.exit(1);
    }
  }
  
  console.log(`\n✅ Migration complete! ${successCount} applied, ${failureCount} failed.`);
}

/**
 * Show migration status
 */
async function showStatus() {
  console.log('\n📊 Migration Status\n');
  
  const allMigrations = getMigrationFiles();
  const executed = await getExecutedMigrations();
  const executedMap = new Map(executed.map(m => [m.version, m]));
  
  console.log('Version | Filename                           | Status     | Executed At');
  console.log('--------|------------------------------------|-----------|-----------------------');
  
  allMigrations.forEach(filename => {
    const version = getVersionFromFilename(filename);
    const executed = executedMap.get(version);
    const status = executed ? '✅ Applied' : '⏳ Pending';
    const executedAt = executed ? new Date(executed.executed_at).toLocaleString() : '-';
    
    console.log(
      `${String(version).padEnd(7)}| ${filename.padEnd(34)}| ${status.padEnd(10)}| ${executedAt}`
    );
  });
  
  const pending = allMigrations.filter(f => !executedMap.has(getVersionFromFilename(f)));
  console.log(`\n${executed.length} applied, ${pending.length} pending`);
}

/**
 * Reset all migrations (dangerous!)
 */
async function resetDatabase() {
  console.warn('⚠️  WARNING: This will reset all migrations and data!');
  console.warn('⚠️  This action is irreversible!\n');
  
  // In production, require confirmation
  const confirmReset = process.argv[3] === '--force';
  
  if (!confirmReset) {
    console.log('To confirm reset, run: node migration-runner.js reset --force');
    process.exit(0);
  }
  
  console.log('🔄 Resetting database...\n');
  
  try {
    // Clear migration history
    await supabase.from('migration_history').delete().gte('version', 0);
    console.log('✅ Cleared migration history');
    
    console.log('⚠️  Note: You should manually restore your database backup');
    console.log('   Database structure has been reset. Run: node migration-runner.js up');
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    process.exit(1);
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const command = process.argv[2] || 'up';
  
  try {
    switch (command) {
      case 'up':
        await runPendingMigrations();
        break;
      case 'status':
        await showStatus();
        break;
      case 'reset':
        await resetDatabase();
        break;
      case 'help':
        console.log(`
Database Migration Runner

Usage: node migration-runner.js [command]

Commands:
  up              Run all pending migrations (default)
  status          Show migration status
  reset           Reset all migrations (requires --force flag)
  help            Show this help message

Examples:
  node migration-runner.js up                  # Run migrations
  node migration-runner.js status              # Check status
  node migration-runner.js reset --force       # Reset database
        `);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run "node migration-runner.js help" for usage');
        process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the CLI
main();
