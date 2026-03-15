#!/bin/bash

# BitRent Database Restore Script
# Usage: ./scripts/restore-database.sh [environment] [backup_file]

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT="${1:-production}"
BACKUP_FILE="${2:-}"
BACKUP_DIR="./backups/database"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $*"
}

# Load environment variables
if [[ -f ".env.${ENVIRONMENT}" ]]; then
    set -a
    source ".env.${ENVIRONMENT}"
    set +a
fi

log "Starting database restore for ${ENVIRONMENT}..."

# If no backup file provided, find the latest one
if [[ -z "$BACKUP_FILE" ]]; then
    BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/${ENVIRONMENT}_backup_*.sql.gz 2>/dev/null | head -1)
    
    if [[ -z "$BACKUP_FILE" ]]; then
        log_error "No backup files found in $BACKUP_DIR"
        exit 1
    fi
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log "Using backup file: $BACKUP_FILE"

# Confirm for production
if [[ "$ENVIRONMENT" == "production" ]]; then
    log_warning "RESTORING PRODUCTION DATABASE - THIS WILL OVERWRITE ALL DATA!"
    read -p "Type 'restore-production' to confirm: " -r
    if [[ ! $REPLY == "restore-production" ]]; then
        log "Restore cancelled"
        exit 0
    fi
fi

# Restore database
DATABASE_URL="${DATABASE_URL:-postgresql://bitrent:dev_password@localhost:5432/bitrent_${ENVIRONMENT}}"

log "Restoring database..."
gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL" || {
    log_error "Database restore failed"
    exit 1
}

log_success "Database restored successfully from $BACKUP_FILE"

# Verify restore
log "Verifying restore..."
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
log_success "Database contains $TABLE_COUNT tables"

log_success "Restore completed successfully"
