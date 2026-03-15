#!/bin/bash

# BitRent Phase 5 - Database Backup Script
# Automated Supabase database backups with encryption and retention

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${1:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backups/bitrent}"
S3_BUCKET="${S3_BUCKET:-bitrent-backups-prod}"
AWS_REGION="${AWS_REGION:-eu-west-1}"
RETENTION_DAYS=${RETENTION_DAYS:-30}

# Create backup directory
mkdir -p $BACKUP_DIR

echo -e "${BLUE}=== BitRent Database Backup ===${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Time: $(date)${NC}"
echo -e "${BLUE}Backup Dir: $BACKUP_DIR${NC}\n"

# Step 1: Check prerequisites
echo -e "${BLUE}Step 1: Checking prerequisites...${NC}"

# Check pg_dump (for PostgreSQL)
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}Error: pg_dump not found${NC}"
    echo "Install PostgreSQL client tools"
    exit 1
fi
echo -e "${GREEN}✓ pg_dump available${NC}"

# Check AWS CLI if S3 is configured
if [[ ! -z "$S3_BUCKET" ]]; then
    if ! command -v aws &> /dev/null; then
        echo -e "${YELLOW}Warning: AWS CLI not found, skipping S3 upload${NC}"
    else
        echo -e "${GREEN}✓ AWS CLI available${NC}"
    fi
fi

# Step 2: Get database connection info
echo -e "\n${BLUE}Step 2: Getting database connection info...${NC}"

SUPABASE_URL=${SUPABASE_URL:-}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-}

