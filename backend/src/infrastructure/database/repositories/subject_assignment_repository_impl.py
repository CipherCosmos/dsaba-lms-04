"""
Subject Assignment Repository Implementation
"""

from typing import Optional, List
from sqlalchemy.orm import Session

from src.domain.repositories.subject_assignment_repository import ISubjectAssignmentRepository
from src.domain.entities.subject_assignment import SubjectAssignment
from src.infrastructure.database.models import SubjectAssignmentModel


class SubjectAssignmentRepository(ISubjectAssignmentRepository):
    """
    Subject Assignment repository implementation
    """

    def __init__(self, db: Session):
        self.db = db

    async def get_by_id(self, id: int) -> Optional[SubjectAssignment]:
        """Get subject assignment by ID"""
        model = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.id == id
        ).first()

        if not model:
            return None

        return self._to_entity(model)

    async def get_all(self, filters: Optional[dict] = None, skip: int = 0, limit: Optional[int] = None) -> List[SubjectAssignment]:
        """Get all subject assignments with optional filters"""
        query = self.db.query(SubjectAssignmentModel)

        if filters:
            for key, value in filters.items():
                if hasattr(SubjectAssignmentModel, key):
                    query = query.filter(getattr(SubjectAssignmentModel, key) == value)

        if limit:
            query = query.offset(skip).limit(limit)

        models = query.all()
        return [self._to_entity(model) for model in models]

    async def create(self, entity: SubjectAssignment) -> SubjectAssignment:
        """Create new subject assignment"""
        model = SubjectAssignmentModel(
            subject_id=entity.subject_id,
            teacher_id=entity.teacher_id,
            semester_id=entity.semester_id,
            academic_year_id=entity.academic_year_id,
            class_id=entity.class_id
        )

        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)

        return self._to_entity(model)

    async def update(self, entity: SubjectAssignment) -> SubjectAssignment:
        """Update subject assignment"""
        model = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.id == entity.id
        ).first()

        if not model:
            raise ValueError(f"SubjectAssignment with id {entity.id} not found")

        model.subject_id = entity.subject_id
        model.teacher_id = entity.teacher_id
        model.semester_id = entity.semester_id
        model.academic_year_id = entity.academic_year_id
        model.class_id = entity.class_id
        model.updated_at = entity.updated_at

        self.db.commit()
        self.db.refresh(model)

        return self._to_entity(model)

    async def delete(self, id: int) -> bool:
        """Delete subject assignment"""
        model = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.id == id
        ).first()

        if not model:
            return False

        self.db.delete(model)
        self.db.commit()

        return True

    async def exists(self, id: int) -> bool:
        """Check if subject assignment exists"""
        count = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.id == id
        ).count()

        return count > 0

    async def count(self, filters: Optional[dict] = None) -> int:
        """Count subject assignments"""
        query = self.db.query(SubjectAssignmentModel)

        if filters:
            for key, value in filters.items():
                if hasattr(SubjectAssignmentModel, key):
                    query = query.filter(getattr(SubjectAssignmentModel, key) == value)

        return query.count()

    async def get_by_subject_and_teacher(
        self,
        subject_id: int,
        teacher_id: int,
        semester_id: int
    ) -> Optional[SubjectAssignment]:
        """Get subject assignment by subject, teacher and semester"""
        model = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.subject_id == subject_id,
            SubjectAssignmentModel.teacher_id == teacher_id,
            SubjectAssignmentModel.semester_id == semester_id
        ).first()

        if not model:
            return None

        return self._to_entity(model)

    async def get_by_teacher(
        self,
        teacher_id: int,
        semester_id: Optional[int] = None,
        academic_year_id: Optional[int] = None
    ) -> List[SubjectAssignment]:
        """Get all subject assignments for a teacher"""
        query = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.teacher_id == teacher_id
        )

        if semester_id:
            query = query.filter(SubjectAssignmentModel.semester_id == semester_id)
        if academic_year_id:
            query = query.filter(SubjectAssignmentModel.academic_year_id == academic_year_id)

        models = query.all()
        return [self._to_entity(model) for model in models]

    async def get_by_subject(
        self,
        subject_id: int,
        semester_id: Optional[int] = None,
        academic_year_id: Optional[int] = None
    ) -> List[SubjectAssignment]:
        """Get all subject assignments for a subject"""
        query = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.subject_id == subject_id
        )

        if semester_id:
            query = query.filter(SubjectAssignmentModel.semester_id == semester_id)
        if academic_year_id:
            query = query.filter(SubjectAssignmentModel.academic_year_id == academic_year_id)

        models = query.all()
        return [self._to_entity(model) for model in models]

    async def get_by_semester(
        self,
        semester_id: int,
        subject_id: Optional[int] = None,
        teacher_id: Optional[int] = None
    ) -> List[SubjectAssignment]:
        """Get all subject assignments for a semester"""
        query = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.semester_id == semester_id
        )

        if subject_id:
            query = query.filter(SubjectAssignmentModel.subject_id == subject_id)
        if teacher_id:
            query = query.filter(SubjectAssignmentModel.teacher_id == teacher_id)

        models = query.all()
        return [self._to_entity(model) for model in models]

    async def exists_for_subject_teacher_semester(
        self,
        subject_id: int,
        teacher_id: int,
        semester_id: int,
        exclude_id: Optional[int] = None
    ) -> bool:
        """Check if subject assignment exists for given subject, teacher and semester"""
        query = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.subject_id == subject_id,
            SubjectAssignmentModel.teacher_id == teacher_id,
            SubjectAssignmentModel.semester_id == semester_id
        )

        if exclude_id:
            query = query.filter(SubjectAssignmentModel.id != exclude_id)

        count = query.count()
        return count > 0

    def _to_entity(self, model: SubjectAssignmentModel) -> SubjectAssignment:
        """Convert model to entity"""
        return SubjectAssignment(
            id=model.id,
            subject_id=model.subject_id,
            teacher_id=model.teacher_id,
            semester_id=model.semester_id,
            academic_year_id=model.academic_year_id,
            class_id=model.class_id,
            created_at=model.created_at,
            updated_at=model.updated_at
        )