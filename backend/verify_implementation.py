#!/usr/bin/env python3
"""
Simple verification script for CO/PO/PSO Framework
"""

print("🚀 CO/PO/PSO Framework Implementation Verification")
print("=" * 60)

# Test 1: Import models
try:
    from models import CODefinition, PODefinition, COTarget, AssessmentWeight, COPOMatrix, QuestionCOWeight, IndirectAttainment, AttainmentAudit
    print("✅ Models imported successfully")
except Exception as e:
    print(f"❌ Model import failed: {e}")

# Test 2: Import schemas
try:
    from schemas import CODefinitionCreate, PODefinitionCreate, COTargetCreate, AssessmentWeightCreate, COPOMatrixCreate, SubjectAttainmentResponse
    print("✅ Schemas imported successfully")
except Exception as e:
    print(f"❌ Schema import failed: {e}")

# Test 3: Import CRUD functions
try:
    from crud import get_co_definitions_by_subject, create_co_definition, bulk_update_co_targets
    print("✅ CRUD functions imported successfully")
except Exception as e:
    print(f"❌ CRUD import failed: {e}")

# Test 4: Import analytics functions
try:
    from attainment_analytics import calculate_co_attainment_for_student, calculate_subject_attainment_analytics
    print("✅ Analytics functions imported successfully")
except Exception as e:
    print(f"❌ Analytics import failed: {e}")

# Test 5: Test schema validation
try:
    co_data = {
        "subject_id": 1,
        "code": "CO1",
        "title": "Understand basic concepts",
        "description": "Students will understand fundamental concepts"
    }
    co_def = CODefinitionCreate(**co_data)
    print("✅ Schema validation working")
except Exception as e:
    print(f"❌ Schema validation failed: {e}")

print("\n" + "=" * 60)
print("🎉 Implementation verification complete!")
print("\nNext steps:")
print("1. Start PostgreSQL: net start postgresql")
print("2. Run migration: alembic upgrade head")
print("3. Start server: python main.py")
print("4. Test endpoints at: http://localhost:8000/docs")
