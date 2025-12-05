"""
Shared Analytics Utilities
Helper functions used across analytics services
"""

from typing import Dict, Any


def calculate_grade(percentage: float) -> str:
    """
    Calculate letter grade from percentage
    
    Args:
        percentage: Percentage score (0-100)
    
    Returns:
        Letter grade (O, A+, A, B+, B, C, F)
    """
    if percentage >= 90:
        return 'O'  # Outstanding
    elif percentage >= 80:
        return 'A+'
    elif percentage >= 70:
        return 'A'
    elif percentage >= 60:
        return 'B+'
    elif percentage >= 50:
        return 'B'
    elif percentage >= 40:
        return 'C'
    else:
        return 'F'


def calculate_percentage(obtained: float, maximum: float) -> float:
    """
    Calculate percentage with validation
    
    Args:
        obtained: Marks obtained
        maximum: Maximum marks
    
    Returns:
        Percentage (0-100), returns 0 if maximum is 0
    """
    if maximum <= 0:
        return 0.0
    return round((obtained / maximum) * 100, 2)


def calculate_sgpa(percentage: float) -> float:
    """
    Calculate SGPA from percentage (10-point scale)
    
    Args:
        percentage: Percentage score (0-100)
    
    Returns:
        SGPA on 10-point scale
    """
    if percentage <= 0:
        return 0.0
    return round(percentage / 10, 2)


def get_blooms_level_name(level: str) -> str:
    """
    Get Bloom's taxonomy level name
    
    Args:
        level: Level code (L1-L6)
    
    Returns:
        Human-readable level name
    """
    blooms_names = {
        'L1': 'Remember',
        'L2': 'Understand',
        'L3': 'Apply',
        'L4': 'Analyze',
        'L5': 'Evaluate',
        'L6': 'Create'
    }
    return blooms_names.get(level, level)


def generate_at_risk_recommendation(percentage: float) -> str:
    """
    Generate recommendation for at-risk students
    
    Args:
        percentage: Current percentage
    
    Returns:
        Recommendation message
    """
    if percentage < 20:
        return "Critical: Immediate intervention required. Schedule one-on-one sessions."
    elif percentage < 30:
        return "High risk: Requires intensive support and regular monitoring."
    elif percentage < 40:
        return "At risk: Needs additional tutoring and practice assignments."
    else:
        return "Borderline: Monitor progress and provide guidance."


def calculate_class_rank(student_id: int, student_percentages: list) -> Dict[str, Any]:
    """
    Calculate student's rank in class
    
    Args:
        student_id: Student ID
        student_percentages: List of tuples (student_id, percentage)
    
    Returns:
        Dict with rank, total students, and average percentage
    """
    if not student_percentages:
        return {
            "rank": None,
            "total_students": 0,
            "average_percentage": 0.0
        }
    
    # Sort by percentage descending
    sorted_students = sorted(student_percentages, key=lambda x: x[1], reverse=True)
    
    # Find rank
    rank = None
    for idx, (sid, _) in enumerate(sorted_students, 1):
        if sid == student_id:
            rank = idx
            break
    
    # Calculate average
    avg_percentage = sum(p for _, p in student_percentages) / len(student_percentages)
    
    return {
        "rank": rank,
        "total_students": len(student_percentages),
        "average_percentage": round(avg_percentage, 2)
    }
