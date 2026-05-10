#!/bin/bash

# Test script for Vercel Cron endpoints
# Usage: ./scripts/test-cron-endpoints.sh [base-url]
# Example: ./scripts/test-cron-endpoints.sh http://localhost:3000

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL (default to localhost)
BASE_URL="${1:-http://localhost:3000}"

# Load CRON_SECRET from .env.local
if [ -f .env.local ]; then
  export $(grep CRON_SECRET .env.local | xargs)
fi

if [ -z "$CRON_SECRET" ]; then
  echo -e "${RED}Error: CRON_SECRET not found in .env.local${NC}"
  echo "Please set CRON_SECRET in .env.local"
  exit 1
fi

echo -e "${YELLOW}Testing Vercel Cron Endpoints${NC}"
echo "Base URL: $BASE_URL"
echo "CRON_SECRET: ${CRON_SECRET:0:10}..."
echo ""

# Function to test an endpoint
test_endpoint() {
  local name=$1
  local path=$2
  
  echo -e "${YELLOW}Testing $name...${NC}"
  
  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$path" \
    -H "Authorization: Bearer $CRON_SECRET" \
    -H "Content-Type: application/json")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Success (HTTP $http_code)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}✗ Failed (HTTP $http_code)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  fi
  
  echo ""
}

# Test authentication failure
echo -e "${YELLOW}Testing authentication (should fail)...${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/cron/streak-check" \
  -H "Authorization: Bearer invalid-secret" \
  -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 401 ]; then
  echo -e "${GREEN}✓ Authentication check passed (HTTP $http_code)${NC}"
else
  echo -e "${RED}✗ Authentication check failed (expected 401, got $http_code)${NC}"
fi
echo ""

# Test all cron endpoints
test_endpoint "Daily Streak Check" "/api/cron/streak-check"
test_endpoint "Weekly Challenge Generation" "/api/cron/generate-challenges"
test_endpoint "Bedtime Mode Check" "/api/cron/bedtime-check"
test_endpoint "Weekly AI Insights" "/api/cron/weekly-insights"

echo -e "${GREEN}All tests completed!${NC}"
