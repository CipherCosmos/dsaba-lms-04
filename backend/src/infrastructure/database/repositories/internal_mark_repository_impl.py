"""
Internal Mark Repository Implementation
"""

from typing import List, Optional
from sqlalchemy.orm import Session, joinedload, selectinload
from src.domain.repositories.internal_mark_repository import IInternalMarkRepository
from src.domain.entities.internal_mark import InternalMark
from src.infrastructure.database.models import (
    InternalMarkModel,
    MarksWorkflowState,
    MarkComponentType,
    StudentModel,
    SubjectAssignmentModel
)


class InternalMarkRepository(IInternalMarkRepository):
    """Internal Mark repository implementation"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create(self, internal_mark: InternalMark) -> InternalMark:
        """Create a new internal mark"""
        model = InternalMarkModel(
            student_id=internal_mark.student_id,
            subject_assignment_id=internal_mark.subject_assignment_id,
            semester_id=internal_mark.semester_id,
            academic_year_id=internal_mark.academic_year_id,
            component_type=internal_mark.component_type,
            marks_obtained=internal_mark.marks_obtained,
            max_marks=internal_mark.max_marks,
            workflow_state=internal_mark.workflow_state,
            entered_by=internal_mark._entered_by,
            submitted_at=internal_mark._submitted_at,
            submitted_by=internal_mark._submitted_by,
            approved_at=internal_mark._approved_at,
            approved_by=internal_mark._approved_by,
            rejected_at=internal_mark._rejected_at,
            rejected_by=internal_mark._rejected_by,
            rejection_reason=internal_mark._rejection_reason,
            frozen_at=internal_mark._frozen_at,
            frozen_by=internal_mark._frozen_by,
            published_at=internal_mark._published_at,
            notes=internal_mark._notes
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_entity(model)
    
    async def get_by_id(self, mark_id: int) -> Optional[InternalMark]:
        """Get internal mark by ID with eager loading"""
        model = self.db.query(InternalMarkModel).options(
            joinedload(InternalMarkModel.student).joinedload(StudentModel.user),
            joinedload(InternalMarkModel.subject_assignment).joinedload(SubjectAssignmentModel.subject)
        ).filter(
            InternalMarkModel.id == mark_id
        ).first()
        return self._to_entity(model) if model else None
    
    async def get_by_student_subject(
        self,
        student_id: int,
        subject_assignment_id: int,
        component_type: MarkComponentType
    ) -> Optional[InternalMark]:
        """Get internal mark by student, subject, and component"""
        model = self.db.query(InternalMarkModel).filter(
            InternalMarkModel.student_id == student_id,
            InternalMarkModel.subject_assignment_id == subject_assignment_id,
            InternalMarkModel.component_type == component_type
        ).first()
        return self._to_entity(model) if model else None
    
    async def get_by_student(
        self,
        student_id: int,
        semester_id: Optional[int] = None,
        academic_year_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 1000
    ) -> List[InternalMark]:
        """Get all internal marks for a student with eager loading and pagination"""
        query = self.db.query(InternalMarkModel).options(
            selectinload(InternalMarkModel.subject_assignment).joinedload(SubjectAssignmentModel.subject)
        ).filter(
            InternalMarkModel.student_id == student_id
        )
        
        if semester_id:
            query = query.filter(InternalMarkModel.semester_id == semester_id)
        if academic_year_id:
            query = query.filter(InternalMarkModel.academic_year_id == academic_year_id)
        
        models = query.order_by(InternalMarkModel.component_type).offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def get_by_subject_assignment(
        self,
        subject_assignment_id: int,
        workflow_state: Optional[MarksWorkflowState] = None,
        skip: int = 0,
        limit: int = 1000
    ) -> List[InternalMark]:
        """Get all internal marks for a subject assignment with eager loading and pagination"""
        query = self.db.query(InternalMarkModel).options(
            selectinload(InternalMarkModel.student).joinedload(StudentModel.user)
        ).filter(
            InternalMarkModel.subject_assignment_id == subject_assignment_id
        )
        
        if workflow_state:
            query = query.filter(InternalMarkModel.workflow_state == workflow_state)
        
        models = query.order_by(InternalMarkModel.student_id, InternalMarkModel.component_type).offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def get_by_workflow_state(
        self,
        workflow_state: MarksWorkflowState,
        department_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 1000
    ) -> List[InternalMark]:
        """Get all marks in a specific workflow state with eager loading and pagination"""
        # DEPRECATED: Using ClassModel for department filtering
        # TODO: Migrate to use semester.batch_instance.department_id instead
        # This join is kept for backward compatibility with assignments that have class_id
        from src.infrastructure.database.models import SubjectAssignmentModel, ClassModel
        
        query = self.db.query(InternalMarkModel).options(
            selectinload(InternalMarkModel.student).joinedload(StudentModel.user),
            selectinload(InternalMarkModel.subject_assignment).joinedload(SubjectAssignmentModel.subject),
            selectinload(InternalMarkModel.subject_assignment).joinedload(SubjectAssignmentModel.teacher)
        ).filter(
            InternalMarkModel.workflow_state == workflow_state
        )
        
        if department_id:
            # Join with subject_assignments -> classes -> departments
            query = query.join(
                SubjectAssignmentModel,
                InternalMarkModel.subject_assignment_id == SubjectAssignmentModel.id
            ).join(
                ClassModel,  # DEPRECATED: Legacy class-based filtering
                SubjectAssignmentModel.class_id == ClassModel.id
            ).filter(ClassModel.department_id == department_id)
        
        models = query.order_by(InternalMarkModel.submitted_at.desc()).offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def update(self, internal_mark: InternalMark) -> InternalMark:
        """Update internal mark"""
        model = self.db.query(InternalMarkModel).filter(
            InternalMarkModel.id == internal_mark.id
        ).first()
        
        if not model:
            raise ValueError(f"Internal mark {internal_mark.id} not found")
        
        model.marks_obtained = internal_mark.marks_obtained
        model.max_marks = internal_mark.max_marks
        model.workflow_state = internal_mark.workflow_state
        model.submitted_at = internal_mark._submitted_at
        model.submitted_by = internal_mark._submitted_by
        model.approved_at = internal_mark._approved_at
        model.approved_by = internal_mark._approved_by
        model.rejected_at = internal_mark._rejected_at
        model.rejected_by = internal_mark._rejected_by
        model.rejection_reason = internal_mark._rejection_reason
        model.frozen_at = internal_mark._frozen_at
        model.frozen_by = internal_mark._frozen_by
        model.published_at = internal_mark._published_at
        model.notes = internal_mark._notes
        
        self.db.commit()
        self.db.refresh(model)
        return self._to_entity(model)
    
    async def delete(self, mark_id: int) -> bool:
        """Delete internal mark"""
        model = self.db.query(InternalMarkModel).filter(
            InternalMarkModel.id == mark_id
        ).first()
        
        if not model:
            return False
        
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def bulk_create(self, marks: List[InternalMark]) -> List[InternalMark]:
        """Bulk create internal marks"""
        models = []
        for mark in marks:
            model = InternalMarkModel(
                student_id=mark.student_id,
                subject_assignment_id=mark.subject_assignment_id,
                semester_id=mark.semester_id,
                academic_year_id=mark.academic_year_id,
                component_type=mark.component_type,
                marks_obtained=mark.marks_obtained,
                max_marks=mark.max_marks,
                workflow_state=mark.workflow_state,
                entered_by=mark._entered_by,
                notes=mark._notes
            )
            models.append(model)
        
        self.db.add_all(models)
        self.db.commit()
        
        for model in models:
            self.db.refresh(model)
        
        return [self._to_entity(model) for model in models]
    
    def _to_entity(self, model: InternalMarkModel) -> InternalMark:
        """Convert model to entity"""
        return InternalMark(
            id=model.id,
            student_id=model.student_id,
            subject_assignment_id=model.subject_assignment_id,
            semester_id=model.semester_id,
            academic_year_id=model.academic_year_id,
            component_type=model.component_type,
            marks_obtained=model.marks_obtained,
            max_marks=model.max_marks,
            workflow_state=model.workflow_state,
            entered_by=model.entered_by,
            submitted_at=model.submitted_at,
            submitted_by=model.submitted_by,
            approved_at=model.approved_at,
            approved_by=model.approved_by,
            rejected_at=model.rejected_at,
            rejected_by=model.rejected_by,
            rejection_reason=model.rejection_reason,
            frozen_at=model.frozen_at,
            frozen_by=model.frozen_by,
            published_at=model.published_at,
            notes=model.notes,
            entered_at=model.entered_at,
            updated_at=model.updated_at
        )

