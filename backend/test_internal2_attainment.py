#!/usr/bin/env python3
"""
Test Internal 2 attainment calculation
"""

from database import SessionLocal
from attainment_analytics import calculate_co_attainment_for_subject

def test_internal2_attainment():
    db = SessionLocal()
    
    try:
        # Test CO attainment for internal2
        print('Testing CO attainment for internal2 after fixing CO mapping...')
        result = calculate_co_attainment_for_subject(db, 16, 'internal2')
        
        print(f'CO Attainment Result:')
        print(f'  Overall Attainment: {result["overall_attainment"]}%')
        print(f'  Target Attainment: {result["target_attainment"]}%')
        print(f'  Gap: {result["gap_analysis"]["overall_gap"]}%')
        print(f'  CO Details:')
        for co in result['co_attainment']:
            print(f'    {co["co_code"]}: {co["actual_pct"]}% (target: {co["target_pct"]}%, gap: {co["gap"]}%)')
            
    except Exception as e:
        print(f'Error: {e}')
    finally:
        db.close()

if __name__ == "__main__":
    test_internal2_attainment()

