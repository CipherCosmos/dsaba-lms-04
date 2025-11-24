# Deployment Guide – DSABA LMS

## Prerequisites
- Docker and Docker Compose
- Kubernetes cluster (EKS or equivalent), NGINX ingress, cert-manager
- PostgreSQL and Redis services
- CI/CD credentials and secrets (AWS ECR, Slack webhook, etc.)

## Environments
- Development: `docker-compose.yml`
- Production: `docker-compose.prod.yml` and `k8s/*`

## Configuration
- Backend environment variables in `backend/src/config.py`:
  - `DATABASE_URL`, `JWT_SECRET_KEY`, `REDIS_URL`, `ENVIRONMENT`, `CORS_ORIGINS`, rate limiting, logging, feature flags.
- Frontend environment: `VITE_API_BASE_URL`, version and environment.
- Kubernetes: `k8s/configmap.yaml`, `k8s/secret.yaml`, deployments/services/ingress (`k8s/*`).

## Docker Compose (Dev)
```bash
docker compose up -d
# Backend: http://localhost:8000, Frontend: http://localhost
```

## Kubernetes Deployment (Prod)
- Images: built and pushed by CI (`.github/workflows/ci-cd.yml`).
- Apply manifests:
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/hpa.yaml
```
- Ingress hosts:
  - Backend: `api.your-domain.com` (`k8s/backend-deployment.yaml:77–105`)
  - Frontend: `your-domain.com`, `www.your-domain.com` (`k8s/frontend-deployment.yaml:68–105`)

## Migrations
```bash
alembic upgrade head
```
- CI runs migrations; ensure DB readiness before serving traffic.

## Health & Monitoring
- Probes: liveness/readiness configured in deployments.
- Health: `GET /health`.
- Logs: structured JSON/text per environment.

## Rollback
- Use `scripts/rollback-k8s.sh` or `kubectl rollout undo`.
- Keep previous images tagged in ECR; verify with rollout status.

## Backup & Restore
- Invoke backup service endpoints or run backend `backup_service` utilities.
- Pre-restore backups created automatically; confirm integrity.