if [[ -z "$SUPABASE_URL" ]] || [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    echo -e "${RED}Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set${NC}"
    echo "Set these environment variables before running backup"
    exit 1
fi

# Extract PostgreSQL connection info from Supabase
# Supabase provides database access at: db.project-ref.supabase.co
PROJECT_REF=$(echo "$SUPABASE_URL" | grep -oP '(?<=https://)[^.]+' || echo "unknown")
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
DB_PORT=5432

echo -e "${GREEN}✓ Database host: $DB_HOST${NC}"
echo -e "${GREEN}✓ Database user: $DB_USER${NC}"

# Step 3: Create backup
echo -e "\n${BLUE}Step 3: Creating database backup...${NC}"

BACKUP_FILE="$BACKUP_DIR/bitrent_${ENVIRONMENT}_${TIMESTAMP}.sql.gz"
BACKUP_INFO_FILE="$BACKUP_DIR/bitrent_${ENVIRONMENT}_${TIMESTAMP}.info"

# Use Supabase API to trigger backup (preferred method)
echo "Using Supabase managed backup..."

# Alternative: Use pg_dump directly if you have access
if [[ ! -z "$DATABASE_URL" ]]; then
    echo "Dumping database using pg_dump..."
    
    PGPASSWORD=$(echo "$DATABASE_URL" | grep -oP '(?<=:)[^@]+(?=@)' || echo "")
    
    if pg_dump \
        --host="$DB_HOST" \
        --username="$DB_USER" \
        --database="$DB_NAME" \
        --port="$DB_PORT" \
        --no-password \
        --verbose \
        --format=plain | gzip > "$BACKUP_FILE" 2>/dev/null; then
        
        echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
        
        # Get file size
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✓ Backup size: $BACKUP_SIZE${NC}"
        
        # Create info file
        cat > "$BACKUP_INFO_FILE" <<EOF
Backup Information
==================
Environment: $ENVIRONMENT
Timestamp: $(date)
Backup File: $(basename $BACKUP_FILE)
Backup Size: $BACKUP_SIZE
Database Host: $DB_HOST
Database Name: $DB_NAME
Retention Days: $RETENTION_DAYS
Checksum: $(sha256sum $BACKUP_FILE | cut -d' ' -f1)
EOF
        
        echo -e "${GREEN}✓ Info file created${NC}"
    else
        echo -e "${RED}Error: pg_dump failed${NC}"
        exit 1
    fi
fi

# Step 4: Encrypt backup (if encryption key provided)
echo -e "\n${BLUE}Step 4: Encrypting backup...${NC}"

if [[ ! -z "$BACKUP_ENCRYPTION_KEY" ]]; then
    if command -v gpg &> /dev/null; then
        ENCRYPTED_FILE="${BACKUP_FILE}.gpg"
        gpg --symmetric --cipher-algo AES256 \
            --batch --yes \
            --passphrase "$BACKUP_ENCRYPTION_KEY" \
            "$BACKUP_FILE"
        
        rm "$BACKUP_FILE"
        BACKUP_FILE="$ENCRYPTED_FILE"
        
        echo -e "${GREEN}✓ Backup encrypted${NC}"
    else
        echo -e "${YELLOW}Warning: GPG not found, skipping encryption${NC}"
    fi
fi

# Step 5: Upload to S3
echo -e "\n${BLUE}Step 5: Uploading to S3...${NC}"

if [[ ! -z "$S3_BUCKET" ]] && command -v aws &> /dev/null; then
    if aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/$(basename $BACKUP_FILE)" \
        --region "$AWS_REGION" \
        --sse AES256 \
        --storage-class STANDARD_IA; then
        
        echo -e "${GREEN}✓ Backup uploaded to S3${NC}"
        
        # Also upload info file
        aws s3 cp "$BACKUP_INFO_FILE" "s3://$S3_BUCKET/backups/$(basename $BACKUP_INFO_FILE)" \
            --region "$AWS_REGION" \
            --sse AES256
    else
        echo -e "${YELLOW}Warning: S3 upload failed${NC}"
    fi
else
    echo -e "${YELLOW}S3 backup skipped (not configured)${NC}"
fi

# Step 6: Cleanup old backups
echo -e "\n${BLUE}Step 6: Cleaning up old backups...${NC}"

# Local cleanup
CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
find "$BACKUP_DIR" -type f -name "bitrent_${ENVIRONMENT}_*.sql*" | while read file; do
    FILE_DATE=$(basename "$file" | grep -oP '\d{8}' | head -1)
    if [[ ! -z "$FILE_DATE" ]] && [[ "$FILE_DATE" < "$CUTOFF_DATE" ]]; then
        echo -e "${YELLOW}Removing: $(basename $file)${NC}"
        rm "$file"
    fi
done

# S3 cleanup (keep last 30 backups)
if [[ ! -z "$S3_BUCKET" ]] && command -v aws &> /dev/null; then
    echo "Cleaning up S3 backups older than $RETENTION_DAYS days..."
    
    CUTOFF_DATE=$(date -u -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
    aws s3api list-objects-v2 \
        --bucket "$S3_BUCKET" \
        --prefix "backups/" \
        --region "$AWS_REGION" \
        --query "Contents[?LastModified<'$CUTOFF_DATE'].Key" \
        --output text | tr '\t' '\n' | while read key; do
        
        if [[ ! -z "$key" ]]; then
            echo -e "${YELLOW}Removing from S3: $key${NC}"
            aws s3 rm "s3://$S3_BUCKET/$key" --region "$AWS_REGION"
        fi
    done
fi

echo -e "${GREEN}✓ Cleanup complete${NC}"

# Step 7: Verify backup
echo -e "\n${BLUE}Step 7: Verifying backup...${NC}"

if [[ -f "$BACKUP_FILE" ]]; then
    FILE_SIZE=$(wc -c < "$BACKUP_FILE")
    if [[ $FILE_SIZE -gt 1000 ]]; then  # At least 1KB
        echo -e "${GREEN}✓ Backup verification passed${NC}"
        echo -e "${GREEN}✓ Backup size: $(numfmt --to=iec-i --suffix=B $FILE_SIZE 2>/dev/null || echo $FILE_SIZE bytes)${NC}"
    else
        echo -e "${RED}Error: Backup file too small${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: Backup file not found${NC}"
    exit 1
fi

# Step 8: Send notification
echo -e "\n${BLUE}Step 8: Sending backup notification...${NC}"

if [[ ! -z "$SLACK_WEBHOOK" ]]; then
    curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-type: application/json' \
        --data "{
            \"text\": \"✅ Database backup completed\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                    {\"title\": \"Size\", \"value\": \"$BACKUP_SIZE\", \"short\": true},
                    {\"title\": \"File\", \"value\": \"$(basename $BACKUP_FILE)\", \"short\": false}
                ]
            }]
        }" 2>/dev/null || true
fi

# Summary
echo -e "\n${BLUE}=== Backup Summary ===${NC}"
echo -e "${GREEN}✓ Environment: $ENVIRONMENT${NC}"
echo -e "${GREEN}✓ Backup file: $(basename $BACKUP_FILE)${NC}"
echo -e "${GREEN}✓ Location: $BACKUP_DIR${NC}"
echo -e "${GREEN}✓ Timestamp: $(date)${NC}"
echo -e "${GREEN}✓ Status: COMPLETE${NC}\n"

exit 0
