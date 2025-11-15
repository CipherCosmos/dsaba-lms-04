.PHONY: help build up down logs test clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

test: ## Run backend tests
	cd backend && pytest tests/ --cov=src --cov-report=term-missing -v

test-docker: ## Run tests in Docker
	docker-compose exec backend pytest tests/ --cov=src --cov-report=term-missing -v

clean: ## Remove all containers, volumes, and images
	docker-compose down -v
	docker system prune -f

restart: ## Restart all services
	docker-compose restart

ps: ## Show running services
	docker-compose ps

shell-backend: ## Open shell in backend container
	docker-compose exec backend /bin/bash

shell-frontend: ## Open shell in frontend container
	docker-compose exec frontend /bin/sh

init-db: ## Initialize database
	docker-compose exec backend python scripts/init_db.py

migrate: ## Run database migrations
	docker-compose exec backend alembic upgrade head

prod-build: ## Build production images
	docker-compose -f docker-compose.prod.yml build

prod-up: ## Start production services
	docker-compose -f docker-compose.prod.yml up -d

prod-down: ## Stop production services
	docker-compose -f docker-compose.prod.yml down

