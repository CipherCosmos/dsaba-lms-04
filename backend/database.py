from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from urllib.parse import quote_plus

# Database URL with proper encoding
# Use SQLite for development if PostgreSQL is not available
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Check if PostgreSQL is available, fallback to SQLite
    try:
        import psycopg2
        DATABASE_URL = "postgresql://postgres:password@localhost:5432/exam_management"
    except ImportError:
        print("⚠️  PostgreSQL not available, using SQLite for development")
        DATABASE_URL = "sqlite:///./exam_management.db"

# Handle password encoding if needed for PostgreSQL
if DATABASE_URL.startswith("postgresql://") and "@localhost" in DATABASE_URL and ":" in DATABASE_URL.split("@")[0].split("//")[1]:
    parts = DATABASE_URL.split("://")[1].split("@")
    user_pass = parts[0]
    host_db = parts[1]
    if ":" in user_pass:
        user, password = user_pass.split(":", 1)
        encoded_password = quote_plus(password)
        DATABASE_URL = f"postgresql://{user}:{encoded_password}@{host_db}"

# Create engine with appropriate settings for SQLite or PostgreSQL
if DATABASE_URL.startswith("sqlite://"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()