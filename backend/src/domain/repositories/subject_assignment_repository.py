"""
Subject Assignment Repository Interface
"""

from typing import Optional, List
from abc import ABC

from .base_repository import IRepository
from ..entities.subject_assignment import SubjectAssignment


class ISubjectAssignmentRepository(IRepository[SubjectAssignment], ABC):
    """
    Subject Assignment repository interface
    """

    async def get_by_subject_and_teacher(
        self,
        subject_id: int,
        teacher_id: int,
        semester_id: int
    ) -> Optional[SubjectAssignment]:
        """
        Get subject assignment by subject, teacher and semester

        Args:
            subject_id: Subject ID
            teacher_id: Teacher ID
            semester_id: Semester ID

        Returns:
            SubjectAssignment entity or None
        """
        pass

    async def get_by_teacher(
        self,
        teacher_id: int,
        semester_id: Optional[int] = None,
        academic_year_id: Optional[int] = None
    ) -> List[SubjectAssignment]:
        """
        Get all subject assignments for a teacher

        Args:
            teacher_id: Teacher ID
            semester_id: Optional semester filter
            academic_year_id: Optional academic year filter

        Returns:
            List of SubjectAssignment entities
        """
        pass

    async def get_by_subject(
        self,
        subject_id: int,
        semester_id: Optional[int] = None,
        academic_year_id: Optional[int] = None
    ) -> List[SubjectAssignment]:
        """
        Get all subject assignments for a subject

        Args:
            subject_id: Subject ID
            semester_id: Optional semester filter
            academic_year_id: Optional academic year filter

        Returns:
            List of SubjectAssignment entities
        """
        pass

    async def get_by_semester(
        self,
        semester_id: int,
        subject_id: Optional[int] = None,
        teacher_id: Optional[int] = None
    ) -> List[SubjectAssignment]:
        """
        Get all subject assignments for a semester

        Args:
            semester_id: Semester ID
            subject_id: Optional subject filter
            teacher_id: Optional teacher filter

        Returns:
            List of SubjectAssignment entities
        """
        pass

    async def exists_for_subject_teacher_semester(
        self,
        subject_id: int,
        teacher_id: int,
        semester_id: int,
        exclude_id: Optional[int] = None
    ) -> bool:
        """
        Check if subject assignment exists for given subject, teacher and semester

        Args:
            subject_id: Subject ID
            teacher_id: Teacher ID
            semester_id: Semester ID
            exclude_id: Optional ID to exclude from check

        Returns:
            True if exists, False otherwise
        """
        pass