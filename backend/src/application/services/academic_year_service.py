"""
Academic Year Service
Business logic for academic year management
"""

from typing import List, Optional
from datetime import date, datetime
from src.domain.entities.academic_year import AcademicYear
from src.domain.repositories.academic_year_repository import IAcademicYearRepository
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError, BusinessRuleViolationError
from src.infrastructure.database.models import AcademicYearStatus


class AcademicYearService:
    """Academic Year service"""
    
    def __init__(self, repository: IAcademicYearRepository):
        self.repository = repository
    
    async def create_academic_year(
        self,
        start_year: int,
        end_year: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> AcademicYear:
        """
        Create a new academic year
        
        Args:
            start_year: Start year (e.g., 2024)
            end_year: End year (e.g., 2025)
            start_date: Academic year start date
            end_date: Academic year end date
        
        Returns:
            Created AcademicYear
        
        Raises:
            EntityAlreadyExistsError: If academic year already exists
            BusinessRuleViolationError: If validation fails
        """
        # Check if academic year already exists
        existing = await self.repository.get_by_years(start_year, end_year)
        if existing:
            raise EntityAlreadyExistsError("AcademicYear", f"{start_year}-{end_year}")
        
        # Validate year range
        if end_year <= start_year:
            raise BusinessRuleViolationError("End year must be greater than start year")
        
        # Check for overlapping years
        all_years = await self.repository.get_all(limit=1000)
        for ay in all_years:
            if (start_year <= ay.end_year and end_year >= ay.start_year):
                raise BusinessRuleViolationError(
                    f"Academic year {start_year}-{end_year} overlaps with existing {ay.display_name}"
                )
        
        display_name = f"{start_year}-{end_year}"
        
        academic_year = AcademicYear(
            id=None,
            start_year=start_year,
            end_year=end_year,
            display_name=display_name,
            is_current=False,
            status=AcademicYearStatus.PLANNED,
            start_date=start_date,
            end_date=end_date
        )
        
        return await self.repository.create(academic_year)
    
    async def get_academic_year(self, academic_year_id: int) -> AcademicYear:
        """Get academic year by ID"""
        academic_year = await self.repository.get_by_id(academic_year_id)
        if not academic_year:
            raise EntityNotFoundError("AcademicYear", academic_year_id)
        return academic_year
    
    async def get_current_academic_year(self) -> Optional[AcademicYear]:
        """Get current academic year"""
        return await self.repository.get_current()
    
    async def list_academic_years(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[AcademicYearStatus] = None,
        is_current: Optional[bool] = None
    ) -> List[AcademicYear]:
        """List academic years with optional filters"""
        return await self.repository.get_all(skip=skip, limit=limit, status=status, is_current=is_current)
    
    async def activate_academic_year(self, academic_year_id: int) -> AcademicYear:
        """
        Activate an academic year
        
        This will:
        1. Deactivate current academic year (if any)
        2. Activate the specified academic year
        """
        academic_year = await self.get_academic_year(academic_year_id)
        
        # Deactivate current academic year
        current = await self.repository.get_current()
        if current and current.id != academic_year_id:
            current.set_current(False)
            await self.repository.update(current)
        
        # Activate new academic year
        academic_year.activate()
        return await self.repository.update(academic_year)
    
    async def archive_academic_year(self, academic_year_id: int) -> AcademicYear:
        """Archive an academic year"""
        academic_year = await self.get_academic_year(academic_year_id)
        academic_year.archive()
        return await self.repository.update(academic_year)
    
    async def update_academic_year(
        self,
        academic_year_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> AcademicYear:
        """Update academic year dates"""
        academic_year = await self.get_academic_year(academic_year_id)
        
        # Create new instance with updated dates
        updated = AcademicYear(
            id=academic_year.id,
            start_year=academic_year.start_year,
            end_year=academic_year.end_year,
            display_name=academic_year.display_name,
            is_current=academic_year.is_current,
            status=academic_year.status,
            start_date=start_date or academic_year.start_date,
            end_date=end_date or academic_year.end_date,
            archived_at=academic_year.archived_at,
            created_at=academic_year._created_at
        )
        
        return await self.repository.update(updated)

