# Docker Setup Guide

## Overview

The project uses Docker and Docker Compose for containerization and orchestration.

## Services

1. **PostgreSQL** - Database (port 5432)
2. **Redis** - Cache and Celery broker (port 6379)
3. **Backend** - FastAPI application (port 8000)
4. **Celery Worker** - Background task processor
5. **Frontend** - React application with Nginx (port 3000)

## Quick Start

### Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variables

### Development

Create `.env` file in root:

```env
POSTGRES_PASSWORD=password
JWT_SECRET_KEY=your-secret-key-here
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000,http://localhost:80
```

### Production

Set environment variables or use `.env` file:

```env
POSTGRES_DB=exam_management
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure-password
JWT_SECRET_KEY=secure-secret-key
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=https://yourdomain.com
ENVIRONMENT=production
```

## Make Commands

Use the provided Makefile for common operations:

```bash
make build      # Build all images
make up         # Start services
make down       # Stop services
make logs       # View logs
make test       # Run tests
make clean      # Clean up everything
```

## Health Checks

All services include health checks:
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`
- Backend: `curl http://localhost:8000/health`
- Frontend: `wget http://localhost/`

## Volumes

- `postgres_data`: PostgreSQL data persistence
- `redis_data`: Redis data persistence

## Networks

All services are connected via `dsaba-lms-network` bridge network.

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Check service status
docker-compose ps

# Restart services
docker-compose restart
```

### Database connection issues

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify connection
docker-compose exec postgres psql -U postgres -d exam_management
```

### Frontend can't connect to backend

1. Check backend is running: `curl http://localhost:8000/health`
2. Verify CORS_ORIGINS includes frontend URL
3. Check nginx proxy configuration in `frontend/nginx.conf`

