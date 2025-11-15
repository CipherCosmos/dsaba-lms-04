"""
Database Session Management
Connection pooling and session handling
"""

from sqlalchemy import create_engine, event, Engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import Pool
from typing import Generator
import logging

from src.config import settings

logger = logging.getLogger(__name__)

# Create SQLAlchemy Base
Base = declarative_base()


# Create engine with connection pooling
def create_db_engine() -> Engine:
    """
    Create database engine with proper configuration
    
    Returns:
        Configured SQLAlchemy engine
    """
    
    # SQLite specific settings
    db_url_str = str(settings.DATABASE_URL)
    if db_url_str.startswith("sqlite"):
        engine = create_engine(
            settings.database_url_sync,
            connect_args={"check_same_thread": False},
            echo=settings.DB_ECHO,
        )
        
        # Enable foreign keys for SQLite
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_conn, connection_record):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        
        logger.info("✅ SQLite database engine created")
        return engine
    
    # PostgreSQL settings (production)
    engine = create_engine(
        settings.database_url_sync,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_pre_ping=settings.DB_POOL_PRE_PING,
        echo=settings.DB_ECHO,
        connect_args={
            "application_name": "dsaba_lms",
            "connect_timeout": 10,
        }
    )
    
    # Pool event listeners for monitoring
    @event.listens_for(Pool, "connect")
    def receive_connect(dbapi_conn, connection_record):
        logger.debug(f"New DB connection created: {id(dbapi_conn)}")
    
    @event.listens_for(Pool, "checkout")
    def receive_checkout(dbapi_conn, connection_record, connection_proxy):
        logger.debug(f"Connection checked out from pool: {id(dbapi_conn)}")
    
    @event.listens_for(Pool, "checkin")
    def receive_checkin(dbapi_conn, connection_record):
        logger.debug(f"Connection returned to pool: {id(dbapi_conn)}")
    
    logger.info(
        f"✅ PostgreSQL database engine created "
        f"(pool_size={settings.DB_POOL_SIZE}, max_overflow={settings.DB_MAX_OVERFLOW})"
    )
    
    return engine


# Create the engine
engine = create_db_engine()

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,  # Don't expire objects after commit
)


def get_db() -> Generator[Session, None, None]:
    """
    Get database session
    
    This is a dependency that can be injected into FastAPI endpoints
    
    Usage:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    
    Yields:
        Database session
    """
    from fastapi.exceptions import RequestValidationError
    from pydantic import ValidationError as PydanticValidationError
    
    db = SessionLocal()
    try:
        yield db
    except (RequestValidationError, PydanticValidationError):
        # Don't catch validation errors - let FastAPI handle them
        db.rollback()
        raise
    except Exception as e:
        from fastapi import HTTPException
        # Don't log HTTPExceptions as errors - they're expected API responses
        if isinstance(e, HTTPException):
            db.rollback()
            raise
        import traceback
        error_msg = str(e) if str(e) else f"{type(e).__name__}: {repr(e)}"
        logger.error(f"Database session error: {error_msg}")
        logger.debug(f"Database session error traceback: {traceback.format_exc()}")
        db.rollback()
        raise
    finally:
        db.close()


def verify_database_connection() -> bool:
    """
    Verify database connection is working
    
    Returns:
        True if connection is working, False otherwise
    """
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("✅ Database connection verified")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False


def create_tables() -> None:
    """
    Create all database tables
    
    Note: In production, use Alembic migrations instead
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created")
    except Exception as e:
        logger.error(f"❌ Failed to create tables: {e}")
        raise


def drop_tables() -> None:
    """
    Drop all database tables
    
    WARNING: This will delete all data!
    Only use in development/testing
    """
    if settings.is_production:
        raise RuntimeError("Cannot drop tables in production!")
    
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("⚠️  Database tables dropped")
    except Exception as e:
        logger.error(f"❌ Failed to drop tables: {e}")
        raise


def get_engine() -> Engine:
    """
    Get the database engine
    
    Returns:
        SQLAlchemy engine instance
    """
    return engine

