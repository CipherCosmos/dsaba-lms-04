#!/bin/bash
set -e

echo "=========================================="
echo "  DSABA LMS - Complete Test Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
BACKEND_PASSED=false
FRONTEND_PASSED=false

# Run backend tests
echo -e "${YELLOW}Running Backend Tests...${NC}"
if ./scripts/test-backend.sh; then
    BACKEND_PASSED=true
    echo -e "${GREEN}✅ Backend tests passed!${NC}"
else
    echo -e "${RED}❌ Backend tests failed!${NC}"
    exit 1
fi

echo ""
echo "----------------------------------------"
echo ""

# Run frontend tests
echo -e "${YELLOW}Running Frontend Tests...${NC}"
if ./scripts/test-frontend.sh; then
    FRONTEND_PASSED=true
    echo -e "${GREEN}✅ Frontend tests passed!${NC}"
else
    echo -e "${RED}❌ Frontend tests failed!${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ All tests passed!${NC}"
echo "=========================================="

