"""
Advanced Attainment Analytics with Comprehensive Analysis

This module provides detailed analytics including:
- Student-level attainment analysis
- Class-wise comparisons
- Exam-wise trends and comparisons
- Performance insights and recommendations
- Advanced statistical analysis
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, desc, case, text
from models import *
from schemas import *
from crud import *
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
import statistics
import numpy as np
from datetime import datetime, timedelta
import json

def calculate_student_detailed_attainment(db: Session, student_id: int, subject_id: int) -> Dict[str, Any]:
    """
    Calculate detailed attainment analysis for a specific student.
    """
    # Get student info
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        return {}
    
    # Get subject info
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        return {}
    
    # Check if student is enrolled in this subject's class
    if not student.class_id or student.class_id != subject.class_id:
        return {}
    
    # Get all exams for this subject
    exams = db.query(Exam).filter(Exam.subject_id == subject_id).all()
    if not exams:
        return {}
    
    exam_ids = [e.id for e in exams]
    
    # Get all marks for this student
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
    
    # Get CO definitions
    co_definitions = db.query(CODefinition).join(Subject).filter(Subject.id == subject_id).all()
    co_targets = db.query(COTarget).filter(COTarget.subject_id == subject_id).all()
    target_lookup = {t.co_id: t for t in co_targets}
    
    # Calculate CO attainment for this student
    co_attainment = {}
    exam_performance = {}
    
    for co_def in co_definitions:
        co_id = co_def.id
        co_code = co_def.code
        
        # Get CO weights for this CO
        co_weights = db.query(QuestionCOWeight).filter(QuestionCOWeight.co_id == co_id).all()
        if not co_weights:
            continue
        
        # Calculate weighted marks
        total_weighted_marks = 0.0
        obtained_weighted_marks = 0.0
        question_details = []
        
        for co_weight in co_weights:
            question_id = co_weight.question_id
            weight_pct = co_weight.weight_pct
            
            # Find the mark for this question
            mark = next((m for m in marks if m.question_id == question_id), None)
            if not mark:
                continue
            
            question_max_marks = mark.question.max_marks
            question_obtained_marks = mark.marks_obtained
            
            weighted_max = question_max_marks * (weight_pct / 100.0)
            weighted_obtained = question_obtained_marks * (weight_pct / 100.0)
            
            total_weighted_marks += weighted_max
            obtained_weighted_marks += weighted_obtained
            
            question_details.append({
                'question_id': question_id,
                'question_text': mark.question.question_text[:100] + '...',
                'max_marks': question_max_marks,
                'obtained_marks': question_obtained_marks,
                'percentage': (question_obtained_marks / question_max_marks) * 100,
                'weight_pct': weight_pct,
                'weighted_max': weighted_max,
                'weighted_obtained': weighted_obtained,
                'exam_name': mark.exam.name,
                'exam_type': mark.exam.exam_type.value,
                'difficulty': mark.question.difficulty.value,
                'blooms_level': mark.question.blooms_level
            })
        
        if total_weighted_marks > 0:
            co_attainment_pct = (obtained_weighted_marks / total_weighted_marks) * 100
            target = target_lookup.get(co_id)
            
            co_attainment[co_code] = {
                'co_id': co_id,
                'co_code': co_code,
                'co_description': co_def.description,
                'attainment_pct': round(co_attainment_pct, 2),
                'target_pct': target.target_pct if target else 70.0,
                'gap': round(co_attainment_pct - (target.target_pct if target else 70.0), 2),
                'total_weighted_marks': round(total_weighted_marks, 2),
                'obtained_weighted_marks': round(obtained_weighted_marks, 2),
                'questions_count': len(co_weights),
                'question_details': question_details
            }
    
    # Calculate exam-wise performance
    for exam in exams:
        exam_marks = [m for m in marks if m.exam_id == exam.id]
        if exam_marks:
            total_marks = sum(m.question.max_marks for m in exam_marks)
            obtained_marks = sum(m.marks_obtained for m in exam_marks)
            percentage = (obtained_marks / total_marks) * 100 if total_marks > 0 else 0
            
            exam_performance[exam.id] = {
                'exam_name': exam.name,
                'exam_type': exam.exam_type.value,
                'total_marks': total_marks,
                'obtained_marks': obtained_marks,
                'percentage': round(percentage, 2),
                'questions_attempted': len(exam_marks),
                'total_questions': len(db.query(Question).filter(Question.exam_id == exam.id).all()),
                'date': exam.created_at.isoformat() if exam.created_at else None
            }
    
    # Calculate overall statistics
    overall_attainment = statistics.mean([co['attainment_pct'] for co in co_attainment.values()]) if co_attainment else 0
    target_attainment = statistics.mean([co['target_pct'] for co in co_attainment.values()]) if co_attainment else 70
    
    # Calculate performance trends
    performance_trend = []
    for exam_id, perf in exam_performance.items():
        performance_trend.append({
            'exam_name': perf['exam_name'],
            'exam_type': perf['exam_type'],
            'percentage': perf['percentage'],
            'date': perf['date']
        })
    
    # Sort by date
    performance_trend.sort(key=lambda x: x['date'] if x['date'] else '')
    
    return {
        'student_id': student_id,
        'student_name': f"{student.first_name} {student.last_name}",
        'student_username': student.username,
        'subject_id': subject_id,
        'subject_name': subject.name,
        'overall_attainment': round(overall_attainment, 2),
        'target_attainment': round(target_attainment, 2),
        'gap': round(overall_attainment - target_attainment, 2),
        'co_attainment': co_attainment,
        'exam_performance': exam_performance,
        'performance_trend': performance_trend,
        'total_exams': len(exams),
        'exams_attempted': len(exam_performance),
        'total_questions_attempted': sum(perf['questions_attempted'] for perf in exam_performance.values()),
        'average_exam_percentage': round(statistics.mean([perf['percentage'] for perf in exam_performance.values()]), 2) if exam_performance else 0
    }

def calculate_class_comparison_analytics(db: Session, subject_id: int) -> Dict[str, Any]:
    """
    Calculate class-wise comparison analytics.
    """
    # Get subject info
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        return {}
    
    # Get only students enrolled in this subject's class
    students = db.query(User).filter(
        and_(
            User.role == 'student',
            User.class_id == subject.class_id
        )
    ).all()
    if not students:
        return {}
    
    # Calculate individual student attainments
    student_attainments = []
    for student in students:
        student_data = calculate_student_detailed_attainment(db, student.id, subject_id)
        if student_data and student_data.get('overall_attainment', 0) > 0:
            student_attainments.append(student_data)
    
    if not student_attainments:
        return {}
    
    # Calculate class statistics
    overall_attainments = [s['overall_attainment'] for s in student_attainments]
    target_attainments = [s['target_attainment'] for s in student_attainments]
    
    class_stats = {
        'total_students': len(student_attainments),
        'average_attainment': round(statistics.mean(overall_attainments), 2),
        'median_attainment': round(statistics.median(overall_attainments), 2),
        'std_deviation': round(statistics.stdev(overall_attainments) if len(overall_attainments) > 1 else 0, 2),
        'min_attainment': round(min(overall_attainments), 2),
        'max_attainment': round(max(overall_attainments), 2),
        'target_attainment': round(statistics.mean(target_attainments), 2),
        'students_above_target': len([a for a in overall_attainments if a >= statistics.mean(target_attainments)]),
        'students_below_target': len([a for a in overall_attainments if a < statistics.mean(target_attainments)]),
        'passing_rate': round((len([a for a in overall_attainments if a >= 60]) / len(overall_attainments)) * 100, 2),
        'excellent_rate': round((len([a for a in overall_attainments if a >= 90]) / len(overall_attainments)) * 100, 2)
    }
    
    # Calculate grade distribution
    grade_distribution = {
        'A_grade': len([a for a in overall_attainments if a >= 90]),
        'B_grade': len([a for a in overall_attainments if 80 <= a < 90]),
        'C_grade': len([a for a in overall_attainments if 70 <= a < 90]),
        'D_grade': len([a for a in overall_attainments if 60 <= a < 70]),
        'F_grade': len([a for a in overall_attainments if a < 60])
    }
    
    # Calculate CO-wise class performance
    co_performance = {}
    co_definitions = db.query(CODefinition).join(Subject).filter(Subject.id == subject_id).all()
    
    for co_def in co_definitions:
        co_code = co_def.code
        co_attainments = []
        
        for student in student_attainments:
            if co_code in student['co_attainment']:
                co_attainments.append(student['co_attainment'][co_code]['attainment_pct'])
        
        if co_attainments:
            co_performance[co_code] = {
                'co_description': co_def.description,
                'average_attainment': round(statistics.mean(co_attainments), 2),
                'median_attainment': round(statistics.median(co_attainments), 2),
                'std_deviation': round(statistics.stdev(co_attainments) if len(co_attainments) > 1 else 0, 2),
                'min_attainment': round(min(co_attainments), 2),
                'max_attainment': round(max(co_attainments), 2),
                'students_above_target': len([a for a in co_attainments if a >= 70]),
                'students_below_target': len([a for a in co_attainments if a < 70])
            }
    
    # Calculate performance quartiles
    sorted_attainments = sorted(overall_attainments)
    n = len(sorted_attainments)
    quartiles = {
        'Q1': round(sorted_attainments[n//4], 2) if n > 0 else 0,
        'Q2': round(sorted_attainments[n//2], 2) if n > 0 else 0,
        'Q3': round(sorted_attainments[3*n//4], 2) if n > 0 else 0
    }
    
    # Identify top and bottom performers
    top_performers = sorted(student_attainments, key=lambda x: x['overall_attainment'], reverse=True)[:3]
    bottom_performers = sorted(student_attainments, key=lambda x: x['overall_attainment'])[:3]
    
    return {
        'subject_id': subject_id,
        'subject_name': subject.name,
        'class_statistics': class_stats,
        'grade_distribution': grade_distribution,
        'co_performance': co_performance,
        'quartiles': quartiles,
        'top_performers': [
            {
                'student_name': s['student_name'],
                'attainment': s['overall_attainment'],
                'gap': s['gap']
            } for s in top_performers
        ],
        'bottom_performers': [
            {
                'student_name': s['student_name'],
                'attainment': s['overall_attainment'],
                'gap': s['gap']
            } for s in bottom_performers
        ],
        'student_details': student_attainments
    }

def calculate_exam_comparison_analytics(db: Session, subject_id: int) -> Dict[str, Any]:
    """
    Calculate exam-wise comparison and trend analytics.
    """
    # Get all exams for this subject
    exams = db.query(Exam).filter(Exam.subject_id == subject_id).order_by(Exam.created_at).all()
    if not exams:
        return {}
    
    # Get all students
    students = db.query(User).filter(User.role == 'student').all()
    if not students:
        return {}
    
    exam_analytics = {}
    exam_trends = []
    
    for exam in exams:
        # Get all marks for this exam
        marks = db.query(Mark).options(
            joinedload(Mark.question)
        ).filter(Mark.exam_id == exam.id).all()
        
        if not marks:
            continue
        
        # Calculate exam statistics
        student_percentages = []
        question_stats = {}
        
        # Group marks by student
        student_marks = defaultdict(list)
        for mark in marks:
            student_marks[mark.student_id].append(mark)
        
        for student_id, student_mark_list in student_marks.items():
            total_marks = sum(m.question.max_marks for m in student_mark_list)
            obtained_marks = sum(m.marks_obtained for m in student_mark_list)
            percentage = (obtained_marks / total_marks) * 100 if total_marks > 0 else 0
            student_percentages.append(percentage)
        
        # Calculate question-wise statistics
        questions = db.query(Question).filter(Question.exam_id == exam.id).all()
        for question in questions:
            question_marks = [m for m in marks if m.question_id == question.id]
            if question_marks:
                percentages = [(m.marks_obtained / question.max_marks) * 100 for m in question_marks]
                question_stats[question.id] = {
                    'question_number': question.question_number,
                    'question_text': question.question_text[:100] + '...',
                    'max_marks': question.max_marks,
                    'average_percentage': round(statistics.mean(percentages), 2),
                    'std_deviation': round(statistics.stdev(percentages) if len(percentages) > 1 else 0, 2),
                    'difficulty': question.difficulty.value,
                    'blooms_level': question.blooms_level,
                    'students_attempted': len(question_marks)
                }
        
        exam_analytics[exam.id] = {
            'exam_name': exam.name,
            'exam_type': exam.exam_type.value,
            'total_questions': len(questions),
            'total_marks': sum(q.max_marks for q in questions),
            'students_attempted': len(student_percentages),
            'average_percentage': round(statistics.mean(student_percentages), 2) if student_percentages else 0,
            'median_percentage': round(statistics.median(student_percentages), 2) if student_percentages else 0,
            'std_deviation': round(statistics.stdev(student_percentages), 2) if len(student_percentages) > 1 else 0,
            'min_percentage': round(min(student_percentages), 2) if student_percentages else 0,
            'max_percentage': round(max(student_percentages), 2) if student_percentages else 0,
            'passing_rate': round((len([p for p in student_percentages if p >= 60]) / len(student_percentages)) * 100, 2) if student_percentages else 0,
            'excellent_rate': round((len([p for p in student_percentages if p >= 90]) / len(student_percentages)) * 100, 2) if student_percentages else 0,
            'question_statistics': question_stats,
            'created_at': exam.created_at.isoformat() if exam.created_at else None
        }
        
        exam_trends.append({
            'exam_name': exam.name,
            'exam_type': exam.exam_type.value,
            'average_percentage': round(statistics.mean(student_percentages), 2) if student_percentages else 0,
            'passing_rate': round((len([p for p in student_percentages if p >= 60]) / len(student_percentages)) * 100, 2) if student_percentages else 0,
            'students_attempted': len(student_percentages),
            'created_at': exam.created_at.isoformat() if exam.created_at else None
        })
    
    # Calculate overall trends
    if len(exam_trends) > 1:
        # Calculate improvement/decline trends
        first_exam = exam_trends[0]
        last_exam = exam_trends[-1]
        
        trend_analysis = {
            'overall_trend': 'improving' if last_exam['average_percentage'] > first_exam['average_percentage'] else 'declining',
            'percentage_change': round(last_exam['average_percentage'] - first_exam['average_percentage'], 2),
            'passing_rate_change': round(last_exam['passing_rate'] - first_exam['passing_rate'], 2),
            'total_exams': len(exam_trends),
            'average_per_exam': round(statistics.mean([e['average_percentage'] for e in exam_trends]), 2)
        }
    else:
        trend_analysis = {
            'overall_trend': 'insufficient_data',
            'percentage_change': 0,
            'passing_rate_change': 0,
            'total_exams': len(exam_trends),
            'average_per_exam': exam_trends[0]['average_percentage'] if exam_trends else 0
        }
    
    return {
        'subject_id': subject_id,
        'exam_analytics': exam_analytics,
        'exam_trends': exam_trends,
        'trend_analysis': trend_analysis
    }

def calculate_comprehensive_attainment_analytics(db: Session, subject_id: int) -> Dict[str, Any]:
    """
    Calculate comprehensive attainment analytics combining all analysis types.
    """
    # Get basic subject info
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        return {}
    
    # Calculate all analytics
    student_analytics = {}
    students = db.query(User).filter(User.role == 'student').all()
    
    for student in students:
        student_data = calculate_student_detailed_attainment(db, student.id, subject_id)
        if student_data and student_data.get('overall_attainment', 0) > 0:
            student_analytics[student.id] = student_data
    
    class_comparison = calculate_class_comparison_analytics(db, subject_id)
    exam_comparison = calculate_exam_comparison_analytics(db, subject_id)
    
    # Calculate advanced insights
    insights = []
    
    if class_comparison:
        class_stats = class_comparison.get('class_statistics', {})
        
        # Performance insights
        if class_stats.get('average_attainment', 0) > 80:
            insights.append("Class is performing excellently with high average attainment")
        elif class_stats.get('average_attainment', 0) > 70:
            insights.append("Class is performing well above target")
        elif class_stats.get('average_attainment', 0) > 60:
            insights.append("Class is performing satisfactorily but below target")
        else:
            insights.append("Class needs immediate attention with low attainment levels")
        
        # Consistency insights
        if class_stats.get('std_deviation', 0) < 10:
            insights.append("Class shows consistent performance across students")
        elif class_stats.get('std_deviation', 0) > 20:
            insights.append("High variation in student performance - consider differentiated instruction")
        
        # Passing rate insights
        if class_stats.get('passing_rate', 0) > 90:
            insights.append("Excellent passing rate - maintain current teaching methods")
        elif class_stats.get('passing_rate', 0) < 60:
            insights.append("Low passing rate - review curriculum and teaching strategies")
    
    if exam_comparison:
        trend_analysis = exam_comparison.get('trend_analysis', {})
        
        if trend_analysis.get('overall_trend') == 'improving':
            insights.append("Student performance is improving across exams")
        elif trend_analysis.get('overall_trend') == 'declining':
            insights.append("Student performance is declining - investigate causes")
    
    # Generate recommendations
    recommendations = []
    
    if class_comparison:
        class_stats = class_comparison.get('class_statistics', {})
        
        if class_stats.get('students_below_target', 0) > class_stats.get('total_students', 0) * 0.3:
            recommendations.append("Consider additional support sessions for struggling students")
        
        if class_stats.get('excellent_rate', 0) < 20:
            recommendations.append("Implement advanced challenges for high-performing students")
        
        if class_stats.get('std_deviation', 0) > 15:
            recommendations.append("Use differentiated instruction strategies to address varying skill levels")
    
    return {
        'subject_id': subject_id,
        'subject_name': subject.name,
        'analysis_timestamp': datetime.now().isoformat(),
        'student_analytics': student_analytics,
        'class_comparison': class_comparison,
        'exam_comparison': exam_comparison,
        'insights': insights,
        'recommendations': recommendations,
        'summary': {
            'total_students_analyzed': len(student_analytics),
            'total_exams_analyzed': len(exam_comparison.get('exam_analytics', {})),
            'average_class_attainment': class_comparison.get('class_statistics', {}).get('average_attainment', 0),
            'class_performance_level': 'excellent' if class_comparison.get('class_statistics', {}).get('average_attainment', 0) > 80 else 'good' if class_comparison.get('class_statistics', {}).get('average_attainment', 0) > 70 else 'needs_improvement'
        }
    }
