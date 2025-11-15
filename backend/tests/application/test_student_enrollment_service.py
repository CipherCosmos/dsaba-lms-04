"""
Student Enrollment Service Tests
Tests for StudentEnrollmentService
"""

import pytest
from datetime import date
from src.application.services.student_enrollment_service import StudentEnrollmentService
from src.infrastructure.database.repositories.student_enrollment_repository_impl import StudentEnrollmentRepository
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError, BusinessRuleViolationError


class TestStudentEnrollmentService:
    """Tests for StudentEnrollmentService"""
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_create_enrollment(self, test_db_session, student_user, semester, academic_year):
        """Test creating a student enrollment"""
        repo = StudentEnrollmentRepository(test_db_session)
        service = StudentEnrollmentService(repo)
        
        enrollment = await service.create_enrollment(
            student_id=student_user.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            roll_no="CS2024001",
            enrollment_date=date.today()
        )
        
        assert enrollment is not None
        assert enrollment.student_id == student_user.id
        assert enrollment.semester_id == semester.id
        assert enrollment.academic_year_id == academic_year.id
        assert enrollment.roll_no == "CS2024001"
        assert enrollment.is_active is True
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_create_duplicate_enrollment(self, test_db_session, student_user, semester, academic_year):
        """Test creating duplicate enrollment raises error"""
        repo = StudentEnrollmentRepository(test_db_session)
        service = StudentEnrollmentService(repo)
        
        # Create first enrollment
        await service.create_enrollment(
            student_id=student_user.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            roll_no="CS2024001"
        )
        
        # Try to create duplicate
        with pytest.raises(EntityAlreadyExistsError):
            await service.create_enrollment(
                student_id=student_user.id,
                semester_id=semester.id,
                academic_year_id=academic_year.id,
                roll_no="CS2024002"
            )
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_enrollment(self, test_db_session, student_user, semester, academic_year):
        """Test getting an enrollment by ID"""
        repo = StudentEnrollmentRepository(test_db_session)
        service = StudentEnrollmentService(repo)
        
        created = await service.create_enrollment(
            student_id=student_user.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            roll_no="CS2024001"
        )
        
        retrieved = await service.get_enrollment(created.id)
        
        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.roll_no == "CS2024001"
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_student_enrollments(self, test_db_session, student_user, semester, academic_year):
        """Test getting enrollments for a student"""
        repo = StudentEnrollmentRepository(test_db_session)
        service = StudentEnrollmentService(repo)
        
        # Create enrollment
        await service.create_enrollment(
            student_id=student_user.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            roll_no="CS2024001"
        )
        
        enrollments = await service.get_student_enrollments(
            student_id=student_user.id,
            academic_year_id=academic_year.id
        )
        
        assert len(enrollments) == 1
        assert enrollments[0].student_id == student_user.id
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_semester_enrollments(self, test_db_session, student_user, semester, academic_year):
        """Test getting enrollments for a semester"""
        repo = StudentEnrollmentRepository(test_db_session)
        service = StudentEnrollmentService(repo)
        
        # Create enrollment
        await service.create_enrollment(
            student_id=student_user.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            roll_no="CS2024001"
        )
        
        enrollments = await service.get_semester_enrollments(
            semester_id=semester.id,
            academic_year_id=academic_year.id
        )
        
        assert len(enrollments) == 1
        assert enrollments[0].semester_id == semester.id
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_bulk_enroll_students(self, test_db_session, student_user, semester, academic_year):
        """Test bulk enrolling students"""
        repo = StudentEnrollmentRepository(test_db_session)
        service = StudentEnrollmentService(repo)
        
        enrollments_data = [
            {
                "student_id": student_user.id,
                "roll_no": "CS2024001",
                "enrollment_date": date.today()
            }
        ]
        
        result = await service.bulk_enroll_students(
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            enrollments=enrollments_data
        )
        
        assert result["enrolled"] == 1
        assert len(result["enrollments"]) == 1
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_promote_student(self, test_db_session, student_user, semester, academic_year):
        """Test promoting a student to next semester"""
        repo = StudentEnrollmentRepository(test_db_session)
        service = StudentEnrollmentService(repo)
        
        # Create enrollment
        enrollment = await service.create_enrollment(
            student_id=student_user.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            roll_no="CS2024001"
        )
        
        # Create next semester (assuming semester_no + 1)
        from src.infrastructure.database.models import SemesterModel
        next_semester = SemesterModel(
            semester_no=semester.semester_no + 1,
            display_name=f"Semester {semester.semester_no + 1}",
            department_id=semester.department_id,
            academic_year_id=academic_year.id
        )
        test_db_session.add(next_semester)
        test_db_session.commit()
        test_db_session.refresh(next_semester)
        
        # Promote student
        promoted = await service.promote_student(
            enrollment_id=enrollment.id,
            next_semester_id=next_semester.id
        )
        
        assert promoted.promotion_status == "promoted"
        assert promoted.next_semester_id == next_semester.id

