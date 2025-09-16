#!/usr/bin/env python3
"""
Fix Internal 2 CO mapping by creating Question-CO weights
"""

from database import SessionLocal
from models import Exam, Question, QuestionCOWeight, CODefinition, Mark

def fix_internal2_co_mapping():
    db = SessionLocal()
    
    try:
        # Get internal2 exam
        internal2_exam = db.query(Exam).filter(Exam.exam_type == 'internal2').first()
        if not internal2_exam:
            print("No internal2 exam found!")
            return
        
        print(f'Internal2 exam: {internal2_exam.name} (ID: {internal2_exam.id}, Subject: {internal2_exam.subject_id})')

        # Get questions for internal2 exam
        questions = db.query(Question).filter(Question.exam_id == internal2_exam.id).all()
        print(f'Questions: {len(questions)}')

        # Get CO definitions for this subject
        co_definitions = db.query(CODefinition).filter(CODefinition.subject_id == internal2_exam.subject_id).all()
        print(f'CO definitions: {len(co_definitions)}')

        if len(questions) == 0 or len(co_definitions) == 0:
            print("No questions or CO definitions found!")
            return

        # Create Question-CO weights
        # Map questions to COs with some distribution
        question_co_mappings = [
            # Question 1 -> CO1 (100%)
            {'question_id': questions[0].id, 'co_id': co_definitions[0].id, 'weight_pct': 100.0},
        ]
        
        # If we have more questions and COs, distribute them
        if len(questions) > 1 and len(co_definitions) > 1:
            # Question 2 -> CO1 (50%) + CO2 (50%)
            question_co_mappings.extend([
                {'question_id': questions[1].id, 'co_id': co_definitions[0].id, 'weight_pct': 50.0},
                {'question_id': questions[1].id, 'co_id': co_definitions[1].id, 'weight_pct': 50.0},
            ])
        
        if len(questions) > 2 and len(co_definitions) > 1:
            # Question 3 -> CO2 (100%)
            question_co_mappings.append({
                'question_id': questions[2].id, 
                'co_id': co_definitions[1].id, 
                'weight_pct': 100.0
            })

        print('Creating Question-CO weights...')
        created_count = 0
        for mapping in question_co_mappings:
            existing = db.query(QuestionCOWeight).filter(
                QuestionCOWeight.question_id == mapping['question_id'],
                QuestionCOWeight.co_id == mapping['co_id']
            ).first()
            
            if not existing:
                weight = QuestionCOWeight(
                    question_id=mapping['question_id'],
                    co_id=mapping['co_id'],
                    weight_pct=mapping['weight_pct']
                )
                db.add(weight)
                created_count += 1
                print(f'Created: Q{mapping["question_id"]} -> CO{mapping["co_id"]}: {mapping["weight_pct"]}%')
            else:
                print(f'Already exists: Q{mapping["question_id"]} -> CO{mapping["co_id"]}')

        db.commit()
        print(f'Question-CO weights created successfully! ({created_count} new weights)')

        # Verify the weights
        weights = db.query(QuestionCOWeight).join(Question).filter(Question.exam_id == internal2_exam.id).all()
        print(f'Total Question-CO weights for internal2: {len(weights)}')
        for w in weights:
            print(f'Q{w.question_id} -> CO{w.co_id}: {w.weight_pct}%')

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_internal2_co_mapping()

