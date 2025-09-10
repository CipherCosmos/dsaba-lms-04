from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, and_, or_, desc, asc
from models import *
from typing import Dict, List, Any, Optional
import statistics
import numpy as np
from collections import defaultdict
from datetime import datetime, timedelta
import pandas as pd

def get_advanced_student_analytics(db: Session, student_id: int, subject_id: Optional[int] = None) -> Dict[str, Any]:
    """Advanced student analytics with detailed CO/PO analysis and predictions"""
    try:
        student = db.query(User).filter(User.id == student_id).first()
        if not student or student.role != UserRole.student:
            return {}

        # Get detailed marks with all relationships
        marks_query = db.query(Mark).options(
            joinedload(Mark.question),
            joinedload(Mark.exam).joinedload(Exam.subject)
        ).filter(Mark.student_id == student_id)

        if subject_id:
            marks_query = marks_query.join(Exam).filter(Exam.subject_id == subject_id)

        marks = marks_query.all()

        if not marks:
            return get_empty_analytics()

        # Advanced performance calculations
        performance_analysis = calculate_advanced_performance(marks)
        
        # Detailed CO/PO analysis
        co_po_analysis = calculate_detailed_co_po_analysis(marks, db)
        
        # Learning curve analysis
        learning_curve = calculate_learning_curve(marks)
        
        # Difficulty-wise analysis
        difficulty_analysis = analyze_performance_by_difficulty(marks)
        
        # Bloom's taxonomy analysis
        blooms_analysis = analyze_blooms_taxonomy_performance(marks)
        
        # Predictive analytics
        predictions = generate_performance_predictions(marks)
        
        # Comparative analysis with class
        comparative_analysis = get_class_comparative_analysis(db, student_id, marks)
        
        # Recommendation engine
        recommendations = generate_personalized_recommendations(performance_analysis, co_po_analysis, difficulty_analysis)

        return {
            "basic_metrics": performance_analysis,
            "co_po_detailed": co_po_analysis,
            "learning_curve": learning_curve,
            "difficulty_analysis": difficulty_analysis,
            "blooms_analysis": blooms_analysis,
            "predictions": predictions,
            "comparative_analysis": comparative_analysis,
            "recommendations": recommendations,
            "study_plan": generate_adaptive_study_plan(co_po_analysis, difficulty_analysis)
        }

    except Exception as e:
        print(f"Error in advanced student analytics: {e}")
        return get_empty_analytics()

def calculate_advanced_performance(marks: List[Mark]) -> Dict[str, Any]:
    """Calculate advanced performance metrics"""
    if not marks:
        return {}
    
    # Group marks by exam
    exam_performance = defaultdict(lambda: {"obtained": 0, "total": 0, "questions": 0})
    
    for mark in marks:
        if mark.question:
            exam_id = mark.exam_id
            exam_performance[exam_id]["obtained"] += mark.marks_obtained
            exam_performance[exam_id]["total"] += mark.question.max_marks
            exam_performance[exam_id]["questions"] += 1
    
    # Calculate various metrics
    exam_percentages = []
    consistency_scores = []
    
    for exam_data in exam_performance.values():
        if exam_data["total"] > 0:
            percentage = (exam_data["obtained"] / exam_data["total"]) * 100
            exam_percentages.append(percentage)
            
            # Question-level consistency
            question_scores = []
            for mark in marks:
                if mark.exam_id in exam_performance and mark.question:
                    question_score = (mark.marks_obtained / mark.question.max_marks) * 100
                    question_scores.append(question_score)
            
            if len(question_scores) > 1:
                consistency_scores.append(statistics.stdev(question_scores))

    # Advanced metrics
    overall_percentage = statistics.mean(exam_percentages) if exam_percentages else 0
    improvement_trend = calculate_improvement_trend(exam_percentages)
    consistency_index = 100 - statistics.mean(consistency_scores) if consistency_scores else 100
    
    return {
        "overall_percentage": round(overall_percentage, 2),
        "exam_percentages": [round(p, 2) for p in exam_percentages],
        "improvement_trend": improvement_trend,
        "consistency_index": round(consistency_index, 2),
        "performance_stability": calculate_performance_stability(exam_percentages),
        "peak_performance": max(exam_percentages) if exam_percentages else 0,
        "average_performance": overall_percentage,
        "performance_variance": round(statistics.variance(exam_percentages), 2) if len(exam_percentages) > 1 else 0
    }

