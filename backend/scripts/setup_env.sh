#!/bin/bash

# Setup script for DSABA LMS Backend
# This script creates a .env file with required environment variables

set -e

echo "🚀 Setting up DSABA LMS Backend Environment..."

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Generate a secure JWT secret key
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# Default database URL (SQLite for development)
DB_URL="${DATABASE_URL:-sqlite:///./exam_management.db}"

# Create .env file
cat > .env << EOF
# Application Settings
ENV=development
DEBUG=True

# JWT Security
JWT_SECRET_KEY=${JWT_SECRET}
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Database Configuration
DATABASE_URL=${DB_URL}

# Redis Configuration (optional for development)
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:5173

# Email Configuration (optional, set to true to enable)
FEATURE_EMAIL_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@example.com
SMTP_FROM_NAME=DSABA LMS
SMTP_USE_TLS=true

# SMS Configuration (optional, for future implementation)
FEATURE_SMS_ENABLED=false

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000
EOF

echo "✅ .env file created successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Review the .env file and update any values as needed"
echo "2. If using PostgreSQL, update DATABASE_URL"
echo "3. If using email, set FEATURE_EMAIL_ENABLED=true and configure SMTP settings"
echo "4. Run migrations: alembic upgrade head"
echo "5. Start the server: python -m uvicorn src.main:app --reload"
echo ""

