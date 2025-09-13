from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from models import Mark
from datetime import datetime
import numpy as np
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
import json

def get_advanced_student_analytics(db: Session, student_id: int, subject_id: Optional[int] = None) -> Dict[str, Any]:
    """Advanced student analytics with detailed CO/PO analysis and predictions"""
    try:
        # Get student's marks
        query = db.query(Mark).filter(Mark.student_id == student_id)
        if subject_id:
            query = query.join(Question).join(Exam).join(Subject).filter(Subject.id == subject_id)
        marks = query.all()

        if not marks:
            return get_empty_analytics()

        performance_analysis = calculate_advanced_performance(marks)
        co_po_analysis = calculate_detailed_co_po_analysis(marks, db)
        difficulty_analysis = analyze_performance_by_difficulty(marks)
        blooms_analysis = analyze_blooms_taxonomy_performance(marks)
        predictions = generate_performance_predictions(marks)
        recommendations = generate_personalized_recommendations(
            performance_analysis, co_po_analysis, difficulty_analysis
        )
        study_plan = generate_adaptive_study_plan(co_po_analysis, difficulty_analysis)

        # Enhanced with SciPy: Learning curve and risk clustering
        learning_curve = calculate_learning_curve(marks)
        risk_assessment = perform_risk_clustering(marks)

        return {
            'performance_analysis': performance_analysis,
            'co_po_attainment': co_po_analysis,
            'difficulty_analysis': difficulty_analysis,
            'blooms_analysis': blooms_analysis,
            'predictions': predictions,
            'recommendations': recommendations,
            'study_plan': study_plan,
            'learning_curve': learning_curve,
            'risk_assessment': risk_assessment,
            'overall_attainment': calculate_overall_attainment(co_po_analysis),
            'nba_compliance': check_nba_compliance(co_po_analysis.get('co_results', {}), co_po_analysis.get('po_results', {})),
            'improvement_trend': calculate_improvement_trend([p['percentage'] for p in performance_analysis.get('exam_trends', [])]),
            'stability': calculate_performance_stability([p['percentage'] for p in performance_analysis.get('exam_trends', [])])
        }
    except Exception as e:
        print(f"Error in advanced analytics: {e}")
        return get_empty_analytics()

def calculate_advanced_performance(marks: List[Mark]) -> Dict[str, Any]:
    """Calculate advanced performance metrics with statistical analysis"""
    if not marks:
        return {'average_score': 0, 'exam_trends': []}

    scores = [m.marks for m in marks if m.question.max_marks > 0]
    averages = []
    trends = []

    # Group by exam
    exams = {}
    for mark in marks:
        exam_id = mark.exam_id
        if exam_id not in exams:
            exams[exam_id] = {'total_marks': 0, 'max_marks': 0}
        exams[exam_id]['total_marks'] += mark.marks
        exams[exam_id]['max_marks'] += mark.question.max_marks if mark.question else 0

    for exam_id, data in exams.items():
        percentage = (data['total_marks'] / data['max_marks'] * 100) if data['max_marks'] > 0 else 0
        averages.append(percentage)
        trends.append({'exam_id': exam_id, 'percentage': percentage})

    # SciPy stats
    mean_score = np.mean(scores)
    std_score = np.std(scores)
    trend_slope = calculate_trend_slope(averages)

    return {
        'average_score': np.mean(averages),
        'std_deviation': std_score,
        'exam_trends': trends,
        'trend_slope': trend_slope,
        'confidence_interval': stats.t.interval(0.95, len(averages)-1, loc=np.mean(averages), scale=stats.sem(averages))
    }

