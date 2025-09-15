"""
Fixed CO/PO Attainment Analytics with Official Formulas

This module implements the correct CO/PO attainment calculation using:
1. Actual student marks from the marks table
2. Question-CO mappings from question_co_weights table
3. CO-PO mappings from co_po_matrix table
4. Official NBA/NAAC formulas for attainment calculation
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, desc, case
from models import *
from schemas import *
from crud import *
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
import statistics
from datetime import datetime

def calculate_co_attainment_for_student(db: Session, student_id: int, subject_id: int, exam_type: Optional[str] = None) -> Dict[str, Any]:
    """
    Calculate CO attainment for a specific student using actual marks and proper CO mapping.
    
    Formula: CO Attainment = (Sum of weighted marks for CO / Sum of total weighted marks for CO) * 100
    """
    # Get CO definitions for the subject
    co_definitions = db.query(CODefinition).join(Subject).filter(Subject.id == subject_id).all()
    if not co_definitions:
        return {}
    
    # Get exams for the subject
    exam_query = db.query(Exam).filter(Exam.subject_id == subject_id)
    if exam_type:
        exam_query = exam_query.filter(Exam.exam_type == exam_type)
    exams = exam_query.all()
    
    if not exams:
        return {}
    
    exam_ids = [e.id for e in exams]
    
    # Get all marks for the student in these exams
    marks = db.query(Mark).options(
        joinedload(Mark.question).joinedload(Question.co_weights)
    ).filter(
        and_(
            Mark.student_id == student_id,
            Mark.exam_id.in_(exam_ids)
        )
    ).all()
    
    if not marks:
        return {}
    
    co_attainment = {}
    
    for co_def in co_definitions:
        co_id = co_def.id
        co_code = co_def.code
        
        # Get all question-CO weights for this CO
        co_weights = db.query(QuestionCOWeight).filter(
            QuestionCOWeight.co_id == co_id
        ).all()
        
        if not co_weights:
            continue
        
        # Calculate weighted marks for this CO
        total_weighted_marks = 0.0
        obtained_weighted_marks = 0.0
        
        for co_weight in co_weights:
            question_id = co_weight.question_id
            weight_pct = co_weight.weight_pct
            
            # Find the mark for this question
            mark = next((m for m in marks if m.question_id == question_id), None)
            if not mark:
                continue
            
            # Calculate weighted marks
            question_max_marks = mark.question.max_marks
            question_obtained_marks = mark.marks_obtained
            
            # Weight the marks based on CO weight percentage
            weighted_max = question_max_marks * (weight_pct / 100.0)
            weighted_obtained = question_obtained_marks * (weight_pct / 100.0)
            
            total_weighted_marks += weighted_max
            obtained_weighted_marks += weighted_obtained
        
        # Calculate CO attainment percentage
        if total_weighted_marks > 0:
            co_attainment_pct = (obtained_weighted_marks / total_weighted_marks) * 100
            co_attainment[co_code] = {
                'co_id': co_id,
                'co_code': co_code,
                'attainment_pct': round(co_attainment_pct, 2),
                'total_weighted_marks': round(total_weighted_marks, 2),
                'obtained_weighted_marks': round(obtained_weighted_marks, 2),
                'questions_count': len(co_weights)
            }
    
    return co_attainment

def calculate_co_attainment_for_subject(db: Session, subject_id: int, exam_type: Optional[str] = None) -> Dict[str, Any]:
    """
    Calculate CO attainment for all students in a subject using proper formulas.
    """
    # Get subject info
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        return {}
    
    # Get all students enrolled in this subject
    students = db.query(User).filter(User.role == 'student').all()
    if not students:
        return {}
    
    # Get CO definitions and targets
    co_definitions = db.query(CODefinition).join(Subject).filter(Subject.id == subject_id).all()
    co_targets = db.query(COTarget).filter(COTarget.subject_id == subject_id).all()
    
    # Create target lookup
    target_lookup = {t.co_id: t for t in co_targets}
    
    co_attainment_details = []
    
    for co_def in co_definitions:
        co_id = co_def.id
        co_code = co_def.code
        
        # Get target for this CO
        target = target_lookup.get(co_id)
        target_pct = target.target_pct if target else 70.0
        
        # Calculate attainment for each student
        student_attainments = []
        
        for student in students:
            student_co_attainment = calculate_co_attainment_for_student(db, student.id, subject_id, exam_type)
            if co_code in student_co_attainment:
                student_attainments.append(student_co_attainment[co_code]['attainment_pct'])
        
        # Calculate average attainment
        if student_attainments:
            avg_attainment = statistics.mean(student_attainments)
            std_deviation = statistics.stdev(student_attainments) if len(student_attainments) > 1 else 0
        else:
            avg_attainment = 0.0
            std_deviation = 0.0
        
        # Calculate gap
        gap = avg_attainment - target_pct
        
        # Determine level
        if target:
            if avg_attainment >= target.l3_threshold:
                level = "L3"
            elif avg_attainment >= target.l2_threshold:
                level = "L2"
            elif avg_attainment >= target.l1_threshold:
                level = "L1"
            else:
                level = "Below L1"
        else:
            level = "No Target"
        
        # Calculate coverage (percentage of students who attempted questions for this CO)
        coverage = (len(student_attainments) / len(students)) * 100 if students else 0
        
        # Calculate attainment rate (percentage of students who met the target)
        attainment_rate = (len([a for a in student_attainments if a >= target_pct]) / len(student_attainments)) * 100 if student_attainments else 0
        
        # Get question difficulty analysis for this CO
        difficulty_analysis = {'easy': 0, 'medium': 0, 'hard': 0}
        blooms_analysis = defaultdict(int)
        
        # Get questions mapped to this CO
        co_questions = db.query(Question).join(QuestionCOWeight).filter(
            QuestionCOWeight.co_id == co_id
        ).all()
        
        for question in co_questions:
            difficulty_analysis[question.difficulty.value] += 1
            if question.blooms_level:
                blooms_analysis[question.blooms_level] += 1
        
        # Generate recommendations
        recommendations = []
        if gap < -15:
            recommendations.append(f"Significant gap of {abs(gap):.1f}% below target. Consider additional practice sessions.")
        elif gap < -10:
            recommendations.append(f"Moderate gap of {abs(gap):.1f}% below target. Review teaching methods.")
        elif gap < 0:
            recommendations.append(f"Minor gap of {abs(gap):.1f}% below target. Focus on weak areas.")
        else:
            recommendations.append(f"Target achieved with {gap:.1f}% above target. Maintain current approach.")
        
        if coverage < 80:
            recommendations.append(f"Low coverage of {coverage:.1f}%. Ensure all students attempt questions.")
        
        if attainment_rate < 60:
            recommendations.append(f"Low attainment rate of {attainment_rate:.1f}%. Consider remedial classes.")
        
        co_attainment_details.append({
            'co_id': co_id,
            'co_code': co_code,
            'co_description': co_def.description or f"Course Outcome {co_code}",
            'target_pct': target_pct,
            'actual_pct': round(avg_attainment, 1),
            'level': level,
            'gap': round(gap, 1),
            'coverage': round(coverage, 1),
            'attainment_rate': round(attainment_rate, 1),
            'evidence': [],  # Can be populated with detailed evidence
            'performance_trend': [
                {'period': 'Current', 'attainment': round(avg_attainment, 1)},
                {'period': 'Target', 'attainment': target_pct}
            ],
            'difficulty_analysis': difficulty_analysis,
            'blooms_taxonomy': dict(blooms_analysis),
            'question_analysis': [],  # Can be populated with detailed question analysis
            'student_performance': {
                'total_students': len(students),
                'passing_students': len([a for a in student_attainments if a >= 60]),
                'excellent_students': len([a for a in student_attainments if a >= 90]),
                'average_attainment': round(avg_attainment, 1),
                'standard_deviation': round(std_deviation, 1)
            },
            'recommendations': recommendations
        })
    
    # Calculate overall subject attainment
    if co_attainment_details:
        overall_attainment = statistics.mean([co['actual_pct'] for co in co_attainment_details])
        target_attainment = statistics.mean([co['target_pct'] for co in co_attainment_details])
    else:
        overall_attainment = 0.0
        target_attainment = 70.0
    
    return {
        'subject_id': subject_id,
        'subject_name': subject.name,
        'subject_code': subject.code or f"SUB{subject_id}",
        'semester': "Unknown",  # Subject doesn't have semester attribute
        'credits': subject.credits or 3,
        'co_attainment': co_attainment_details,
        'overall_attainment': round(overall_attainment, 1),
        'target_attainment': round(target_attainment, 1),
        'gap_analysis': {
            'overall_gap': round(target_attainment - overall_attainment, 1),
            'co_gaps': [{'co_code': co['co_code'], 'gap': co['gap']} for co in co_attainment_details],
            'critical_cos': [co['co_code'] for co in co_attainment_details if co['gap'] < -15]
        },
        'recommendations': [
            f"Overall attainment is {overall_attainment:.1f}% vs target {target_attainment:.1f}%",
            f"Focus on {len([co for co in co_attainment_details if co['gap'] < -10])} COs with significant gaps",
            "Consider additional practice sessions for difficult topics"
        ],
        'performance_metrics': {
            'total_students': len(students),
            'total_exams': len(db.query(Exam).filter(Exam.subject_id == subject_id).all()),
            'total_questions': len(db.query(Question).join(Exam).filter(Exam.subject_id == subject_id).all()),
            'average_attainment': round(overall_attainment, 1),
            'target_attainment': round(target_attainment, 1),
            'gap': round(target_attainment - overall_attainment, 1)
        },
        'class_statistics': {
            'total_students': len(students),
            'total_exams': len(db.query(Exam).filter(Exam.subject_id == subject_id).all()),
            'total_questions': len(db.query(Question).join(Exam).filter(Exam.subject_id == subject_id).all()),
            'average_attainment': round(overall_attainment, 1),
            'target_attainment': round(target_attainment, 1),
            'gap': round(target_attainment - overall_attainment, 1)
        }
    }

def calculate_po_attainment_for_subject(db: Session, subject_id: int, exam_type: Optional[str] = None) -> Dict[str, Any]:
    """
    Calculate PO attainment for a subject using CO-PO mapping and CO attainments.
    
    Formula: PO Attainment = Sum(CO Attainment * CO-PO Strength) / Sum(CO-PO Strength) * 100
    """
    # Get CO attainment data
    co_data = calculate_co_attainment_for_subject(db, subject_id, exam_type)
    co_attainment = co_data.get('co_attainment', [])
    
    if not co_attainment:
        return {'po_attainment': []}
    
    # Get CO-PO matrix for this subject
    co_po_matrix = db.query(COPOMatrix).filter(COPOMatrix.subject_id == subject_id).all()
    if not co_po_matrix:
        return {'po_attainment': []}
    
    # Group by PO
    po_groups = defaultdict(list)
    for mapping in co_po_matrix:
        po_groups[mapping.po_id].append({
            'co_id': mapping.co_id,
            'strength': mapping.strength,
            'co_definition': mapping.co_definition
        })
    
    po_attainment = []
    
    for po_id, contributing_cos in po_groups.items():
        # Get PO definition
        po_def = db.query(PODefinition).filter(PODefinition.id == po_id).first()
        if not po_def:
            continue
        
        po_code = po_def.code
        
        # Calculate PO attainment
        total_strength = 0
        weighted_attainment = 0
        contributing_co_details = []
        
        for co_info in contributing_cos:
            co_id = co_info['co_id']
            strength = co_info['strength']
            
            # Find CO attainment
            co_attainment_info = next((co for co in co_attainment if co['co_id'] == co_id), None)
            if not co_attainment_info:
                continue
            
            co_attainment_pct = co_attainment_info['actual_pct']
            total_strength += strength
            weighted_attainment += co_attainment_pct * strength
            
            contributing_co_details.append({
                'co_code': co_attainment_info['co_code'],
                'strength': strength,
                'co_attainment': co_attainment_pct,
                'contribution': (co_attainment_pct * strength) / total_strength if total_strength > 0 else 0
            })
        
        if total_strength > 0:
            direct_attainment = weighted_attainment / total_strength
        else:
            direct_attainment = 0
        
        # For now, set indirect attainment to 0 (can be calculated from surveys later)
        indirect_attainment = 0.0
        total_attainment = direct_attainment * 0.8 + indirect_attainment * 0.2  # 80% direct, 20% indirect
        
        # Determine level
        if total_attainment >= 80:
            level = "L3"
        elif total_attainment >= 70:
            level = "L2"
        elif total_attainment >= 60:
            level = "L1"
        else:
            level = "Below L1"
        
        # Calculate gap
        gap = total_attainment - 70  # Assuming 70% as target
        
        # Generate recommendations
        recommendations = []
        if total_attainment < 60:
            recommendations.append(f"PO {po_code} attainment is below 60%. Focus on strengthening contributing COs.")
        elif total_attainment < 70:
            recommendations.append(f"PO {po_code} attainment is below target. Review contributing COs.")
        else:
            recommendations.append(f"PO {po_code} attainment is satisfactory. Maintain current approach.")
        
        # Calculate strength and improvement areas
        strength_areas = [co['co_code'] for co in contributing_co_details if co['co_attainment'] >= 80]
        improvement_areas = [co['co_code'] for co in contributing_co_details if co['co_attainment'] < 60]
        
        po_attainment.append({
            'po_id': po_id,
            'po_code': po_code,
            'po_description': po_def.description or f"Program Outcome {po_code}",
            'direct_pct': round(direct_attainment, 1),
            'indirect_pct': round(indirect_attainment, 1),
            'total_pct': round(total_attainment, 1),
            'level': level,
            'gap': round(gap, 1),
            'contributing_cos': [co['co_code'] for co in contributing_co_details],
            'co_contributions': contributing_co_details,
            'performance_trend': [
                {'period': 'Current', 'attainment': round(total_attainment, 1)},
                {'period': 'Target', 'attainment': 70.0}
            ],
            'attainment_distribution': {
                'excellent': len([co for co in contributing_co_details if co['co_attainment'] >= 90]),
                'good': len([co for co in contributing_co_details if 80 <= co['co_attainment'] < 90]),
                'satisfactory': len([co for co in contributing_co_details if 70 <= co['co_attainment'] < 80]),
                'needs_improvement': len([co for co in contributing_co_details if co['co_attainment'] < 70])
            },
            'strength_areas': strength_areas,
            'improvement_areas': improvement_areas,
            'recommendations': recommendations
        })
    
    return {'po_attainment': po_attainment}

def calculate_subject_attainment_analytics(db: Session, subject_id: int, exam_type: Optional[str] = None) -> SubjectAttainmentResponse:
    """
    Calculate comprehensive subject attainment analytics using proper formulas.
    """
    # Get subject info
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise ValueError("Subject not found")
    
    # Calculate CO attainment
    co_data = calculate_co_attainment_for_subject(db, subject_id, exam_type)
    
    # Calculate PO attainment
    po_data = calculate_po_attainment_for_subject(db, subject_id, exam_type)
    
    # Calculate additional metrics
    difficulty_analysis = calculate_difficulty_analysis(db, subject_id, exam_type)
    blooms_analysis = calculate_blooms_analysis(db, subject_id, exam_type)
    student_distribution = calculate_student_distribution(db, subject_id, exam_type)
    
    return SubjectAttainmentResponse(
        subject_id=subject_id,
        subject_name=subject.name,
        subject_code=co_data.get('subject_code', f"SUB{subject_id}"),
        semester=co_data.get('semester', "Unknown"),
        credits=co_data.get('credits', 3),
        co_attainment=co_data.get('co_attainment', []),
        po_attainment=po_data.get('po_attainment', []),
        blooms_distribution=blooms_analysis,
        difficulty_mix=difficulty_analysis,
        co_coverage=len(co_data.get('co_attainment', [])) / len(db.query(CODefinition).join(Subject).filter(Subject.id == subject_id).all()) * 100 if db.query(CODefinition).join(Subject).filter(Subject.id == subject_id).count() > 0 else 0,
        overall_attainment=co_data.get('overall_attainment', 0),
        target_attainment=co_data.get('target_attainment', 0),
        gap_analysis=co_data.get('gap_analysis', {}),
        recommendations=co_data.get('recommendations', []),
        performance_metrics=co_data.get('performance_metrics', {}),
        historical_comparison={},
        class_statistics=co_data.get('class_statistics', {}),
        exam_analysis=calculate_exam_analysis(db, subject_id, exam_type),
        difficulty_analysis=difficulty_analysis,
        blooms_analysis=blooms_analysis,
        student_distribution=student_distribution,
        improvement_trends=co_data.get('performance_metrics', {}).get('improvement_trends', [])
    )

def calculate_difficulty_analysis(db: Session, subject_id: int, exam_type: Optional[str] = None) -> Dict[str, Any]:
    """Calculate question difficulty distribution."""
    query = db.query(Question).join(Exam).filter(Exam.subject_id == subject_id)
    if exam_type:
        query = query.filter(Exam.exam_type == exam_type)
    
    questions = query.all()
    
    difficulty_counts = {'easy': 0, 'medium': 0, 'hard': 0}
    total_marks = 0
    
    for question in questions:
        difficulty_counts[question.difficulty.value] += 1
        total_marks += question.max_marks
    
    total_questions = len(questions)
    
    return {
        'easy': {
            'count': difficulty_counts['easy'],
            'percentage': (difficulty_counts['easy'] / total_questions * 100) if total_questions > 0 else 0,
            'marks': sum(q.max_marks for q in questions if q.difficulty.value == 'easy')
        },
        'medium': {
            'count': difficulty_counts['medium'],
            'percentage': (difficulty_counts['medium'] / total_questions * 100) if total_questions > 0 else 0,
            'marks': sum(q.max_marks for q in questions if q.difficulty.value == 'medium')
        },
        'hard': {
            'count': difficulty_counts['hard'],
            'percentage': (difficulty_counts['hard'] / total_questions * 100) if total_questions > 0 else 0,
            'marks': sum(q.max_marks for q in questions if q.difficulty.value == 'hard')
        }
    }

def calculate_blooms_analysis(db: Session, subject_id: int, exam_type: Optional[str] = None) -> Dict[str, Any]:
    """Calculate Blooms taxonomy distribution."""
    query = db.query(Question).join(Exam).filter(Exam.subject_id == subject_id)
    if exam_type:
        query = query.filter(Exam.exam_type == exam_type)
    
    questions = query.all()
    
    blooms_counts = defaultdict(int)
    total_marks = 0
    
    for question in questions:
        if question.blooms_level:
            blooms_counts[question.blooms_level] += 1
            total_marks += question.max_marks
    
    total_questions = len(questions)
    
    result = {}
    for level, count in blooms_counts.items():
        result[level] = {
            'count': count,
            'percentage': (count / total_questions * 100) if total_questions > 0 else 0,
            'marks': sum(q.max_marks for q in questions if q.blooms_level == level)
        }
    
    return result

def calculate_student_distribution(db: Session, subject_id: int, exam_type: Optional[str] = None) -> Dict[str, int]:
    """Calculate student grade distribution."""
    # Get all students for this subject
    students = db.query(User).filter(User.role == 'student').all()
    
    # Calculate overall attainment for each student
    student_attainments = {}
    for student in students:
        co_data = calculate_co_attainment_for_student(db, student.id, subject_id, exam_type)
        if co_data:
            avg_attainment = statistics.mean([co['attainment_pct'] for co in co_data.values()])
            student_attainments[student.id] = avg_attainment
    
    # Categorize by grades
    distribution = {'A_grade': 0, 'B_grade': 0, 'C_grade': 0, 'D_grade': 0, 'F_grade': 0}
    
    for attainment in student_attainments.values():
        if attainment >= 90:
            distribution['A_grade'] += 1
        elif attainment >= 80:
            distribution['B_grade'] += 1
        elif attainment >= 70:
            distribution['C_grade'] += 1
        elif attainment >= 60:
            distribution['D_grade'] += 1
        else:
            distribution['F_grade'] += 1
    
    return distribution

def calculate_exam_analysis(db: Session, subject_id: int, exam_type: Optional[str] = None) -> Dict[str, Any]:
    """Calculate exam analysis."""
    query = db.query(Exam).filter(Exam.subject_id == subject_id)
    if exam_type:
        query = query.filter(Exam.exam_type == exam_type)
    
    exams = query.all()
    
    result = {}
    for exam in exams:
        questions = db.query(Question).filter(Question.exam_id == exam.id).all()
        total_marks = sum(q.max_marks for q in questions)
        
        # Calculate average difficulty
        difficulty_counts = {'easy': 0, 'medium': 0, 'hard': 0}
        for q in questions:
            difficulty_counts[q.difficulty.value] += 1
        
        if difficulty_counts['easy'] >= difficulty_counts['medium'] and difficulty_counts['easy'] >= difficulty_counts['hard']:
            avg_difficulty = 'easy'
        elif difficulty_counts['medium'] >= difficulty_counts['hard']:
            avg_difficulty = 'medium'
        else:
            avg_difficulty = 'hard'
        
        result[exam.exam_type.value] = {
            'total_marks': total_marks,
            'total_questions': len(questions),
            'difficulty': avg_difficulty,
            'exam_type': exam.exam_type.value
        }
    
    return result
