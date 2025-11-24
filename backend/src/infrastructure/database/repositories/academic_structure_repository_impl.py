"""
Academic Structure Repository Implementations
SQLAlchemy implementations for Batch, BatchYear, Semester
"""

import warnings
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from src.domain.repositories.academic_structure_repository import (
    IBatchRepository,
    ISemesterRepository,
    IBatchInstanceRepository,
    ISectionRepository
)
from src.domain.entities.academic_structure import Batch, BatchYear, Semester, BatchInstance, Section
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError

from ..models import BatchModel, SemesterModel, BatchInstanceModel, SectionModel


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


class SemesterRepository(ISemesterRepository):
    """SQLAlchemy implementation of semester repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: SemesterModel) -> Optional[Semester]:
        if not model:
            return None
        return Semester(
            id=model.id,
            semester_no=model.semester_no,
            batch_instance_id=model.batch_instance_id,
            batch_year_id=model.batch_year_id,
            academic_year_id=model.academic_year_id,
            department_id=model.department_id,
            is_current=model.is_current,
            start_date=model.start_date,
            end_date=model.end_date,
            status=model.status or 'active',
            created_at=model.created_at,
            updated_at=model.updated_at
        )
    
    def _to_model(self, entity: Semester) -> SemesterModel:
        return SemesterModel(
            id=entity.id,
            batch_instance_id=entity.batch_instance_id,
            batch_year_id=entity.batch_year_id,
            academic_year_id=entity.academic_year_id,
            department_id=entity.department_id,
            semester_no=entity.semester_no,
            is_current=entity.is_current,
            start_date=entity.start_date,
            end_date=entity.end_date,
            status=entity.status
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
    
    async def get_by_batch_instance(self, batch_instance_id: int) -> List[Semester]:
        models = self.db.query(SemesterModel).filter(
            SemesterModel.batch_instance_id == batch_instance_id
        ).order_by(SemesterModel.semester_no).all()
        return [self._to_entity(model) for model in models]
    
    async def get_by_batch_instance_and_number(
        self,
        batch_instance_id: int,
        semester_no: int
    ) -> Optional[Semester]:
        model = self.db.query(SemesterModel).filter(
            SemesterModel.batch_instance_id == batch_instance_id,
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
        # Check for duplicate - support both batch_instance_id (new) and batch_year_id (legacy)
        from src.domain.exceptions import ValidationError
        
        if entity.batch_instance_id:
            # New structure: check by batch_instance_id + semester_no
            existing = await self.get_by_batch_instance_and_number(
                entity.batch_instance_id,
                entity.semester_no
            )
            if existing:
                raise EntityAlreadyExistsError(
                    "Semester",
                    "batch_instance_id + semester_no",
                    f"Semester {entity.semester_no} already exists for this batch instance"
                )
        elif entity.batch_year_id:
            # Legacy structure: check by batch_year_id + semester_no
            existing = await self.get_by_number(entity.batch_year_id, entity.semester_no)
            if existing:
                raise EntityAlreadyExistsError(
                    "Semester",
                    "batch_year_id + semester_no",
                    f"Semester {entity.semester_no} already exists for this batch year"
                )
        else:
            # Neither provided - this should be caught by entity validation, but double-check
            raise ValidationError(
                "Either batch_instance_id or batch_year_id must be provided",
                field="batch_instance_id",
                value=None
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
        model.batch_instance_id = entity.batch_instance_id
        model.batch_year_id = entity.batch_year_id
        model.academic_year_id = entity.academic_year_id
        model.department_id = entity.department_id
        model.semester_no = entity.semester_no
        model.is_current = entity.is_current
        model.start_date = entity.start_date
        model.end_date = entity.end_date
        model.status = entity.status
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
        if filters:
            if 'batch_year_id' in filters:
                query = query.filter(SemesterModel.batch_year_id == filters['batch_year_id'])
            if 'batch_instance_id' in filters:
                query = query.filter(SemesterModel.batch_instance_id == filters['batch_instance_id'])
        return query.count()


class BatchInstanceRepository(IBatchInstanceRepository):
    """SQLAlchemy implementation of batch instance repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: BatchInstanceModel) -> Optional[BatchInstance]:
        if not model:
            return None
        return BatchInstance(
            id=model.id,
            academic_year_id=model.academic_year_id,
            department_id=model.department_id,
            batch_id=model.batch_id,
            admission_year=model.admission_year,
            current_semester=model.current_semester,
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at
        )
    
    def _to_model(self, entity: BatchInstance) -> BatchInstanceModel:
        return BatchInstanceModel(
            id=entity.id,
            academic_year_id=entity.academic_year_id,
            department_id=entity.department_id,
            batch_id=entity.batch_id,
            admission_year=entity.admission_year,
            current_semester=entity.current_semester,
            is_active=entity.is_active
        )
    
    async def get_by_id(self, id: int) -> Optional[BatchInstance]:
        model = self.db.query(BatchInstanceModel).filter(BatchInstanceModel.id == id).first()
        return self._to_entity(model)
    
    async def get_by_academic_year_and_department(
        self,
        academic_year_id: int,
        department_id: int
    ) -> List[BatchInstance]:
        models = self.db.query(BatchInstanceModel).filter(
            BatchInstanceModel.academic_year_id == academic_year_id,
            BatchInstanceModel.department_id == department_id
        ).all()
        return [self._to_entity(model) for model in models]
    
    async def get_by_academic_year(self, academic_year_id: int) -> List[BatchInstance]:
        models = self.db.query(BatchInstanceModel).filter(
            BatchInstanceModel.academic_year_id == academic_year_id
        ).all()
        return [self._to_entity(model) for model in models]
    
    async def get_by_department(self, department_id: int) -> List[BatchInstance]:
        models = self.db.query(BatchInstanceModel).filter(
            BatchInstanceModel.department_id == department_id
        ).all()
        return [self._to_entity(model) for model in models]
    
    async def get_unique(
        self,
        academic_year_id: int,
        department_id: int,
        batch_id: int
    ) -> Optional[BatchInstance]:
        model = self.db.query(BatchInstanceModel).filter(
            BatchInstanceModel.academic_year_id == academic_year_id,
            BatchInstanceModel.department_id == department_id,
            BatchInstanceModel.batch_id == batch_id
        ).first()
        return self._to_entity(model)
    
    async def exists_unique(
        self,
        academic_year_id: int,
        department_id: int,
        batch_id: int,
        exclude_id: Optional[int] = None
    ) -> bool:
        query = self.db.query(BatchInstanceModel).filter(
            BatchInstanceModel.academic_year_id == academic_year_id,
            BatchInstanceModel.department_id == department_id,
            BatchInstanceModel.batch_id == batch_id
        )
        if exclude_id:
            query = query.filter(BatchInstanceModel.id != exclude_id)
        return query.count() > 0
    
    async def get_all(self, skip: int = 0, limit: int = 100, filters: Optional[Dict[str, Any]] = None) -> List[BatchInstance]:
        query = self.db.query(BatchInstanceModel)
        if filters:
            if 'academic_year_id' in filters:
                query = query.filter(BatchInstanceModel.academic_year_id == filters['academic_year_id'])
            if 'department_id' in filters:
                query = query.filter(BatchInstanceModel.department_id == filters['department_id'])
            if 'batch_id' in filters:
                query = query.filter(BatchInstanceModel.batch_id == filters['batch_id'])
            if 'is_active' in filters:
                query = query.filter(BatchInstanceModel.is_active == filters['is_active'])
        models = query.offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def create(self, entity: BatchInstance) -> BatchInstance:
        if await self.exists_unique(
            entity.academic_year_id,
            entity.department_id,
            entity.batch_id
        ):
            raise EntityAlreadyExistsError(
                "BatchInstance",
                "academic_year_id + department_id + batch_id",
                f"Batch instance already exists for AY={entity.academic_year_id}, Dept={entity.department_id}, Batch={entity.batch_id}"
            )
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return await self.get_by_id(model.id)
    
    async def update(self, entity: BatchInstance) -> BatchInstance:
        model = self.db.query(BatchInstanceModel).filter(BatchInstanceModel.id == entity.id).first()
        if not model:
            raise EntityNotFoundError("BatchInstance", entity.id)
        
        # Check unique constraint if changing key fields
        if (model.academic_year_id != entity.academic_year_id or
            model.department_id != entity.department_id or
            model.batch_id != entity.batch_id):
            if await self.exists_unique(
                entity.academic_year_id,
                entity.department_id,
                entity.batch_id,
                exclude_id=entity.id
            ):
                raise EntityAlreadyExistsError(
                    "BatchInstance",
                    "academic_year_id + department_id + batch_id",
                    "Batch instance with this combination already exists"
                )
        
        model.academic_year_id = entity.academic_year_id
        model.department_id = entity.department_id
        model.batch_id = entity.batch_id
        model.admission_year = entity.admission_year
        model.current_semester = entity.current_semester
        model.is_active = entity.is_active
        self.db.commit()
        self.db.refresh(model)
        return await self.get_by_id(entity.id)
    
    async def delete(self, id: int) -> bool:
        model = self.db.query(BatchInstanceModel).filter(BatchInstanceModel.id == id).first()
        if not model:
            return False
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def exists(self, id: int) -> bool:
        return self.db.query(BatchInstanceModel).filter(BatchInstanceModel.id == id).count() > 0
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        query = self.db.query(BatchInstanceModel)
        if filters:
            if 'academic_year_id' in filters:
                query = query.filter(BatchInstanceModel.academic_year_id == filters['academic_year_id'])
            if 'department_id' in filters:
                query = query.filter(BatchInstanceModel.department_id == filters['department_id'])
            if 'is_active' in filters:
                query = query.filter(BatchInstanceModel.is_active == filters['is_active'])
        return query.count()


