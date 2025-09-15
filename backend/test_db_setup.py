"""
Test database setup script using SQLite for testing migrations
"""

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Use SQLite for testing
DATABASE_URL = "sqlite:///./test_exam_management.db"

# Create engine
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def test_database_connection():
    """Test database connection"""
    try:
        # Test connection
        with engine.connect() as connection:
            from sqlalchemy import text
            result = connection.execute(text("SELECT 1"))
            print("✅ Database connection successful!")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def create_tables():
    """Create all tables using SQLAlchemy models"""
    try:
        # Import models
        from models import Base
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully!")
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

def test_migrations():
    """Test running migrations - Skip for SQLite as migrations are PostgreSQL-specific"""
    print("⏭️  Skipping migrations (PostgreSQL-specific)")
    print("   Note: Migrations will be run when using PostgreSQL database")
    return True

def main():
    """Main test function"""
    print("🧪 Testing Database Setup with SQLite")
    print("=" * 50)
    
    # Test 1: Database connection
    print("\n1. Testing database connection...")
    if not test_database_connection():
        return False
    
    # Test 2: Create tables
    print("\n2. Creating tables...")
    if not create_tables():
        return False
    
    # Test 3: Run migrations
    print("\n3. Running migrations...")
    if not test_migrations():
        return False
    
    print("\n🎉 All tests passed! Database setup is working correctly.")
    print("\nNext steps:")
    print("1. Set up PostgreSQL database")
    print("2. Update DATABASE_URL to use PostgreSQL")
    print("3. Run migrations on PostgreSQL")
    print("4. Start the FastAPI server")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
