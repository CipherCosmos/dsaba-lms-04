"""
Survey domain entity for indirect attainment
"""

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from .base import Entity


class SurveyQuestion(BaseModel):
    """Survey question value object"""
    id: Optional[int] = None
    question_text: str
    question_type: str  # rating, text, multiple_choice, yes_no
    options: Optional[List[str]] = None
    required: bool = True
    order_index: int = 0


class Survey(Entity):
    """Survey domain entity"""
    
    def __init__(
        self,
        title: str,
        department_id: int,
        academic_year_id: int,
        id: Optional[int] = None,
        description: Optional[str] = None,
        status: str = "draft",  # draft, active, closed
        target_audience: str = "students",  # students, alumni, employers
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        created_by: Optional[int] = None,
        questions: Optional[List[SurveyQuestion]] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        super().__init__(id)
        self._title = title
        self._description = description
        self._department_id = department_id
        self._academic_year_id = academic_year_id
        self._status = status
        self._target_audience = target_audience
        self._start_date = start_date
        self._end_date = end_date
        self._created_by = created_by
        self._questions = questions or []
        self._created_at = created_at
        self._updated_at = updated_at
    
    # Properties
    @property
    def title(self) -> str:
        return self._title
    
    @property
    def description(self) -> Optional[str]:
        return self._description
    
    @property
    def department_id(self) -> int:
        return self._department_id
    
    @property
    def academic_year_id(self) -> int:
        return self._academic_year_id
    
    @property
    def status(self) -> str:
        return self._status
    
    @property
    def target_audience(self) -> str:
        return self._target_audience
    
    @property
    def start_date(self) -> Optional[date]:
        return self._start_date
    
    @property
    def end_date(self) -> Optional[date]:
        return self._end_date
    
    @property
    def created_by(self) -> Optional[int]:
        return self._created_by
    
    @property
    def questions(self) -> List[SurveyQuestion]:
        return self._questions
    
    @property
    def created_at(self) -> Optional[datetime]:
        return self._created_at
    
    @property
    def updated_at(self) -> Optional[datetime]:
        return self._updated_at

    def is_active(self) -> bool:
        """Check if survey is currently active"""
        if self.status != "active":
            return False
        if self.start_date and self.end_date:
            today = date.today()
            return self.start_date <= today <= self.end_date
        return True

    def can_accept_responses(self) -> bool:
        """Check if survey can accept new responses"""
        return self.status == "active" and self.is_active()
    
    def dict(self) -> dict:
        """Convert survey to dictionary for compatibility"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "department_id": self.department_id,
            "academic_year_id": self.academic_year_id,
            "status": self.status,
            "target_audience": self.target_audience,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "created_by": self.created_by,
            "questions": self.questions,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class SurveyResponse(BaseModel):
    """Survey response value object"""
    id: Optional[int] = None
    survey_id: int
    question_id: int
    respondent_id: int
    response_value: Optional[str] = None
    rating_value: Optional[int] = None
    submitted_at: datetime = Field(default_factory=datetime.now)


class SurveyWithResponses(Survey):
    """Survey with response statistics"""
    total_responses: int = 0
    completion_rate: float = 0.0
    responses: List[SurveyResponse] = Field(default_factory=list)