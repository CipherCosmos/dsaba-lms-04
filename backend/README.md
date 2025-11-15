# DSABA LMS - Backend

FastAPI backend application built with Clean Architecture and Domain-Driven Design principles.

## 🏗️ Architecture

This backend follows **Clean Architecture** with clear separation of concerns:

- **Domain Layer** (`src/domain/`): Core business logic, entities, value objects, and repository interfaces
- **Application Layer** (`src/application/`): Use cases, services, and DTOs
- **Infrastructure Layer** (`src/infrastructure/`): Database, cache, queue, and external services
- **API Layer** (`src/api/`): FastAPI endpoints, middleware, and dependencies

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 15+ (or SQLite for development)
- Redis (for caching and Celery)

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Initialize database
python scripts/init_db.py

# Run migrations
alembic upgrade head

# Start server
python run.py
# or
uvicorn src.main:app --reload
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── domain/              # Domain layer
│   │   ├── entities/        # Domain entities
│   │   ├── value_objects/   # Value objects
│   │   ├── repositories/   # Repository interfaces
│   │   ├── enums/          # Domain enums
│   │   └── exceptions/      # Domain exceptions
│   ├── application/         # Application layer
│   │   ├── services/       # Business logic services
│   │   └── dto/            # Data Transfer Objects
│   ├── infrastructure/      # Infrastructure layer
│   │   ├── database/       # Database models and repositories
│   │   ├── cache/          # Redis cache
│   │   ├── queue/          # Celery tasks
│   │   └── security/       # Security utilities
│   └── api/                # API layer
│       ├── v1/             # API v1 endpoints
│       ├── middleware/     # Middleware
│       └── dependencies.py # Dependency injection
├── tests/                   # Test suite (285 tests)
├── scripts/                 # Utility scripts
├── alembic/                 # Database migrations
└── requirements.txt         # Python dependencies
```

## 🧪 Testing

```bash
# Run all tests
pytest tests/ --cov=src --cov-report=term-missing

# Run specific test file
pytest tests/api/test_auth_endpoints.py

# Run with coverage report
pytest tests/ --cov=src --cov-report=html
```

## 📊 Test Coverage

- **285 tests passing** ✅
- **71.94% code coverage** ✅

## 🔧 Configuration

See `.env.example` for all available environment variables.

### Required Variables

- `DATABASE_URL`: Database connection string
- `JWT_SECRET_KEY`: Secret key for JWT tokens (minimum 32 characters)

### Optional Variables

- `REDIS_URL`: Redis connection string
- `CELERY_BROKER_URL`: Celery broker URL
- `CELERY_RESULT_BACKEND`: Celery result backend
- `ENVIRONMENT`: Environment (development/staging/production)

## 📚 API Documentation

Once the server is running, access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🐳 Docker

```bash
# Build image
docker build -t dsaba-lms-backend .

# Run container
docker run -p 8000:8000 --env-file .env dsaba-lms-backend
```

## 🔄 Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## 📝 Scripts

- `scripts/init_db.py`: Initialize database with admin user
- `scripts/add_admin.py`: Add admin user
- `scripts/check_db.py`: Check database connection
- `scripts/check_users.py`: List all users

## 🏆 Features

- ✅ Clean Architecture
- ✅ Domain-Driven Design
- ✅ JWT Authentication
- ✅ Role-Based Access Control
- ✅ Redis Caching
- ✅ Celery Background Tasks
- ✅ Comprehensive Testing
- ✅ API Documentation

## 📖 Documentation

See `docs/` directory for comprehensive documentation.

