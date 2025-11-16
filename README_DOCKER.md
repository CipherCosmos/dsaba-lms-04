# Docker Setup with Hot Reload

## Quick Start

### Initial Setup (No Cache)
```bash
# Rebuild everything without cache
docker compose build --no-cache

# Or use the helper script
./scripts/docker-rebuild.sh
```

### Start Services
```bash
docker compose up -d
```

### View Logs
```bash
# All services
docker compose logs -f

# Frontend only
docker compose logs -f frontend

# Backend only
docker compose logs -f backend
```

## Development URLs

- **Frontend**: http://localhost:5173 (Vite dev server with HMR)
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Hot Reload Features

✅ **Frontend**: Automatic hot reload via Vite HMR  
✅ **Backend**: Automatic reload via Uvicorn `--reload`  
✅ **No Cache**: Builds without cache to ensure latest updates  
✅ **Volume Mounts**: Source code mounted for instant changes  

## Rebuilding

### Full Rebuild (No Cache)
```bash
docker compose build --no-cache
docker compose up -d
```

### Rebuild Specific Service
```bash
docker compose build --no-cache frontend
docker compose build --no-cache backend
docker compose restart frontend
docker compose restart backend
```

### Quick Restart (No Rebuild)
```bash
docker compose restart frontend
docker compose restart backend
```

## Troubleshooting

### Changes Not Appearing?

1. **Check if services are running**
   ```bash
   docker compose ps
   ```

2. **Check logs for errors**
   ```bash
   docker compose logs frontend
   docker compose logs backend
   ```

3. **Clear browser cache**
   - Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

4. **Force rebuild**
   ```bash
   docker compose build --no-cache
   docker compose up -d
   ```

### Port Conflicts?

If ports 5173 or 8000 are in use, change them in `docker-compose.yml`:
```yaml
ports:
  - "3001:5173"  # Frontend
  - "8001:8000"  # Backend
```

## File Watching

- **Frontend**: Vite watches all files in `./frontend/src`
- **Backend**: Uvicorn watches all files in `./backend/src`
- Changes are detected automatically and trigger reload

## Environment Variables

### Frontend
- `VITE_API_BASE_URL`: Backend API URL
- `NODE_ENV`: Set to `development`
- `CHOKIDAR_USEPOLLING`: Enable file polling

### Backend
- `PYTHONUNBUFFERED`: Disable output buffering
- `PYTHONDONTWRITEBYTECODE`: Don't write .pyc files
- `ENVIRONMENT`: Set to `development`

## Production Build

For production, use:
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

For detailed documentation, see [docs/DOCKER_HOT_RELOAD_SETUP.md](docs/DOCKER_HOT_RELOAD_SETUP.md)