def calculate_detailed_co_po_analysis(marks: List[Mark], db: Session) -> Dict[str, Any]:
    """Detailed Course Outcome and Program Outcome analysis"""
    co_analysis = defaultdict(lambda: {
        "marks_obtained": 0, 
        "total_marks": 0, 
        "question_count": 0,
        "difficulty_breakdown": {"easy": 0, "medium": 0, "hard": 0},
        "blooms_breakdown": defaultdict(int),
        "exam_wise": defaultdict(float)
    })
    
    po_analysis = defaultdict(lambda: {
        "marks_obtained": 0, 
        "total_marks": 0, 
        "question_count": 0,
        "co_mapping": set(),
        "subject_mapping": set()
    })
    
    for mark in marks:
        if not mark.question:
            continue
            
        question = mark.question
        
        # CO Analysis
        if question.co_mapping:
            for co in question.co_mapping:
                co_analysis[co]["marks_obtained"] += mark.marks_obtained
                co_analysis[co]["total_marks"] += question.max_marks
                co_analysis[co]["question_count"] += 1
                co_analysis[co]["difficulty_breakdown"][question.difficulty.value] += 1
                co_analysis[co]["blooms_breakdown"][question.blooms_level] += 1
                
                # Exam-wise CO performance
                if mark.exam:
                    exam_key = f"{mark.exam.name}"
                    if question.max_marks > 0:
                        co_analysis[co]["exam_wise"][exam_key] = (mark.marks_obtained / question.max_marks) * 100
        
        # PO Analysis
        if question.po_mapping:
            for po in question.po_mapping:
                po_analysis[po]["marks_obtained"] += mark.marks_obtained
                po_analysis[po]["total_marks"] += question.max_marks
                po_analysis[po]["question_count"] += 1
                
                if question.co_mapping:
                    po_analysis[po]["co_mapping"].update(question.co_mapping)
                
                if mark.exam and mark.exam.subject:
                    po_analysis[po]["subject_mapping"].add(mark.exam.subject.name)
    
    # Calculate attainment percentages and grades
    co_results = {}
    for co, data in co_analysis.items():
        if data["total_marks"] > 0:
            attainment = (data["marks_obtained"] / data["total_marks"]) * 100
            co_results[co] = {
                "attainment_percentage": round(attainment, 2),
                "grade": get_attainment_grade(attainment),
                "question_count": data["question_count"],
                "difficulty_distribution": dict(data["difficulty_breakdown"]),
                "blooms_distribution": dict(data["blooms_breakdown"]),
                "exam_performance": dict(data["exam_wise"]),
                "improvement_needed": attainment < 60,
                "strength_area": attainment >= 80
            }
    
    po_results = {}
    for po, data in po_analysis.items():
        if data["total_marks"] > 0:
            attainment = (data["marks_obtained"] / data["total_marks"]) * 100
            po_results[po] = {
                "attainment_percentage": round(attainment, 2),
                "grade": get_attainment_grade(attainment),
                "question_count": data["question_count"],
                "related_cos": list(data["co_mapping"]),
                "subjects_involved": list(data["subject_mapping"]),
                "improvement_needed": attainment < 60,
                "strength_area": attainment >= 80
            }
    
    return {
        "co_analysis": co_results,
        "po_analysis": po_results,
        "overall_co_attainment": calculate_overall_attainment(co_results),
        "overall_po_attainment": calculate_overall_attainment(po_results),
        "nba_compliance": check_nba_compliance(co_results, po_results)
    }

