"""
Survey repository interface for indirect attainment
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from ..entities.survey import Survey, SurveyResponse, SurveyWithResponses


class SurveyRepository(ABC):
    """Abstract base class for survey data access"""

    @abstractmethod
    async def get_by_id(self, survey_id: int) -> Optional[Survey]:
        """Get survey by ID"""
        pass

    @abstractmethod
    async def get_by_department(self, department_id: int, skip: int = 0, limit: int = 100) -> List[Survey]:
        """Get surveys by department"""
        pass

    @abstractmethod
    async def get_active_surveys(self, department_id: int, academic_year_id: Optional[int] = None) -> List[Survey]:
        """Get active surveys for a department"""
        pass

    @abstractmethod
    async def create(self, survey: Survey) -> Survey:
        """Create a new survey"""
        pass

    @abstractmethod
    async def update(self, survey: Survey) -> Survey:
        """Update an existing survey"""
        pass

    @abstractmethod
    async def delete(self, survey_id: int) -> bool:
        """Delete a survey"""
        pass

    @abstractmethod
    async def get_with_responses(self, survey_id: int) -> Optional[SurveyWithResponses]:
        """Get survey with all responses"""
        pass

    @abstractmethod
    async def save_response(self, response: SurveyResponse) -> SurveyResponse:
        """Save a survey response"""
        pass

    @abstractmethod
    async def get_user_responses(self, survey_id: int, user_id: int) -> List[SurveyResponse]:
        """Get all responses for a user in a survey"""
        pass

    @abstractmethod
    async def has_user_responded(self, survey_id: int, user_id: int) -> bool:
        """Check if user has already responded to survey"""
        pass