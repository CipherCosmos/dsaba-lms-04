# Troubleshooting Guide – DSABA LMS

## Authentication Errors (401/403)
- Verify `Authorization` header and token expiry (30 min).
- Check blacklist (logout) and user active status.
- CORS mismatch: confirm `CORS_ORIGINS` in backend settings.

## Rate Limit (429)
- Respect `Retry-After` header; reduce request frequency.
- Review limiter configuration and per-endpoint limits.

## Database Connectivity
- Check `DATABASE_URL`; run `/health` endpoint.
- Validate migrations: `alembic upgrade head`.
- Inspect connection pool configuration.

## Cache Issues
- Clear cache with `GET /cache/clear`.
- Ensure Redis service is reachable.

## Migrations & Schema
- Alembic versions in `backend/alembic/versions/*`.
- If errors, re-run migrations or inspect Alembic history.

## Logs & Monitoring
- Increase `LOG_LEVEL` to `DEBUG` in development.
- Check audit logs for errors and slow responses.
- DB monitor reports slow queries.

## Reports & PDF Failures
- Confirm storage settings and file permissions.
- Ensure Celery workers are running for async tasks.

## Deployment/Ingress Issues
- Validate ingress hosts and TLS certificates.
- Check readiness/liveness probe statuses.

## Rollback & Recovery
- Use Kubernetes rollout undo or `scripts/rollback-k8s.sh`.
- Restore from backups using backup service procedures.