#!/bin/bash

# BitRent Smoke Tests Script
# Usage: ./scripts/smoke-tests.sh [environment] [base_url]

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT="${1:-staging}"
BASE_URL="${2:-http://localhost:3000}"
TESTS_PASSED=0
TESTS_FAILED=0

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}✗${NC} $*"
    ((TESTS_FAILED++))
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

# Test helper
test_endpoint() {
    local name="$1"
    local method="${2:-GET}"
    local path="$3"
    local expected_status="${4:-200}"
    local data="${5:-}"
    
    log "Testing: $name"
    
    local curl_opts=(-s -w "\n%{http_code}" --max-time 10 -X "$method")
    
    if [[ -n "$data" ]]; then
        curl_opts+=(-H "Content-Type: application/json" -d "$data")
    fi
    
    local response=$(curl "${curl_opts[@]}" "${BASE_URL}${path}" || echo "000")
    local status=$(echo "$response" | tail -1)
    local body=$(echo "$response" | head -1)
    
    if [[ "$status" == "$expected_status" ]]; then
        log_success "$name (HTTP $status)"
        echo "$body"
    else
        log_error "$name returned HTTP $status (expected $expected_status)"
        echo "$body"
        return 1
    fi
}

main() {
    log "=================================="
    log "  BitRent Smoke Tests - ${ENVIRONMENT}"
    log "=================================="
    log "Target URL: $BASE_URL"
    
    # Wait for service to be ready
    log "Waiting for service to be ready..."
    for i in {1..30}; do
        if curl -sf "${BASE_URL}/health" &>/dev/null; then
            log_success "Service is ready"
            break
        fi
        if [[ $i -eq 30 ]]; then
            log_error "Service did not become ready in time"
            exit 1
        fi
        sleep 1
    done
    
    log ""
    log "Running smoke tests..."
    log ""
    
    # 1. Health check
    test_endpoint "Health Check" GET "/health" 200 || true
    
    # 2. API Health
    test_endpoint "API Health" GET "/api/v1/health" 200 || true
    
    # 3. Get miners list
    test_endpoint "List Miners" GET "/api/v1/miners?limit=10" 200 || true
    
    # 4. Get user profile (should fail without auth)
    test_endpoint "Protected Route (no auth)" GET "/api/v1/profile" 401 || true
    
    # 5. Test login endpoint
    test_endpoint "Login Endpoint Available" POST "/api/v1/auth/login" 400 '{"email":"test@example.com"}' || true
    
    # 6. Test rental creation (should fail without auth)
    test_endpoint "Create Rental (no auth)" POST "/api/v1/rentals" 401 '{}' || true
    
    # 7. Test pagination
    test_endpoint "Pagination Test" GET "/api/v1/miners?page=1&limit=5" 200 || true
    
    # 8. Test filtering
    test_endpoint "Filter Test" GET "/api/v1/miners?hashrate_min=100" 200 || true
    
    # 9. Test sorting
    test_endpoint "Sort Test" GET "/api/v1/miners?sort=-price" 200 || true
    
    # 10. Static files
    test_endpoint "Static File" GET "/favicon.ico" 200 || true
    
    # 11. 404 handling
    log "Testing: 404 Error Handling"
    local response=$(curl -s -w "\n%{http_code}" --max-time 10 "${BASE_URL}/api/v1/nonexistent" || echo "000")
    local status=$(echo "$response" | tail -1)
    if [[ "$status" == "404" ]]; then
        log_success "404 Error Handling (HTTP 404)"
    else
        log_error "404 Error Handling returned HTTP $status (expected 404)"
    fi
    
    # 12. Response headers
    log "Testing: Response Headers"
    local headers=$(curl -s -I "${BASE_URL}/api/v1/health" | grep -E "^(Content-Type|X-)" || echo "")
    if [[ -n "$headers" ]]; then
        log_success "Response Headers Present"
    else
        log_error "No response headers found"
    fi
    
    # 13. CORS headers
    log "Testing: CORS Headers"
    local cors_header=$(curl -s -H "Origin: http://localhost:3001" "${BASE_URL}/api/v1/health" | grep -i "access-control" || echo "")
    if [[ -n "$cors_header" ]]; then
        log_success "CORS Headers Present"
    else
        log_info "CORS Headers Not Found (may be expected)"
    fi
    
    # 14. Database connectivity
    log "Testing: Database Query"
    local db_response=$(curl -s "${BASE_URL}/api/v1/miners?limit=1" | grep -E "id|name|address" || echo "")
    if [[ -n "$db_response" ]]; then
        log_success "Database Query Successful"
    else
        log_info "Database Query returned empty result"
    fi
    
    # 15. Performance baseline
    log "Testing: Response Time"
    local start_time=$(date +%s%N)
    curl -sf "${BASE_URL}/api/v1/miners?limit=10" &>/dev/null || true
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [[ $response_time -lt 500 ]]; then
        log_success "Response Time: ${response_time}ms"
    elif [[ $response_time -lt 1000 ]]; then
        log_info "Response Time: ${response_time}ms (slightly slow)"
    else
        log_error "Response Time: ${response_time}ms (too slow)"
    fi
    
    log ""
    log "=================================="
    log "Smoke Tests Summary"
    log "=================================="
    log_success "Passed: $TESTS_PASSED"
    log_error "Failed: $TESTS_FAILED"
    log "=================================="
    
    if [[ $TESTS_FAILED -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

main
