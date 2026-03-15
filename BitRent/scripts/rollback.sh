#!/bin/bash

# BitRent Rollback Script
# Usage: ./scripts/rollback.sh [version] [environment]

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VERSION="${1:-}"
ENVIRONMENT="${2:-production}"
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${DEPLOY_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${DEPLOY_DIR}/logs/rollback_${TIMESTAMP}.log"

mkdir -p "${DEPLOY_DIR}/logs"

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "${LOG_FILE}"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}✗${NC} $*" | tee -a "${LOG_FILE}"
}

# Get latest backup
get_latest_backup() {
    ls -t "${BACKUP_DIR}"/backup_${ENVIRONMENT}_*.tar.gz 2>/dev/null | head -1
}

# Get previous version from Git
get_previous_version() {
    if [[ -z "$VERSION" ]]; then
        git describe --tags --abbrev=0 2>/dev/null || git rev-parse --short HEAD
    else
        echo "$VERSION"
    fi
}

# Rollback application code
rollback_code() {
    local prev_version=$(get_previous_version)
    
    log "Rolling back to version: $prev_version"
    
    git fetch --all || {
        log_error "Failed to fetch from remote"
        return 1
    }
    
    git checkout "$prev_version" || {
        log_error "Failed to checkout version $prev_version"
        return 1
    }
    
    npm install || {
        log_error "Failed to install dependencies"
        return 1
    }
    
    npm run build || {
        log_error "Failed to rebuild"
        return 1
    }
    
    log_success "Code rollback completed"
}

# Restore database from backup
restore_database() {
    log "Restoring database from backup..."
    
    "${DEPLOY_DIR}/scripts/restore-database.sh" "$ENVIRONMENT" || {
        log_error "Database restore failed"
        return 1
    }
    
    log_success "Database restored"
}

# Deploy rolled-back version
deploy_rolled_back() {
    log "Deploying rolled-back version..."
    
    if command -v railway &> /dev/null; then
        railway up --detach --message="Rollback to $VERSION" || {
            log_error "Railway deployment failed"
            return 1
        }
    else
        docker restart bitrent-api || {
            log_error "Docker restart failed"
            return 1
        }
    fi
    
    log_success "Rolled-back version deployed"
}

# Verify rollback
verify_rollback() {
    log "Verifying rollback..."
    
    local max_retries=10
    local retry=0
    
    while [[ $retry -lt $max_retries ]]; do
        if curl -f "http://localhost:3000/health" &>/dev/null; then
            log_success "Application is healthy after rollback"
            return 0
        fi
        
        log_warning "Waiting for application... ($((retry + 1))/$max_retries)"
        sleep 5
        ((retry++))
    done
    
    log_error "Application failed to become healthy"
    return 1
}

# Main rollback flow
main() {
    log "==================================="
    log "  BitRent Rollback Script"
    log "==================================="
    log "Environment: $ENVIRONMENT"
    log "Version: ${VERSION:-latest}"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_error "PRODUCTION ROLLBACK INITIATED"
        read -p "Are you SURE you want to rollback production? Type 'yes' to confirm: " -r
        if [[ ! $REPLY == "yes" ]]; then
            log "Rollback cancelled"
            exit 0
        fi
    fi
    
    rollback_code || exit 1
    
    if [[ "$ENVIRONMENT" != "development" ]]; then
        read -p "Restore database from backup? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            restore_database || exit 1
        fi
    fi
    
    deploy_rolled_back || exit 1
    verify_rollback || exit 1
    
    log_success "Rollback completed successfully!"
    log "==================================="
}

main
