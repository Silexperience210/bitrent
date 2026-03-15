#!/bin/bash

# BitRent Phase 5 - Smoke Tests
# Quick validation after deployment

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_URL=${1:-http://localhost:3000}
TIMEOUT=10

# Counters
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local expected_code=${4:-200}
    
    echo -e "${BLUE}Testing: $name${NC}"
    echo "  $method $API_URL$endpoint"
    
    local response=$(curl -s -X $method "$API_URL$endpoint" \
        -H "Content-Type: application/json" \
        -w "\n%{http_code}" \
        --max-time $TIMEOUT 2>/dev/null || echo "\n000")
    
    local status_code=$(echo "$response" | tail -n 1)
    
    if [ "$status_code" = "$expected_code" ]; then
        echo -e "  ${GREEN}✓ Pass (HTTP $status_code)${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "  ${RED}✗ Fail (HTTP $status_code, expected $expected_code)${NC}"
        ((FAILED++))
        return 1
    fi
}

# Header
echo -e "\n${BLUE}=== BitRent Smoke Tests ===${NC}"
echo -e "${BLUE}API URL: $API_URL${NC}"
echo -e "${BLUE}Time: $(date)${NC}\n"

# 1. Health Check
echo -e "${BLUE}--- Basic Health Checks ---${NC}"
test_endpoint "Health Status" "GET" "/health" "200"
test_endpoint "Ready Status" "GET" "/health/ready" "200"

# 2. API Endpoints
echo -e "\n${BLUE}--- API Endpoints ---${NC}"
test_endpoint "List Miners" "GET" "/client/mineurs" "200"
test_endpoint "Get Stats" "GET" "/admin/stats" "200" || true

# 3. Authentication
echo -e "\n${BLUE}--- Authentication ---${NC}"
test_endpoint "Nostr Challenge" "POST" "/auth/nostr-challenge" "200"

# 4. Error Handling
echo -e "\n${BLUE}--- Error Handling ---${NC}"
test_endpoint "Not Found" "GET" "/api/nonexistent" "404"
test_endpoint "Method Not Allowed" "DELETE" "/health" "405" || true

# 5. Rate Limiting
echo -e "\n${BLUE}--- Rate Limiting ---${NC}"
for i in {1..3}; do
    curl -s -X GET "$API_URL/health" > /dev/null 2>&1
done
test_endpoint "After Rate Limit" "GET" "/health" "200"

# 6. Response Headers
echo -e "\n${BLUE}--- Security Headers ---${NC}"
HEADERS=$(curl -s -I "$API_URL/health" | grep -iE "x-content-type-options|x-frame-options|strict-transport-security" || true)

if [[ ! -z "$HEADERS" ]]; then
    echo -e "  ${GREEN}✓ Security headers present${NC}"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠ Some security headers missing${NC}"
fi

# 7. Performance
echo -e "\n${BLUE}--- Performance ---${NC}"
START=$(date +%s%N)
curl -s -X GET "$API_URL/health" > /dev/null 2>&1
END=$(date +%s%N)
DURATION=$((($END - $START) / 1000000))

echo "  Response time: ${DURATION}ms"
if [ $DURATION -lt 1000 ]; then
    echo -e "  ${GREEN}✓ Response time acceptable${NC}"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠ Response time high${NC}"
fi

# Summary
echo -e "\n${BLUE}=== Test Summary ===${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
else
    echo -e "${GREEN}Failed: $FAILED${NC}"
fi

TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
    PERCENTAGE=$((PASSED * 100 / TOTAL))
    echo -e "${BLUE}Success Rate: ${PERCENTAGE}%${NC}"
fi

echo -e "${BLUE}Time: $(date)${NC}\n"

# Exit code
if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
