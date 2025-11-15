"""
Academic Structure Service
Business logic for batch, batch year, and semester management
"""

from typing import List, Optional, Dict, Any
from datetime import date

from src.domain.repositories.academic_structure_repository import (
    IBatchRepository,
    IBatchYearRepository,
    ISemesterRepository
)
from src.domain.entities.academic_structure import Batch, BatchYear, Semester
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    BusinessRuleViolationError
)


class AcademicStructureService:
    """
    Academic structure service
    
    Coordinates batch, batch year, and semester management
    """
    
    def __init__(
        self,
        batch_repository: IBatchRepository,
        batch_year_repository: IBatchYearRepository,
        semester_repository: ISemesterRepository
    ):
        self.batch_repository = batch_repository
        self.batch_year_repository = batch_year_repository
        self.semester_repository = semester_repository
    
    # Batch operations
    async def create_batch(
        self,
        name: str,
        duration_years: int
    ) -> Batch:
        """Create a new batch"""
        batch = Batch(
            name=name,
            duration_years=duration_years,
            is_active=True
        )
        return await self.batch_repository.create(batch)
    
    async def get_batch(self, batch_id: int) -> Batch:
        """Get batch by ID"""
        batch = await self.batch_repository.get_by_id(batch_id)
        if not batch:
            raise EntityNotFoundError("Batch", batch_id)
        return batch
    
    async def list_batches(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None
    ) -> List[Batch]:
        """List batches"""
        filters = {}
        if is_active is not None:
            filters['is_active'] = is_active
        return await self.batch_repository.get_all(skip=skip, limit=limit, filters=filters)
    
    async def activate_batch(self, batch_id: int) -> Batch:
        """Activate batch"""
        batch = await self.get_batch(batch_id)
        batch.activate()
        return await self.batch_repository.update(batch)
    
    async def deactivate_batch(self, batch_id: int) -> Batch:
        """Deactivate batch"""
        batch = await self.get_batch(batch_id)
        batch.deactivate()
        return await self.batch_repository.update(batch)
    
    # BatchYear operations
    async def create_batch_year(
        self,
        batch_id: int,
        start_year: int,
        end_year: int,
        is_current: bool = False
    ) -> BatchYear:
        """Create a new batch year"""
        # Verify batch exists
        batch = await self.get_batch(batch_id)
        
        # If marking as current, unmark others
        if is_current:
            current = await self.batch_year_repository.get_current()
            if current:
                current.unmark_as_current()
                await self.batch_year_repository.update(current)
        
        batch_year = BatchYear(
            batch_id=batch_id,
            start_year=start_year,
            end_year=end_year,
            is_current=is_current
        )
        return await self.batch_year_repository.create(batch_year)
    
    async def get_batch_year(self, batch_year_id: int) -> BatchYear:
        """Get batch year by ID"""
        batch_year = await self.batch_year_repository.get_by_id(batch_year_id)
        if not batch_year:
            raise EntityNotFoundError("BatchYear", batch_year_id)
        return batch_year
    
    async def get_batch_years_by_batch(self, batch_id: int) -> List[BatchYear]:
        """Get all batch years for a batch"""
        return await self.batch_year_repository.get_by_batch(batch_id)
    
    async def mark_batch_year_as_current(self, batch_year_id: int) -> BatchYear:
        """Mark batch year as current"""
        # Unmark current
        current = await self.batch_year_repository.get_current()
        if current and current.id != batch_year_id:
            current.unmark_as_current()
            await self.batch_year_repository.update(current)
        
        # Mark new as current
        batch_year = await self.get_batch_year(batch_year_id)
        batch_year.mark_as_current()
        return await self.batch_year_repository.update(batch_year)
    
    # Semester operations
    async def create_semester(
        self,
        batch_year_id: int,
        semester_no: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        is_current: bool = False
    ) -> Semester:
        """Create a new semester"""
        # Verify batch year exists
        await self.get_batch_year(batch_year_id)
        
        # If marking as current, unmark others
        if is_current:
            current = await self.semester_repository.get_current()
            if current:
                current.unmark_as_current()
                await self.semester_repository.update(current)
        
        semester = Semester(
            batch_year_id=batch_year_id,
            semester_no=semester_no,
            start_date=start_date,
            end_date=end_date,
            is_current=is_current
        )
        return await self.semester_repository.create(semester)
    
    async def get_semester(self, semester_id: int) -> Semester:
        """Get semester by ID"""
        semester = await self.semester_repository.get_by_id(semester_id)
        if not semester:
            raise EntityNotFoundError("Semester", semester_id)
        return semester
    
    async def get_semesters_by_batch_year(self, batch_year_id: int) -> List[Semester]:
        """Get all semesters for a batch year"""
        return await self.semester_repository.get_by_batch_year(batch_year_id)
    
    async def mark_semester_as_current(self, semester_id: int) -> Semester:
        """Mark semester as current"""
        # Unmark current
        current = await self.semester_repository.get_current()
        if current and current.id != semester_id:
            current.unmark_as_current()
            await self.semester_repository.update(current)
        
        # Mark new as current
        semester = await self.get_semester(semester_id)
        semester.mark_as_current()
        return await self.semester_repository.update(semester)
    
    async def update_semester_dates(
        self,
        semester_id: int,
        start_date: date,
        end_date: date
    ) -> Semester:
        """Update semester dates"""
        semester = await self.get_semester(semester_id)
        semester.set_dates(start_date, end_date)
        return await self.semester_repository.update(semester)

    async def list_semesters(
        self,
        skip: int = 0,
        limit: int = 100,
        batch_year_id: Optional[int] = None,
        is_current: Optional[bool] = None
    ) -> List[Semester]:
        """List semesters with optional filters"""
        filters = {}
        if batch_year_id is not None:
            filters['batch_year_id'] = batch_year_id
        if is_current is not None:
            filters['is_current'] = is_current
        return await self.semester_repository.get_all(skip=skip, limit=limit, filters=filters)

