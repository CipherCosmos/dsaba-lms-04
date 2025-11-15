#!/usr/bin/env python3
"""
Simple script to check database connection and existing tables
"""

from database import engine
from sqlalchemy import text

def check_database():
    try:
        with engine.connect() as conn:
            # Check if we can connect
            print("✅ Database connection successful")
            
            # Check existing tables
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            
            tables = [row[0] for row in result]
            print(f"📋 Existing tables: {tables}")
            
            # Check if CO/PO tables already exist
            co_po_tables = [t for t in tables if 'co_' in t or 'po_' in t or 'attainment' in t]
            if co_po_tables:
                print(f"⚠️  CO/PO tables already exist: {co_po_tables}")
            else:
                print("✅ No CO/PO tables found - migration needed")
                
            # Check existing enum types
            result = conn.execute(text("""
                SELECT typname 
                FROM pg_type 
                WHERE typtype = 'e'
                ORDER BY typname
            """))
            
            enums = [row[0] for row in result]
            print(f"📋 Existing enum types: {enums}")
            
            # Check if specific enums exist
            for enum_name in ['examtype', 'potype', 'attainmentlevel', 'indirectsource']:
                result = conn.execute(text(f"SELECT 1 FROM pg_type WHERE typname = '{enum_name}'"))
                exists = result.fetchone() is not None
                print(f"  - {enum_name}: {'✅ exists' if exists else '❌ missing'}")
            
            return tables, enums
            
    except Exception as e:
        print(f"❌ Database error: {e}")
        return [], []

if __name__ == "__main__":
    check_database()
