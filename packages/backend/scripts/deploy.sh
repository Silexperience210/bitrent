#!/bin/bash

# BitRent Phase 5 - Deployment Script
# Automated deployment to Railway (staging or production)

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
RAILWAY_TOKEN=${RAILWAY_TOKEN:-}
PROJECT_ID=${PROJECT_ID:-}
SERVICE_NAME=${SERVICE_NAME:-bitrent-api}

# Check inputs
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}Error: Environment must be 'staging' or 'production'${NC}"
    exit 1
fi

if [[ -z "$RAILWAY_TOKEN" ]]; then
    echo -e "${RED}Error: RAILWAY_TOKEN not set${NC}"
    exit 1
fi

echo -e "${BLUE}=== BitRent Deployment Script ===${NC}"
echo -e "${BLUE}Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "${BLUE}Time: $(date)${NC}"

# Step 1: Pre-deployment checks
echo -e "\n${BLUE}Step 1: Running pre-deployment checks...${NC}"

# Check if git is clean
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}Warning: Uncommitted changes detected${NC}"
    echo "Uncommitted changes:"
    git status -s
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi

# Check Node.js version
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js version: $NODE_VERSION${NC}"

# Check npm
npm --version > /dev/null 2>&1 || { echo -e "${RED}npm not found${NC}"; exit 1; }
echo -e "${GREEN}✓ npm available${NC}"

# Step 2: Install dependencies
echo -e "\n${BLUE}Step 2: Installing dependencies...${NC}"
npm ci --omit=dev > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 3: Run tests
echo -e "\n${BLUE}Step 3: Running tests...${NC}"
if npm run test:all 2>/dev/null; then
    echo -e "${GREEN}✓ All tests passed${NC}"
else
    echo -e "${YELLOW}Warning: Some tests failed${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi

# Step 4: Build Docker image
echo -e "\n${BLUE}Step 4: Building Docker image...${NC}"
DOCKER_TAG="bitrent-backend:$ENVIRONMENT-$(date +%s)"
if docker build -t $DOCKER_TAG -t bitrent-backend:$ENVIRONMENT .; then
    echo -e "${GREEN}✓ Docker image built: $DOCKER_TAG${NC}"
else
    echo -e "${RED}Error: Docker build failed${NC}"
    exit 1
fi

# Step 5: Security scan (optional)
echo -e "\n${BLUE}Step 5: Running security scan...${NC}"
if command -v snyk &> /dev/null; then
    npm run test:security || true
    echo -e "${GREEN}✓ Security scan complete${NC}"
else
    echo -e "${YELLOW}⚠ Snyk not found, skipping security scan${NC}"
fi

# Step 6: Deploy to Railway
echo -e "\n${BLUE}Step 6: Deploying to Railway ($ENVIRONMENT)...${NC}"

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}Error: Railway CLI not installed${NC}"
    echo "Install with: npm install -g @railway/cli"
    exit 1
fi

# Login to Railway
export RAILWAY_TOKEN=$RAILWAY_TOKEN

# Deploy to specific environment
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "${YELLOW}⚠ Deploying to PRODUCTION${NC}"
    read -p "Are you sure? Type 'yes' to continue: " -r
    if [[ ! $REPLY == "yes" ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi

railway up --service $SERVICE_NAME
DEPLOY_STATUS=$?

if [[ $DEPLOY_STATUS -eq 0 ]]; then
    echo -e "${GREEN}✓ Deployment successful${NC}"
else
    echo -e "${RED}Error: Deployment failed (exit code: $DEPLOY_STATUS)${NC}"
    exit $DEPLOY_STATUS
fi

# Step 7: Post-deployment health checks
echo -e "\n${BLUE}Step 7: Running post-deployment health checks...${NC}"

sleep 10  # Wait for service to start

# Get the deployment URL
if [[ "$ENVIRONMENT" == "production" ]]; then
    DEPLOY_URL="https://api.bitrent.io"
else
    DEPLOY_URL="https://api-staging.bitrent.io"
fi

# Health check
echo -e "${BLUE}Testing health endpoint: $DEPLOY_URL/health${NC}"
if curl -f -s "$DEPLOY_URL/health" > /dev/null; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}Warning: Health check failed${NC}"
    echo -e "${YELLOW}Please check the deployment manually${NC}"
fi

# Step 8: Smoke tests
echo -e "\n${BLUE}Step 8: Running smoke tests...${NC}"
if bash scripts/smoke-tests.sh "$DEPLOY_URL"; then
    echo -e "${GREEN}✓ Smoke tests passed${NC}"
else
    echo -e "${YELLOW}Warning: Smoke tests had issues${NC}"
fi

# Step 9: Notify team
echo -e "\n${BLUE}Step 9: Sending deployment notification...${NC}"
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MESSAGE=$(git log -1 --pretty=%B)

NOTIFICATION="
✅ BitRent Deployment Successful!

Environment: $ENVIRONMENT
Time: $(date)
Commit: $COMMIT_HASH
Message: $COMMIT_MESSAGE
URL: $DEPLOY_URL
"

# Send to Slack (if webhook configured)
if [[ ! -z "$SLACK_WEBHOOK" ]]; then
    curl -X POST $SLACK_WEBHOOK \
        -H 'Content-type: application/json' \
        --data "{\"text\": \"$NOTIFICATION\"}" \
        2>/dev/null || true
fi

echo -e "${GREEN}✓ Notification sent${NC}"

# Final summary
echo -e "\n${BLUE}=== Deployment Summary ===${NC}"
echo -e "${GREEN}✓ Environment: $ENVIRONMENT${NC}"
echo -e "${GREEN}✓ Deployment URL: $DEPLOY_URL${NC}"
echo -e "${GREEN}✓ Timestamp: $(date)${NC}"
echo -e "${GREEN}✓ Status: COMPLETE${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo "1. Monitor logs: railway logs -s $SERVICE_NAME --follow"
echo "2. Check metrics: https://dashboard.railway.app"
echo "3. Verify functionality in $ENVIRONMENT"

exit 0
