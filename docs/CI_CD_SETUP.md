# CI/CD Pipeline Setup

## Overview

A comprehensive CI/CD pipeline has been set up for the DSABA LMS project using GitHub Actions. The pipeline ensures code quality, runs all tests, and only allows deployment if all checks pass.

## Pipeline Stages

### 1. Code Quality Checks (`lint` job)
- **Python Linting**: Runs `flake8` on backend code
- **Python Type Checking**: Runs `mypy` for type validation
- **Frontend Linting**: Runs ESLint on TypeScript/React code
- **Frontend Type Checking**: Runs TypeScript compiler check

### 2. Backend Tests (`backend-tests` job)
- **Unit Tests**: Fast, isolated tests
- **Integration Tests**: Database-requiring tests
- **API Tests**: Endpoint tests
- **Coverage**: Generates coverage reports (minimum 70% required)
- **Services**: Uses PostgreSQL and Redis services

### 3. Frontend Tests (`frontend-tests` job)
- **Unit Tests**: Component and utility tests
- **Coverage**: Generates coverage reports
- **Type Checking**: TypeScript validation

### 4. Docker Build (`docker-build` job)
- **Backend Image**: Builds backend Docker image
- **Frontend Image**: Builds frontend Docker image
- **Caching**: Uses GitHub Actions cache for faster builds

### 5. Docker Compose Integration Test (`docker-compose-test` job)
- **Service Health**: Checks all services are healthy
- **Migrations**: Runs database migrations
- **Container Tests**: Runs tests inside containers
- **Logs**: Captures logs on failure

### 6. Deployment (`deploy` job)
- **Trigger**: Only on `main` branch pushes
- **Condition**: All previous jobs must pass
- **Production**: Deploys to production environment

## Workflow Triggers

The pipeline runs on:
- **Push** to `main` or `develop` branches
- **Pull Requests** to `main` or `develop` branches
- **Manual trigger** via `workflow_dispatch`

## Test Scripts

### Backend Tests
```bash
./scripts/test-backend.sh
```

Runs:
1. Linting checks
2. Type checking
3. Unit tests
4. Integration tests
5. API tests
6. Coverage report

### Frontend Tests
```bash
./scripts/test-frontend.sh
```

Runs:
1. Type checking
2. Linting
3. Tests
4. Coverage report

### All Tests
```bash
./scripts/test-all.sh
```

Runs both backend and frontend test suites.

### Build and Test
```bash
./scripts/build-and-test.sh
```

Runs:
1. Docker image builds
2. Service startup
3. Health checks
4. Database migrations
5. Backend tests
6. Frontend accessibility check

## Makefile Commands

```bash
# Build Docker images
make build

# Start services
make up

# Run all tests
make test-all

# Build and test everything
make build-and-test

# Check service health
make health-check

# View logs
make logs
make logs-backend
make logs-frontend

# Run migrations
make migrate

# Clean up
make clean
```

## Coverage Requirements

- **Backend**: Minimum 70% coverage required
- **Frontend**: Coverage reporting enabled
- **Reports**: Generated in HTML and XML formats

## Test Markers

Backend tests use pytest markers:
- `@pytest.mark.unit` - Unit tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.api` - API tests
- `@pytest.mark.slow` - Slow tests

## Environment Variables

### CI/CD Environment
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET_KEY`: JWT secret for testing
- `REDIS_URL`: Redis connection string
- `ENVIRONMENT`: Set to `test` or `ci`

### Production Environment
- `POSTGRES_PASSWORD`: Database password
- `JWT_SECRET_KEY`: Production JWT secret
- `CORS_ORIGINS`: Allowed CORS origins

## Deployment Process

1. **Code Push**: Developer pushes to `main` branch
2. **CI Pipeline**: All tests and checks run
3. **Build**: Docker images built and tested
4. **Deployment**: If all checks pass, deploy to production
5. **Health Check**: Verify production services are healthy
6. **Notification**: Team notified of deployment status

## Manual Testing

### Local Development
```bash
# Start services
make up

# Run tests
make test
make test-frontend

# Check health
make health-check

# View logs
make logs
```

### Docker Testing
```bash
# Build and test
make build-and-test

# Run tests in containers
make test-docker
```

## Troubleshooting

### Build Failures
1. Check Docker is running: `docker ps`
2. Check logs: `make logs`
3. Rebuild: `make clean && make build`

### Test Failures
1. Check database is running: `docker compose ps postgres`
2. Check Redis is running: `docker compose ps redis`
3. View test output: `make test-docker`

### Service Health Issues
1. Check service status: `make ps`
2. View service logs: `make logs-backend` or `make logs-frontend`
3. Restart services: `make restart`

## Best Practices

1. **Always run tests locally** before pushing
2. **Check CI/CD status** after pushing
3. **Fix failing tests** before merging PRs
4. **Review coverage reports** regularly
5. **Keep dependencies updated**
6. **Monitor production health** after deployment

## Next Steps

1. **Add E2E Tests**: Playwright or Cypress for end-to-end testing
2. **Performance Tests**: Load testing with k6 or Locust
3. **Security Scanning**: Add Snyk or OWASP dependency check
4. **Automated Releases**: Semantic versioning and changelog generation
5. **Monitoring**: Add application monitoring (Sentry, DataDog, etc.)
