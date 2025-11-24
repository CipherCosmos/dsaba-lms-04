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
        subject_id: int,
        teacher_id: int,
        semester_id: int,
        academic_year_id: int,
        class_id: Optional[int] = None,
        id: Optional[int] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        """
        Args:
            subject_id (int): The ID of the subject.
            teacher_id (int): The ID of the teacher.
            semester_id (int): The ID of the semester.
            academic_year_id (int): The ID of the academic year.
            class_id (Optional[int]): DEPRECATED - Kept for backward compatibility. New assignments should derive class from semester.batch_instance_id. Defaults to None.
            id (Optional[int]): The ID of the assignment.
            created_at (Optional[datetime]): Creation timestamp.
            updated_at (Optional[datetime]): Update timestamp.
        """
        super().__init__(id)
        self.subject_id = subject_id
        self.teacher_id = teacher_id
        self.semester_id = semester_id
        self.academic_year_id = academic_year_id
        # DEPRECATED: class_id is optional and should not be used in new code
        self.class_id = class_id
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def _validate(self) -> None:
        """Validate entity state"""
        if not self.subject_id:
            raise ValueError("Subject ID is required")
        if not self.teacher_id:
            raise ValueError("Teacher ID is required")
        if not self.semester_id:
            raise ValueError("Semester ID is required")
        if not self.academic_year_id:
            raise ValueError("Academic year ID is required")

    def to_dict(self) -> dict:
        """Convert entity to dictionary"""
        return {
            "id": self.id,
            "subject_id": self.subject_id,
            "teacher_id": self.teacher_id,
            "semester_id": self.semester_id,
            "academic_year_id": self.academic_year_id,
            "class_id": self.class_id,  # DEPRECATED: Legacy field
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
