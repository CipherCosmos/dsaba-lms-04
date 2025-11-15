"""
Academic Year Repository Implementation
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from src.domain.repositories.academic_year_repository import IAcademicYearRepository
from src.domain.entities.academic_year import AcademicYear
from src.infrastructure.database.models import (
    AcademicYearModel,
    AcademicYearStatus
)


class AcademicYearRepository(IAcademicYearRepository):
    """Academic Year repository implementation"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create(self, academic_year: AcademicYear) -> AcademicYear:
        """Create a new academic year"""
        model = AcademicYearModel(
            start_year=academic_year.start_year,
            end_year=academic_year.end_year,
            display_name=academic_year.display_name,
            is_current=academic_year.is_current,
            status=academic_year.status,
            start_date=academic_year.start_date,
            end_date=academic_year.end_date,
            archived_at=academic_year.archived_at
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_entity(model)
    
    async def get_by_id(self, academic_year_id: int) -> Optional[AcademicYear]:
        """Get academic year by ID"""
        model = self.db.query(AcademicYearModel).filter(
            AcademicYearModel.id == academic_year_id
        ).first()
        return self._to_entity(model) if model else None
    
    async def get_current(self) -> Optional[AcademicYear]:
        """Get current academic year"""
        model = self.db.query(AcademicYearModel).filter(
            AcademicYearModel.is_current == True,
            AcademicYearModel.status == AcademicYearStatus.ACTIVE
        ).first()
        return self._to_entity(model) if model else None
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[AcademicYearStatus] = None,
        is_current: Optional[bool] = None
    ) -> List[AcademicYear]:
        """Get all academic years with optional filters"""
        query = self.db.query(AcademicYearModel)
        
        if status:
            query = query.filter(AcademicYearModel.status == status)
        if is_current is not None:
            query = query.filter(AcademicYearModel.is_current == is_current)
        
        models = query.order_by(AcademicYearModel.start_year.desc()).offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def update(self, academic_year: AcademicYear) -> AcademicYear:
        """Update academic year"""
        model = self.db.query(AcademicYearModel).filter(
            AcademicYearModel.id == academic_year.id
        ).first()
        
        if not model:
            raise ValueError(f"Academic year {academic_year.id} not found")
        
        model.start_year = academic_year.start_year
        model.end_year = academic_year.end_year
        model.display_name = academic_year.display_name
        model.is_current = academic_year.is_current
        model.status = academic_year.status
        model.start_date = academic_year.start_date
        model.end_date = academic_year.end_date
        model.archived_at = academic_year.archived_at
        
        self.db.commit()
        self.db.refresh(model)
        return self._to_entity(model)
    
    async def delete(self, academic_year_id: int) -> bool:
        """Delete academic year"""
        model = self.db.query(AcademicYearModel).filter(
            AcademicYearModel.id == academic_year_id
        ).first()
        
        if not model:
            return False
        
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def get_by_years(self, start_year: int, end_year: int) -> Optional[AcademicYear]:
        """Get academic year by start and end years"""
        model = self.db.query(AcademicYearModel).filter(
            AcademicYearModel.start_year == start_year,
            AcademicYearModel.end_year == end_year
        ).first()
        return self._to_entity(model) if model else None
    
    def _to_entity(self, model: AcademicYearModel) -> AcademicYear:
        """Convert model to entity"""
        return AcademicYear(
            id=model.id,
            start_year=model.start_year,
            end_year=model.end_year,
            display_name=model.display_name,
            is_current=model.is_current,
            status=model.status,
            start_date=model.start_date,
            end_date=model.end_date,
            archived_at=model.archived_at,
            created_at=model.created_at
        )

