#!/bin/bash

# =============================================================================
# CareerUZ - Database Backup Script
# =============================================================================
#
# This script creates automatic backups of your database
#
# Usage:
#   ./scripts/backup_database.sh
#
# Setup cron job (daily at 2 AM):
#   crontab -e
#   0 2 * * * /path/to/careeruz/backend/scripts/backup_database.sh
#
# =============================================================================

# Configuration
BACKUP_DIR="./backups"
DB_FILE="./careeruz.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/careeruz_backup_$DATE.db"
MAX_BACKUPS=30  # Keep last 30 backups

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}CareerUZ - Database Backup${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}Creating backup directory...${NC}"
    mkdir -p "$BACKUP_DIR"
fi

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo -e "${RED}Error: Database file not found: $DB_FILE${NC}"
    exit 1
fi

# Create backup
echo -e "${YELLOW}Creating backup...${NC}"
cp "$DB_FILE" "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup created successfully!${NC}"
    echo -e "  File: $BACKUP_FILE"
    echo -e "  Size: $BACKUP_SIZE"
else
    echo -e "${RED}✗ Backup failed!${NC}"
    exit 1
fi

# Compress backup (optional)
echo -e "${YELLOW}Compressing backup...${NC}"
gzip "$BACKUP_FILE"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

if [ -f "$COMPRESSED_FILE" ]; then
    COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup compressed!${NC}"
    echo -e "  File: $COMPRESSED_FILE"
    echo -e "  Size: $COMPRESSED_SIZE"
fi

# Clean old backups (keep last MAX_BACKUPS)
echo -e "${YELLOW}Cleaning old backups...${NC}"
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.gz 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
    echo -e "${YELLOW}Found $BACKUP_COUNT backups. Deleting oldest $DELETE_COUNT...${NC}"
    
    ls -1t "$BACKUP_DIR"/*.gz | tail -n "$DELETE_COUNT" | xargs rm -f
    
    echo -e "${GREEN}✓ Cleaned $DELETE_COUNT old backups${NC}"
else
    echo -e "${GREEN}✓ $BACKUP_COUNT backups found (limit: $MAX_BACKUPS)${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Backup completed successfully!${NC}"
echo -e "${GREEN}==================================${NC}"
echo -e "  Date: $(date)"
echo -e "  Backup: $COMPRESSED_FILE"
echo -e "  Total backups: $(ls -1 "$BACKUP_DIR"/*.gz 2>/dev/null | wc -l)"
echo ""

# Upload to cloud (optional - uncomment to enable)
# echo -e "${YELLOW}Uploading to cloud storage...${NC}"
# 
# # AWS S3
# # aws s3 cp "$COMPRESSED_FILE" s3://your-bucket/backups/
# 
# # Google Cloud Storage
# # gsutil cp "$COMPRESSED_FILE" gs://your-bucket/backups/
# 
# echo -e "${GREEN}✓ Uploaded to cloud${NC}"

exit 0
