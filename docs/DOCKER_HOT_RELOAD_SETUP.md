# Docker Hot Reload Setup

## Overview
This setup enables hot reload for both frontend and backend, ensuring instant updates without rebuilding Docker images.

## Features
- ✅ **Frontend Hot Reload**: Vite dev server with file watching
- ✅ **Backend Hot Reload**: Uvicorn with `--reload` flag
- ✅ **No Cache**: Builds without cache to ensure latest updates
- ✅ **Volume Mounts**: Source code mounted for instant changes

## Quick Start

### 1. Rebuild without cache
```bash
docker compose build --no-cache
```

### 2. Start services
```bash
docker compose up -d
```

### 3. View logs
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
- **Backend Docs**: http://localhost:8000/docs

## Hot Reload Configuration

### Frontend
- **Port**: 5173 (Vite default)
- **Hot Module Replacement**: Enabled
- **File Watching**: Polling enabled for Docker volumes
- **Volume Mount**: `./frontend:/app` (excludes `node_modules`)

### Backend
- **Port**: 8000
- **Auto Reload**: Enabled with `--reload --reload-dir /app/src`
- **Volume Mount**: `./backend:/app` (excludes `__pycache__`)

## Rebuilding After Changes

### Option 1: Automatic (Recommended)
Changes are automatically detected and reloaded. No rebuild needed!

### Option 2: Force Rebuild (If needed)
```bash
# Rebuild specific service
docker compose build --no-cache frontend
docker compose build --no-cache backend

# Restart service
docker compose restart frontend
docker compose restart backend
```

### Option 3: Full Rebuild
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Troubleshooting

### Frontend not updating?
1. Check if Vite is running: `docker compose logs frontend`
2. Verify volume mount: `docker compose exec frontend ls -la /app/src`
3. Clear browser cache (Ctrl+Shift+R / Cmd+Shift+R)
4. Check HMR connection in browser console

### Backend not reloading?
1. Check if `--reload` flag is active: `docker compose logs backend`
2. Verify file changes are detected
3. Check volume mount: `docker compose exec backend ls -la /app/src`
4. Restart backend: `docker compose restart backend`

### Port conflicts?
If ports 5173 or 8000 are in use:
```bash
# Change ports in docker-compose.yml
ports:
  - "3001:5173"  # Frontend
  - "8001:8000"  # Backend
```

## Production Build

For production, use the production Dockerfile:
```bash
docker compose -f docker-compose.prod.yml up -d
```

## Environment Variables

### Frontend
- `VITE_API_BASE_URL`: Backend API URL (default: http://localhost:8000)
- `VITE_API_VERSION`: API version (default: v1)
- `NODE_ENV`: Set to `development` for dev mode
- `CHOKIDAR_USEPOLLING`: Enable file polling for Docker

### Backend
- `PYTHONUNBUFFERED`: Disable Python output buffering
- `PYTHONDONTWRITEBYTECODE`: Don't write .pyc files
- `ENVIRONMENT`: Set to `development` for dev mode

## File Watching

### Frontend
- Uses Vite's HMR (Hot Module Replacement)
- Polling enabled for Docker volume compatibility
- Watches all files in `./frontend/src`

### Backend
- Uses Uvicorn's `--reload` flag
- Watches `./backend/src` directory
- Automatically restarts on Python file changes

## Performance Notes

- **First Build**: May take 2-5 minutes (installing dependencies)
- **Subsequent Changes**: Instant (hot reload)
- **Memory Usage**: Development mode uses more memory than production
- **CPU Usage**: File watching uses minimal CPU

## Best Practices

1. **Always use `--no-cache` for initial build** to ensure fresh dependencies
2. **Check logs regularly** to catch errors early
3. **Use volume mounts** for source code (already configured)
4. **Exclude build artifacts** from volumes (node_modules, __pycache__)
5. **Clear browser cache** if frontend changes don't appear

---

**Last Updated**: 2024-12-XX

