"""
Test Data Factories
Generate test data using Faker
"""

from faker import Faker
from datetime import datetime, timedelta
from typing import Optional

fake = Faker()


def create_user_data(
    username: Optional[str] = None,
    email: Optional[str] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    **kwargs
) -> dict:
    """Create test user data"""
    return {
        "username": username or fake.user_name(),
        "email": email or fake.email(),
        "first_name": first_name or fake.first_name(),
        "last_name": last_name or fake.last_name(),
        "password": "Test123!@#$",
        **kwargs
    }


def create_department_data(
    name: Optional[str] = None,
    code: Optional[str] = None,
    **kwargs
) -> dict:
    """Create test department data"""
    return {
        "name": name or fake.company(),
        "code": code or fake.lexify(text="???").upper(),
        "description": fake.text(max_nb_chars=200),
        **kwargs
    }


def create_subject_data(
    name: Optional[str] = None,
    code: Optional[str] = None,
    credits: Optional[int] = None,
    **kwargs
) -> dict:
    """Create test subject data"""
    return {
        "name": name or fake.catch_phrase(),
        "code": code or fake.lexify(text="??###").upper(),
        "credits": credits or fake.random_int(min=1, max=6),
        "description": fake.text(max_nb_chars=200),
        **kwargs
    }


def create_exam_data(
    name: Optional[str] = None,
    exam_type: Optional[str] = None,
    max_marks: Optional[int] = None,
    **kwargs
) -> dict:
    """Create test exam data"""
    return {
        "name": name or fake.catch_phrase(),
        "exam_type": exam_type or "MIDTERM",
        "date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "max_marks": max_marks or 100,
        "duration_minutes": 120,
        "status": "DRAFT",
        **kwargs
    }


def create_mark_data(
    marks_obtained: Optional[float] = None,
    **kwargs
) -> dict:
    """Create test mark data"""
    return {
        "marks_obtained": marks_obtained or fake.random_int(min=0, max=100),
        **kwargs
    }


def create_question_data(
    question_text: Optional[str] = None,
    max_marks: Optional[float] = None,
    **kwargs
) -> dict:
    """Create test question data"""
    return {
        "question_text": question_text or fake.text(max_nb_chars=500),
        "max_marks": max_marks or fake.random_int(min=1, max=20),
        "section": "A",
        "difficulty": "MEDIUM",
        "blooms_level": "UNDERSTAND",
        **kwargs
    }

