"""
Academic Structure Repository Implementations
SQLAlchemy implementations for Batch, BatchYear, Semester
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from src.domain.repositories.academic_structure_repository import (
    IBatchRepository,
    IBatchYearRepository,
    ISemesterRepository
)
from src.domain.entities.academic_structure import Batch, BatchYear, Semester
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError

from ..models import BatchModel, BatchYearModel, SemesterModel


class BatchRepository(IBatchRepository):
    """SQLAlchemy implementation of batch repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: BatchModel) -> Optional[Batch]:
        if not model:
            return None
        return Batch(
            id=model.id,
            name=model.name,
            duration_years=model.duration_years,
            is_active=model.is_active,
            created_at=model.created_at
        )
    
    def _to_model(self, entity: Batch) -> BatchModel:
        return BatchModel(
            id=entity.id,
            name=entity.name,
            duration_years=entity.duration_years,
            is_active=entity.is_active
        )
    
    async def get_by_id(self, id: int) -> Optional[Batch]:
        model = self.db.query(BatchModel).filter(BatchModel.id == id).first()
        return self._to_entity(model)
    
    async def get_by_name(self, name: str) -> Optional[Batch]:
        model = self.db.query(BatchModel).filter(BatchModel.name == name).first()
        return self._to_entity(model)
    
    async def name_exists(self, name: str, exclude_id: Optional[int] = None) -> bool:
        query = self.db.query(BatchModel).filter(BatchModel.name == name)
        if exclude_id:
            query = query.filter(BatchModel.id != exclude_id)
        return query.count() > 0
    
    async def get_all(self, skip: int = 0, limit: int = 100, filters: Optional[Dict[str, Any]] = None) -> List[Batch]:
        query = self.db.query(BatchModel)
        if filters and 'is_active' in filters:
            query = query.filter(BatchModel.is_active == filters['is_active'])
        models = query.offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def create(self, entity: Batch) -> Batch:
        if await self.name_exists(entity.name):
            raise EntityAlreadyExistsError("Batch", "name", entity.name)
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return await self.get_by_id(model.id)
    
    async def update(self, entity: Batch) -> Batch:
        model = self.db.query(BatchModel).filter(BatchModel.id == entity.id).first()
        if not model:
            raise EntityNotFoundError("Batch", entity.id)
        if model.name != entity.name and await self.name_exists(entity.name, exclude_id=entity.id):
            raise EntityAlreadyExistsError("Batch", "name", entity.name)
        model.name = entity.name
        model.duration_years = entity.duration_years
        model.is_active = entity.is_active
        self.db.commit()
        self.db.refresh(model)
        return await self.get_by_id(entity.id)
    
    async def delete(self, id: int) -> bool:
        model = self.db.query(BatchModel).filter(BatchModel.id == id).first()
        if not model:
            return False
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def exists(self, id: int) -> bool:
        return self.db.query(BatchModel).filter(BatchModel.id == id).count() > 0
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        query = self.db.query(BatchModel)
        if filters and 'is_active' in filters:
            query = query.filter(BatchModel.is_active == filters['is_active'])
        return query.count()


