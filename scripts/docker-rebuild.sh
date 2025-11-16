#!/bin/bash

# Docker Rebuild Script with No Cache
# This script rebuilds Docker containers without cache to ensure latest updates

set -e

echo "🚀 Rebuilding Docker containers without cache..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Stop containers
echo -e "${YELLOW}Stopping containers...${NC}"
docker compose down

# Rebuild without cache
echo -e "${YELLOW}Rebuilding without cache...${NC}"
docker compose build --no-cache

# Start containers
echo -e "${YELLOW}Starting containers...${NC}"
docker compose up -d

# Show logs
echo -e "${GREEN}✅ Rebuild complete!${NC}"
echo ""
echo "View logs with: docker compose logs -f"
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:8000"

