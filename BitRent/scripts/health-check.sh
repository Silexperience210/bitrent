#!/bin/bash

# BitRent Health Check Script
# Usage: ./scripts/health-check.sh [environment] [--verbose]

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT="${1:-production}"
VERBOSE="${2:-}"
BASE_URL="${BASE_URL:-https://bitrent.io}"
TIMEOUT=10

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

# Check HTTP health endpoint
check_health_endpoint() {
    log "Checking health endpoint..."
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time "$TIMEOUT" \
        "${BASE_URL}/health" || echo "000")
    
    if [[ "$response" == "200" ]]; then
        log_success "Health endpoint OK (200)"
        return 0
    else
        log_error "Health endpoint returned $response"
        return 1
    fi
}

# Check API response time
check_api_performance() {
    log "Checking API response time..."
    
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" \
        --max-time "$TIMEOUT" \
        "${BASE_URL}/api/v1/health" || echo "0")
    
    response_time=$(echo "scale=3; $response_time * 1000" | bc)
    
    if (( $(echo "$response_time < 200" | bc -l) )); then
        log_success "API response time: ${response_time}ms (< 200ms)"
        return 0
    elif (( $(echo "$response_time < 500" | bc -l) )); then
        log_warning "API response time: ${response_time}ms (acceptable)"
        return 0
    else
        log_error "API response time: ${response_time}ms (> 500ms)"
        return 1
    fi
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..."
    
    if [[ -f ".env.${ENVIRONMENT}" ]]; then
        set -a
        source ".env.${ENVIRONMENT}"
        set +a
    fi
    
    if [[ -z "${DATABASE_URL:-}" ]]; then
        log_warning "DATABASE_URL not set, skipping database check"
        return 0
    fi
    
    if psql "$DATABASE_URL" -c "SELECT 1" &>/dev/null; then
        log_success "Database connectivity OK"
        
        # Check table count
        TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
        [[ "$VERBOSE" == "--verbose" ]] && log "Database contains $TABLE_COUNT tables"
        
        return 0
    else
        log_error "Database connectivity failed"
        return 1
    fi
}

# Check SSL certificate
check_ssl() {
    log "Checking SSL certificate..."
    
    if ! command -v openssl &> /dev/null; then
        log_warning "openssl not found, skipping SSL check"
        return 0
    fi
    
    local cert_info=$(echo | openssl s_client -servername bitrent.io -connect bitrent.io:443 2>&1 | \
        openssl x509 -noout -dates 2>/dev/null)
    
    if [[ -z "$cert_info" ]]; then
        log_error "Could not retrieve SSL certificate"
        return 1
    fi
    
    local expiry_date=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
    log_success "SSL certificate valid until: $expiry_date"
    
    return 0
}

# Check cache headers
check_cache_headers() {
    log "Checking cache headers..."
    
    local headers=$(curl -s -I "${BASE_URL}/" | grep -i "cache-control" || echo "")
    
    if [[ -n "$headers" ]]; then
        log_success "Cache headers present: $headers"
        return 0
    else
        log_warning "No cache headers found"
        return 0
    fi
}

# Check security headers
check_security_headers() {
    log "Checking security headers..."
    
    local required_headers=(
        "strict-transport-security"
        "x-content-type-options"
        "x-frame-options"
        "content-security-policy"
    )
    
    local headers=$(curl -s -I "${BASE_URL}/" | tr '[:upper:]' '[:lower:]')
    local missing_count=0
    
    for header in "${required_headers[@]}"; do
        if echo "$headers" | grep -q "$header"; then
            [[ "$VERBOSE" == "--verbose" ]] && log_success "Header present: $header"
        else
            log_warning "Header missing: $header"
            ((missing_count++))
        fi
    done
    
    if [[ $missing_count -eq 0 ]]; then
        log_success "All security headers present"
        return 0
    else
        log_warning "$missing_count security headers missing"
        return 0
    fi
}

# Check Redis connectivity
check_redis() {
    log "Checking Redis connectivity..."
    
    if [[ -z "${REDIS_URL:-}" ]]; then
        log_warning "REDIS_URL not set, skipping Redis check"
        return 0
    fi
    
    if command -v redis-cli &> /dev/null; then
        if redis-cli -u "${REDIS_URL}" ping &>/dev/null; then
            log_success "Redis connectivity OK"
            return 0
        else
            log_error "Redis connectivity failed"
            return 1
        fi
    else
        log_warning "redis-cli not found, skipping Redis check"
        return 0
    fi
}

# Check uptime
check_uptime() {
    log "Checking uptime..."
    
    local uptime=$(curl -s "${BASE_URL}/api/v1/status" | grep -o '"uptime":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    
    log_success "Service uptime: $uptime"
    return 0
}

# Main health check flow
main() {
    log "=================================="
    log "  BitRent Health Check - ${ENVIRONMENT}"
    log "=================================="
    
    local failed_checks=0
    
    check_health_endpoint || ((failed_checks++))
    check_api_performance || ((failed_checks++))
    check_database || ((failed_checks++))
    check_ssl || ((failed_checks++))
    check_cache_headers || ((failed_checks++))
    check_security_headers || ((failed_checks++))
    check_redis || ((failed_checks++))
    check_uptime || ((failed_checks++))
    
    log "=================================="
    
    if [[ $failed_checks -eq 0 ]]; then
        log_success "All health checks passed!"
        exit 0
    else
        log_error "$failed_checks health checks failed"
        exit 1
    fi
}

main
