# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Start Services with Docker Compose

```bash
# Start all services (PostgreSQL, Redis, Backend, Frontend, Celery)
docker-compose up -d

# Or use Makefile
make up
```

### 2. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### 3. Initialize Database

```bash
# Initialize database with admin user
docker-compose exec backend python scripts/init_db.py

# Or use Makefile
make init-db
```

## 📋 Common Commands

```bash
# View logs
make logs
# or
docker-compose logs -f

# Stop services
make down
# or
docker-compose down

# Run tests
make test
# or
cd backend && pytest tests/

# Restart services
make restart
```

## 🔧 Manual Setup (Without Docker)

### Backend
```bash
cd backend
pip install -r requirements.txt
python scripts/init_db.py
python run.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📚 More Information

- **Docker Setup**: See `docs/DOCKER_SETUP.md`
- **CI/CD**: See `docs/CI_CD_SETUP.md`
- **Project Structure**: See `docs/PROJECT_STRUCTURE.md`
- **Full Documentation**: See `docs/README.md`

## ✅ Verification

After starting services, verify they're running:

```bash
# Check service status
docker-compose ps

# Check backend health
curl http://localhost:8000/health

# Check frontend
curl http://localhost:3000
```

## 🎉 You're Ready!

The application is now running and ready for development!