def analyze_performance_by_difficulty(marks: List[Mark]) -> Dict[str, Any]:
    """Analyze performance based on question difficulty"""
    difficulty_stats = defaultdict(lambda: {"obtained": 0, "total": 0, "count": 0})
    
    for mark in marks:
        if mark.question:
            difficulty = mark.question.difficulty.value
            difficulty_stats[difficulty]["obtained"] += mark.marks_obtained
            difficulty_stats[difficulty]["total"] += mark.question.max_marks
            difficulty_stats[difficulty]["count"] += 1
    
    results = {}
    for difficulty, data in difficulty_stats.items():
        if data["total"] > 0:
            percentage = (data["obtained"] / data["total"]) * 100
            results[difficulty] = {
                "percentage": round(percentage, 2),
                "question_count": data["count"],
                "total_marks": data["total"],
                "obtained_marks": round(data["obtained"], 2),
                "performance_level": get_performance_level(percentage)
            }
    
    return results

def analyze_blooms_taxonomy_performance(marks: List[Mark]) -> Dict[str, Any]:
    """Analyze performance based on Bloom's taxonomy levels"""
    blooms_stats = defaultdict(lambda: {"obtained": 0, "total": 0, "count": 0})
    
    for mark in marks:
        if mark.question and mark.question.blooms_level:
            level = mark.question.blooms_level
            blooms_stats[level]["obtained"] += mark.marks_obtained
            blooms_stats[level]["total"] += mark.question.max_marks
            blooms_stats[level]["count"] += 1
    
    results = {}
    for level, data in blooms_stats.items():
        if data["total"] > 0:
            percentage = (data["obtained"] / data["total"]) * 100
            results[level] = {
                "percentage": round(percentage, 2),
                "question_count": data["count"],
                "cognitive_level": get_cognitive_level_description(level),
                "performance_indicator": get_blooms_performance_indicator(level, percentage)
            }
    
    return results

def generate_performance_predictions(marks: List[Mark]) -> Dict[str, Any]:
    """Generate performance predictions using trend analysis"""
    if len(marks) < 3:
        return {"insufficient_data": True}
    
    # Group marks by exam chronologically
    exam_performance = defaultdict(lambda: {"obtained": 0, "total": 0, "date": None})
    
    for mark in marks:
        if mark.question and mark.exam:
            exam_id = mark.exam_id
            exam_performance[exam_id]["obtained"] += mark.marks_obtained
            exam_performance[exam_id]["total"] += mark.question.max_marks
            if not exam_performance[exam_id]["date"]:
                exam_performance[exam_id]["date"] = mark.exam.created_at
    
    # Calculate trend
    performance_data = []
    for exam_data in exam_performance.values():
        if exam_data["total"] > 0:
            percentage = (exam_data["obtained"] / exam_data["total"]) * 100
            performance_data.append((exam_data["date"], percentage))
    
    # Sort by date
    performance_data.sort(key=lambda x: x[0])
    
    if len(performance_data) < 3:
        return {"insufficient_data": True}
    
    # Simple linear regression for trend
    percentages = [p[1] for p in performance_data]
    trend_slope = calculate_trend_slope(percentages)
    
    # Predict next performance
    last_performance = percentages[-1]
    predicted_next = max(0, min(100, last_performance + trend_slope))
    
    return {
        "trend_direction": "improving" if trend_slope > 1 else "declining" if trend_slope < -1 else "stable",
        "trend_strength": abs(trend_slope),
        "predicted_next_performance": round(predicted_next, 2),
        "confidence_level": calculate_prediction_confidence(percentages),
        "recommendation": get_trend_based_recommendation(trend_slope, last_performance)
    }

