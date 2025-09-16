#!/usr/bin/env python3
"""
Test Advanced Analytics endpoints
"""

from database import SessionLocal
from advanced_attainment_analytics import calculate_class_comparison_analytics, calculate_exam_comparison_analytics, calculate_comprehensive_attainment_analytics

def test_advanced_analytics():
    db = SessionLocal()
    
    try:
        # Test class comparison analytics
        print('Testing class comparison analytics...')
        result = calculate_class_comparison_analytics(db, 16)  # Subject ID 16
        print(f'Class Comparison Result:')
        print(f'  Subject: {result.get("subject_name", "Unknown")}')
        print(f'  Total Students: {result.get("class_statistics", {}).get("total_students", 0)}')
        print(f'  Average Attainment: {result.get("class_statistics", {}).get("average_attainment", 0)}%')
        print(f'  Students Above Target: {result.get("class_statistics", {}).get("students_above_target", 0)}')
        
        print('\nTesting exam comparison analytics...')
        exam_result = calculate_exam_comparison_analytics(db, 16)
        print(f'Exam Comparison Result:')
        print(f'  Subject: {exam_result.get("subject_id", "Unknown")}')
        print(f'  Total Exams: {len(exam_result.get("exam_analytics", {}))}')
        print(f'  Exam Trends: {len(exam_result.get("exam_trends", []))}')
        
        print('\nTesting comprehensive analytics...')
        comp_result = calculate_comprehensive_attainment_analytics(db, 16)
        print(f'Comprehensive Result:')
        print(f'  Subject: {comp_result.get("subject_name", "Unknown")}')
        print(f'  Students Analyzed: {comp_result.get("summary", {}).get("total_students_analyzed", 0)}')
        print(f'  Average Class Attainment: {comp_result.get("summary", {}).get("average_class_attainment", 0)}%')
        print(f'  Performance Level: {comp_result.get("summary", {}).get("class_performance_level", "Unknown")}')
        
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_advanced_analytics()

