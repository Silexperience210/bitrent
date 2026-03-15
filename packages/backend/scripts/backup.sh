#!/bin/bash

# BitRent Database Backup Script
# Creates automated backups of Supabase PostgreSQL database
# Usage: ./backup.sh [backup_dir]

set -e

# Configuration
BACKUP_DIR="${1:-./.backups}"
BACKUP_RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/bitrent_backup_$TIMESTAMP.sql"
LOG_FILE="$BACKUP_DIR/backup.log"

# Supabase credentials (from environment variables)
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_DB_HOST="${SUPABASE_DB_HOST:-}"
SUPABASE_DB_USER="${SUPABASE_DB_USER:-}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
SUPABASE_DB_NAME="${SUPABASE_DB_NAME:-postgres}"
SUPABASE_DB_PORT="${SUPABASE_DB_PORT:-5432}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log_message() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
  echo -e "${RED}ERROR: $1${NC}" | tee -a "$LOG_FILE"
  exit 1
}

# Success message
success_message() {
  echo -e "${GREEN}✓ $1${NC}" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
  log_message "Checking prerequisites..."
  
  # Check if pg_dump is installed
  if ! command -v pg_dump &> /dev/null; then
    error_exit "pg_dump is not installed. Please install PostgreSQL client tools."
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

# Create backup directory
create_backup_dir() {
  if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    log_message "Created backup directory: $BACKUP_DIR"
  fi
}

# Perform backup
perform_backup() {
  log_message "Starting database backup..."
  log_message "Target: $SUPABASE_DB_HOST:$SUPABASE_DB_PORT/$SUPABASE_DB_NAME"
  
  # Export password for pg_dump
  export PGPASSWORD="$SUPABASE_DB_PASSWORD"
  
  # Run pg_dump with SSL (required for Supabase)
  pg_dump \
    --host="$SUPABASE_DB_HOST" \
    --port="$SUPABASE_DB_PORT" \
    --username="$SUPABASE_DB_USER" \
    --database="$SUPABASE_DB_NAME" \
    --format=plain \
    --verbose \
    --file="$BACKUP_FILE" \
    --ssl-mode=require \
    2>&1 | tee -a "$LOG_FILE"
  
  if [ $? -ne 0 ]; then
    error_exit "Backup failed"
  fi
  
  # Unset password
  unset PGPASSWORD
  
  success_message "Backup completed: $BACKUP_FILE"
}

# Compress backup
compress_backup() {
  log_message "Compressing backup..."
  
  if command -v gzip &> /dev/null; then
    gzip "$BACKUP_FILE"
    BACKUP_FILE="$BACKUP_FILE.gz"
    success_message "Backup compressed"
  else
    log_message "gzip not available, skipping compression"
  fi
}

# Get backup file size
get_backup_size() {
  if [ -f "$BACKUP_FILE" ]; then
    du -h "$BACKUP_FILE" | cut -f1
  fi
}

# Cleanup old backups
cleanup_old_backups() {
  log_message "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
  
  find "$BACKUP_DIR" -name "bitrent_backup_*.sql*" -type f -mtime +$BACKUP_RETENTION_DAYS -delete
  
  success_message "Old backups cleaned up"
}

# Verify backup
verify_backup() {
  log_message "Verifying backup integrity..."
  
  if [ ! -f "$BACKUP_FILE" ]; then
    error_exit "Backup file not found for verification"
  fi
  
  # Check file size
  BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
  
  if [ "$BACKUP_SIZE" -lt 1000 ]; then
    error_exit "Backup file is too small ($BACKUP_SIZE bytes). Backup may be corrupted."
  fi
  
  success_message "Backup verified (Size: $(get_backup_size()))"
}

# Generate report
generate_report() {
  log_message "Generating backup report..."
  
  BACKUP_SIZE=$(get_backup_size)
  BACKUP_TIMESTAMP=$(date -r "$BACKUP_FILE" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || stat -c %y "$BACKUP_FILE" 2>/dev/null)
  
  REPORT_FILE="$BACKUP_DIR/bitrent_backup_$TIMESTAMP.report"
  
  cat > "$REPORT_FILE" << EOF
BitRent Database Backup Report
==============================
Date: $BACKUP_TIMESTAMP
Backup File: $(basename "$BACKUP_FILE")
Backup Path: $BACKUP_FILE
Backup Size: $BACKUP_SIZE
Database: $SUPABASE_DB_NAME
Host: $SUPABASE_DB_HOST
Port: $SUPABASE_DB_PORT

Retention Policy: $BACKUP_RETENTION_DAYS days
Status: ✓ Success

To restore from this backup, use:
  ./restore.sh $BACKUP_FILE

EOF
  
  log_message "Report saved to: $REPORT_FILE"
}

# Main execution
main() {
  echo -e "${YELLOW}BitRent Database Backup Script${NC}"
  echo "================================"
  
  check_prerequisites
  create_backup_dir
  perform_backup
  compress_backup
  verify_backup
  cleanup_old_backups
  generate_report
  
  echo ""
  success_message "Backup completed successfully!"
  echo "Backup file: $BACKUP_FILE"
  echo "Backup size: $(get_backup_size())"
}

# Run main function
main "$@"