def generate_personalized_recommendations(performance_analysis: Dict, co_po_analysis: Dict, difficulty_analysis: Dict) -> List[Dict[str, Any]]:
    """Generate personalized study recommendations"""
    recommendations = []
    
    # Performance-based recommendations
    if performance_analysis.get("overall_percentage", 0) < 60:
        recommendations.append({
            "type": "urgent",
            "category": "Overall Performance",
            "message": "Immediate attention needed. Focus on fundamental concepts.",
            "action_items": [
                "Schedule daily study sessions",
                "Seek help from teachers",
                "Form study groups with peers"
            ]
        })
    
    # CO-based recommendations
    if "co_analysis" in co_po_analysis:
        weak_cos = [co for co, data in co_po_analysis["co_analysis"].items() 
                   if data["attainment_percentage"] < 60]
        
        if weak_cos:
            recommendations.append({
                "type": "academic",
                "category": "Course Outcomes",
                "message": f"Focus on improving weak COs: {', '.join(weak_cos)}",
                "action_items": [
                    f"Review topics related to {', '.join(weak_cos)}",
                    "Practice additional problems in these areas",
                    "Consult reference materials for better understanding"
                ]
            })
    
    # Difficulty-based recommendations
    if difficulty_analysis:
        hard_performance = difficulty_analysis.get("hard", {}).get("percentage", 0)
        if hard_performance < 50:
            recommendations.append({
                "type": "skill",
                "category": "Problem Solving",
                "message": "Improve performance on challenging problems",
                "action_items": [
                    "Practice more complex problems daily",
                    "Break down difficult problems into steps",
                    "Seek guidance on advanced topics"
                ]
            })
    
    return recommendations

def generate_adaptive_study_plan(co_po_analysis: Dict, difficulty_analysis: Dict) -> Dict[str, Any]:
    """Generate an adaptive study plan based on performance"""
    study_plan = {
        "daily_schedule": [],
        "weekly_goals": [],
        "priority_topics": [],
        "practice_recommendations": []
    }
    
    # Identify weak areas
    weak_cos = []
    if "co_analysis" in co_po_analysis:
        weak_cos = [co for co, data in co_po_analysis["co_analysis"].items() 
                   if data["attainment_percentage"] < 70]
    
    # Daily schedule recommendations
    if weak_cos:
        study_plan["daily_schedule"].append({
            "time_slot": "Morning (1 hour)",
            "activity": f"Focus on weak COs: {', '.join(weak_cos[:2])}",
            "materials": "Textbook chapters, practice problems"
        })
    
    study_plan["daily_schedule"].append({
        "time_slot": "Evening (30 minutes)",
        "activity": "Review daily topics and solve practice questions",
        "materials": "Class notes, reference books"
    })
    
    # Weekly goals
    if weak_cos:
        study_plan["weekly_goals"].append({
            "goal": f"Improve understanding of {weak_cos[0]} by 15%",
            "target_date": "End of week",
            "success_criteria": "Score 70%+ in practice tests"
        })
    
    return study_plan

# Helper functions
def get_empty_analytics() -> Dict[str, Any]:
    """Return empty analytics structure"""
    return {
        "basic_metrics": {},
        "co_po_detailed": {"co_analysis": {}, "po_analysis": {}},
        "learning_curve": {},
        "difficulty_analysis": {},
        "blooms_analysis": {},
        "predictions": {"insufficient_data": True},
        "comparative_analysis": {},
        "recommendations": [],
        "study_plan": {"daily_schedule": [], "weekly_goals": []}
    }

def calculate_improvement_trend(percentages: List[float]) -> str:
    """Calculate improvement trend from performance data"""
    if len(percentages) < 2:
        return "insufficient_data"
    
    recent_avg = statistics.mean(percentages[-3:]) if len(percentages) >= 3 else percentages[-1]
    older_avg = statistics.mean(percentages[:-3]) if len(percentages) >= 6 else percentages[0]
    
    if recent_avg > older_avg + 5:
        return "strong_improvement"
    elif recent_avg > older_avg + 2:
        return "moderate_improvement"
    elif recent_avg < older_avg - 5:
        return "declining"
    elif recent_avg < older_avg - 2:
        return "slight_decline"
    else:
        return "stable"

def calculate_performance_stability(percentages: List[float]) -> float:
    """Calculate performance stability index"""
    if len(percentages) < 2:
        return 100.0
    
    variance = statistics.variance(percentages)
    stability = max(0, 100 - variance)
    return round(stability, 2)

def get_attainment_grade(percentage: float) -> str:
    """Get grade based on attainment percentage"""
    if percentage >= 90:
        return "A+"
    elif percentage >= 80:
        return "A"
    elif percentage >= 70:
        return "B+"
    elif percentage >= 60:
        return "B"
    elif percentage >= 50:
        return "C"
    else:
        return "F"

