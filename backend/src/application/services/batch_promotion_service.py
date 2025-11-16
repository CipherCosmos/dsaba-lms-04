"""
Batch Promotion Service
Business logic for promoting all students in a batch to the next semester
"""

from typing import List, Dict, Any, Optional
from datetime import date, datetime

from src.domain.repositories.academic_structure_repository import (
    IBatchInstanceRepository,
    ISemesterRepository
)
from src.domain.repositories.student_enrollment_repository import IStudentEnrollmentRepository
from src.infrastructure.database.models import (
    StudentModel,
    StudentEnrollmentModel,
    PromotionHistoryModel
)
from src.domain.entities.academic_structure import BatchInstance, Semester
from src.domain.entities.student_enrollment import StudentEnrollment
from src.domain.exceptions import (
    EntityNotFoundError,
    BusinessRuleViolationError
)


class BatchPromotionService:
    """
    Batch Promotion service
    
    Handles promotion of all students in a batch to the next semester.
    Only Principal, HOD, and Admin can perform batch promotions.
    """
    
    def __init__(
        self,
        batch_instance_repository: IBatchInstanceRepository,
        semester_repository: ISemesterRepository,
        enrollment_repository: IStudentEnrollmentRepository,
        db  # SQLAlchemy session
    ):
        self.batch_instance_repository = batch_instance_repository
        self.semester_repository = semester_repository
        self.enrollment_repository = enrollment_repository
        self.db = db
    
    async def promote_batch(
        self,
        batch_instance_id: int,
        promoted_by: int,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Promote all students in a batch to the next semester
        
        This method:
        1. Validates batch can be promoted
        2. Gets current semester for batch
        3. Creates next semester if it doesn't exist
        4. Promotes all students in the batch
        5. Updates batch's current_semester
        6. Creates promotion history records
        
        Args:
            batch_instance_id: Batch instance ID
            promoted_by: User ID who is promoting
            notes: Optional notes about the promotion
        
        Returns:
            Dictionary with promotion results:
                - promoted_count: Number of students promoted
                - errors: List of errors (if any)
                - new_semester_id: ID of the new semester
        """
        # Get batch instance
        batch_instance = await self.batch_instance_repository.get_by_id(batch_instance_id)
        if not batch_instance:
            raise EntityNotFoundError("BatchInstance", batch_instance_id)
        
        if not batch_instance.is_active:
            raise BusinessRuleViolationError(
                "batch_promotion",
                "Cannot promote inactive batch"
            )
        
        current_semester_no = batch_instance.current_semester
        
        # Validate batch can be promoted
        if current_semester_no >= 12:
            raise BusinessRuleViolationError(
                "batch_promotion",
                "Batch is already at maximum semester (12)"
            )
        
        next_semester_no = current_semester_no + 1
        
        # Get or create next semester
        next_semester = await self.semester_repository.get_by_batch_instance_and_number(
            batch_instance_id=batch_instance_id,
            semester_no=next_semester_no
        )
        
        if not next_semester:
            # Create next semester
            next_semester = Semester(
                id=None,
                semester_no=next_semester_no,
                batch_instance_id=batch_instance_id,
                academic_year_id=batch_instance.academic_year_id,
                department_id=batch_instance.department_id,
                is_current=True,
                status='active'
            )
            next_semester = await self.semester_repository.create(next_semester)
        
        # Get all students in this batch
        students = self.db.query(StudentModel).filter(
            StudentModel.batch_instance_id == batch_instance_id,
            StudentModel.current_semester_id.isnot(None)
        ).all()
        
        # Get current semester
        current_semester = await self.semester_repository.get_by_batch_instance_and_number(
            batch_instance_id=batch_instance_id,
            semester_no=current_semester_no
        )
        
        if not current_semester:
            raise EntityNotFoundError(
                "Semester",
                f"Semester {current_semester_no} for batch {batch_instance_id}"
            )
        
        promoted_count = 0
        errors = []
        
        # Promote each student
        for student in students:
            try:
                # Get current enrollment
                current_enrollment = await self.enrollment_repository.get_by_student_semester(
                    student_id=student.id,
                    semester_id=current_semester.id,
                    academic_year_id=batch_instance.academic_year_id
                )
                
                if not current_enrollment:
                    errors.append(f"Student {student.id}: No enrollment found for current semester")
                    continue
                
                if current_enrollment.promotion_status != 'pending':
                    errors.append(f"Student {student.id}: Enrollment status is {current_enrollment.promotion_status}, cannot promote")
                    continue
                
                # Check if student already enrolled in next semester
                existing_next = await self.enrollment_repository.get_by_student_semester(
                    student_id=student.id,
                    semester_id=next_semester.id,
                    academic_year_id=batch_instance.academic_year_id
                )
                
                if existing_next:
                    errors.append(f"Student {student.id}: Already enrolled in next semester")
                    continue
                
                # Mark current enrollment as promoted
                current_enrollment.promote(next_semester.id)
                await self.enrollment_repository.update(current_enrollment)
                
                # Create new enrollment in next semester
                new_enrollment = StudentEnrollment(
                    id=None,
                    student_id=student.id,
                    semester_id=next_semester.id,
                    academic_year_id=batch_instance.academic_year_id,
                    roll_no=current_enrollment.roll_no,
                    enrollment_date=date.today(),
                    is_active=True,
                    promotion_status='pending'
                )
                await self.enrollment_repository.create(new_enrollment)
                
                # Update student's current semester and denormalized fields
                student.current_semester_id = next_semester.id
                student.academic_year_id = batch_instance.academic_year_id
                student.department_id = batch_instance.department_id
                # Note: Don't commit here - commit all at once at the end
                
                # Create promotion history record
                promotion_history = PromotionHistoryModel(
                    student_id=student.id,
                    from_semester_id=current_semester.id,
                    to_semester_id=next_semester.id,
                    from_academic_year_id=batch_instance.academic_year_id,
                    to_academic_year_id=batch_instance.academic_year_id,
                    promotion_date=date.today(),
                    promotion_type='regular',
                    promoted_by=promoted_by,
                    notes=notes
                )
                self.db.add(promotion_history)
                
                promoted_count += 1
                
            except Exception as e:
                errors.append(f"Student {student.id}: {str(e)}")
                self.db.rollback()  # Rollback failed transaction
                continue
        
        # Commit all changes at once (students, enrollments, promotion history)
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            errors.append(f"Failed to commit promotion changes: {str(e)}")
            raise
        
        # Update batch instance's current semester
        batch_instance.promote_to_next_semester()
        await self.batch_instance_repository.update(batch_instance)
        
        # Mark current semester as not current, next semester as current
        current_semester.unmark_as_current()
        await self.semester_repository.update(current_semester)
        
        next_semester.mark_as_current()
        await self.semester_repository.update(next_semester)
        
        return {
            "promoted_count": promoted_count,
            "total_students": len(students),
            "errors": errors,
            "new_semester_id": next_semester.id,
            "batch_current_semester": batch_instance.current_semester
        }