def calculate_detailed_co_po_analysis(marks: List[Mark], db: Session) -> Dict[str, Any]:
    """Detailed CO/PO analysis with attainment levels"""
    co_results = {}
    po_results = {}

    for mark in marks:
        question = mark.question
        if question:
            co_id = question.co_id
            po_id = question.po_id

            if co_id:
                if co_id not in co_results:
                    co_results[co_id] = {'total_marks': 0, 'max_marks': 0, 'attainment': 0}
                co_results[co_id]['total_marks'] += mark.marks
                co_results[co_id]['max_marks'] += question.max_marks

            if po_id:
                if po_id not in po_results:
                    po_results[po_id] = {'total_marks': 0, 'max_marks': 0, 'attainment': 0}
                po_results[po_id]['total_marks'] += mark.marks
                po_results[po_id]['max_marks'] += question.max_marks

    # Calculate attainments
    for co_id, data in co_results.items():
        data['attainment'] = (data['total_marks'] / data['max_marks'] * 100) if data['max_marks'] > 0 else 0

    for po_id, data in po_results.items():
        data['attainment'] = (data['total_marks'] / data['max_marks'] * 100) if data['max_marks'] > 0 else 0

    return {
        'co_results': co_results,
        'po_results': po_results
    }

def analyze_performance_by_difficulty(marks: List[Mark]) -> Dict[str, Any]:
    """Analyze performance by question difficulty"""
    difficulty_scores = {'easy': [], 'medium': [], 'hard': []}

    for mark in marks:
        if mark.question and mark.question.difficulty:
            diff = mark.question.difficulty.value.lower()
            if diff in difficulty_scores:
                percentage = (mark.marks / mark.question.max_marks * 100) if mark.question.max_marks > 0 else 0
                difficulty_scores[diff].append(percentage)

    analysis = {}
    for diff, scores in difficulty_scores.items():
        if scores:
            analysis[diff] = {
                'average': np.mean(scores),
                'std': np.std(scores),
                'count': len(scores)
            }

    return analysis

def analyze_blooms_taxonomy_performance(marks: List[Mark]) -> Dict[str, Any]:
    """Analyze performance by Bloom's taxonomy levels"""
    blooms_scores = {}

    for mark in marks:
        if mark.question and mark.question.blooms_level:
            level = mark.question.blooms_level
            if level not in blooms_scores:
                blooms_scores[level] = {'total': 0, 'max': 0}
            blooms_scores[level]['total'] += mark.marks
            blooms_scores[level]['max'] += mark.question.max_marks

    analysis = {}
    for level, data in blooms_scores.items():
        analysis[level] = {
            'attainment': (data['total'] / data['max'] * 100) if data['max'] > 0 else 0,
            'grade': get_attainment_grade((data['total'] / data['max'] * 100) if data['max'] > 0 else 0)
        }

    return analysis

def generate_performance_predictions(marks: List[Mark]) -> Dict[str, Any]:
    """Generate predictions using linear regression"""
    if len(marks) < 2:
        return {'predicted_next': 70, 'confidence': 'low'}

    # Simple linear regression on exam scores
    exam_scores = []
    for mark in marks:
        # Aggregate per exam
        exam_key = (mark.exam_id, mark.question.exam.date if mark.question and mark.question.exam else datetime.now())
        if exam_key not in exam_scores:
            exam_scores.append({'exam': mark.exam_id, 'score': mark.marks / mark.question.max_marks * 100 if mark.question else 0})

    if len(exam_scores) < 2:
        return {'predicted_next': 70, 'confidence': 'low'}

    x = np.array(range(len(exam_scores))).reshape(-1, 1)
    y = np.array([s['score'] for s in exam_scores])
    model = LinearRegression().fit(x, y)
    next_x = np.array([[len(exam_scores)]])
    predicted = model.predict(next_x)[0]

    confidence = calculate_prediction_confidence([s['score'] for s in exam_scores])

    return {
        'predicted_next_score': max(0, min(100, predicted)),
        'confidence': confidence,
        'model_r2': model.score(x, y),
        'recommendation': get_trend_based_recommendation(model.coef_[0][0], y[-1])
    }

