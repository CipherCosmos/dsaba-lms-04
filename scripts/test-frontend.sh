#!/bin/bash
set -e

echo "=== Frontend Test Suite ==="
echo ""

cd frontend

echo "1. Running type checking..."
npm run type-check || exit 1

echo ""
echo "2. Running linting..."
npm run lint || exit 1

echo ""
echo "3. Running tests..."
npm run test || exit 1

echo ""
echo "4. Running tests with coverage..."
npm run test:coverage || exit 1

echo ""
echo "✅ All frontend tests passed!"

