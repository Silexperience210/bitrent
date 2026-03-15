#!/bin/bash

# BitRent Phase 5 - Health Check Script
# Continuous health monitoring for production

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_URL=${1:-https://api.bitrent.io}
LOG_FILE=${2:-/var/log/bitrent/health-check.log}
CHECK_INTERVAL=60
MAX_RETRIES=3
ALERT_THRESHOLD=5

# Create log directory if needed
mkdir -p $(dirname $LOG_FILE)

# Helper functions
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> $LOG_FILE
    echo "[$timestamp] [$level] $message"
}

check_endpoint() {
    local endpoint=$1
    local expected_code=$2
    local timeout=5
    
    local response=$(curl -s -X GET "$API_URL$endpoint" \
        -w "\n%{http_code}" \
        --max-time $timeout 2>/dev/null || echo "\n000")
    
    local status_code=$(echo "$response" | tail -n 1)
    
    if [ "$status_code" = "$expected_code" ]; then
        return 0
    else
        return 1
    fi
}

# Main health check
perform_health_check() {
    local health_ok=true
    local failed_checks=0
    
    # 1. API Health
    if check_endpoint "/health" "200"; then
        log_message "OK" "API health check passed"
    else
        log_message "ERROR" "API health check failed"
        health_ok=false
        ((failed_checks++))
    fi
    
    # 2. Database connectivity
    if check_endpoint "/health/db" "200"; then
        log_message "OK" "Database connectivity OK"
    else
        log_message "WARN" "Database connectivity check failed"
        ((failed_checks++))
    fi
    
    # 3. Cache check
    if check_endpoint "/health/cache" "200"; then
        log_message "OK" "Cache connectivity OK"
    else
        log_message "WARN" "Cache connectivity check failed"
    fi
    
    # 4. External services
    if check_endpoint "/health/external" "200"; then
        log_message "OK" "External services OK"
    else
        log_message "WARN" "External services check failed"
    fi
    
    # Check if alerts should be triggered
    if [ $failed_checks -ge $ALERT_THRESHOLD ]; then
        send_alert "BitRent Health Check Failed: $failed_checks checks failed"
        health_ok=false
    fi
    
    return $([[ "$health_ok" == "true" ]] && echo 0 || echo 1)
}

send_alert() {
    local message=$1
    
    # Send to PagerDuty if configured
    if [[ ! -z "$PAGERDUTY_INTEGRATION_KEY" ]]; then
        curl -X POST "https://events.pagerduty.com/v2/enqueue" \
            -H "Content-Type: application/json" \
            -d "{
                \"routing_key\": \"$PAGERDUTY_INTEGRATION_KEY\",
                \"event_action\": \"trigger\",
                \"dedup_key\": \"bitrent-health-$(date +%s)\",
                \"payload\": {
                    \"summary\": \"$message\",
                    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                    \"severity\": \"critical\",
                    \"source\": \"BitRent Health Check\"
                }
            }" 2>/dev/null || true
    fi
    
    # Send to Slack if configured
    if [[ ! -z "$SLACK_WEBHOOK" ]]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-type: application/json' \
            --data "{\"text\": \"🚨 $message\"}" 2>/dev/null || true
    fi
    
    log_message "ALERT" "$message"
}

# Retry logic for transient failures
retry_check() {
    local attempt=1
    while [ $attempt -le $MAX_RETRIES ]; do
        if perform_health_check; then
            return 0
        fi
        if [ $attempt -lt $MAX_RETRIES ]; then
            log_message "INFO" "Retrying... (attempt $((attempt+1))/$MAX_RETRIES)"
            sleep 10
        fi
        ((attempt++))
    done
    return 1
}

# Main loop
echo -e "${BLUE}=== BitRent Health Check Service ===${NC}"
echo -e "${BLUE}API URL: $API_URL${NC}"
echo -e "${BLUE}Log File: $LOG_FILE${NC}"
echo -e "${BLUE}Check Interval: ${CHECK_INTERVAL}s${NC}\n"

log_message "INFO" "Health check service started"

while true; do
    if retry_check; then
        echo -e "${GREEN}✓ Health check passed at $(date)${NC}"
    else
        echo -e "${RED}✗ Health check FAILED at $(date)${NC}"
    fi
    
    sleep $CHECK_INTERVAL
done