def get_performance_level(percentage: float) -> str:
    """Get performance level description"""
    if percentage >= 85:
        return "Excellent"
    elif percentage >= 75:
        return "Good"
    elif percentage >= 60:
        return "Satisfactory"
    elif percentage >= 50:
        return "Needs Improvement"
    else:
        return "Poor"

def get_cognitive_level_description(blooms_level: str) -> str:
    """Get description for Bloom's taxonomy level"""
    descriptions = {
        "Remember": "Basic recall and recognition",
        "Understand": "Comprehension and explanation",
        "Apply": "Using knowledge in new situations",
        "Analyze": "Breaking down complex information",
        "Evaluate": "Making judgments and decisions",
        "Create": "Producing new and original work"
    }
    return descriptions.get(blooms_level, "Unknown level")

def get_blooms_performance_indicator(level: str, percentage: float) -> str:
    """Get performance indicator for Bloom's level"""
    if percentage >= 80:
        return f"Strong {level.lower()} skills"
    elif percentage >= 60:
        return f"Adequate {level.lower()} skills"
    else:
        return f"Needs improvement in {level.lower()} skills"

def calculate_overall_attainment(results: Dict) -> float:
    """Calculate overall attainment percentage"""
    if not results:
        return 0.0
    
    percentages = [data["attainment_percentage"] for data in results.values()]
    return round(statistics.mean(percentages), 2) if percentages else 0.0

def check_nba_compliance(co_results: Dict, po_results: Dict) -> Dict[str, Any]:
    """Check NBA compliance status"""
    co_compliance = sum(1 for data in co_results.values() if data["attainment_percentage"] >= 60)
    po_compliance = sum(1 for data in po_results.values() if data["attainment_percentage"] >= 60)
    
    total_cos = len(co_results)
    total_pos = len(po_results)
    
    co_compliance_rate = (co_compliance / total_cos * 100) if total_cos > 0 else 0
    po_compliance_rate = (po_compliance / total_pos * 100) if total_pos > 0 else 0
    
    return {
        "co_compliance_rate": round(co_compliance_rate, 2),
        "po_compliance_rate": round(po_compliance_rate, 2),
        "overall_compliance": round((co_compliance_rate + po_compliance_rate) / 2, 2),
        "nba_ready": co_compliance_rate >= 75 and po_compliance_rate >= 70,
        "areas_for_improvement": [
            co for co, data in co_results.items() if data["attainment_percentage"] < 60
        ] + [
            po for po, data in po_results.items() if data["attainment_percentage"] < 60
        ]
    }

def calculate_learning_curve(marks: List[Mark]) -> Dict[str, Any]:
    """Calculate learning curve analysis"""
    if len(marks) < 3:
        return {"insufficient_data": True}
    
    # Group by exam date and calculate performance
    exam_performance = defaultdict(lambda: {"obtained": 0, "total": 0, "date": None})
    
    for mark in marks:
        if mark.question and mark.exam:
            exam_id = mark.exam_id
            exam_performance[exam_id]["obtained"] += mark.marks_obtained
            exam_performance[exam_id]["total"] += mark.question.max_marks
            if not exam_performance[exam_id]["date"]:
                exam_performance[exam_id]["date"] = mark.exam.created_at
    
    # Sort by date and calculate learning velocity
    performance_timeline = []
    for exam_data in exam_performance.values():
        if exam_data["total"] > 0:
            percentage = (exam_data["obtained"] / exam_data["total"]) * 100
            performance_timeline.append((exam_data["date"], percentage))
    
    performance_timeline.sort(key=lambda x: x[0])
    
    if len(performance_timeline) < 3:
        return {"insufficient_data": True}
    
    # Calculate learning velocity (improvement rate)
    improvements = []
    for i in range(1, len(performance_timeline)):
        prev_perf = performance_timeline[i-1][1]
        curr_perf = performance_timeline[i][1]
        improvements.append(curr_perf - prev_perf)
    
    avg_improvement = statistics.mean(improvements)
    learning_consistency = 100 - (statistics.stdev(improvements) if len(improvements) > 1 else 0)
    
    return {
        "learning_velocity": round(avg_improvement, 2),
        "learning_consistency": round(learning_consistency, 2),
        "performance_timeline": [(date.isoformat(), round(perf, 2)) for date, perf in performance_timeline],
        "trend_analysis": "accelerating" if avg_improvement > 2 else "decelerating" if avg_improvement < -2 else "stable"
    }

