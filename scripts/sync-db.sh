#!/bin/bash

# Database Sync Script for YouTube Time
# Usage: ./sync-db.sh [push|pull]

set -e

# Configuration
LOCAL_DB="./backend/data/cache.db"
REMOTE_DB="/opt/youtube_time/backend/data/cache.db"
DOCKER_CONTEXT="motherhouse"
BACKUP_DIR="./backups"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to backup local database
backup_local() {
  local timestamp=$(date +%Y%m%d_%H%M%S)
  cp "$LOCAL_DB" "$BACKUP_DIR/cache_local_$timestamp.db"
  echo -e "${GREEN}✓ Local backup created: $BACKUP_DIR/cache_local_$timestamp.db${NC}"
}

# Function to backup remote database
backup_remote() {
  local timestamp=$(date +%Y%m%d_%H%M%S)
  # Get remote host from docker context
  REMOTE_HOST=$(docker context inspect $DOCKER_CONTEXT --format '{{.Endpoints.docker.Host}}' | sed 's/ssh:\/\///')
  
  scp "$REMOTE_HOST:$REMOTE_DB" "$BACKUP_DIR/cache_remote_$timestamp.db"
  echo -e "${GREEN}✓ Remote backup created: $BACKUP_DIR/cache_remote_$timestamp.db${NC}"
}

# Function to push local to remote
push_db() {
  echo -e "${YELLOW}📤 Pushing local database to remote...${NC}"
  
  # Backup remote first
  backup_remote
  
  # Get remote host
  REMOTE_HOST=$(docker context inspect $DOCKER_CONTEXT --format '{{.Endpoints.docker.Host}}' | sed 's/ssh:\/\///')
  
  # Copy to remote
  scp "$LOCAL_DB" "$REMOTE_HOST:$REMOTE_DB"
  
  # Restart backend container to reload database
  echo -e "${YELLOW}🔄 Restarting backend container...${NC}"
  docker --context $DOCKER_CONTEXT compose -f docker-compose.prod.yml restart youtube_time_api
  
  echo -e "${GREEN}✅ Database pushed and container restarted!${NC}"
}

# Function to pull remote to local
pull_db() {
  echo -e "${YELLOW}📥 Pulling remote database to local...${NC}"
  
  # Backup local first
  backup_local
  
  # Get remote host
  REMOTE_HOST=$(docker context inspect $DOCKER_CONTEXT --format '{{.Endpoints.docker.Host}}' | sed 's/ssh:\/\///')
  
  # Copy from remote
  scp "$REMOTE_HOST:$REMOTE_DB" "$LOCAL_DB"
  
  echo -e "${GREEN}✅ Database pulled successfully!${NC}"
}

# Main script
case "$1" in
  push)
    push_db
    ;;
  pull)
    pull_db
    ;;
  backup-local)
    backup_local
    ;;
  backup-remote)
    backup_remote
    ;;
  *)
    echo "Usage: $0 {push|pull|backup-local|backup-remote}"
    echo ""
    echo "  push           - Push local database to remote (backs up remote first)"
    echo "  pull           - Pull remote database to local (backs up local first)"
    echo "  backup-local   - Create backup of local database"
    echo "  backup-remote  - Create backup of remote database"
    exit 1
    ;;
esac
