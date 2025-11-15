#!/bin/bash

# Migration script for DSABA LMS Backend
# This script runs database migrations with proper environment setup

set -e

echo "🔄 Running database migrations..."

# Navigate to backend directory
cd "$(dirname "$0")/.."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Running setup script..."
    ./scripts/setup_env.sh
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Set default JWT_SECRET_KEY if not set (for migrations only)
if [ -z "$JWT_SECRET_KEY" ]; then
    export JWT_SECRET_KEY="migration-secret-key-for-development-only-min-32-chars-long"
    echo "⚠️  Using default JWT_SECRET_KEY for migrations. Set JWT_SECRET_KEY in .env for production."
fi

# Set default DATABASE_URL if not set (SQLite)
if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="sqlite:///./exam_management.db"
    echo "⚠️  Using SQLite database. Set DATABASE_URL in .env for PostgreSQL."
fi

# Run migrations
echo "📊 Current database: $DATABASE_URL"
alembic upgrade head

echo "✅ Migrations completed successfully!"

