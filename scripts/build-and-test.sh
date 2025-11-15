#!/bin/bash
set -e

# Detect docker compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "❌ Docker Compose not found. Please install Docker Compose."
    exit 1
fi

echo "=========================================="
echo "  DSABA LMS - Build and Test"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Build Docker images
echo -e "${YELLOW}Step 1: Building Docker images...${NC}"
if $DOCKER_COMPOSE build; then
    echo -e "${GREEN}✅ Docker images built successfully${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

echo ""

# Step 2: Start services
echo -e "${YELLOW}Step 2: Starting services...${NC}"
$DOCKER_COMPOSE up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 15

# Check service health
echo -e "${YELLOW}Checking service health...${NC}"
if $DOCKER_COMPOSE ps | grep -q "healthy\|Up"; then
    echo -e "${GREEN}✅ Services are running${NC}"
else
    echo -e "${RED}❌ Some services are not healthy${NC}"
    $DOCKER_COMPOSE ps
    $DOCKER_COMPOSE logs
    exit 1
fi

echo ""

# Step 3: Run database migrations
echo -e "${YELLOW}Step 3: Running database migrations...${NC}"
if $DOCKER_COMPOSE exec -T backend alembic upgrade head; then
    echo -e "${GREEN}✅ Migrations completed${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    $DOCKER_COMPOSE logs backend
    exit 1
fi

echo ""

# Step 4: Run backend tests
echo -e "${YELLOW}Step 4: Running backend tests...${NC}"
if $DOCKER_COMPOSE exec -T backend pytest tests/ --cov=src --cov-report=term-missing -v; then
    echo -e "${GREEN}✅ Backend tests passed${NC}"
else
    echo -e "${RED}❌ Backend tests failed${NC}"
    $DOCKER_COMPOSE logs backend
    exit 1
fi

echo ""

# Step 5: Check frontend build
echo -e "${YELLOW}Step 5: Checking frontend build...${NC}"
if $DOCKER_COMPOSE exec -T frontend wget --spider --quiet http://localhost/; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${RED}❌ Frontend is not accessible${NC}"
    $DOCKER_COMPOSE logs frontend
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Build and test completed successfully!${NC}"
echo "=========================================="

