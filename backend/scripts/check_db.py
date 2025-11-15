#!/usr/bin/env python3
"""
Database Check Script
Checks database connection and existing tables using new architecture
"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.infrastructure.database.session import verify_database_connection, get_engine
from sqlalchemy import text, inspect

def check_database():
    """Check database connection and tables"""
    try:
        # Check connection
        if verify_database_connection():
            print("✅ Database connection successful")
        else:
            print("❌ Database connection failed")
            return
        
        engine = get_engine()
        
        # Check existing tables
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        print(f"📋 Existing tables ({len(tables)}):")
        for table in sorted(tables):
            print(f"   - {table}")
        
        # Check if key tables exist
        key_tables = ['users', 'departments', 'subjects', 'exams', 'marks', 'final_marks']
        missing_tables = [t for t in key_tables if t not in tables]
        
        if missing_tables:
            print(f"⚠️  Missing key tables: {missing_tables}")
        else:
            print("✅ All key tables exist")
        
        # Check CO/PO tables
        co_po_tables = [t for t in tables if 'co_' in t or 'po_' in t or 'attainment' in t or 'mapping' in t]
        if co_po_tables:
            print(f"✅ CO/PO tables found: {len(co_po_tables)}")
        else:
            print("⚠️  No CO/PO tables found")
        
        return tables
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        import traceback
        traceback.print_exc()
        return []

if __name__ == "__main__":
    check_database()

