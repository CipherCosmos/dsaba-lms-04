"""
Department Service
Business logic for department management operations
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from src.domain.repositories.department_repository import IDepartmentRepository
from src.domain.repositories.user_repository import IUserRepository
from src.domain.entities.department import Department
from src.domain.entities.user import User
from src.domain.enums.user_role import UserRole
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    BusinessRuleViolationError,
    ValidationError
)


class DepartmentService:
    """
    Department service
    
    Coordinates department management operations
    """
    
    def __init__(
        self,
        department_repository: IDepartmentRepository,
        user_repository: IUserRepository,
        db: Optional[Session] = None
    ):
        self.department_repository = department_repository
        self.user_repository = user_repository
        self.db = db
    
    async def create_department(
        self,
        name: str,
        code: str,
        hod_id: Optional[int] = None
    ) -> Department:
        """
        Create a new department
        
        Args:
            name: Department name
            code: Department code (unique)
            hod_id: Optional HOD user ID
        
        Returns:
            Created Department entity
        
        Raises:
            EntityAlreadyExistsError: If code exists
            EntityNotFoundError: If HOD not found
            BusinessRuleViolationError: If HOD doesn't have HOD role
        """
        # Validate HOD if provided
        if hod_id:
            hod = await self.user_repository.get_by_id(hod_id)
            if not hod:
                raise EntityNotFoundError("User", hod_id)
            
            # Verify HOD has HOD role
            if UserRole.HOD not in hod.roles:
                raise BusinessRuleViolationError(
                    rule="hod_assignment",
                    message="User must have HOD role to be assigned as HOD"
                )
        
        # Create department
        department = Department(
            name=name,
            code=code,
            hod_id=hod_id,
            is_active=True
        )
        
        return await self.department_repository.create(department)
    
    async def get_department(self, department_id: int) -> Department:
        """
        Get department by ID
        
        Args:
            department_id: Department ID
        
        Returns:
            Department entity
        
        Raises:
            EntityNotFoundError: If department not found
        """
        department = await self.department_repository.get_by_id(department_id)
        if not department:
            raise EntityNotFoundError("Department", department_id)
        return department
    
    async def get_department_by_code(self, code: str) -> Optional[Department]:
        """Get department by code"""
        return await self.department_repository.get_by_code(code)
    
    async def update_department(
        self,
        department_id: int,
        name: Optional[str] = None,
        code: Optional[str] = None
    ) -> Department:
        """
        Update department information
        
        Args:
            department_id: Department ID
            name: Optional new name
            code: Optional new code
        
        Returns:
            Updated Department entity
        
        Raises:
            EntityNotFoundError: If department not found
            EntityAlreadyExistsError: If new code exists
        """
        department = await self.get_department(department_id)
        department.update_info(name=name, code=code)
        return await self.department_repository.update(department)
    
    async def assign_hod(
        self,
        department_id: int,
        hod_id: int
    ) -> Department:
        """
        Assign HOD to department
        
        Args:
            department_id: Department ID
            hod_id: HOD user ID
        
        Returns:
            Updated Department entity
        
        Raises:
            EntityNotFoundError: If department or user not found
            BusinessRuleViolationError: If user doesn't have HOD role
        """
        department = await self.get_department(department_id)
        
        # Validate HOD
        hod = await self.user_repository.get_by_id(hod_id)
        if not hod:
            raise EntityNotFoundError("User", hod_id)
        
        # Verify HOD has HOD role
        if UserRole.HOD not in hod.roles:
            raise BusinessRuleViolationError(
                rule="hod_assignment",
                message="User must have HOD role to be assigned as HOD"
            )
        
        department.assign_hod(hod_id)
        return await self.department_repository.update(department)
    
    async def remove_hod(self, department_id: int) -> Department:
        """
        Remove HOD from department
        
        Args:
            department_id: Department ID
        
        Returns:
            Updated Department entity
        
        Raises:
            EntityNotFoundError: If department not found
            BusinessRuleViolationError: If no HOD assigned
        """
        department = await self.get_department(department_id)
        department.remove_hod()
        return await self.department_repository.update(department)
    
    async def activate_department(self, department_id: int) -> Department:
        """
        Activate department
        
        Args:
            department_id: Department ID
        
        Returns:
            Updated Department entity
        """
        department = await self.get_department(department_id)
        department.activate()
        return await self.department_repository.update(department)
    
    async def deactivate_department(self, department_id: int) -> Department:
        """
        Deactivate department
        
        Args:
            department_id: Department ID
        
        Returns:
            Updated Department entity
        """
        department = await self.get_department(department_id)
        department.deactivate()
        return await self.department_repository.update(department)
    
    async def list_departments(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Department]:
        """
        List departments with pagination and filtering
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records
            filters: Optional filters (is_active, has_hod, etc.)
        
        Returns:
            List of Department entities
        """
        return await self.department_repository.get_all(
            skip=skip,
            limit=limit,
            filters=filters
        )
    
    async def delete_department(self, department_id: int) -> bool:
        """
        Delete department
        
        Args:
            department_id: Department ID
        
        Returns:
            True if deleted, False if not found
        
        Note:
            This should check for dependencies (classes, subjects, users)
            before deletion. Consider soft delete instead.
        """
        # Check for dependencies before deletion
        from src.infrastructure.database.models import (
            SubjectModel, BatchInstanceModel, UserModel, StudentModel, TeacherModel
        )
        
        # Check if department has subjects
        subject_count = self.db.query(SubjectModel).filter(
            SubjectModel.department_id == department_id
        ).count()
        
        if subject_count > 0:
            raise ValidationError(
                f"Cannot delete department: {subject_count} subject(s) are assigned to this department",
                field="department_id"
            )
        
        # Check if department has batch instances (classes)
        batch_instance_count = self.db.query(BatchInstanceModel).filter(
            BatchInstanceModel.department_id == department_id
        ).count()
        
        if batch_instance_count > 0:
            raise ValidationError(
                f"Cannot delete department: {batch_instance_count} batch instance(s) belong to this department",
                field="department_id"
            )
        
        # Check if department has students
        student_count = self.db.query(StudentModel).filter(
            StudentModel.department_id == department_id
        ).count()
        
        if student_count > 0:
            raise ValidationError(
                f"Cannot delete department: {student_count} student(s) belong to this department",
                field="department_id"
            )
        
        # Check if department has teachers
        teacher_count = self.db.query(TeacherModel).filter(
            TeacherModel.department_id == department_id
        ).count()
        
        if teacher_count > 0:
            raise ValidationError(
                f"Cannot delete department: {teacher_count} teacher(s) belong to this department",
                field="department_id"
            )
        return await self.department_repository.delete(department_id)
    
    async def count_departments(
        self,
        filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """Count departments with optional filters"""
        return await self.department_repository.count(filters=filters)

