"""
Student Enrollment Repository Interface
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.entities.student_enrollment import StudentEnrollment


class IStudentEnrollmentRepository(ABC):
    """Student Enrollment repository interface"""
    
    @abstractmethod
    async def create(self, enrollment: StudentEnrollment) -> StudentEnrollment:
        """Create a new enrollment"""
        pass
    
    @abstractmethod
    async def get_by_id(self, enrollment_id: int) -> Optional[StudentEnrollment]:
        """Get enrollment by ID"""
        pass
    
    @abstractmethod
    async def get_by_student_semester(
        self,
        student_id: int,
        semester_id: int,
        academic_year_id: int
    ) -> Optional[StudentEnrollment]:
        """Get enrollment by student, semester, and academic year"""
        pass
    
    @abstractmethod
    async def get_by_student(
        self,
        student_id: int,
        academic_year_id: Optional[int] = None,
        skip: int = 0,
        limit: Optional[int] = None
    ) -> List[StudentEnrollment]:
        """Get all enrollments for a student"""
        pass

    @abstractmethod
    async def get_by_semester(
        self,
        semester_id: int,
        academic_year_id: Optional[int] = None,
        skip: int = 0,
        limit: Optional[int] = None
    ) -> List[StudentEnrollment]:
        """Get all enrollments for a semester"""
        pass
    
    @abstractmethod
    async def update(self, enrollment: StudentEnrollment) -> StudentEnrollment:
        """Update enrollment"""
        pass
    
    @abstractmethod
    async def delete(self, enrollment_id: int) -> bool:
        """Delete enrollment"""
        pass