class BatchYearRepository(IBatchYearRepository):
    """SQLAlchemy implementation of batch year repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: BatchYearModel) -> Optional[BatchYear]:
        if not model:
            return None
        return BatchYear(
            id=model.id,
            batch_id=model.batch_id,
            start_year=model.start_year,
            end_year=model.end_year,
            is_current=model.is_current,
            created_at=model.created_at
        )
    
    def _to_model(self, entity: BatchYear) -> BatchYearModel:
        return BatchYearModel(
            id=entity.id,
            batch_id=entity.batch_id,
            start_year=entity.start_year,
            end_year=entity.end_year,
            is_current=entity.is_current
        )
    
    async def get_by_id(self, id: int) -> Optional[BatchYear]:
        model = self.db.query(BatchYearModel).filter(BatchYearModel.id == id).first()
        return self._to_entity(model)
    
    async def get_by_batch(self, batch_id: int) -> List[BatchYear]:
        models = self.db.query(BatchYearModel).filter(BatchYearModel.batch_id == batch_id).all()
        return [self._to_entity(model) for model in models]
    
    async def get_current(self) -> Optional[BatchYear]:
        model = self.db.query(BatchYearModel).filter(BatchYearModel.is_current == True).first()
        return self._to_entity(model)
    
    async def get_by_years(self, start_year: int, end_year: int) -> Optional[BatchYear]:
        model = self.db.query(BatchYearModel).filter(
            BatchYearModel.start_year == start_year,
            BatchYearModel.end_year == end_year
        ).first()
        return self._to_entity(model)
    
    async def get_all(self, skip: int = 0, limit: int = 100, filters: Optional[Dict[str, Any]] = None) -> List[BatchYear]:
        query = self.db.query(BatchYearModel)
        if filters:
            if 'batch_id' in filters:
                query = query.filter(BatchYearModel.batch_id == filters['batch_id'])
            if 'is_current' in filters:
                query = query.filter(BatchYearModel.is_current == filters['is_current'])
        models = query.offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def create(self, entity: BatchYear) -> BatchYear:
        # Check for duplicate
        existing = await self.get_by_years(entity.start_year, entity.end_year)
        if existing:
            raise EntityAlreadyExistsError(
                "BatchYear",
                "start_year + end_year",
                f"{entity.start_year}-{entity.end_year}"
            )
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return await self.get_by_id(model.id)
    
    async def update(self, entity: BatchYear) -> BatchYear:
        model = self.db.query(BatchYearModel).filter(BatchYearModel.id == entity.id).first()
        if not model:
            raise EntityNotFoundError("BatchYear", entity.id)
        model.batch_id = entity.batch_id
        model.start_year = entity.start_year
        model.end_year = entity.end_year
        model.is_current = entity.is_current
        self.db.commit()
        self.db.refresh(model)
        return await self.get_by_id(entity.id)
    
    async def delete(self, id: int) -> bool:
        model = self.db.query(BatchYearModel).filter(BatchYearModel.id == id).first()
        if not model:
            return False
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def exists(self, id: int) -> bool:
        return self.db.query(BatchYearModel).filter(BatchYearModel.id == id).count() > 0
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        query = self.db.query(BatchYearModel)
        if filters:
            if 'batch_id' in filters:
                query = query.filter(BatchYearModel.batch_id == filters['batch_id'])
        return query.count()


class SemesterRepository(ISemesterRepository):
    """SQLAlchemy implementation of semester repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: SemesterModel) -> Optional[Semester]:
        if not model:
            return None
        return Semester(
            id=model.id,
            batch_year_id=model.batch_year_id,
            semester_no=model.semester_no,
            is_current=model.is_current,
            start_date=model.start_date,
            end_date=model.end_date,
            created_at=model.created_at
        )
    
    def _to_model(self, entity: Semester) -> SemesterModel:
        return SemesterModel(
            id=entity.id,
            batch_year_id=entity.batch_year_id,
            semester_no=entity.semester_no,
            is_current=entity.is_current,
            start_date=entity.start_date,
            end_date=entity.end_date
        )
    
    async def get_by_id(self, id: int) -> Optional[Semester]:
        model = self.db.query(SemesterModel).filter(SemesterModel.id == id).first()
        return self._to_entity(model)
    
    async def get_by_batch_year(self, batch_year_id: int) -> List[Semester]:
        models = self.db.query(SemesterModel).filter(
            SemesterModel.batch_year_id == batch_year_id
        ).order_by(SemesterModel.semester_no).all()
        return [self._to_entity(model) for model in models]
    
    async def get_current(self) -> Optional[Semester]:
        model = self.db.query(SemesterModel).filter(SemesterModel.is_current == True).first()
        return self._to_entity(model)
    
    async def get_by_number(self, batch_year_id: int, semester_no: int) -> Optional[Semester]:
        model = self.db.query(SemesterModel).filter(
            SemesterModel.batch_year_id == batch_year_id,
            SemesterModel.semester_no == semester_no
        ).first()
        return self._to_entity(model)
    
    async def get_all(self, skip: int = 0, limit: int = 100, filters: Optional[Dict[str, Any]] = None) -> List[Semester]:
        query = self.db.query(SemesterModel)
        if filters:
            if 'batch_year_id' in filters:
                query = query.filter(SemesterModel.batch_year_id == filters['batch_year_id'])
            if 'is_current' in filters:
                query = query.filter(SemesterModel.is_current == filters['is_current'])
        models = query.offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def create(self, entity: Semester) -> Semester:
        # Check for duplicate
        existing = await self.get_by_number(entity.batch_year_id, entity.semester_no)
        if existing:
            raise EntityAlreadyExistsError(
                "Semester",
                "batch_year_id + semester_no",
                f"Semester {entity.semester_no} already exists for this batch year"
            )
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return await self.get_by_id(model.id)
    
    async def update(self, entity: Semester) -> Semester:
        model = self.db.query(SemesterModel).filter(SemesterModel.id == entity.id).first()
        if not model:
            raise EntityNotFoundError("Semester", entity.id)
        model.batch_year_id = entity.batch_year_id
        model.semester_no = entity.semester_no
        model.is_current = entity.is_current
        model.start_date = entity.start_date
        model.end_date = entity.end_date
        self.db.commit()
        self.db.refresh(model)
        return await self.get_by_id(entity.id)
    
    async def delete(self, id: int) -> bool:
        model = self.db.query(SemesterModel).filter(SemesterModel.id == id).first()
        if not model:
            return False
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def exists(self, id: int) -> bool:
        return self.db.query(SemesterModel).filter(SemesterModel.id == id).count() > 0
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        query = self.db.query(SemesterModel)
        if filters and 'batch_year_id' in filters:
            query = query.filter(SemesterModel.batch_year_id == filters['batch_year_id'])
        return query.count()

