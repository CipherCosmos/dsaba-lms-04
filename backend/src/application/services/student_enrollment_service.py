"""
Student Enrollment Service
Business logic for student enrollment management
"""

from typing import List, Optional
from datetime import date
from src.domain.entities.student_enrollment import StudentEnrollment
from src.domain.repositories.student_enrollment_repository import IStudentEnrollmentRepository
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError


class StudentEnrollmentService:
    """Student Enrollment service"""
    
    def __init__(self, repository: IStudentEnrollmentRepository):
        self.repository = repository
        # Access db session through repository for bulk operations
    
    async def enroll_student(
        self,
        student_id: int,
        semester_id: int,
        academic_year_id: int,
        roll_no: str,
        enrollment_date: date
    ) -> StudentEnrollment:
        """
        Enroll a student in a semester for an academic year
        
        Args:
            student_id: Student ID
            semester_id: Semester ID
            academic_year_id: Academic Year ID
            roll_no: Roll number for this semester
            enrollment_date: Enrollment date
        
        Returns:
            Created StudentEnrollment
        
        Raises:
            EntityAlreadyExistsError: If enrollment already exists
        """
        # Check if enrollment already exists
        existing = await self.repository.get_by_student_semester(
            student_id=student_id,
            semester_id=semester_id,
            academic_year_id=academic_year_id
        )
        if existing:
            raise EntityAlreadyExistsError(
                "StudentEnrollment",
                f"student_id={student_id}, semester_id={semester_id}, academic_year_id={academic_year_id}"
            )
        
        enrollment = StudentEnrollment(
            id=None,
            student_id=student_id,
            semester_id=semester_id,
            academic_year_id=academic_year_id,
            roll_no=roll_no,
            enrollment_date=enrollment_date,
            is_active=True,
            promotion_status='pending'
        )
        
        return await self.repository.create(enrollment)
    
    async def get_enrollment(self, enrollment_id: int) -> StudentEnrollment:
        """Get enrollment by ID"""
        enrollment = await self.repository.get_by_id(enrollment_id)
        if not enrollment:
            raise EntityNotFoundError("StudentEnrollment", enrollment_id)
        return enrollment
    
    async def get_student_enrollments(
        self,
        student_id: int,
        academic_year_id: Optional[int] = None
    ) -> List[StudentEnrollment]:
        """Get all enrollments for a student"""
        return await self.repository.get_by_student(student_id, academic_year_id)
    
    async def get_semester_enrollments(
        self,
        semester_id: int,
        academic_year_id: Optional[int] = None
    ) -> List[StudentEnrollment]:
        """Get all enrollments for a semester"""
        return await self.repository.get_by_semester(semester_id, academic_year_id)
    
    async def promote_student(
        self,
        enrollment_id: int,
        next_semester_id: int
    ) -> StudentEnrollment:
        """Promote student to next semester"""
        enrollment = await self.get_enrollment(enrollment_id)
        enrollment.promote(next_semester_id)
        return await self.repository.update(enrollment)
    
    async def bulk_enroll_students(
        self,
        semester_id: int,
        academic_year_id: int,
        enrollments: List[dict]  # List of {student_id, roll_no, enrollment_date}
    ) -> List[StudentEnrollment]:
        """Bulk enroll students in a semester with optimized batch processing"""
        from src.infrastructure.database.models import StudentEnrollmentModel
        
        if not enrollments:
            return []
        
        results = []
        errors = []
        enrollment_models = []
        enrollment_date = date.today()
        
        # Get all student IDs to check for duplicates in batch
        student_ids = [e['student_id'] for e in enrollments]
        
        # Batch check for existing enrollments using repository's db session
        db = self.repository.db
        existing_enrollments = db.query(StudentEnrollmentModel).filter(
            StudentEnrollmentModel.semester_id == semester_id,
            StudentEnrollmentModel.academic_year_id == academic_year_id,
            StudentEnrollmentModel.student_id.in_(student_ids)
        ).all()
        existing_student_ids = {e.student_id for e in existing_enrollments}
        
        # Validate and prepare all enrollments first
        for enrollment_data in enrollments:
            try:
                # Check if already exists
                if enrollment_data['student_id'] in existing_student_ids:
                    errors.append(f"Student {enrollment_data['student_id']} already enrolled")
                    continue
                
                # Create enrollment model for batch insert
                model = StudentEnrollmentModel(
                    student_id=enrollment_data['student_id'],
                    semester_id=semester_id,
                    academic_year_id=academic_year_id,
                    roll_no=enrollment_data['roll_no'],
                    enrollment_date=enrollment_data.get('enrollment_date', enrollment_date),
                    is_active=True,
                    promotion_status='pending'
                )
                enrollment_models.append(model)
            except Exception as e:
                errors.append(f"Error preparing enrollment for student {enrollment_data['student_id']}: {str(e)}")
        
        # Batch insert all enrollments in a single transaction using repository's db session
        if enrollment_models:
            try:
                db.add_all(enrollment_models)
                db.commit()
                
                # Refresh all models to get IDs
                for model in enrollment_models:
                    db.refresh(model)
                
                # Convert back to entities
                results = [self.repository._to_entity(model) for model in enrollment_models]
            except Exception as e:
                db.rollback()
                errors.append(f"Batch insert error: {str(e)}")
                # If batch fails, try individual inserts as fallback
                for enrollment_data in enrollments:
                    if enrollment_data['student_id'] not in existing_student_ids:
                        try:
                            enrollment = await self.enroll_student(
                                student_id=enrollment_data['student_id'],
                                semester_id=semester_id,
                                academic_year_id=academic_year_id,
                                roll_no=enrollment_data['roll_no'],
                                enrollment_date=enrollment_data.get('enrollment_date', enrollment_date)
                            )
                            results.append(enrollment)
                        except Exception as e2:
                            errors.append(f"Fallback enrollment failed for student {enrollment_data['student_id']}: {str(e2)}")
        
        if errors:
            # Log errors but return successful enrollments
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Bulk enrollment completed with {len(errors)} errors: {errors}")
        
        return results

