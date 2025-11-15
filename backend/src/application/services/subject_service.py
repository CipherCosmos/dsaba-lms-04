"""
Subject Service
Business logic for subject management operations
"""

from typing import List, Optional, Dict, Any

from src.domain.repositories.subject_repository import ISubjectRepository
from src.domain.entities.subject import Subject
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    ValidationError
)


class SubjectService:
    """
    Subject service
    
    Coordinates subject management operations
    """
    
    def __init__(self, subject_repository: ISubjectRepository):
        self.subject_repository = subject_repository
    
    async def create_subject(
        self,
        code: str,
        name: str,
        department_id: int,
        credits: float,
        max_internal: float = 40.0,
        max_external: float = 60.0,
        semester_id: Optional[int] = None,
        academic_year_id: Optional[int] = None
    ) -> Subject:
        """
        Create a new subject
        
        Args:
            code: Subject code (unique)
            name: Subject name
            department_id: Department ID
            credits: Number of credits
            max_internal: Maximum internal marks (default 40)
            max_external: Maximum external marks (default 60)
        
        Returns:
            Created Subject entity
        
        Raises:
            EntityAlreadyExistsError: If code exists
            ValidationError: If validation fails
        """
        subject = Subject(
            code=code,
            name=name,
            department_id=department_id,
            credits=credits,
            max_internal=max_internal,
            max_external=max_external,
            is_active=True
        )
        
        return await self.subject_repository.create(subject)
    
    async def get_subject(self, subject_id: int) -> Subject:
        """
        Get subject by ID
        
        Args:
            subject_id: Subject ID
        
        Returns:
            Subject entity
        
        Raises:
            EntityNotFoundError: If subject not found
        """
        subject = await self.subject_repository.get_by_id(subject_id)
        if not subject:
            raise EntityNotFoundError("Subject", subject_id)
        return subject
    
    async def get_subject_by_code(self, code: str) -> Optional[Subject]:
        """Get subject by code"""
        return await self.subject_repository.get_by_code(code)
    
    async def update_subject(
        self,
        subject_id: int,
        name: Optional[str] = None,
        credits: Optional[float] = None
    ) -> Subject:
        """
        Update subject information
        
        Args:
            subject_id: Subject ID
            name: Optional new name
            credits: Optional new credits
        
        Returns:
            Updated Subject entity
        """
        subject = await self.get_subject(subject_id)
        subject.update_info(name=name, credits=credits)
        return await self.subject_repository.update(subject)
    
    async def update_marks_distribution(
        self,
        subject_id: int,
        max_internal: float,
        max_external: float
    ) -> Subject:
        """
        Update marks distribution
        
        Args:
            subject_id: Subject ID
            max_internal: New maximum internal marks
            max_external: New maximum external marks
        
        Returns:
            Updated Subject entity
        
        Raises:
            ValidationError: If internal + external != 100
        """
        subject = await self.get_subject(subject_id)
        subject.update_marks_distribution(max_internal, max_external)
        return await self.subject_repository.update(subject)
    
    async def activate_subject(self, subject_id: int) -> Subject:
        """Activate subject"""
        subject = await self.get_subject(subject_id)
        subject.activate()
        return await self.subject_repository.update(subject)
    
    async def deactivate_subject(self, subject_id: int) -> Subject:
        """Deactivate subject"""
        subject = await self.get_subject(subject_id)
        subject.deactivate()
        return await self.subject_repository.update(subject)
    
    async def list_subjects(
        self,
        skip: int = 0,
        limit: int = 100,
        department_id: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> List[Subject]:
        """
        List subjects with pagination and filtering
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records
            department_id: Optional department filter
            is_active: Optional active status filter
        
        Returns:
            List of Subject entities
        """
        filters = {}
        if department_id:
            filters['department_id'] = department_id
        if is_active is not None:
            filters['is_active'] = is_active
        
        return await self.subject_repository.get_all(
            skip=skip,
            limit=limit,
            filters=filters
        )
    
    async def get_subjects_by_department(
        self,
        department_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Subject]:
        """Get all subjects in a department"""
        return await self.subject_repository.get_by_department(
            department_id=department_id,
            skip=skip,
            limit=limit
        )
    
    async def delete_subject(self, subject_id: int) -> bool:
        """
        Delete subject
        
        Args:
            subject_id: Subject ID
        
        Returns:
            True if deleted, False if not found
        
        Note:
            Should check for dependencies (exams, assignments) before deletion
        """
        return await self.subject_repository.delete(subject_id)
    
    async def count_subjects(
        self,
        department_id: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> int:
        """Count subjects with optional filters"""
        filters = {}
        if department_id:
            filters['department_id'] = department_id
        if is_active is not None:
            filters['is_active'] = is_active
        return await self.subject_repository.count(filters=filters)