class SectionRepository(ISectionRepository):
    """SQLAlchemy implementation of section repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: SectionModel) -> Optional[Section]:
        if not model:
            return None
        return Section(
            id=model.id,
            batch_instance_id=model.batch_instance_id,
            section_name=model.section_name,
            capacity=model.capacity,
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at
        )
    
    def _to_model(self, entity: Section) -> SectionModel:
        return SectionModel(
            id=entity.id,
            batch_instance_id=entity.batch_instance_id,
            section_name=entity.section_name,
            capacity=entity.capacity,
            is_active=entity.is_active
        )
    
    async def get_by_id(self, id: int) -> Optional[Section]:
        model = self.db.query(SectionModel).filter(SectionModel.id == id).first()
        return self._to_entity(model)
    
    async def get_by_batch_instance(self, batch_instance_id: int) -> List[Section]:
        models = self.db.query(SectionModel).filter(
            SectionModel.batch_instance_id == batch_instance_id
        ).order_by(SectionModel.section_name).all()
        return [self._to_entity(model) for model in models]
    
    async def get_by_batch_instance_and_name(
        self,
        batch_instance_id: int,
        section_name: str
    ) -> Optional[Section]:
        model = self.db.query(SectionModel).filter(
            SectionModel.batch_instance_id == batch_instance_id,
            SectionModel.section_name == section_name.upper()
        ).first()
        return self._to_entity(model)
    
    async def exists_in_batch(
        self,
        batch_instance_id: int,
        section_name: str,
        exclude_id: Optional[int] = None
    ) -> bool:
        query = self.db.query(SectionModel).filter(
            SectionModel.batch_instance_id == batch_instance_id,
            SectionModel.section_name == section_name.upper()
        )
        if exclude_id:
            query = query.filter(SectionModel.id != exclude_id)
        return query.count() > 0
    
    async def get_all(self, skip: int = 0, limit: int = 100, filters: Optional[Dict[str, Any]] = None) -> List[Section]:
        query = self.db.query(SectionModel)
        if filters:
            if 'batch_instance_id' in filters:
                query = query.filter(SectionModel.batch_instance_id == filters['batch_instance_id'])
            if 'is_active' in filters:
                query = query.filter(SectionModel.is_active == filters['is_active'])
        models = query.offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def create(self, entity: Section) -> Section:
        if await self.exists_in_batch(entity.batch_instance_id, entity.section_name):
            raise EntityAlreadyExistsError(
                "Section",
                "batch_instance_id + section_name",
                f"Section {entity.section_name} already exists in this batch"
            )
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return await self.get_by_id(model.id)
    
    async def update(self, entity: Section) -> Section:
        model = self.db.query(SectionModel).filter(SectionModel.id == entity.id).first()
        if not model:
            raise EntityNotFoundError("Section", entity.id)
        
        # Check unique constraint if changing section name
        if model.section_name != entity.section_name:
            if await self.exists_in_batch(entity.batch_instance_id, entity.section_name, exclude_id=entity.id):
                raise EntityAlreadyExistsError(
                    "Section",
                    "section_name",
                    f"Section {entity.section_name} already exists in this batch"
                )
        
        model.batch_instance_id = entity.batch_instance_id
        model.section_name = entity.section_name
        model.capacity = entity.capacity
        model.is_active = entity.is_active
        self.db.commit()
        self.db.refresh(model)
        return await self.get_by_id(entity.id)
    
    async def delete(self, id: int) -> bool:
        model = self.db.query(SectionModel).filter(SectionModel.id == id).first()
        if not model:
            return False
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def exists(self, id: int) -> bool:
        return self.db.query(SectionModel).filter(SectionModel.id == id).count() > 0
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        query = self.db.query(SectionModel)
        if filters and 'batch_instance_id' in filters:
            query = query.filter(SectionModel.batch_instance_id == filters['batch_instance_id'])
        return query.count()

