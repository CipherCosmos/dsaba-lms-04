#!/usr/bin/env python3
"""
Script to update CO/PO/PSO framework tables with proper foreign keys
"""

from database import engine
from sqlalchemy import text

def update_copo_tables():
    try:
        with engine.connect() as conn:
            print("✅ Database connection successful")
            
            # Add foreign key columns to existing tables
            print("📋 Adding foreign key columns...")
            
            # Add co_id column to co_targets table
            try:
                conn.execute(text("""
                    ALTER TABLE co_targets 
                    ADD COLUMN IF NOT EXISTS co_id INTEGER REFERENCES co_definitions(id)
                """))
                print("  ✅ Added co_id column to co_targets table")
            except Exception as e:
                print(f"  ❌ Error adding co_id to co_targets: {e}")
            
            # Add co_id and po_id columns to co_po_matrix table
            try:
                conn.execute(text("""
                    ALTER TABLE co_po_matrix 
                    ADD COLUMN IF NOT EXISTS co_id INTEGER REFERENCES co_definitions(id)
                """))
                print("  ✅ Added co_id column to co_po_matrix table")
            except Exception as e:
                print(f"  ❌ Error adding co_id to co_po_matrix: {e}")
            
            try:
                conn.execute(text("""
                    ALTER TABLE co_po_matrix 
                    ADD COLUMN IF NOT EXISTS po_id INTEGER REFERENCES po_definitions(id)
                """))
                print("  ✅ Added po_id column to co_po_matrix table")
            except Exception as e:
                print(f"  ❌ Error adding po_id to co_po_matrix: {e}")
            
            # Add co_id column to question_co_weights table
            try:
                conn.execute(text("""
                    ALTER TABLE question_co_weights 
                    ADD COLUMN IF NOT EXISTS co_id INTEGER REFERENCES co_definitions(id)
                """))
                print("  ✅ Added co_id column to question_co_weights table")
            except Exception as e:
                print(f"  ❌ Error adding co_id to question_co_weights: {e}")
            
            # Add po_id and co_id columns to indirect_attainment table
            try:
                conn.execute(text("""
                    ALTER TABLE indirect_attainment 
                    ADD COLUMN IF NOT EXISTS po_id INTEGER REFERENCES po_definitions(id)
                """))
                print("  ✅ Added po_id column to indirect_attainment table")
            except Exception as e:
                print(f"  ❌ Error adding po_id to indirect_attainment: {e}")
            
            try:
                conn.execute(text("""
                    ALTER TABLE indirect_attainment 
                    ADD COLUMN IF NOT EXISTS co_id INTEGER REFERENCES co_definitions(id)
                """))
                print("  ✅ Added co_id column to indirect_attainment table")
            except Exception as e:
                print(f"  ❌ Error adding co_id to indirect_attainment: {e}")
            
            # Commit all changes
            conn.commit()
            print("✅ All changes committed successfully!")
            
            # Verify the updated table structure
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name IN ('co_targets', 'co_po_matrix', 'question_co_weights', 'indirect_attainment')
                AND column_name LIKE '%_id'
                ORDER BY table_name, column_name
            """))
            
            columns = [row for row in result]
            print(f"📋 Foreign key columns: {columns}")
            
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    update_copo_tables()
