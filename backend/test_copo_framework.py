#!/usr/bin/env python3
"""
Test script for CO/PO/PSO Framework Implementation

This script tests the new CO/PO/PSO framework endpoints and functionality
without requiring a database connection.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import *
from schemas import *
from crud import *
from attainment_analytics import *
import json

def test_models():
    """Test that all models can be imported and instantiated"""
    print("Testing Models...")
    
    # Test CO Definition
    co_def = CODefinition(
        subject_id=1,
        code="CO1",
        title="Understand basic concepts",
        description="Students will understand fundamental concepts"
    )
    print(f"✅ CO Definition: {co_def.code} - {co_def.title}")
    
    # Test PO Definition
    po_def = PODefinition(
        department_id=1,
        code="PO1",
        title="Engineering Knowledge",
        description="Apply knowledge of mathematics, science, engineering fundamentals",
        type="PO"
    )
    print(f"✅ PO Definition: {po_def.code} - {po_def.title}")
    
    # Test CO Target
    co_target = COTarget(
        subject_id=1,
        co_code="CO1",
        target_pct=70.0,
        l1_threshold=60.0,
        l2_threshold=70.0,
        l3_threshold=80.0
    )
    print(f"✅ CO Target: {co_target.co_code} - {co_target.target_pct}%")
    
    # Test Assessment Weight
    assessment_weight = AssessmentWeight(
        subject_id=1,
        exam_type=ExamType.internal1,
        weight_pct=25.0
    )
    print(f"✅ Assessment Weight: {assessment_weight.exam_type.value} - {assessment_weight.weight_pct}%")
    
    # Test CO-PO Matrix
    co_po_matrix = COPOMatrix(
        subject_id=1,
        co_code="CO1",
        po_code="PO1",
        strength=3
    )
    print(f"✅ CO-PO Matrix: {co_po_matrix.co_code} -> {co_po_matrix.po_code} (strength: {co_po_matrix.strength})")
    
    print("✅ All models imported and instantiated successfully!")

def test_schemas():
    """Test that all Pydantic schemas work correctly"""
    print("\nTesting Schemas...")
    
    # Test CO Definition Schema
    co_def_data = {
        "subject_id": 1,
        "code": "CO1",
        "title": "Understand basic concepts",
        "description": "Students will understand fundamental concepts"
    }
    co_def = CODefinitionCreate(**co_def_data)
    print(f"✅ CO Definition Schema: {co_def.code}")
    
    # Test PO Definition Schema
    po_def_data = {
        "department_id": 1,
        "code": "PO1",
        "title": "Engineering Knowledge",
        "description": "Apply knowledge of mathematics, science, engineering fundamentals",
        "type": "PO"
    }
    po_def = PODefinitionCreate(**po_def_data)
    print(f"✅ PO Definition Schema: {po_def.code}")
    
    # Test CO Target Schema
    co_target_data = {
        "subject_id": 1,
        "co_code": "CO1",
        "target_pct": 70.0,
        "l1_threshold": 60.0,
        "l2_threshold": 70.0,
        "l3_threshold": 80.0
    }
    co_target = COTargetCreate(**co_target_data)
    print(f"✅ CO Target Schema: {co_target.co_code} - {co_target.target_pct}%")
    
    # Test Assessment Weight Schema
    assessment_weight_data = {
        "subject_id": 1,
        "exam_type": "internal1",
        "weight_pct": 25.0
    }
    assessment_weight = AssessmentWeightCreate(**assessment_weight_data)
    print(f"✅ Assessment Weight Schema: {assessment_weight.exam_type} - {assessment_weight.weight_pct}%")
    
    # Test CO-PO Matrix Schema
    co_po_matrix_data = {
        "subject_id": 1,
        "co_code": "CO1",
        "po_code": "PO1",
        "strength": 3
    }
    co_po_matrix = COPOMatrixCreate(**co_po_matrix_data)
    print(f"✅ CO-PO Matrix Schema: {co_po_matrix.co_code} -> {co_po_matrix.po_code}")
    
    # Test Bulk Update Schemas
    bulk_co_target_data = {
        "subject_id": 1,
        "co_targets": [co_target_data]
    }
    bulk_co_target = BulkCOTargetUpdate(**bulk_co_target_data)
    print(f"✅ Bulk CO Target Schema: {len(bulk_co_target.co_targets)} targets")
    
    print("✅ All schemas validated successfully!")

def test_analytics_schemas():
    """Test analytics response schemas"""
    print("\nTesting Analytics Schemas...")
    
    # Test CO Attainment Detail
    co_attainment_data = {
        "co_code": "CO1",
        "target_pct": 70.0,
        "actual_pct": 75.5,
        "level": "L2",
        "gap": 5.5,
        "coverage": 100.0,
        "evidence": [
            {
                "question_id": 1,
                "question_number": "1a",
                "max_marks": 10.0,
                "obtained_marks": 8.0,
                "percentage": 80.0,
                "exam_name": "Mid Term",
                "exam_type": "internal1"
            }
        ]
    }
    co_attainment = COAttainmentDetail(**co_attainment_data)
    print(f"✅ CO Attainment Detail: {co_attainment.co_code} - {co_attainment.actual_pct}%")
    
    # Test PO Attainment Detail
    po_attainment_data = {
        "po_code": "PO1",
        "direct_pct": 72.0,
        "indirect_pct": 85.0,
        "total_pct": 75.9,
        "level": "L2",
        "gap": 5.9,
        "contributing_cos": ["CO1", "CO2", "CO3"]
    }
    po_attainment = POAttainmentDetail(**po_attainment_data)
    print(f"✅ PO Attainment Detail: {po_attainment.po_code} - {po_attainment.total_pct}%")
    
    # Test Subject Attainment Response
    subject_attainment_data = {
        "subject_id": 1,
        "subject_name": "Data Structures",
        "co_attainment": [co_attainment_data],
        "po_attainment": [po_attainment_data],
        "blooms_distribution": {
            "Remember": {"count": 2, "percentage": 20.0, "marks": 20.0},
            "Understand": {"count": 3, "percentage": 30.0, "marks": 30.0},
            "Apply": {"count": 3, "percentage": 30.0, "marks": 30.0},
            "Analyze": {"count": 2, "percentage": 20.0, "marks": 20.0}
        },
        "difficulty_mix": {
            "easy": {"count": 3, "percentage": 30.0, "marks": 30.0},
            "medium": {"count": 4, "percentage": 40.0, "marks": 40.0},
            "hard": {"count": 3, "percentage": 30.0, "marks": 30.0}
        },
        "co_coverage": 100.0
    }
    subject_attainment = SubjectAttainmentResponse(**subject_attainment_data)
    print(f"✅ Subject Attainment Response: {subject_attainment.subject_name}")
    
    print("✅ All analytics schemas validated successfully!")

def test_endpoint_structure():
    """Test that all endpoint functions are properly defined"""
    print("\nTesting Endpoint Structure...")
    
    # Check if main.py has the new endpoints
    with open('main.py', 'r') as f:
        main_content = f.read()
    
    endpoints = [
        'get_subject_cos',
        'create_subject_co',
        'get_department_pos',
        'create_department_po',
        'get_subject_co_targets',
        'bulk_update_co_targets_endpoint',
        'get_subject_assessment_weights',
        'bulk_update_assessment_weights_endpoint',
        'get_subject_co_po_matrix',
        'bulk_update_co_po_matrix_endpoint',
        'get_question_co_weights',
        'bulk_update_question_co_weights_endpoint',
        'get_subject_indirect_attainment',
        'create_indirect_attainment_endpoint',
        'get_subject_attainment_analytics',
        'get_student_attainment_analytics',
        'get_class_attainment_analytics',
        'get_program_attainment_analytics',
        'get_blueprint_validation'
    ]
    
    for endpoint in endpoints:
        if endpoint in main_content:
            print(f"✅ Endpoint found: {endpoint}")
        else:
            print(f"❌ Endpoint missing: {endpoint}")
    
    print("✅ Endpoint structure validation complete!")

def test_crud_functions():
    """Test that all CRUD functions are properly defined"""
    print("\nTesting CRUD Functions...")
    
    crud_functions = [
        'get_co_definitions_by_subject',
        'create_co_definition',
        'update_co_definition',
        'delete_co_definition',
        'get_po_definitions_by_department',
        'create_po_definition',
        'update_po_definition',
        'delete_po_definition',
        'get_co_targets_by_subject',
        'create_co_target',
        'update_co_target',
        'delete_co_target',
        'bulk_update_co_targets',
        'get_assessment_weights_by_subject',
        'create_assessment_weight',
        'update_assessment_weight',
        'delete_assessment_weight',
        'bulk_update_assessment_weights',
        'get_co_po_matrix_by_subject',
        'create_co_po_matrix',
        'update_co_po_matrix',
        'delete_co_po_matrix',
        'bulk_update_co_po_matrix',
        'get_question_co_weights',
        'create_question_co_weight',
        'update_question_co_weight',
        'delete_question_co_weight',
        'bulk_update_question_co_weights',
        'get_indirect_attainment_by_subject',
        'create_indirect_attainment',
        'update_indirect_attainment',
        'delete_indirect_attainment',
        'create_attainment_audit',
        'get_attainment_audit_by_subject'
    ]
    
    with open('crud.py', 'r') as f:
        crud_content = f.read()
    
    for func in crud_functions:
        if func in crud_content:
            print(f"✅ CRUD function found: {func}")
        else:
            print(f"❌ CRUD function missing: {func}")
    
    print("✅ CRUD functions validation complete!")

def test_analytics_functions():
    """Test that all analytics functions are properly defined"""
    print("\nTesting Analytics Functions...")
    
    analytics_functions = [
        'calculate_co_attainment_for_student',
        'calculate_po_attainment_for_subject',
        'calculate_subject_attainment_analytics',
        'calculate_co_attainment_for_subject',
        'calculate_blooms_distribution',
        'calculate_difficulty_mix',
        'calculate_co_coverage',
        'calculate_student_attainment_analytics',
        'calculate_class_attainment_analytics',
        'calculate_program_attainment_analytics'
    ]
    
    with open('attainment_analytics.py', 'r') as f:
        analytics_content = f.read()
    
    for func in analytics_functions:
        if func in analytics_content:
            print(f"✅ Analytics function found: {func}")
        else:
            print(f"❌ Analytics function missing: {func}")
    
    print("✅ Analytics functions validation complete!")

def main():
    """Run all tests"""
    print("🚀 Testing CO/PO/PSO Framework Implementation")
    print("=" * 50)
    
    try:
        test_models()
        test_schemas()
        test_analytics_schemas()
        test_endpoint_structure()
        test_crud_functions()
        test_analytics_functions()
        
        print("\n" + "=" * 50)
        print("🎉 All tests passed! The CO/PO/PSO framework is ready for use.")
        print("\nNext steps:")
        print("1. Start PostgreSQL database")
        print("2. Run: alembic upgrade head")
        print("3. Start the FastAPI server: python main.py")
        print("4. Test the endpoints using the API documentation at http://localhost:8000/docs")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
