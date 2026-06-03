#!/bin/bash

# =============================================================================
# CareerUZ - Database Restore Script
# =============================================================================
#
# This script restores database from backup
#
# Usage:
#   ./scripts/restore_database.sh [backup_file]
#
# Example:
#   ./scripts/restore_database.sh backups/careeruz_backup_20260119_140000.db.gz
#
# =============================================================================

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}CareerUZ - Database Restore${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# Check if backup file provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: No backup file specified${NC}"
    echo ""
    echo "Available backups:"
    ls -lh backups/*.gz 2>/dev/null || echo "  No backups found"
    echo ""
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 backups/careeruz_backup_20260119_140000.db.gz"
    exit 1
fi

BACKUP_FILE="$1"
DB_FILE="./careeruz.db"
BACKUP_CURRENT="${DB_FILE}.backup_$(date +%Y%m%d_%H%M%S)"

# Check if backup exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Confirmation
echo -e "${YELLOW}⚠️  WARNING: This will replace current database!${NC}"
echo ""
echo "  Current: $DB_FILE"
echo "  Restore from: $BACKUP_FILE"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

# Backup current database
echo -e "${YELLOW}Backing up current database...${NC}"
if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_CURRENT"
    echo -e "${GREEN}✓ Current database backed up to: $BACKUP_CURRENT${NC}"
fi

# Decompress if .gz
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "${YELLOW}Decompressing backup...${NC}"
    gunzip -c "$BACKUP_FILE" > "${BACKUP_FILE%.gz}"
    RESTORE_FILE="${BACKUP_FILE%.gz}"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Restore
echo -e "${YELLOW}Restoring database...${NC}"
cp "$RESTORE_FILE" "$DB_FILE"

# Verify
if [ -f "$DB_FILE" ]; then
    DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
    echo -e "${GREEN}✓ Database restored successfully!${NC}"
    echo -e "  File: $DB_FILE"
    echo -e "  Size: $DB_SIZE"
else
    echo -e "${RED}✗ Restore failed!${NC}"
    echo -e "${YELLOW}Restoring from backup...${NC}"
    cp "$BACKUP_CURRENT" "$DB_FILE"
    exit 1
fi

# Clean up decompressed file if it was .gz
if [[ "$BACKUP_FILE" == *.gz ]] && [ -f "$RESTORE_FILE" ]; then
    rm "$RESTORE_FILE"
fi

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Restore completed!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

exit 0
