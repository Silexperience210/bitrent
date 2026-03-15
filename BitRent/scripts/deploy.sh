#!/bin/bash

# BitRent Deployment Script
# Usage: ./scripts/deploy.sh [environment] [version]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${1:-staging}"
VERSION="${2:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="./logs/deploy_${ENVIRONMENT}_${TIMESTAMP}.log"

# Configuration
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${DEPLOY_DIR}/backups"
SCRIPTS_DIR="${DEPLOY_DIR}/scripts"

# Ensure log directory exists
mkdir -p "${DEPLOY_DIR}/logs"
mkdir -p "${BACKUP_DIR}"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "${LOG_FILE}"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}✗${NC} $*" | tee -a "${LOG_FILE}"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $*" | tee -a "${LOG_FILE}"
}

# Error handler
on_error() {
    log_error "Deployment failed at line $1"
    log "Rolling back changes..."
    if [[ "$ENVIRONMENT" == "production" ]]; then
        "${SCRIPTS_DIR}/rollback.sh" "$VERSION"
    fi
    exit 1
}

trap 'on_error $LINENO' ERR

# Validate environment
validate_environment() {
    if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        exit 1
    fi
    log "Deploying to ${BLUE}${ENVIRONMENT}${NC}"
}

# Load environment variables
load_environment_variables() {
    local env_file="${DEPLOY_DIR}/.env.${ENVIRONMENT}"
    
    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        exit 1
    fi
    
    set -a
    source "$env_file"
    set +a
    
    log_success "Loaded environment variables from $env_file"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    local required_commands=("docker" "git" "curl" "npm")
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    log_success "All prerequisites met"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        npm run test:coverage || {
            log_error "Tests failed"
            exit 1
        }
    else
        npm test || {
            log_warning "Tests failed, continuing..."
        }
    fi
    
    log_success "Tests completed"
}

# Build application
build_application() {
    log "Building application..."
    
    npm run build || {
        log_error "Build failed"
        exit 1
    }
    
    log_success "Application built successfully"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    local backup_file="${BACKUP_DIR}/backup_${ENVIRONMENT}_${TIMESTAMP}.tar.gz"
    
    tar -czf "$backup_file" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=logs \
        --exclude=dist \
        . || {
        log_error "Backup creation failed"
        exit 1
    }
    
    log_success "Backup created: $backup_file"
    echo "$backup_file"
}

# Database migration
run_migrations() {
    log "Running database migrations..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        # Backup database before migration
        "${SCRIPTS_DIR}/backup-database.sh" "$ENVIRONMENT" || {
            log_error "Database backup failed"
            exit 1
        }
    fi
    
    npm run migrate || {
        log_error "Database migration failed"
        exit 1
    }
    
    log_success "Database migrations completed"
}

# Deploy using Railway
deploy_to_railway() {
    log "Deploying to Railway (${ENVIRONMENT})..."
    
    if ! command -v "railway" &> /dev/null; then
        log_warning "Railway CLI not found, skipping Railway deployment"
        return
    fi
    
    railway link \
        --project="bitrent-${ENVIRONMENT}" \
        --environment="$ENVIRONMENT" || {
        log_warning "Could not link to Railway project"
    }
    
    railway up \
        --detach \
        --message="Deploy $(date +%Y-%m-%d_%H:%M:%S)" || {
        log_error "Railway deployment failed"
        exit 1
    }
    
    log_success "Deployment to Railway initiated"
}

# Deploy using Docker
deploy_to_docker() {
    log "Deploying Docker image..."
    
    local image_name="bitrent:${ENVIRONMENT}-${VERSION:-latest}"
    local registry="${DOCKER_REGISTRY:-}"
    
    if [[ -n "$registry" ]]; then
        image_name="${registry}/${image_name}"
    fi
    
    log "Building Docker image: $image_name"
    docker build -t "$image_name" . || {
        log_error "Docker build failed"
        exit 1
    }
    
    if [[ -n "$registry" ]]; then
        log "Pushing to registry..."
        docker push "$image_name" || {
            log_error "Docker push failed"
            exit 1
        }
    fi
    
    log_success "Docker image deployed: $image_name"
}

# Run smoke tests
run_smoke_tests() {
    log "Running smoke tests..."
    
    local max_retries=5
    local retry_count=0
    
    while [[ $retry_count -lt $max_retries ]]; do
        if curl -f "http://localhost:3000/health" &>/dev/null; then
            log_success "Application is healthy"
            npm run test:smoke || {
                log_warning "Smoke tests failed, but application is running"
            }
            return 0
        fi
        
        log_warning "Waiting for application to be ready... ($((retry_count + 1))/$max_retries)"
        sleep 10
        ((retry_count++))
    done
    
    log_error "Application failed to become healthy"
    exit 1
}

# Update DNS and cache
update_infrastructure() {
    log "Updating infrastructure..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "Purging Cloudflare cache..."
        if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
            curl -X POST \
                "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
                -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
                -H "Content-Type: application/json" \
                --data '{"purge_everything":true}' || {
                log_warning "Cloudflare purge failed"
            }
        fi
    fi
    
    log_success "Infrastructure updated"
}

# Send notifications
send_notifications() {
    local status="$1"
    local message="Deployment to ${ENVIRONMENT} ${status}"
    
    log "Sending notifications..."
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            --data "{
                \"text\": \"${message}\",
                \"blocks\": [{
                    \"type\": \"section\",
                    \"text\": {
                        \"type\": \"mrkdwn\",
                        \"text\": \"*${message}*\n*Environment:* ${ENVIRONMENT}\n*Version:* ${VERSION:-latest}\n*Time:* $(date '+%Y-%m-%d %H:%M:%S')\"
                    }
                }]
            }" || log_warning "Slack notification failed"
    fi
    
    log_success "Notifications sent"
}

# Main deployment flow
main() {
    log "==================================="
    log "  BitRent Deployment Script"
    log "==================================="
    
    validate_environment
    load_environment_variables
    check_prerequisites
    
    log "Deployment plan for ${ENVIRONMENT}:"
    log "  1. Run tests"
    log "  2. Build application"
    log "  3. Create backup"
    log "  4. Run migrations"
    log "  5. Deploy application"
    log "  6. Run smoke tests"
    log "  7. Update infrastructure"
    log "  8. Send notifications"
    
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Deployment cancelled"
        exit 0
    fi
    
    run_tests
    build_application
    create_backup
    run_migrations
    deploy_to_railway
    sleep 30  # Wait for deployment
    run_smoke_tests
    update_infrastructure
    send_notifications "SUCCEEDED ✓"
    
    log "==================================="
    log_success "Deployment completed successfully!"
    log "==================================="
}

# Run main function
main
