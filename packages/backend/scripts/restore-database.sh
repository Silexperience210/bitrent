#!/bin/bash

# BitRent Phase 5 - Database Restore Script
# Restore from encrypted backup

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_FILE=${1:-}
ENVIRONMENT=${2:-staging}
BACKUP_ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY:-}

echo -e "${BLUE}=== BitRent Database Restore ===${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Time: $(date)${NC}\n"

# Validation
if [[ -z "$BACKUP_FILE" ]]; then
    echo -e "${RED}Error: Backup file not provided${NC}"
    echo "Usage: $0 <backup-file> [environment]"
    exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Restore for production requires explicit confirmation
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "${RED}⚠ WARNING: Restoring to PRODUCTION${NC}"
    echo "This will overwrite the production database!"
    read -p "Type 'RESTORE_PROD' to confirm: " -r
    if [[ ! $REPLY == "RESTORE_PROD" ]]; then
        echo -e "${BLUE}Restore cancelled${NC}"
        exit 0
    fi
fi

# Step 1: Decrypt backup if needed
echo -e "${BLUE}Step 1: Preparing backup file...${NC}"

WORKING_FILE="$BACKUP_FILE"
if [[ "$BACKUP_FILE" == *.gpg ]]; then
    if [[ -z "$BACKUP_ENCRYPTION_KEY" ]]; then
        echo -e "${RED}Error: Backup is encrypted but no key provided${NC}"
        exit 1
    fi
    
    if ! command -v gpg &> /dev/null; then
        echo -e "${RED}Error: GPG not found${NC}"
        exit 1
    fi
    
    WORKING_FILE="${BACKUP_FILE%.gpg}.sql.tmp"
    
    echo "Decrypting backup..."
    gpg --batch --yes \
        --passphrase "$BACKUP_ENCRYPTION_KEY" \
        --output "$WORKING_FILE" \
        "$BACKUP_FILE"
    
    echo -e "${GREEN}✓ Backup decrypted${NC}"
else
    # If it's compressed, decompress it
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        WORKING_FILE="${BACKUP_FILE%.gz}"
        if [[ ! -f "$WORKING_FILE" ]]; then
            gunzip -c "$BACKUP_FILE" > "$WORKING_FILE"
        fi
    fi
fi

# Verify working file
if [[ ! -f "$WORKING_FILE" ]]; then
    echo -e "${RED}Error: Failed to prepare backup file${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backup file ready${NC}"

# Step 2: Get database connection info
echo -e "\n${BLUE}Step 2: Getting database connection info...${NC}"

SUPABASE_URL=${SUPABASE_URL:-}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-}

if [[ -z "$SUPABASE_URL" ]]; then
    echo -e "${RED}Error: SUPABASE_URL not set${NC}"
    exit 1
fi

PROJECT_REF=$(echo "$SUPABASE_URL" | grep -oP '(?<=https://)[^.]+' || echo "unknown")
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
DB_PORT=5432

echo -e "${GREEN}✓ Database host: $DB_HOST${NC}"

# Step 3: Create backup of current database (safety measure)
echo -e "\n${BLUE}Step 3: Creating safety backup...${NC}"

SAFETY_BACKUP="/tmp/bitrent_safety_$(date +%s).sql.gz"
echo "Creating safety backup to: $SAFETY_BACKUP"

if pg_dump \
    --host="$DB_HOST" \
    --username="$DB_USER" \
    --database="$DB_NAME" \
    --port="$DB_PORT" \
    --no-password | gzip > "$SAFETY_BACKUP" 2>/dev/null; then
    echo -e "${GREEN}✓ Safety backup created${NC}"
else
    echo -e "${YELLOW}Warning: Could not create safety backup${NC}"
fi

# Step 4: Verify backup integrity
echo -e "\n${BLUE}Step 4: Verifying backup integrity...${NC}"

if file "$WORKING_FILE" | grep -q "SQL"; then
    echo -e "${GREEN}✓ Backup file format valid${NC}"
