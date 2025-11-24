"""
Student Enrollment Repository Implementation
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from src.domain.repositories.student_enrollment_repository import IStudentEnrollmentRepository
from src.domain.entities.student_enrollment import StudentEnrollment
from src.infrastructure.database.models import StudentEnrollmentModel


class StudentEnrollmentRepository(IStudentEnrollmentRepository):
    """Student Enrollment repository implementation"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create(self, enrollment: StudentEnrollment) -> StudentEnrollment:
        """Create a new enrollment"""
        model = StudentEnrollmentModel(
            student_id=enrollment.student_id,
            semester_id=enrollment.semester_id,
            academic_year_id=enrollment.academic_year_id,
            roll_no=enrollment.roll_no,
            enrollment_date=enrollment.enrollment_date,
            is_active=enrollment.is_active,
            promotion_status=enrollment.promotion_status,
            next_semester_id=enrollment.next_semester_id
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_entity(model)
    
    async def get_by_id(self, enrollment_id: int) -> Optional[StudentEnrollment]:
        """Get enrollment by ID"""
        model = self.db.query(StudentEnrollmentModel).filter(
            StudentEnrollmentModel.id == enrollment_id
        ).first()
        return self._to_entity(model) if model else None
    
    async def get_by_student_semester(
        self,
        student_id: int,
        semester_id: int,
        academic_year_id: int
    ) -> Optional[StudentEnrollment]:
        """Get enrollment by student, semester, and academic year"""
        model = self.db.query(StudentEnrollmentModel).filter(
            StudentEnrollmentModel.student_id == student_id,
            StudentEnrollmentModel.semester_id == semester_id,
            StudentEnrollmentModel.academic_year_id == academic_year_id
        ).first()
        return self._to_entity(model) if model else None
    
    async def get_by_student(
        self,
        student_id: int,
        academic_year_id: Optional[int] = None,
        skip: int = 0,
        limit: Optional[int] = None
    ) -> List[StudentEnrollment]:
        """Get all enrollments for a student"""
        query = self.db.query(StudentEnrollmentModel).filter(
            StudentEnrollmentModel.student_id == student_id
        )

        if academic_year_id:
            query = query.filter(StudentEnrollmentModel.academic_year_id == academic_year_id)

        query = query.order_by(StudentEnrollmentModel.enrollment_date.desc())

        if limit:
            query = query.offset(skip).limit(limit)

        models = query.all()
        return [self._to_entity(model) for model in models]

    async def get_by_semester(
        self,
        semester_id: int,
        academic_year_id: Optional[int] = None,
        skip: int = 0,
        limit: Optional[int] = None
    ) -> List[StudentEnrollment]:
        """Get all enrollments for a semester"""
        query = self.db.query(StudentEnrollmentModel).filter(
            StudentEnrollmentModel.semester_id == semester_id
        )

        if academic_year_id:
            query = query.filter(StudentEnrollmentModel.academic_year_id == academic_year_id)

        if limit:
            query = query.offset(skip).limit(limit)

        models = query.all()
        return [self._to_entity(model) for model in models]
    
    async def update(self, enrollment: StudentEnrollment) -> StudentEnrollment:
        """Update enrollment"""
        model = self.db.query(StudentEnrollmentModel).filter(
            StudentEnrollmentModel.id == enrollment.id
        ).first()
        
        if not model:
            raise ValueError(f"Enrollment {enrollment.id} not found")
        
        model.roll_no = enrollment.roll_no
        model.is_active = enrollment.is_active
        model.promotion_status = enrollment.promotion_status
        model.next_semester_id = enrollment.next_semester_id
        
        self.db.commit()
        self.db.refresh(model)
        return self._to_entity(model)
    
    async def delete(self, enrollment_id: int) -> bool:
        """Delete enrollment"""
        model = self.db.query(StudentEnrollmentModel).filter(
            StudentEnrollmentModel.id == enrollment_id
        ).first()
        
        if not model:
            return False
        
        self.db.delete(model)
        self.db.commit()
        return True
    
    def _to_entity(self, model: StudentEnrollmentModel) -> StudentEnrollment:
        """Convert model to entity"""
        return StudentEnrollment(
            id=model.id,
            student_id=model.student_id,
            semester_id=model.semester_id,
            academic_year_id=model.academic_year_id,
            roll_no=model.roll_no,
            enrollment_date=model.enrollment_date,
            is_active=model.is_active,
            promotion_status=model.promotion_status,
            next_semester_id=model.next_semester_id,
            created_at=model.created_at,
            updated_at=model.updated_at
        )