def get_class_comparative_analysis(db: Session, student_id: int, student_marks: List[Mark]) -> Dict[str, Any]:
    """Get comparative analysis with class performance"""
    try:
        student = db.query(User).filter(User.id == student_id).first()
        if not student or not student.class_id:
            return {}
        
        # Get all students in the same class
        class_students = db.query(User).filter(
            and_(User.class_id == student.class_id, User.role == UserRole.student, User.is_active == True)
        ).all()
        
        # Get performance data for all students
        class_performances = []
        for class_student in class_students:
            student_marks_data = db.query(Mark).options(
                joinedload(Mark.question)
            ).filter(Mark.student_id == class_student.id).all()
            
            if student_marks_data:
                total_obtained = sum(mark.marks_obtained for mark in student_marks_data)
                total_possible = sum(mark.question.max_marks for mark in student_marks_data if mark.question)
                percentage = (total_obtained / total_possible * 100) if total_possible > 0 else 0
                class_performances.append(percentage)
        
        if not class_performances:
            return {}
        
        # Calculate student's performance
        student_total_obtained = sum(mark.marks_obtained for mark in student_marks)
        student_total_possible = sum(mark.question.max_marks for mark in student_marks if mark.question)
        student_percentage = (student_total_obtained / student_total_possible * 100) if student_total_possible > 0 else 0
        
        # Calculate comparative metrics
        class_average = statistics.mean(class_performances)
        class_median = statistics.median(class_performances)
        student_percentile = sum(1 for p in class_performances if p <= student_percentage) / len(class_performances) * 100
        
        # Find rank
        sorted_performances = sorted(class_performances, reverse=True)
        rank = sorted_performances.index(student_percentage) + 1 if student_percentage in sorted_performances else len(sorted_performances)
        
        return {
            "class_average": round(class_average, 2),
            "class_median": round(class_median, 2),
            "student_percentile": round(student_percentile, 2),
            "rank": rank,
            "total_students": len(class_performances),
            "performance_gap": round(student_percentage - class_average, 2),
            "above_average": student_percentage > class_average,
            "top_quartile": student_percentile >= 75,
            "class_distribution": {
                "excellent": len([p for p in class_performances if p >= 90]),
                "good": len([p for p in class_performances if 80 <= p < 90]),
                "average": len([p for p in class_performances if 60 <= p < 80]),
                "below_average": len([p for p in class_performances if p < 60])
            }
        }
        
    except Exception as e:
        print(f"Error in comparative analysis: {e}")
        return {}

def calculate_trend_slope(values: List[float]) -> float:
    """Calculate trend slope using simple linear regression"""
    if len(values) < 2:
        return 0
    
    n = len(values)
    x = list(range(n))
    y = values
    
    # Calculate slope using least squares
    x_mean = statistics.mean(x)
    y_mean = statistics.mean(y)
    
    numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
    denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
    
    return numerator / denominator if denominator != 0 else 0

def calculate_prediction_confidence(percentages: List[float]) -> str:
    """Calculate confidence level for predictions"""
    if len(percentages) < 3:
        return "low"
    
    # Calculate consistency
    variance = statistics.variance(percentages)
    
    if variance < 25:
        return "high"
    elif variance < 100:
        return "medium"
    else:
        return "low"

def get_trend_based_recommendation(trend_slope: float, last_performance: float) -> str:
    """Get recommendation based on trend"""
    if trend_slope > 2:
        return "Excellent improvement trend! Continue current study methods."
    elif trend_slope > 0:
        return "Good progress. Maintain consistency to accelerate improvement."
    elif trend_slope > -2:
        return "Performance is stable. Focus on weak areas for improvement."
    else:
        return "Declining trend detected. Immediate intervention needed."