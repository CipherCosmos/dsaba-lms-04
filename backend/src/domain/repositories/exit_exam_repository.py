"""
Exit exam repository interface for indirect attainment
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from ..entities.exit_exam import ExitExam, ExitExamResult, ExitExamWithResults


class ExitExamRepository(ABC):
    """Abstract base class for exit exam data access"""

    @abstractmethod
    async def get_by_id(self, exit_exam_id: int) -> Optional[ExitExam]:
        """Get exit exam by ID"""
        pass

    @abstractmethod
    async def get_by_department(self, department_id: int, skip: int = 0, limit: int = 100) -> List[ExitExam]:
        """Get exit exams by department"""
        pass

    @abstractmethod
    async def get_active_exams(self, department_id: int, academic_year_id: Optional[int] = None) -> List[ExitExam]:
        """Get active exit exams for a department"""
        pass

    @abstractmethod
    async def create(self, exit_exam: ExitExam) -> ExitExam:
        """Create a new exit exam"""
        pass

    @abstractmethod
    async def update(self, exit_exam: ExitExam) -> ExitExam:
        """Update an existing exit exam"""
        pass

    @abstractmethod
    async def delete(self, exit_exam_id: int) -> bool:
        """Delete an exit exam"""
        pass

    @abstractmethod
    async def get_with_results(self, exit_exam_id: int) -> Optional[ExitExamWithResults]:
        """Get exit exam with all results"""
        pass

    @abstractmethod
    async def save_result(self, result: ExitExamResult) -> ExitExamResult:
        """Save an exit exam result"""
        pass

    @abstractmethod
    async def get_student_result(self, exit_exam_id: int, student_id: int) -> Optional[ExitExamResult]:
        """Get result for a specific student in an exit exam"""
        pass

    @abstractmethod
    async def has_student_taken_exam(self, exit_exam_id: int, student_id: int) -> bool:
        """Check if student has already taken the exit exam"""
        pass