#!/bin/bash

# BitRent Database Backup Script
# Usage: ./scripts/backup-database.sh [environment]

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

ENVIRONMENT="${1:-production}"
BACKUP_DIR="./backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${ENVIRONMENT}_backup_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*"
}

# Load environment variables
if [[ -f ".env.${ENVIRONMENT}" ]]; then
    set -a
    source ".env.${ENVIRONMENT}"
    set +a
fi

log "Starting database backup for ${ENVIRONMENT}..."

# Backup Supabase database
if [[ "$ENVIRONMENT" == "production" ]]; then
    log "Backing up Supabase production database..."
    
    if [[ -z "${SUPABASE_ANON_KEY:-}" ]] || [[ -z "${SUPABASE_URL:-}" ]]; then
        log_error "Supabase credentials not configured"
        exit 1
    fi
    
    # Using curl to trigger Supabase backup API
    curl -X POST \
        "${SUPABASE_URL}/rest/v1/rpc/create_backup" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"backup_name\":\"backup_${TIMESTAMP}\"}" \
        --fail || {
        log_error "Failed to create Supabase backup"
        exit 1
    }
    
    log_success "Supabase backup initiated"
    
else
    # Local database backup
    log "Backing up local ${ENVIRONMENT} database..."
    
    DATABASE_URL="${DATABASE_URL:-postgresql://bitrent:dev_password@localhost:5432/bitrent_${ENVIRONMENT}}"
    
    pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE" || {
        log_error "Database backup failed"
        exit 1
    }
    
    log_success "Database backed up to $BACKUP_FILE"
fi

# Cleanup old backups (keep last 30 days)
log "Cleaning up old backups..."
find "$BACKUP_DIR" -name "${ENVIRONMENT}_backup_*.sql.gz" -mtime +30 -delete || {
    log_error "Failed to cleanup old backups"
}

log_success "Backup completed successfully"
