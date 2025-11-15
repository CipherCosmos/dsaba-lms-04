#!/bin/bash
set -e

echo "=== Backend Test Suite ==="
echo ""

cd backend

echo "1. Running linting checks..."
python -m flake8 src/ --max-line-length=120 --exclude=__pycache__,migrations || echo "⚠️  Linting issues found (non-blocking)"

echo ""
echo "2. Running type checking..."
python -m mypy src/ --ignore-missing-imports || echo "⚠️  Type checking issues found (non-blocking)"

echo ""
echo "3. Running unit tests..."
pytest tests/ -m unit -v --tb=short || exit 1

echo ""
echo "4. Running integration tests..."
pytest tests/ -m integration -v --tb=short || exit 1

echo ""
echo "5. Running API tests..."
pytest tests/api/ -v --tb=short || exit 1

echo ""
echo "6. Running all tests with coverage..."
pytest tests/ --cov=src --cov-report=term-missing --cov-report=html --cov-fail-under=70 -v || exit 1

echo ""
echo "✅ All backend tests passed!"

