#!/bin/bash

# BitRent Performance Test Script
# Usage: ./scripts/performance-test.sh [environment] [base_url] [duration]

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT="${1:-staging}"
BASE_URL="${2:-http://localhost:3000}"
DURATION="${3:-60}"  # seconds
CONCURRENT_USERS="${4:-10}"

OUTPUT_FILE="./logs/performance_${ENVIRONMENT}_$(date +%Y%m%d_%H%M%S).txt"
mkdir -p ./logs

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$OUTPUT_FILE"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*" | tee -a "$OUTPUT_FILE"
}

log_error() {
    echo -e "${RED}✗${NC} $*" | tee -a "$OUTPUT_FILE"
}

log_info() {
    echo -e "${YELLOW}ℹ${NC} $*" | tee -a "$OUTPUT_FILE"
}

# Check if Apache Bench is available
check_ab() {
    if ! command -v ab &> /dev/null; then
        log_error "Apache Bench (ab) is not installed"
        log_info "Install with: sudo apt-get install apache2-utils (Ubuntu/Debian)"
        return 1
    fi
    return 0
}

# Check if wrk is available
check_wrk() {
    if ! command -v wrk &> /dev/null; then
        log_error "wrk is not installed"
        log_info "Install from: https://github.com/wg/wrk"
        return 1
    fi
    return 0
}

# Run Apache Bench performance test
run_ab_test() {
    log "Running Apache Bench test..."
    
    local requests=1000
    local concurrency="$CONCURRENT_USERS"
    
    log "Configuration:"
    log "  - Total Requests: $requests"
    log "  - Concurrency: $concurrency"
    log "  - Target URL: ${BASE_URL}/api/v1/miners?limit=10"
    log ""
    
    ab -n "$requests" -c "$concurrency" -t "$DURATION" \
        "${BASE_URL}/api/v1/miners?limit=10" | tee -a "$OUTPUT_FILE" || true
}

# Run custom performance test with curl
run_custom_test() {
    log "Running custom load test..."
    
    local total_requests=0
    local successful_requests=0
    local failed_requests=0
    local total_time=0
    local min_time=999999
    local max_time=0
    local sum_time=0
    
    log "Configuration:"
    log "  - Duration: ${DURATION}s"
    log "  - Concurrent users: $CONCURRENT_USERS"
    log "  - Target URL: ${BASE_URL}/api/v1/miners"
    log ""
    log "Running..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + DURATION))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        for i in $(seq 1 "$CONCURRENT_USERS"); do
            (
                local request_start=$(date +%s%N)
                local status=$(curl -s -o /dev/null -w "%{http_code}" \
                    --max-time 10 \
                    "${BASE_URL}/api/v1/miners?limit=10&page=$((RANDOM % 10 + 1))")
                local request_end=$(date +%s%N)
                
                local response_time=$(( (request_end - request_start) / 1000000 ))
                
                echo "$status|$response_time"
            ) &
        done
        wait
    done | {
        while IFS="|" read -r status response_time; do
            ((total_requests++))
            
            if [[ "$status" == "200" ]]; then
                ((successful_requests++))
            else
                ((failed_requests++))
            fi
            
            sum_time=$((sum_time + response_time))
            
            if [[ $response_time -lt $min_time ]]; then
                min_time=$response_time
            fi
            
            if [[ $response_time -gt $max_time ]]; then
                max_time=$response_time
            fi
        done
        
        local avg_time=$((sum_time / total_requests))
        local throughput=$((total_requests / DURATION))
        
        log ""
        log "=================================="
        log "Performance Test Results"
        log "=================================="
        log "Total Requests: $total_requests"
        log "Successful: $successful_requests ($(( (successful_requests * 100) / total_requests ))%)"
        log "Failed: $failed_requests"
        log "Throughput: $throughput requests/second"
        log "Response Time (min/avg/max): ${min_time}ms / ${avg_time}ms / ${max_time}ms"
        log "=================================="
        
        # Performance benchmarks
        if [[ $avg_time -lt 100 ]]; then
            log_success "Response time is excellent (< 100ms)"
        elif [[ $avg_time -lt 200 ]]; then
            log_success "Response time is good (< 200ms)"
        elif [[ $avg_time -lt 500 ]]; then
            log_info "Response time is acceptable (< 500ms)"
        else
            log_error "Response time is poor (> 500ms)"
        fi
        
        if [[ $((successful_requests * 100 / total_requests)) -ge 99 ]]; then
            log_success "Success rate is excellent (>= 99%)"
        elif [[ $((successful_requests * 100 / total_requests)) -ge 95 ]]; then
            log_success "Success rate is good (>= 95%)"
        else
            log_error "Success rate is poor (< 95%)"
        fi
    }
}

# Run resource monitoring during test
monitor_resources() {
    log ""
    log "Checking system resources..."
    
    if command -v free &> /dev/null; then
        local memory=$(free -h | grep "^Mem" | awk '{print $2, "total,", $3, "used,", $4, "free"}')
        log "Memory: $memory"
    fi
    
    if command -v uptime &> /dev/null; then
        local load=$(uptime | awk -F'load average:' '{print $2}')
        log "Load Average:$load"
    fi
    
    if command -v df &> /dev/null; then
        local disk=$(df -h / | tail -1 | awk '{print $2, "total,", $3, "used,", $4, "available"}')
        log "Disk: $disk"
    fi
}

# Main performance test flow
main() {
    log "=================================="
    log "  BitRent Performance Test"
    log "=================================="
    log "Environment: $ENVIRONMENT"
    log "Target URL: $BASE_URL"
    log "Start Time: $(date '+%Y-%m-%d %H:%M:%S')"
    log ""
    
    monitor_resources
    log ""
    
    # Try Apache Bench first
    if check_ab; then
        run_ab_test
    else
        log_info "Falling back to custom load test..."
        run_custom_test
    fi
    
    log ""
    log "Performance test completed at $(date '+%Y-%m-%d %H:%M:%S')"
    log "Results saved to: $OUTPUT_FILE"
}

main
