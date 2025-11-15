#!/bin/bash

# Test script for Profile and Password Reset endpoints
# This script tests the API endpoints to ensure they work correctly

set -e

echo "🧪 Testing Profile and Password Reset Endpoints..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:8000}"
BASE_URL="${API_URL}/api/v1"

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    local token=$6
    
    echo -n "Testing: $description... "
    
    # Build curl command
    if [ -n "$token" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} (Status: $status_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        echo -e "${RED}✗${NC} (Expected: $expected_status, Got: $status_code)"
        echo "$body"
        return 1
    fi
}

# Check if server is running
echo "Checking if server is running at $API_URL..."
if ! curl -s "$API_URL/health" > /dev/null; then
    echo -e "${RED}✗ Server is not running at $API_URL${NC}"
    echo "Please start the server first: python -m uvicorn src.main:app --reload"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Test 1: Forgot Password (Public endpoint)
echo "=== Testing Forgot Password ==="
test_endpoint "POST" "/auth/forgot-password" \
    '{"email_or_username": "test@example.com"}' \
    200 \
    "Forgot password request"

# Test 2: Reset Password (Public endpoint) - Will fail without valid token
echo ""
echo "=== Testing Reset Password ==="
test_endpoint "POST" "/auth/reset-password" \
    '{"token": "invalid-token", "new_password": "NewPassword123!"}' \
    422 \
    "Reset password with invalid token"

# Test 3: Get Profile (Requires authentication)
echo ""
echo "=== Testing Profile Endpoints ==="
echo -e "${YELLOW}Note: Profile endpoints require authentication${NC}"
echo "To test profile endpoints, you need to:"
echo "1. Login first to get a token"
echo "2. Use the token in the Authorization header"
echo ""

# Example test with token (commented out - requires actual login)
# TOKEN="your-token-here"
# test_endpoint "GET" "/profile/me" "" 200 "Get my profile" "$TOKEN"
# test_endpoint "PUT" "/profile/me" \
#     '{"first_name": "John", "last_name": "Doe", "phone_number": "+1234567890"}' \
#     200 \
#     "Update my profile" \
#     "$TOKEN"

echo ""
echo -e "${GREEN}✓ Basic endpoint tests completed${NC}"
echo ""
echo "To test authenticated endpoints:"
echo "1. Login: POST $BASE_URL/auth/login"
echo "2. Get token from response"
echo "3. Use token in Authorization header: Bearer <token>"

