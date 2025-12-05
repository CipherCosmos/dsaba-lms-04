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

    def __init__(
        self,
        title: str,
        department_id: int,
        academic_year_id: int,
        id: Optional[int] = None,
        description: Optional[str] = None,
        status: str = "draft",
        exam_date: Optional[date] = None,
        total_questions: int = 0,
        passing_score: Decimal = Decimal("50.0"),
        created_by: Optional[int] = None,
        results: Optional[list[ExitExamResult]] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        super().__init__(id)
        self.title = title
        self.description = description
        self.department_id = department_id
        self.academic_year_id = academic_year_id
        self.status = status
        self.exam_date = exam_date
        self.total_questions = total_questions
        self.passing_score = passing_score
        self.created_by = created_by
        self.results = results or []
        self._created_at = created_at
        self._updated_at = updated_at

    def dict(self) -> dict:
        """Convert exit exam to dictionary"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "department_id": self.department_id,
            "academic_year_id": self.academic_year_id,
            "status": self.status,
            "exam_date": self.exam_date,
            "total_questions": self.total_questions,
            "passing_score": self.passing_score,
            "created_by": self.created_by,
            "results": [r.dict() for r in self.results],
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

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

    def __init__(self, total_students: int = 0, pass_rate: float = 0.0, average_score: float = 0.0, **kwargs):
        self.total_students = total_students
        self.pass_rate = pass_rate
        self.average_score = average_score
        super().__init__(**kwargs)
        
    def dict(self) -> dict:
        """Convert to dictionary"""
        data = super().dict()
        data.update({
            "total_students": self.total_students,
            "pass_rate": self.pass_rate,
            "average_score": self.average_score
        })
        return data