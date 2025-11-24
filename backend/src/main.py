"""
DSABA LMS - Main Application Entry Point
Clean Architecture Implementation
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import datetime

from src.config import settings
from src.infrastructure.database.session import verify_database_connection, create_tables, SessionLocal
# Import database module to ensure relationships are configured
from src.infrastructure.database import models as _  # noqa: F401
from src.infrastructure.database.role_initializer import ensure_roles_exist
from src.api.v1 import auth, users, profile, departments, exams, marks, academic_structure, subjects, analytics, reports, course_outcomes, program_outcomes, co_po_mappings, questions, final_marks, bulk_uploads, pdf_generation, dashboard, subject_assignments, audit, students, academic_years, student_enrollments, internal_marks, batch_instances, indirect_attainment, backup, monitoring
from src.api.middleware.error_handler import setup_error_handlers
from src.api.middleware.security_headers import add_security_headers
from src.api.middleware.logging import setup_logging
from src.api.middleware.rate_limiting import setup_rate_limiting
from src.api.middleware.audit_middleware import setup_audit_middleware

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events
    
    Handles startup and shutdown events
    """
    # Startup
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"📍 Environment: {settings.ENVIRONMENT}")
    
    # Verify database connection
    if verify_database_connection():
        logger.info("✅ Database connection verified")
    else:
        logger.error("❌ Database connection failed")
        raise RuntimeError("Cannot connect to database")
    
    # Create tables (in development)
    if settings.is_development:
        create_tables()
        logger.info("✅ Database tables created/verified")
    
    # Ensure all required roles exist
    try:
        db = SessionLocal()
        try:
            ensure_roles_exist(db)
            logger.info("✅ All required roles verified")
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"⚠️ Failed to ensure roles exist: {e}")
    
    # Verify configuration
    logger.info(f"✅ JWT expiry: {settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
    logger.info(f"✅ DB pool size: {settings.DB_POOL_SIZE}")
    logger.info(f"✅ Caching enabled: {settings.FEATURE_CACHING_ENABLED}")
    
    logger.info("🎉 Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down application")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Internal Exam Management System with CO-PO Framework",
    docs_url="/docs" if settings.is_development else None,  # Disable in production
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

# Setup error handlers
setup_error_handlers(app)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# GZip compression middleware for better performance
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Security headers middleware
app.middleware("http")(add_security_headers)

# Rate limiting middleware (if enabled)
if settings.RATE_LIMIT_ENABLED:
    setup_rate_limiting(app)

# Audit middleware
setup_audit_middleware(app)

# Health check endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """
    Health check endpoint
    
    Returns system health status
    """
    from datetime import datetime
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/cache/clear", tags=["System"])
async def clear_cache():
    """Clear server-side cache"""
    from src.infrastructure.cache.redis_client import get_cache_service
    cache_service = get_cache_service()
    if cache_service.is_enabled:
        await cache_service.clear_cache()
    return {
        "message": "Cache cleared",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "cache_bust": int(datetime.datetime.utcnow().timestamp() * 1000)
    }


@app.get("/", tags=["System"])
async def root():
    """
    Root endpoint
    
    Returns API information
    """
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs" if settings.is_development else "Documentation disabled",
        "api_version": settings.API_VERSION,
    }


# Include API routers
app.include_router(
    auth.router,
    prefix=settings.api_prefix,
)
app.include_router(
    users.router,
    prefix=settings.api_prefix,
)
app.include_router(
    profile.router,
    prefix=settings.api_prefix,
)
app.include_router(
    departments.router,
    prefix=settings.api_prefix,
)
app.include_router(
    exams.router,
    prefix=settings.api_prefix,
)
app.include_router(
    marks.router,
    prefix=settings.api_prefix,
)
app.include_router(
    academic_structure.router,
    prefix=settings.api_prefix,
)
app.include_router(
    subjects.router,
    prefix=settings.api_prefix,
)
app.include_router(
    analytics.router,
    prefix=settings.api_prefix,
)
app.include_router(
    reports.router,
    prefix=settings.api_prefix,
)
app.include_router(
    course_outcomes.router,
    prefix=settings.api_prefix,
)
app.include_router(
    program_outcomes.router,
    prefix=settings.api_prefix,
)
app.include_router(
    co_po_mappings.router,
    prefix=settings.api_prefix,
)
app.include_router(
    questions.router,
    prefix=settings.api_prefix,
)
app.include_router(
    final_marks.router,
    prefix=settings.api_prefix,
)
app.include_router(
    bulk_uploads.router,
    prefix=settings.api_prefix,
)
app.include_router(
    pdf_generation.router,
    prefix=settings.api_prefix,
)
app.include_router(
    dashboard.router,
    prefix=settings.api_prefix,
)
app.include_router(
    subject_assignments.router,
    prefix=settings.api_prefix,
)
app.include_router(
    audit.router,
    prefix=settings.api_prefix,
)
app.include_router(
    students.router,
    prefix=settings.api_prefix,
)
app.include_router(
    academic_years.router,
    prefix=settings.api_prefix,
)
app.include_router(
    student_enrollments.router,
    prefix=settings.api_prefix,
)
app.include_router(
    internal_marks.router,
    prefix=settings.api_prefix,
)
app.include_router(
    batch_instances.router,
    prefix=settings.api_prefix,
)
app.include_router(
    indirect_attainment.router,
    prefix=settings.api_prefix,
)
app.include_router(
    backup.router,
    prefix=settings.api_prefix,
)
app.include_router(
    monitoring.router,
    prefix=settings.api_prefix,
)


# Run application
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD and settings.is_development,
        log_level=settings.LOG_LEVEL.lower(),
    )