def perform_risk_clustering(marks: List[Mark]) -> Dict[str, Any]:
    """Use KMeans to cluster students by risk level (placeholder for full class data)"""
    scores = [m.marks / m.question.max_marks * 100 for m in marks if m.question]
    if len(scores) < 3:
        return {'risk_level': 'medium', 'cluster': 1}

    kmeans = KMeans(n_clusters=3, n_init=10)
    clusters = kmeans.fit_predict(np.array(scores).reshape(-1, 1))
    risk_cluster = clusters[-1] if len(clusters) > 0 else 1

    risk_levels = ['low', 'medium', 'high']
    return {
        'risk_level': risk_levels[risk_cluster],
        'cluster_center': kmeans.cluster_centers_[risk_cluster][0],
        'intervention_needed': risk_cluster > 1
    }

def generate_personalized_recommendations(performance_analysis: Dict, co_po_analysis: Dict, difficulty_analysis: Dict) -> List[Dict[str, Any]]:
    """Generate personalized recommendations based on analysis"""
    recommendations = []

    # Weak COs
    weak_cos = [co for co, data in co_po_analysis.get('co_results', {}).items() if data['attainment'] < 70]
    if weak_cos:
        recommendations.append({
            'type': 'focus_area',
            'description': f"Focus on Course Outcomes: {', '.join(weak_cos)}. Review related topics.",
            'priority': 'high'
        })

    # Difficulty struggles
    hard_areas = [diff for diff, data in difficulty_analysis.items() if data['average'] < 50]
    if hard_areas:
        recommendations.append({
            'type': 'practice',
            'description': f"Practice more on {', '.join(hard_areas)} difficulty questions.",
            'priority': 'medium'
        })

    # Trend based
    trend = performance_analysis.get('trend_slope', 0)
    if trend < 0:
        recommendations.append({
            'type': 'motivation',
            'description': "Your scores are declining. Seek tutor help or review fundamentals.",
            'priority': 'high'
        })

    return recommendations

def generate_adaptive_study_plan(co_po_analysis: Dict, difficulty_analysis: Dict) -> Dict[str, Any]:
    """Generate adaptive study plan"""
    weak_areas = [co for co, data in co_po_analysis.get('co_results', {}).items() if data['attainment'] < 70]
    plan = {
        'duration': '2 weeks',
        'focus_areas': weak_areas,
        'daily_hours': 2,
        'resources': ['Review lecture notes', 'Practice problems from weak COs']
    }
    return plan

def get_empty_analytics() -> Dict[str, Any]:
    """Return empty analytics structure"""
    return {
        'performance_analysis': {'average_score': 0, 'exam_trends': []},
        'co_po_attainment': {'co_results': {}, 'po_results': {}},
        'difficulty_analysis': {},
        'blooms_analysis': {},
        'predictions': {'predicted_next_score': 0, 'confidence': 'low'},
        'recommendations': [],
        'study_plan': {},
        'learning_curve': {},
        'risk_assessment': {'risk_level': 'unknown'},
        'overall_attainment': 0,
        'nba_compliance': {},
        'improvement_trend': 'stable',
        'stability': 0
    }

def calculate_improvement_trend(percentages: List[float]) -> str:
    if len(percentages) < 2:
        return 'insufficient_data'
    slope = calculate_trend_slope(percentages)
    if slope > 5:
        return 'improving'
    elif slope < -5:
        return 'declining'
    else:
        return 'stable'

def calculate_performance_stability(percentages: List[float]) -> float:
    return np.std(percentages) if percentages else 0

def get_attainment_grade(percentage: float) -> str:
    if percentage >= 80:
        return 'excellent'
    elif percentage >= 60:
        return 'good'
    elif percentage >= 40:
        return 'average'
    else:
        return 'needs_improvement'

def get_performance_level(percentage: float) -> str:
    if percentage >= 90:
        return 'outstanding'
    elif percentage >= 75:
        return 'strong'
    elif percentage >= 60:
        return 'satisfactory'
    else:
        return 'developing'

