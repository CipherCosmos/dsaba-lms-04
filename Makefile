.PHONY: help build up down logs test clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Detect docker compose command
DOCKER_COMPOSE := $(shell which docker-compose 2>/dev/null || echo "docker compose")

build: ## Build all Docker images
	$(DOCKER_COMPOSE) build

up: ## Start all services
	$(DOCKER_COMPOSE) up -d

down: ## Stop all services
	$(DOCKER_COMPOSE) down

logs: ## View logs from all services
	$(DOCKER_COMPOSE) logs -f

logs-backend: ## View backend logs
	$(DOCKER_COMPOSE) logs -f backend

logs-frontend: ## View frontend logs
	$(DOCKER_COMPOSE) logs -f frontend

test: ## Run backend tests
	cd backend && pytest tests/ --cov=src --cov-report=term-missing -v

test-frontend: ## Run frontend tests
	cd frontend && npm run test

test-all: ## Run all tests
	./scripts/test-all.sh

test-docker: ## Run tests in Docker
	$(DOCKER_COMPOSE) exec -T backend pytest tests/ --cov=src --cov-report=term-missing -v

build-and-test: ## Build and test everything
	./scripts/build-and-test.sh

clean: ## Remove all containers, volumes, and images
	$(DOCKER_COMPOSE) down -v
	docker system prune -f

restart: ## Restart all services
	$(DOCKER_COMPOSE) restart

ps: ## Show running services
	$(DOCKER_COMPOSE) ps

shell-backend: ## Open shell in backend container
	$(DOCKER_COMPOSE) exec backend /bin/bash

shell-frontend: ## Open shell in frontend container
	$(DOCKER_COMPOSE) exec frontend /bin/sh

init-db: ## Initialize database
	$(DOCKER_COMPOSE) exec -T backend python scripts/init_db.py

migrate: ## Run database migrations
	$(DOCKER_COMPOSE) exec -T backend alembic upgrade head

health-check: ## Check service health
	@echo "Checking service health..."
	@$(DOCKER_COMPOSE) ps
	@echo ""
	@echo "Backend health:"
	@$(DOCKER_COMPOSE) exec -T backend curl -f http://localhost:8000/health || echo "Backend not healthy"
	@echo ""
	@echo "Frontend health:"
	@$(DOCKER_COMPOSE) exec -T frontend wget --spider --quiet http://localhost/ && echo "Frontend is healthy" || echo "Frontend not healthy"

prod-build: ## Build production images
	$(DOCKER_COMPOSE) -f docker-compose.prod.yml build

prod-up: ## Start production services
	$(DOCKER_COMPOSE) -f docker-compose.prod.yml up -d

prod-down: ## Stop production services
	$(DOCKER_COMPOSE) -f docker-compose.prod.yml down