elif gunzip -t "$WORKING_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ Backup file format valid (gzip)${NC}"
else
    echo -e "${YELLOW}Warning: Could not verify backup file${NC}"
fi

# Step 5: Restore database
echo -e "\n${BLUE}Step 5: Restoring database...${NC}"
echo -e "${YELLOW}⚠ This may take several minutes...${NC}\n"

if psql \
    --host="$DB_HOST" \
    --username="$DB_USER" \
    --database="$DB_NAME" \
    --port="$DB_PORT" \
    --no-password \
    --file="$WORKING_FILE" 2>&1 | tail -20; then
    
    echo -e "\n${GREEN}✓ Database restore complete${NC}"
    RESTORE_SUCCESS=true
else
    echo -e "\n${RED}Error: Database restore failed${NC}"
    RESTORE_SUCCESS=false
fi

# Step 6: Verify restore
echo -e "\n${BLUE}Step 6: Verifying restore...${NC}"

# Check if tables exist
TABLE_COUNT=$(psql \
    --host="$DB_HOST" \
    --username="$DB_USER" \
    --database="$DB_NAME" \
    --port="$DB_PORT" \
    --no-password \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "0")

if [[ $TABLE_COUNT -gt 0 ]]; then
    echo -e "${GREEN}✓ Database tables verified: $TABLE_COUNT tables${NC}"
else
    echo -e "${RED}Warning: No tables found in database${NC}"
fi

# Step 7: Run migrations if needed
echo -e "\n${BLUE}Step 7: Running post-restore checks...${NC}"

if [[ -f "scripts/migrate.js" ]]; then
    echo "Running migrations..."
    npm run migrate || true
fi

# Step 8: Cleanup
echo -e "\n${BLUE}Step 8: Cleaning up...${NC}"

if [[ "$WORKING_FILE" != "$BACKUP_FILE" ]]; then
    rm -f "$WORKING_FILE"
    echo -e "${GREEN}✓ Temporary files cleaned${NC}"
fi

# Step 9: Notification
echo -e "\n${BLUE}Step 9: Sending restore notification...${NC}"

if [[ ! -z "$SLACK_WEBHOOK" ]]; then
    if [[ "$RESTORE_SUCCESS" == "true" ]]; then
        COLOR="good"
        STATUS="✅ successful"
    else
        COLOR="danger"
        STATUS="❌ failed"
    fi
    
    curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-type: application/json' \
        --data "{
            \"attachments\": [{
                \"color\": \"$COLOR\",
                \"title\": \"Database Restore $STATUS\",
                \"fields\": [
                    {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                    {\"title\": \"Time\", \"value\": \"$(date)\", \"short\": true},
                    {\"title\": \"Tables Restored\", \"value\": \"$TABLE_COUNT\", \"short\": true},
                    {\"title\": \"Safety Backup\", \"value\": \"$SAFETY_BACKUP\", \"short\": true}
                ]
            }]
        }" 2>/dev/null || true
fi

# Summary
echo -e "\n${BLUE}=== Restore Summary ===${NC}"
echo -e "${GREEN}✓ Environment: $ENVIRONMENT${NC}"
echo -e "${GREEN}✓ Backup file: $(basename $BACKUP_FILE)${NC}"
if [[ "$RESTORE_SUCCESS" == "true" ]]; then
    echo -e "${GREEN}✓ Status: SUCCESS${NC}"
    echo -e "${GREEN}✓ Tables restored: $TABLE_COUNT${NC}"
    if [[ ! -z "$SAFETY_BACKUP" ]]; then
        echo -e "${GREEN}✓ Safety backup: $SAFETY_BACKUP${NC}"
    fi
else
    echo -e "${RED}✗ Status: FAILED${NC}"
    echo -e "${YELLOW}Check the error messages above${NC}"
fi
echo -e "${GREEN}✓ Timestamp: $(date)${NC}\n"

if [[ "$RESTORE_SUCCESS" == "true" ]]; then
    exit 0
else
    exit 1
fi
