#!/bin/bash

# BitRent Database Restore Script
# Restores database from backup
# Usage: ./restore.sh <backup_file> [--force]

set -e

BACKUP_FILE="${1:-}"
FORCE_RESTORE="${2:-}"

# Supabase credentials
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_DB_HOST="${SUPABASE_DB_HOST:-}"
SUPABASE_DB_USER="${SUPABASE_DB_USER:-}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
SUPABASE_DB_NAME="${SUPABASE_DB_NAME:-postgres}"
SUPABASE_DB_PORT="${SUPABASE_DB_PORT:-5432}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log_message() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

error_exit() {
  echo -e "${RED}ERROR: $1${NC}"
  exit 1
}

success_message() {
  echo -e "${GREEN}✓ $1${NC}"
}

warning_message() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
  log_message "Checking prerequisites..."
  
  # Check if psql is installed
  if ! command -v psql &> /dev/null; then
    error_exit "psql is not installed. Please install PostgreSQL client tools."
  fi
  
  # Check backup file
  if [ -z "$BACKUP_FILE" ]; then
    error_exit "Usage: ./restore.sh <backup_file> [--force]"
  fi
  
  # Handle gzipped files
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    if ! command -v gunzip &> /dev/null; then
      error_exit "gunzip is not installed. Cannot decompress backup file."
    fi
  fi
  
  # Check environment variables
  if [ -z "$SUPABASE_DB_HOST" ]; then
    error_exit "SUPABASE_DB_HOST environment variable not set"
  fi
  
  if [ -z "$SUPABASE_DB_USER" ]; then
    error_exit "SUPABASE_DB_USER environment variable not set"
  fi
  
  if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    error_exit "SUPABASE_DB_PASSWORD environment variable not set"
  fi
  
  success_message "Prerequisites check passed"
}

# Validate backup file
validate_backup() {
  log_message "Validating backup file: $BACKUP_FILE"
  
  if [ ! -f "$BACKUP_FILE" ]; then
    error_exit "Backup file not found: $BACKUP_FILE"
  fi
  
  # If gzipped, decompress temporarily
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    warning_message "Backup file is gzipped. Decompressing..."
    TEMP_BACKUP="/tmp/bitrent_restore_$$.sql"
    gunzip -c "$BACKUP_FILE" > "$TEMP_BACKUP"
    BACKUP_FILE="$TEMP_BACKUP"
  fi
  
  # Verify it contains SQL
  if ! head -1 "$BACKUP_FILE" | grep -q "^--.*PostgreSQL"; then
    error_exit "Backup file does not appear to be a valid PostgreSQL dump"
  fi
  
  success_message "Backup file validation passed"
}

# Confirm restore
confirm_restore() {
  if [ "$FORCE_RESTORE" != "--force" ]; then
    echo -e "${YELLOW}"
    echo "⚠️  WARNING: This will OVERWRITE the current database!"
    echo "⚠️  All existing data will be replaced with the backup data!"
    echo "⚠️  This action CANNOT be undone!"
    echo -e "${NC}"
    
    read -p "Are you sure you want to restore? Type 'yes' to confirm: " confirm
    
    if [ "$confirm" != "yes" ]; then
      log_message "Restore cancelled by user"
      exit 0
    fi
  else
    warning_message "Force restore enabled. Proceeding without confirmation."
  fi
}

# Perform restore
perform_restore() {
  log_message "Starting database restore..."
  log_message "Target: $SUPABASE_DB_HOST:$SUPABASE_DB_PORT/$SUPABASE_DB_NAME"
  
  # Export password for psql
  export PGPASSWORD="$SUPABASE_DB_PASSWORD"
  
  # Drop all existing objects first
  log_message "Dropping existing database objects..."
  
  psql \
    --host="$SUPABASE_DB_HOST" \
    --port="$SUPABASE_DB_PORT" \
    --username="$SUPABASE_DB_USER" \
    --database="$SUPABASE_DB_NAME" \
    --ssl-mode=require \
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>&1 || true
  
  # Restore from backup
  log_message "Restoring database from backup..."
  
  psql \
    --host="$SUPABASE_DB_HOST" \
    --port="$SUPABASE_DB_PORT" \
    --username="$SUPABASE_DB_USER" \
    --database="$SUPABASE_DB_NAME" \
    --ssl-mode=require \
    --file="$BACKUP_FILE" \
    2>&1 | tee /tmp/restore.log
  
  if [ $? -ne 0 ]; then
    error_exit "Restore failed. Check /tmp/restore.log for details."
  fi
  
  # Unset password
  unset PGPASSWORD
  
  success_message "Restore completed successfully"
}

# Verify restore
verify_restore() {
  log_message "Verifying restored database..."
  
  export PGPASSWORD="$SUPABASE_DB_PASSWORD"
  
  # Count tables
  TABLE_COUNT=$(psql \
    --host="$SUPABASE_DB_HOST" \
    --port="$SUPABASE_DB_PORT" \
    --username="$SUPABASE_DB_USER" \
    --database="$SUPABASE_DB_NAME" \
    --ssl-mode=require \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
  
  # Count rows in main tables
  USERS_COUNT=$(psql \
    --host="$SUPABASE_DB_HOST" \
    --port="$SUPABASE_DB_PORT" \
    --username="$SUPABASE_DB_USER" \
    --database="$SUPABASE_DB_NAME" \
    --ssl-mode=require \
    -t -c "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0")
  
  unset PGPASSWORD
  
  if [ "$TABLE_COUNT" -gt 0 ]; then
    success_message "Verification passed"
    echo "  Tables restored: $TABLE_COUNT"
    echo "  Users in database: $USERS_COUNT"
  else
    error_exit "Verification failed: No tables found in restored database"
  fi
}

# Cleanup temp files
cleanup() {
  if [ -f "/tmp/bitrent_restore_$$.sql" ]; then
    rm -f "/tmp/bitrent_restore_$$.sql"
  fi
}

# Main execution
main() {
  echo -e "${YELLOW}BitRent Database Restore Script${NC}"
  echo "=================================="
  
  check_prerequisites
  validate_backup
  confirm_restore
  perform_restore
  verify_restore
  cleanup
  
  echo ""
  success_message "Database restore completed!"
  echo "Database is ready for use."
}

# Run main with error handling
main "$@" || exit 1
