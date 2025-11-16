"""
Batch Instance Service
Business logic for batch instance and section management
"""

from typing import List, Optional, Dict, Any
from datetime import date, datetime

from src.domain.repositories.academic_structure_repository import (
    IBatchInstanceRepository,
    ISectionRepository,
    ISemesterRepository
)
from src.domain.repositories.student_enrollment_repository import IStudentEnrollmentRepository
from src.domain.entities.academic_structure import BatchInstance, Section, Semester
from src.domain.entities.student_enrollment import StudentEnrollment
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    BusinessRuleViolationError
)


class BatchInstanceService:
    """
    Batch Instance service
    
    Manages batch instances (Academic Year + Department + Program)
    """
    
    def __init__(
        self,
        batch_instance_repository: IBatchInstanceRepository,
        section_repository: ISectionRepository,
        semester_repository: ISemesterRepository
    ):
        self.batch_instance_repository = batch_instance_repository
        self.section_repository = section_repository
        self.semester_repository = semester_repository
    
    async def create_batch_instance(
        self,
        academic_year_id: int,
        department_id: int,
        batch_id: int,
        admission_year: int,
        sections: Optional[List[str]] = None  # List of section names: ['A', 'B', 'C']
    ) -> BatchInstance:
        """
        Create a new batch instance with optional sections
        
        Args:
            academic_year_id: Academic year ID
            department_id: Department ID
            batch_id: Program batch ID (B.Tech, MBA, etc.)
            admission_year: Year of admission
            sections: Optional list of section names to create
        
        Returns:
            Created BatchInstance
        """
        # Check if batch instance already exists
        existing = await self.batch_instance_repository.get_unique(
            academic_year_id=academic_year_id,
            department_id=department_id,
            batch_id=batch_id
        )
        if existing:
            raise EntityAlreadyExistsError(
                "BatchInstance",
                "academic_year_id + department_id + batch_id",
                f"Batch instance already exists for this combination"
            )
        
        # Create batch instance
        batch_instance = BatchInstance(
            id=None,
            academic_year_id=academic_year_id,
            department_id=department_id,
            batch_id=batch_id,
            admission_year=admission_year,
            current_semester=1,
            is_active=True
        )
        
        created_instance = await self.batch_instance_repository.create(batch_instance)
        
        # Create default sections if provided
        if sections:
            for section_name in sections:
                section = Section(
                    id=None,
                    batch_instance_id=created_instance.id,
                    section_name=section_name,
                    is_active=True
                )
                try:
                    await self.section_repository.create(section)
                except EntityAlreadyExistsError:
                    # Skip if section already exists (shouldn't happen, but handle gracefully)
                    pass
        
        # Create first semester for this batch
        first_semester = Semester(
            id=None,
            semester_no=1,
            batch_instance_id=created_instance.id,
            academic_year_id=academic_year_id,
            department_id=department_id,
            is_current=True,
            status='active'
        )
        await self.semester_repository.create(first_semester)
        
        return created_instance
    
    async def get_batch_instance(self, batch_instance_id: int) -> BatchInstance:
        """Get batch instance by ID"""
        batch_instance = await self.batch_instance_repository.get_by_id(batch_instance_id)
        if not batch_instance:
            raise EntityNotFoundError("BatchInstance", batch_instance_id)
        return batch_instance
    
    async def list_batch_instances(
        self,
        skip: int = 0,
        limit: int = 100,
        academic_year_id: Optional[int] = None,
        department_id: Optional[int] = None,
        batch_id: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> List[BatchInstance]:
        """List batch instances with filters"""
        filters: Dict[str, Any] = {}
        if academic_year_id:
            filters['academic_year_id'] = academic_year_id
        if department_id:
            filters['department_id'] = department_id
        if batch_id:
            filters['batch_id'] = batch_id
        if is_active is not None:
            filters['is_active'] = is_active
        
        return await self.batch_instance_repository.get_all(skip=skip, limit=limit, filters=filters)
    
    async def add_section(
        self,
        batch_instance_id: int,
        section_name: str,
        capacity: Optional[int] = None
    ) -> Section:
        """
        Add a section to a batch instance
        
        Args:
            batch_instance_id: Batch instance ID
            section_name: Section name (A, B, C, etc.)
            capacity: Optional capacity limit
        
        Returns:
            Created Section
        """
        # Verify batch instance exists
        await self.get_batch_instance(batch_instance_id)
        
        section = Section(
            id=None,
            batch_instance_id=batch_instance_id,
            section_name=section_name,
            capacity=capacity,
            is_active=True
        )
        
        return await self.section_repository.create(section)
    
    async def get_sections(self, batch_instance_id: int) -> List[Section]:
        """Get all sections for a batch instance"""
        return await self.section_repository.get_by_batch_instance(batch_instance_id)
    
    async def get_section(self, section_id: int) -> Section:
        """Get section by ID"""
        section = await self.section_repository.get_by_id(section_id)
        if not section:
            raise EntityNotFoundError("Section", section_id)
        return section
    
    async def update_section(
        self,
        section_id: int,
        section_name: Optional[str] = None,
        capacity: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> Section:
        """Update section"""
        section = await self.get_section(section_id)
        
        if section_name is not None:
            section._section_name = section_name.upper()
        if capacity is not None:
            section.set_capacity(capacity)
        if is_active is not None:
            if is_active:
                section.activate()
            else:
                section.deactivate()
        
        return await self.section_repository.update(section)
    
    async def create_semester_for_batch(
        self,
        batch_instance_id: int,
        semester_no: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Semester:
        """
        Create a semester for a batch instance
        
        Args:
            batch_instance_id: Batch instance ID
            semester_no: Semester number (1-8)
            start_date: Optional start date
            end_date: Optional end date
        
        Returns:
            Created Semester
        """
        # Verify batch instance exists
        batch_instance = await self.get_batch_instance(batch_instance_id)
        
        # Check if semester already exists
        existing = await self.semester_repository.get_by_batch_instance_and_number(
            batch_instance_id=batch_instance_id,
            semester_no=semester_no
        )
        if existing:
            raise EntityAlreadyExistsError(
                "Semester",
                "batch_instance_id + semester_no",
                f"Semester {semester_no} already exists for this batch"
            )
        
        semester = Semester(
            id=None,
            semester_no=semester_no,
            batch_instance_id=batch_instance_id,
            academic_year_id=batch_instance.academic_year_id,
            department_id=batch_instance.department_id,
            start_date=start_date,
            end_date=end_date,
            is_current=False,
            status='active'
        )
        
        return await self.semester_repository.create(semester)
    
    async def get_semesters_for_batch(self, batch_instance_id: int) -> List[Semester]:
        """Get all semesters for a batch instance"""
        return await self.semester_repository.get_by_batch_instance(batch_instance_id)
    
    async def activate_batch_instance(self, batch_instance_id: int) -> BatchInstance:
        """Activate batch instance"""
        batch_instance = await self.get_batch_instance(batch_instance_id)
        batch_instance.activate()
        return await self.batch_instance_repository.update(batch_instance)
    
    async def deactivate_batch_instance(self, batch_instance_id: int) -> BatchInstance:
        """Deactivate batch instance"""
        batch_instance = await self.get_batch_instance(batch_instance_id)
        batch_instance.deactivate()
        return await self.batch_instance_repository.update(batch_instance)

