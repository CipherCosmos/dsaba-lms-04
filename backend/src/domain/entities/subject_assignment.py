"""
Subject Assignment Domain Entity
Represents assignment of a subject to a teacher for a specific class/semester
"""

from typing import Optional
from datetime import datetime

from .base import Entity


class SubjectAssignment(Entity):
    """
    Subject Assignment entity

    Represents the assignment of a subject to a teacher for a specific class and semester
    """

    def __init__(
        self,
        id: int,
        subject_id: int,
        teacher_id: int,
        semester_id: int,
        academic_year: int,
        academic_year_id: Optional[int] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        """
        Initialize a SubjectAssignment entity.

        Args:
            id (int): Unique identifier for the assignment
            subject_id (int): ID of the subject
            teacher_id (int): ID of the teacher
            semester_id (int): ID of the semester
            academic_year (int): Academic year (e.g., 2024)
            academic_year_id (Optional[int]): FK to academic years table
            created_at (Optional[datetime]): Creation timestamp
            updated_at (Optional[datetime]): Last update timestamp
        """
        self.id = id
        self.subject_id = subject_id
        self.teacher_id = teacher_id
        self.semester_id = semester_id
        self.academic_year = academic_year
        self.academic_year_id = academic_year_id
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()

    def _validate(self) -> None:
        """Validate entity state"""
        if not self.subject_id:
            raise ValueError("Subject ID is required")
        if not self.teacher_id:
            raise ValueError("Teacher ID is required")
        if not self.semester_id:
            raise ValueError("Semester ID is required")
        if not self.academic_year:
            raise ValueError("Academic year is required")

    def to_dict(self) -> dict:
        """Convert entity to dictionary"""
        return {
            "id": self.id,
            "subject_id": self.subject_id,
            "teacher_id": self.teacher_id,
            "semester_id": self.semester_id,
            "academic_year": self.academic_year,
            "academic_year_id": self.academic_year_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
