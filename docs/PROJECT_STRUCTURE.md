# Project Structure

## Overview

The project follows a clean separation between backend and frontend, with Docker containerization and CI/CD pipeline.

## Directory Structure

```
dsaba-lms-04/
├── backend/                    # Backend API (FastAPI)
│   ├── src/                    # Clean Architecture source
│   │   ├── domain/             # Domain layer
│   │   ├── application/        # Application layer
│   │   ├── infrastructure/     # Infrastructure layer
│   │   └── api/                # API layer
│   ├── tests/                  # Test suite (285 tests)
│   ├── scripts/                # Utility scripts
│   ├── Dockerfile              # Backend Docker image
│   ├── .dockerignore           # Docker ignore rules
│   └── requirements.txt        # Python dependencies
│
├── frontend/                   # Frontend Application (React)
│   ├── src/                    # React source code
│   │   ├── components/         # Reusable components
│   │   ├── pages/              # Page components
│   │   ├── modules/            # Feature modules
│   │   ├── store/              # Redux store
│   │   └── config/             # Configuration
│   ├── public/                 # Static assets
│   ├── dist/                   # Build output
│   ├── Dockerfile              # Frontend Docker image
│   ├── nginx.conf              # Nginx configuration
│   ├── .dockerignore           # Docker ignore rules
│   └── package.json            # Node dependencies
│
├── docs/                       # Documentation
│   ├── architecture/           # Architecture docs
│   ├── phases/                 # Phase summaries
│   ├── testing/                # Testing docs
│   └── verification/           # Verification reports
│
├── docker-compose.yml          # Development compose
├── docker-compose.prod.yml     # Production compose
├── Makefile                    # Common commands
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # CI/CD pipeline
└── README.md                   # Main README
```

## Services Architecture

### Backend
- **Framework**: FastAPI
- **Architecture**: Clean Architecture with DDD
- **Database**: PostgreSQL
- **Cache**: Redis
- **Background Tasks**: Celery
- **Port**: 8000

### Frontend
- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **State Management**: Redux Toolkit
- **Server**: Nginx (production)
- **Port**: 3000 (dev), 80 (Docker)

### Infrastructure
- **Database**: PostgreSQL 15
- **Cache/Broker**: Redis 7
- **Orchestration**: Docker Compose

## Docker Services

1. **postgres** - PostgreSQL database
2. **redis** - Redis cache and broker
3. **backend** - FastAPI application
4. **celery_worker** - Background task processor
5. **frontend** - React application with Nginx

## Network

All services communicate via `dsaba-lms-network` bridge network.

## Volumes

- `postgres_data` - PostgreSQL data persistence
- `redis_data` - Redis data persistence

## Environment Variables

### Backend
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET_KEY` - JWT secret key
- `REDIS_URL` - Redis connection string
- `CELERY_BROKER_URL` - Celery broker URL
- `CELERY_RESULT_BACKEND` - Celery result backend
- `ENVIRONMENT` - Environment (development/production)

### Frontend
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_API_VERSION` - API version
- `VITE_ENVIRONMENT` - Environment

## Development Workflow

1. Start services: `docker-compose up -d`
2. Make changes to code
3. Services auto-reload (backend) or rebuild (frontend)
4. Run tests: `make test`
5. View logs: `make logs`

## Production Deployment

1. Set environment variables
2. Build images: `docker-compose -f docker-compose.prod.yml build`
3. Start services: `docker-compose -f docker-compose.prod.yml up -d`
4. Monitor: `docker-compose -f docker-compose.prod.yml logs -f`

