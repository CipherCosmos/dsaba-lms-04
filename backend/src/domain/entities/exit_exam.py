"""
Exit exam domain entity for indirect attainment
"""

from datetime import date, datetime
from typing import Optional
from decimal import Decimal

from pydantic import BaseModel, Field

from .base import Entity


class ExitExamResult(BaseModel):
    """Exit exam result value object"""
    id: Optional[int] = None
    exit_exam_id: int
    student_id: int
    score: Decimal
    max_score: Decimal
    percentage: Decimal
    passed: bool
    submitted_at: datetime = Field(default_factory=datetime.now)


class ExitExam(Entity):
    """Exit exam domain entity"""
    title: str
    description: Optional[str] = None
    department_id: int
    academic_year_id: int
    status: str = "draft"  # draft, active, completed
    exam_date: Optional[date] = None
    total_questions: int = 0
    passing_score: Decimal = Field(default=Decimal("50.0"))
    created_by: Optional[int] = None
    results: list[ExitExamResult] = Field(default_factory=list)

    def is_active(self) -> bool:
        """Check if exit exam is currently active"""
        return self.status == "active"

    def calculate_pass_rate(self) -> float:
        """Calculate pass rate from results"""
        if not self.results:
            return 0.0
        passed_count = sum(1 for result in self.results if result.passed)
        return (passed_count / len(self.results)) * 100

    def get_average_score(self) -> float:
        """Calculate average score from results"""
        if not self.results:
            return 0.0
        total_score = sum(result.percentage for result in self.results)
        return total_score / len(self.results)


class ExitExamWithResults(ExitExam):
    """Exit exam with aggregated results"""
    total_students: int = 0
    pass_rate: float = 0.0
    average_score: float = 0.0