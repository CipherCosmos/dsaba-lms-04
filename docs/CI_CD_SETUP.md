# CI/CD Pipeline Documentation

## Overview

The project uses GitHub Actions for Continuous Integration and Continuous Deployment.

## Pipeline Workflow

### 1. Backend Tests

- Runs on Ubuntu latest
- Sets up PostgreSQL and Redis services
- Installs Python dependencies
- Runs linting (flake8, black, isort)
- Runs pytest with coverage
- Uploads coverage to Codecov

### 2. Frontend Tests

- Runs on Ubuntu latest
- Sets up Node.js 18
- Installs npm dependencies
- Runs linting
- Builds frontend application

### 3. Docker Build

- Builds backend Docker image
- Builds frontend Docker image
- Pushes images to GitHub Container Registry
- Only runs on push to main/develop branches

### 4. Docker Compose Test

- Tests full Docker Compose setup
- Runs integration tests
- Only runs on push to main branch

## Triggers

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

## Secrets Required

No secrets required for basic CI/CD. For production deployments, you may need:

- `DOCKER_USERNAME`: Docker registry username
- `DOCKER_PASSWORD`: Docker registry password
- `DEPLOY_KEY`: SSH key for deployment

## Manual Trigger

You can manually trigger workflows from GitHub Actions tab.

## Viewing Results

1. Go to GitHub repository
2. Click on "Actions" tab
3. Select workflow run
4. View logs and test results

## Local Testing

Test CI/CD pipeline locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflow
act -j backend-test
act -j frontend-test
```

