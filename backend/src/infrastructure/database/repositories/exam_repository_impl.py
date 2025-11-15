"""
Exam Repository Implementation
SQLAlchemy implementation of IExamRepository
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload, selectinload

from src.domain.repositories.exam_repository import IExamRepository
from src.domain.entities.exam import Exam
from src.domain.enums.exam_type import ExamType, ExamStatus
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError

from ..models import ExamModel, SubjectAssignmentModel


class ExamRepository(IExamRepository):
    """
    SQLAlchemy implementation of exam repository
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: ExamModel) -> Optional[Exam]:
        """Convert database model to domain entity"""
        if not model:
            return None
        
        return Exam(
            id=model.id,
            name=model.name,
            subject_assignment_id=model.subject_assignment_id,
            exam_type=ExamType(model.exam_type),
            exam_date=model.exam_date,
            total_marks=float(model.total_marks),
            duration_minutes=model.duration_minutes,
            instructions=model.instructions,
            status=ExamStatus(model.status),
            question_paper_url=model.question_paper_url,
            created_by=model.created_by,
            created_at=model.created_at,
            updated_at=model.updated_at
        )
    
    def _to_model(self, entity: Exam) -> ExamModel:
        """Convert domain entity to database model"""
        return ExamModel(
            id=entity.id,
            name=entity.name,
            subject_assignment_id=entity.subject_assignment_id,
            exam_type=entity.exam_type.value,
            exam_date=entity.exam_date,
            total_marks=entity.total_marks,
            duration_minutes=entity.duration_minutes,
            instructions=entity.instructions,
            status=entity.status.value,
            question_paper_url=entity.question_paper_url,
            created_by=entity.created_by
        )
    
    async def get_by_id(self, id: int) -> Optional[Exam]:
        """Get exam by ID with eager loading"""
        model = self.db.query(ExamModel).options(
            joinedload(ExamModel.subject_assignment).joinedload(SubjectAssignmentModel.subject),
            joinedload(ExamModel.subject_assignment).joinedload(SubjectAssignmentModel.teacher)
        ).filter(ExamModel.id == id).first()
        return self._to_entity(model)
    
    async def get_by_subject_assignment(
        self,
        subject_assignment_id: int,
        exam_type: Optional[ExamType] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Exam]:
        """Get exams by subject assignment with pagination"""
        query = self.db.query(ExamModel).options(
            joinedload(ExamModel.subject_assignment)
        ).filter(
            ExamModel.subject_assignment_id == subject_assignment_id
        )
        
        if exam_type:
            query = query.filter(ExamModel.exam_type == exam_type.value)
        
        models = query.order_by(ExamModel.exam_date.desc()).offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def get_by_status(
        self,
        status: ExamStatus,
        skip: int = 0,
        limit: int = 100
    ) -> List[Exam]:
        """Get exams by status"""
        models = self.db.query(ExamModel).filter(
            ExamModel.status == status.value
        ).offset(skip).limit(limit).all()
        
        return [self._to_entity(model) for model in models]
    
    async def exists_for_subject_assignment(
        self,
        subject_assignment_id: int,
        exam_type: ExamType
    ) -> bool:
        """Check if exam exists for subject assignment and type"""
        return self.db.query(ExamModel).filter(
            ExamModel.subject_assignment_id == subject_assignment_id,
            ExamModel.exam_type == exam_type.value
        ).count() > 0
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Exam]:
        """Get all exams with optional filtering and eager loading"""
        query = self.db.query(ExamModel).options(
            joinedload(ExamModel.subject_assignment)
        )
        
        if filters:
            if 'status' in filters:
                query = query.filter(ExamModel.status == filters['status'].value)
            if 'exam_type' in filters:
                query = query.filter(ExamModel.exam_type == filters['exam_type'].value)
            if 'subject_assignment_id' in filters:
                query = query.filter(ExamModel.subject_assignment_id == filters['subject_assignment_id'])
        
        models = query.order_by(ExamModel.exam_date.desc()).offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def create(self, entity: Exam) -> Exam:
        """Create a new exam"""
        # Check for duplicate
        if await self.exists_for_subject_assignment(
            entity.subject_assignment_id,
            entity.exam_type
        ):
            raise EntityAlreadyExistsError(
                "Exam",
                "subject_assignment_id + exam_type",
                f"{entity.subject_assignment_id} + {entity.exam_type.value}"
            )
        
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(model.id)
    
    async def update(self, entity: Exam) -> Exam:
        """Update existing exam"""
        model = self.db.query(ExamModel).filter(ExamModel.id == entity.id).first()
        
        if not model:
            raise EntityNotFoundError("Exam", entity.id)
        
        # Update fields
        model.name = entity.name
        model.exam_date = entity.exam_date
        model.total_marks = entity.total_marks
        model.duration_minutes = entity.duration_minutes
        model.instructions = entity.instructions
        model.status = entity.status.value
        model.question_paper_url = entity.question_paper_url
        
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(entity.id)
    
    async def delete(self, id: int) -> bool:
        """Delete exam"""
        model = self.db.query(ExamModel).filter(ExamModel.id == id).first()
        
        if not model:
            return False
        
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def exists(self, id: int) -> bool:
        """Check if exam exists"""
        return self.db.query(ExamModel).filter(ExamModel.id == id).count() > 0
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count exams with optional filters"""
        query = self.db.query(ExamModel)
        
        if filters:
            if 'status' in filters:
                query = query.filter(ExamModel.status == filters['status'].value)
            if 'exam_type' in filters:
                query = query.filter(ExamModel.exam_type == filters['exam_type'].value)
        
        return query.count()