def get_cognitive_level_description(blooms_level: str) -> str:
    levels = {
        'remember': 'Recall facts and basic concepts',
        'understand': 'Explain ideas or concepts',
        'apply': 'Use information in new situations',
        'analyze': 'Draw connections among ideas',
        'evaluate': 'Justify a stand or decision',
        'create': 'Produce new or original work'
    }
    return levels.get(blooms_level, 'Unknown level')

def get_blooms_performance_indicator(level: str, percentage: float) -> str:
    base = get_performance_level(percentage)
    return f"{base} in {level} taxonomy"

def calculate_overall_attainment(results: Dict) -> float:
    cos = [data['attainment'] for data in results.get('co_results', {}).values()]
    return np.mean(cos) if cos else 0

def check_nba_compliance(co_results: Dict, po_results: Dict) -> Dict[str, Any]:
    """Check NBA compliance thresholds (example: 70% attainment)"""
    compliant = True
    issues = []

    for co, data in co_results.items():
        if data['attainment'] < 70:
            compliant = False
            issues.append(f"CO {co} below threshold")

    for po, data in po_results.items():
        if data['attainment'] < 60:
            compliant = False
            issues.append(f"PO {po} below threshold")

    return {
        'compliant': compliant,
        'issues': issues,
        'overall_score': calculate_overall_attainment({'co_results': co_results, 'po_results': po_results})
    }

def calculate_learning_curve(marks: List[Mark]) -> Dict[str, Any]:
    """Calculate learning curve using exponential fit"""
    scores = [m.marks for m in marks]
    if len(scores) < 3:
        return {'curve_type': 'linear', 'growth_rate': 0}

    x = np.array(range(len(scores)))
    y = np.array(scores)
    # Simple linear for now; can use curve_fit for exponential
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)

    return {
        'growth_rate': slope,
        'r_squared': r_value**2,
        'p_value': p_value
    }

def get_class_comparative_analysis(db: Session, student_id: int, student_marks: List[Mark]) -> Dict[str, Any]:
    """Get comparative analysis with class performance"""
    try:
        # Get class students and their marks for the same exams
        student = db.query(User).filter(User.id == student_id).first()
        if not student or not student.class_id:
            return {'comparison': 'no_class_data'}

        class_students = db.query(User).filter(User.class_id == student.class_id, User.role == 'student').all()
        class_marks = []
        for s in class_students:
            s_marks = db.query(Mark).filter(Mark.student_id == s.id).all()
            class_marks.extend(s_marks)

        if not class_marks:
            return {'comparison': 'no_data'}

        student_avg = np.mean([m.marks for m in student_marks])
        class_avg = np.mean([m.marks for m in class_marks])

        return {
            'student_avg': student_avg,
            'class_avg': class_avg,
            'percentile': calculate_percentile(student_avg, [np.mean([m.marks for m in db.query(Mark).filter(Mark.student_id == s.id).all() or [0]]) for s in class_students]),
            'above_average': student_avg > class_avg
        }
    except Exception as e:
        print(f"Error in class comparison: {e}")
        return {'comparison': 'error'}

def calculate_trend_slope(values: List[float]) -> float:
    if len(values) < 2:
        return 0
    x = np.array(range(len(values)))
    slope, _, _, _, _ = stats.linregress(x, values)
    return slope

def calculate_prediction_confidence(percentages: List[float]) -> str:
    if len(percentages) < 3:
        return 'low'
    stability = np.std(percentages)
    if stability < 5:
        return 'high'
    elif stability < 15:
        return 'medium'
    else:
        return 'low'

def get_trend_based_recommendation(trend_slope: float, last_performance: float) -> str:
    if trend_slope > 5 and last_performance > 70:
        return 'Maintain momentum with advanced challenges'
    elif trend_slope < -5 or last_performance < 50:
        return 'Immediate intervention needed; review basics'
    else:
        return 'Consistent effort; focus on weak areas'

def calculate_percentile(value: float, values: List[float]) -> float:
    if not values:
        return 50
    return (sum(1 for v in values if v < value) / len(values)) * 100