# Performance Benchmark Report – DSABA LMS

## Targets
- 95th percentile response time: ≤ 1000 ms
- Average response time: ≤ 300 ms
- Throughput: ≥ 50 RPS
- Error rate: ≤ 5%

## Methodology
- Tool: Locust headless scenarios (`backend/tests/performance/locustfile.py`).
- Users/spawn: configured in CI as 10 users, 2 spawn/sec for 30s (`.github/workflows/ci-cd.yml:352–361`).
- Endpoints exercised: auth, subjects listing, dashboard stats, analytics, students, academic years.

## Environment
- CI ephemeral environment; backend started via Uvicorn (`ci-cd.yml:341–351`).
- DB: PostgreSQL service; cache: Redis service.

## Observations
- Scenarios simulate Student/Teacher/Admin behaviors; includes authentication and high-frequency read-only endpoints.
- Slow/failed requests captured in Locust metrics output.

## Recommendations
- Increase scenario duration and user count for staging benchmarks.
- Add custom tasks for internal marks workflows and report generation under load.
- Enable DB query monitor and capture slow query reports (`backend/src/infrastructure/database/monitoring.py`).
- Consider CDN for static assets to reduce frontend load times.