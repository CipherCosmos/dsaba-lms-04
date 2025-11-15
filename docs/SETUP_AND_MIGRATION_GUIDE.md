# Setup and Migration Guide

## Quick Start

### 1. Backend Setup

#### Prerequisites
- Python 3.11+
- PostgreSQL (or SQLite for development)
- Redis (optional, for caching and Celery)

#### Step 1: Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Step 2: Setup Environment Variables
```bash
# Option 1: Use the setup script (recommended)
./scripts/setup_env.sh

# Option 2: Manually create .env file
cp .env.example .env
# Edit .env and set your values
```

#### Step 3: Run Database Migrations
```bash
# Option 1: Use the migration script (recommended)
./scripts/run_migration.sh

# Option 2: Manual migration
export JWT_SECRET_KEY="your-secret-key-minimum-32-characters"
export DATABASE_URL="sqlite:///./exam_management.db"  # or PostgreSQL URL
alembic upgrade head
```

#### Step 4: Start the Server
```bash
python -m uvicorn src.main:app --reload
```

### 2. Frontend Setup

#### Prerequisites
- Node.js 18+
- npm or yarn

#### Step 1: Install Dependencies
```bash
npm install
```

#### Step 2: Start Development Server
```bash
npm run dev
```

## Environment Variables

### Required Variables

#### Backend
- `JWT_SECRET_KEY`: Secret key for JWT tokens (minimum 32 characters)
- `DATABASE_URL`: Database connection URL

#### Optional Variables
- `REDIS_URL`: Redis connection URL (default: redis://localhost:6379/0)
- `FRONTEND_URL`: Frontend URL for password reset links (default: http://localhost:5173)
- `SMTP_HOST`: SMTP server host (for email)
- `SMTP_PORT`: SMTP server port (default: 587)
- `SMTP_USER`: SMTP username
- `SMTP_PASSWORD`: SMTP password
- `FEATURE_EMAIL_ENABLED`: Enable email features (default: false)

### Example .env File

```env
# Application Settings
ENV=development
DEBUG=True

# JWT Security
JWT_SECRET_KEY=your-secret-key-minimum-32-characters-long
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Database Configuration
DATABASE_URL=sqlite:///./exam_management.db
# Or for PostgreSQL:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/exam_management

# Redis Configuration
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Email Configuration
FEATURE_EMAIL_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@example.com
SMTP_FROM_NAME=DSABA LMS
SMTP_USE_TLS=true
```

## Database Migrations

### Running Migrations

```bash
# Upgrade to latest
alembic upgrade head

# Downgrade one revision
alembic downgrade -1

# Show current revision
alembic current

# Show migration history
alembic history
```

### Creating New Migrations

```bash
# Auto-generate migration
alembic revision --autogenerate -m "description"

# Create empty migration
alembic revision -m "description"
```

### Migration Files

- `001_add_copo_framework_tables.py`: Initial CO-PO framework tables
- `002_fix_schema_consistency.py`: Schema consistency fixes
- `003_add_password_reset_and_profile_fields.py`: Password reset tokens and profile fields

## Testing

### Backend Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/api/test_auth_endpoints.py

# Run with coverage
pytest --cov=src --cov-report=html
```

### Frontend Tests

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## Troubleshooting

### Migration Issues

#### Issue: JWT_SECRET_KEY required error
**Solution**: Set JWT_SECRET_KEY environment variable or use the setup script:
```bash
export JWT_SECRET_KEY="your-secret-key-minimum-32-characters"
```

#### Issue: Database connection error
**Solution**: Check DATABASE_URL and ensure database is running:
```bash
# For PostgreSQL
pg_isready -h localhost -p 5432

# For SQLite
# Ensure the directory is writable
```

#### Issue: Import errors during migration
**Solution**: Ensure all dependencies are installed:
```bash
pip install -r requirements.txt
```

### API Issues

#### Issue: 401 Unauthorized
**Solution**: Check JWT token is valid and not expired. Ensure JWT_SECRET_KEY matches.

#### Issue: 403 Forbidden
**Solution**: Check user roles and permissions. Ensure user has required permissions.

#### Issue: 422 Validation Error
**Solution**: Check request body matches API schema. Review validation errors in response.

### Frontend Issues

#### Issue: API connection errors
**Solution**: Check API_BASE_URL in frontend config. Ensure backend is running.

#### Issue: CORS errors
**Solution**: Check CORS_ORIGINS in backend config. Ensure frontend URL is allowed.

## Production Deployment

### Backend

1. Set `ENV=production` in .env
2. Use strong `JWT_SECRET_KEY` (generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
3. Use PostgreSQL database
4. Enable email features and configure SMTP
5. Set up Redis for caching
6. Configure proper CORS origins
7. Use HTTPS
8. Set up monitoring and logging

### Frontend

1. Build for production: `npm run build`
2. Serve static files from `dist/` directory
3. Configure API_BASE_URL to production backend
4. Enable service worker for PWA
5. Set up CDN for assets
6. Configure proper caching headers

## Security Checklist

- [ ] Strong JWT_SECRET_KEY (minimum 32 characters)
- [ ] Secure database credentials
- [ ] HTTPS enabled in production
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (using ORM)
- [ ] XSS protection (input sanitization)
- [ ] CSRF protection
- [ ] Password reset tokens expire after 24 hours
- [ ] Email verification required
- [ ] Role-based access control enforced

## Support

For issues or questions:
1. Check the documentation in `docs/` directory
2. Review error logs
3. Check GitHub issues
4. Contact the development team

