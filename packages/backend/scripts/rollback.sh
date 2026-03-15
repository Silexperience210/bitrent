#!/bin/bash

# BitRent Phase 5 - Rollback Script
# Automated rollback to previous deployment

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${1:-staging}
RAILWAY_TOKEN=${RAILWAY_TOKEN:-}
SERVICE_NAME=${SERVICE_NAME:-bitrent-api}

if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}Error: Environment must be 'staging' or 'production'${NC}"
    exit 1
fi

if [[ -z "$RAILWAY_TOKEN" ]]; then
    echo -e "${RED}Error: RAILWAY_TOKEN not set${NC}"
    exit 1
fi

echo -e "${BLUE}=== BitRent Rollback Script ===${NC}"
echo -e "${RED}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Time: $(date)${NC}"

# Confirmation for production
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "${RED}⚠ WARNING: Rolling back PRODUCTION${NC}"
    echo "This will revert to the previous deployment."
    read -p "Type 'ROLLBACK_PROD' to confirm: " -r
    if [[ ! $REPLY == "ROLLBACK_PROD" ]]; then
        echo -e "${BLUE}Rollback cancelled${NC}"
        exit 0
    fi
fi

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}Error: Railway CLI not installed${NC}"
    exit 1
fi

export RAILWAY_TOKEN=$RAILWAY_TOKEN

# Step 1: Get current deployments
echo -e "\n${BLUE}Step 1: Fetching deployment history...${NC}"
DEPLOYMENTS=$(railway list)
echo "$DEPLOYMENTS"

# Step 2: Get previous deployment
echo -e "\n${BLUE}Step 2: Identifying previous deployment...${NC}"
PREVIOUS_DEPLOYMENT=$(echo "$DEPLOYMENTS" | sed -n '2p' | awk '{print $1}')

if [[ -z "$PREVIOUS_DEPLOYMENT" ]]; then
    echo -e "${RED}Error: No previous deployment found${NC}"
    exit 1
fi

echo -e "${YELLOW}Previous deployment: $PREVIOUS_DEPLOYMENT${NC}"

# Step 3: Pre-rollback checks
echo -e "\n${BLUE}Step 3: Running pre-rollback checks...${NC}"

# Get current status
echo -e "${BLUE}Current status:${NC}"
railway status -s $SERVICE_NAME || true

# Step 4: Execute rollback
echo -e "\n${BLUE}Step 4: Rolling back to previous deployment...${NC}"
read -p "Are you ready to rollback? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Rollback cancelled${NC}"
    exit 0
fi

railway redeploy $PREVIOUS_DEPLOYMENT -s $SERVICE_NAME
ROLLBACK_STATUS=$?

if [[ $ROLLBACK_STATUS -eq 0 ]]; then
    echo -e "${GREEN}✓ Rollback initiated${NC}"
else
    echo -e "${RED}Error: Rollback failed (exit code: $ROLLBACK_STATUS)${NC}"
    exit $ROLLBACK_STATUS
fi

# Step 5: Wait for rollback
echo -e "\n${BLUE}Step 5: Waiting for rollback to complete...${NC}"
sleep 15

# Step 6: Post-rollback health checks
echo -e "\n${BLUE}Step 6: Running health checks...${NC}"

if [[ "$ENVIRONMENT" == "production" ]]; then
    DEPLOY_URL="https://api.bitrent.io"
else
    DEPLOY_URL="https://api-staging.bitrent.io"
fi

echo -e "${BLUE}Testing health endpoint: $DEPLOY_URL/health${NC}"
RETRY_COUNT=0
MAX_RETRIES=10

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s "$DEPLOY_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Health check passed${NC}"
        HEALTH_OK=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -e "${YELLOW}Retry $RETRY_COUNT/$MAX_RETRIES...${NC}"
    sleep 5
done

if [[ "$HEALTH_OK" != "true" ]]; then
    echo -e "${RED}Warning: Health check failed after rollback${NC}"
    echo -e "${YELLOW}Please investigate manually${NC}"
fi

# Step 7: Notify team
echo -e "\n${BLUE}Step 7: Sending rollback notification...${NC}"

NOTIFICATION="
🔄 BitRent Rollback Completed!

Environment: $ENVIRONMENT
Time: $(date)
Previous Deployment: $PREVIOUS_DEPLOYMENT
URL: $DEPLOY_URL
Status: $([ "$HEALTH_OK" == "true" ] && echo "✅ Healthy" || echo "⚠️ Check Required")
"

# Send to Slack
if [[ ! -z "$SLACK_WEBHOOK" ]]; then
    curl -X POST $SLACK_WEBHOOK \
        -H 'Content-type: application/json' \
        --data "{\"text\": \"$NOTIFICATION\"}" \
        2>/dev/null || true
fi

echo -e "${GREEN}✓ Notification sent${NC}"

# Final summary
echo -e "\n${BLUE}=== Rollback Summary ===${NC}"
echo -e "${GREEN}✓ Environment: $ENVIRONMENT${NC}"
echo -e "${GREEN}✓ Rolled back to: $PREVIOUS_DEPLOYMENT${NC}"
echo -e "${GREEN}✓ URL: $DEPLOY_URL${NC}"
echo -e "${GREEN}✓ Timestamp: $(date)${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo "1. Verify the application is working correctly"
echo "2. Investigate the issue that caused the rollback"
echo "3. Check logs: railway logs -s $SERVICE_NAME --follow"
echo "4. Create an incident report"

exit 0
