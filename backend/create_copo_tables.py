#!/usr/bin/env python3
"""
Script to manually create CO/PO/PSO framework tables
"""

from database import engine
from sqlalchemy import text

def create_copo_tables():
    try:
        with engine.connect() as conn:
            print("✅ Database connection successful")
            
            # Create missing enum types
            print("📋 Creating enum types...")
            
            # Create potype enum
            try:
                conn.execute(text("CREATE TYPE potype AS ENUM ('PO', 'PSO')"))
                print("  ✅ Created potype enum")
            except Exception as e:
                if "already exists" in str(e):
                    print("  ⚠️  potype enum already exists")
                else:
                    print(f"  ❌ Error creating potype: {e}")
            
            # Create attainmentlevel enum
            try:
                conn.execute(text("CREATE TYPE attainmentlevel AS ENUM ('L1', 'L2', 'L3')"))
                print("  ✅ Created attainmentlevel enum")
            except Exception as e:
                if "already exists" in str(e):
                    print("  ⚠️  attainmentlevel enum already exists")
                else:
                    print(f"  ❌ Error creating attainmentlevel: {e}")
            
            # Create indirectsource enum
            try:
                conn.execute(text("CREATE TYPE indirectsource AS ENUM ('course_exit_survey', 'employer_feedback', 'alumni_survey', 'industry_feedback')"))
                print("  ✅ Created indirectsource enum")
            except Exception as e:
                if "already exists" in str(e):
                    print("  ⚠️  indirectsource enum already exists")
                else:
                    print(f"  ❌ Error creating indirectsource: {e}")
            
            # Create tables
            print("📋 Creating tables...")
            
            # Create CO definitions table
            try:
                conn.execute(text("""
                    CREATE TABLE co_definitions (
                        id SERIAL PRIMARY KEY,
                        subject_id INTEGER NOT NULL REFERENCES subjects(id),
                        code VARCHAR(10) NOT NULL,
                        title VARCHAR(200) NOT NULL,
                        description TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """))
                print("  ✅ Created co_definitions table")
            except Exception as e:
                if "already exists" in str(e):
                    print("  ⚠️  co_definitions table already exists")
                else:
                    print(f"  ❌ Error creating co_definitions: {e}")
            
            # Create PO definitions table
            try:
                conn.execute(text("""
                    CREATE TABLE po_definitions (
                        id SERIAL PRIMARY KEY,
                        department_id INTEGER NOT NULL REFERENCES departments(id),
                        code VARCHAR(10) NOT NULL,
                        title VARCHAR(200) NOT NULL,
                        description TEXT,
                        type potype NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """))
                print("  ✅ Created po_definitions table")
            except Exception as e:
                if "already exists" in str(e):
                    print("  ⚠️  po_definitions table already exists")
                else:
                    print(f"  ❌ Error creating po_definitions: {e}")
            
            # Create CO targets table
            try:
                conn.execute(text("""
                    CREATE TABLE co_targets (
                        id SERIAL PRIMARY KEY,
                        subject_id INTEGER NOT NULL REFERENCES subjects(id),
                        co_code VARCHAR(10) NOT NULL,
                        target_pct DECIMAL(5,2) NOT NULL,
                        l1_threshold DECIMAL(5,2) NOT NULL,
                        l2_threshold DECIMAL(5,2) NOT NULL,
                        l3_threshold DECIMAL(5,2) NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """))
                print("  ✅ Created co_targets table")
            except Exception as e:
                if "already exists" in str(e):
                    print("  ⚠️  co_targets table already exists")
                else:
                    print(f"  ❌ Error creating co_targets: {e}")
            
            # Create assessment weights table
            try:
                conn.execute(text("""
                    CREATE TABLE assessment_weights (
                        id SERIAL PRIMARY KEY,
                        subject_id INTEGER NOT NULL REFERENCES subjects(id),
                        exam_type examtype NOT NULL,
                        weight_pct DECIMAL(5,2) NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """))
                print("  ✅ Created assessment_weights table")
            except Exception as e:
                if "already exists" in str(e):
                    print("  ⚠️  assessment_weights table already exists")
                else:
                    print(f"  ❌ Error creating assessment_weights: {e}")
            
            # Create CO-PO matrix table
            try:
                conn.execute(text("""
                    CREATE TABLE co_po_matrix (
                        id SERIAL PRIMARY KEY,
                        subject_id INTEGER NOT NULL REFERENCES subjects(id),
                        co_code VARCHAR(10) NOT NULL,
                        po_code VARCHAR(10) NOT NULL,
                        strength INTEGER NOT NULL CHECK (strength IN (1, 2, 3)),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """))
                print("  ✅ Created co_po_matrix table")
            except Exception as e:
                if "already exists" in str(e):
                    print("  ⚠️  co_po_matrix table already exists")
                else:
                    print(f"  ❌ Error creating co_po_matrix: {e}")
            
            # Create question CO weights table
            try:
                conn.execute(text("""
                    CREATE TABLE question_co_weights (
                        id SERIAL PRIMARY KEY,
                        question_id INTEGER NOT NULL REFERENCES questions(id),
                        co_code VARCHAR(10) NOT NULL,
                        weight_pct DECIMAL(5,2) NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """))
                print("  ✅ Created question_co_weights table")
            except Exception as e:
                if "already exists" in str(e):
                    print("  ⚠️  question_co_weights table already exists")
                else:
                    print(f"  ❌ Error creating question_co_weights: {e}")
            
            # Create indirect attainment table
            try:
                conn.execute(text("""
                    CREATE TABLE indirect_attainment (
                        id SERIAL PRIMARY KEY,
                        subject_id INTEGER NOT NULL REFERENCES subjects(id),
                        source indirectsource NOT NULL,
                        po_code VARCHAR(10),
                        co_code VARCHAR(10),
                        value_pct DECIMAL(5,2) NOT NULL,
                        term VARCHAR(20),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """))
                print("  ✅ Created indirect_attainment table")
            except Exception as e:
                if "already exists" in str(e):
                    print("  ⚠️  indirect_attainment table already exists")
                else:
                    print(f"  ❌ Error creating indirect_attainment: {e}")
            
            # Create attainment audit table
            try:
                conn.execute(text("""
                    CREATE TABLE attainment_audit (
                        id SERIAL PRIMARY KEY,
                        subject_id INTEGER NOT NULL REFERENCES subjects(id),
                        change TEXT NOT NULL,
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """))
                print("  ✅ Created attainment_audit table")
            except Exception as e:
                if "already exists" in str(e):
                    print("  ⚠️  attainment_audit table already exists")
                else:
                    print(f"  ❌ Error creating attainment_audit: {e}")
            
            # Add co_weighting_mode column to questions table
            try:
                conn.execute(text("""
                    ALTER TABLE questions 
                    ADD COLUMN IF NOT EXISTS co_weighting_mode VARCHAR(20) DEFAULT 'equal_split'
                """))
                print("  ✅ Added co_weighting_mode column to questions table")
            except Exception as e:
                print(f"  ❌ Error adding co_weighting_mode column: {e}")
            
            # Commit all changes
            conn.commit()
            print("✅ All changes committed successfully!")
            
            # Verify tables were created
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND (table_name LIKE '%co%' OR table_name LIKE '%po%' OR table_name LIKE '%attainment%')
                ORDER BY table_name
            """))
            
            new_tables = [row[0] for row in result]
            print(f"📋 New CO/PO tables created: {new_tables}")
            
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    create_copo_tables()
