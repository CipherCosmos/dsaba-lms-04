import pytest
from httpx import AsyncClient
from sqlalchemy.orm import Session
from datetime import date

from src.infrastructure.database.models import (
    StudentModel, AcademicYearModel, BatchInstanceModel, 
    UserModel, DepartmentModel, StudentYearProgressionModel
)
from tests.utils.auth_helpers import get_auth_headers

class TestStudentProgressionEndpoints:
    
    @pytest.fixture
    def auth_headers(self, teacher_token):
        """Headers for teacher user"""
        return get_auth_headers(teacher_token)

    @pytest.fixture
    def admin_auth_headers(self, admin_token):
        """Headers for admin user"""
        return get_auth_headers(admin_token)

    @pytest.fixture
    def test_student(self, test_db_session: Session, student_user):
        """Get student profile"""
        return test_db_session.query(StudentModel).filter(StudentModel.user_id == student_user.id).first()

    @pytest.fixture
    def progression_data(self, test_db_session: Session, test_student):
        """Create test data for progression tests"""
        # Create or get academic years
        current_year = test_db_session.query(AcademicYearModel).filter_by(start_year=2024, end_year=2025).first()
        if not current_year:
            current_year = AcademicYearModel(
                display_name="2024-2025",
                start_year=2024,
                end_year=2025,
                start_date=date(2024, 6, 1),
                end_date=date(2025, 5, 31),
                is_current=True,
                status="active"
            )
            test_db_session.add(current_year)

        next_year = test_db_session.query(AcademicYearModel).filter_by(start_year=2025, end_year=2026).first()
        if not next_year:
            next_year = AcademicYearModel(
                display_name="2025-2026",
                start_year=2025,
                end_year=2026,
                start_date=date(2025, 6, 1),
                end_date=date(2026, 5, 31),
                is_current=False,
                status="planned"
            )
            test_db_session.add(next_year)
            
        test_db_session.commit()
        
        # Update student to be in current year
        student = test_db_session.query(StudentModel).filter(StudentModel.id == test_student.id).first()
        student.academic_year_id = current_year.id
        student.current_year_level = 1
        test_db_session.commit()
        
        return {
            "current_year": current_year,
            "next_year": next_year,
            "student": student
        }

    @pytest.mark.asyncio
    async def test_check_promotion_eligibility(
        self, 
        async_client: AsyncClient, 
        auth_headers, 
        progression_data
    ):
        """Test checking promotion eligibility"""
        student_id = progression_data["student"].id
        
        # Test with good performance
        response = await async_client.get(
            f"/api/v1/student-progression/students/{student_id}/eligibility",
            params={"cgpa": 8.5, "attendance": 85.0},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["eligible"] is True
        
        # Test with poor performance (if logic exists, otherwise just checks structure)
        response = await async_client.get(
            f"/api/v1/student-progression/students/{student_id}/eligibility",
            params={"cgpa": 2.0, "attendance": 40.0},
            headers=auth_headers
        )
        assert response.status_code == 200
        
    @pytest.mark.asyncio
    async def test_promote_student(
        self, 
        async_client: AsyncClient, 
        admin_auth_headers, 
        progression_data
    ):
        """Test promoting a student"""
        student_id = progression_data["student"].id
        next_year_id = progression_data["next_year"].id
        
        payload = {
            "academic_year_id": next_year_id,
            "performance_data": {
                "cgpa": 8.5,
                "attendance": 90.0
            },
            "notes": "Promoted via test"
        }
        
        response = await async_client.post(
            f"/api/v1/student-progression/students/{student_id}/promote",
            json=payload,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["student_id"] == student_id
        assert data["to_year_level"] == 2
        assert data["promotion_type"] == "regular"

    @pytest.mark.asyncio
    async def test_promote_student_permission(
        self, 
        async_client: AsyncClient, 
        auth_headers, # Regular user/teacher
        progression_data
    ):
        """Test that regular users cannot promote students"""
        student_id = progression_data["student"].id
        next_year_id = progression_data["next_year"].id
        
        payload = {
            "academic_year_id": next_year_id
        }
        
        response = await async_client.post(
            f"/api/v1/student-progression/students/{student_id}/promote",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_detain_student(
        self, 
        async_client: AsyncClient, 
        admin_auth_headers, 
        progression_data
    ):
        """Test detaining a student"""
        student_id = progression_data["student"].id
        
        payload = {
            "reason": "Low attendance",
            "notes": "Detained via test"
        }
        
        response = await async_client.post(
            f"/api/v1/student-progression/students/{student_id}/detain",
            json=payload,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify student is detained
        response = await async_client.get(
            f"/api/v1/students/{student_id}",
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        assert response.json()["is_detained"] is True

    @pytest.mark.asyncio
    async def test_clear_detention(
        self, 
        async_client: AsyncClient, 
        admin_auth_headers, 
        progression_data,
        test_db_session
    ):
        """Test clearing detention"""
        student = progression_data["student"]
        student.is_detained = True
        test_db_session.commit()
        
        response = await async_client.post(
            f"/api/v1/student-progression/students/{student.id}/clear-detention",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify student is not detained
        response = await async_client.get(
            f"/api/v1/students/{student.id}",
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        assert response.json()["is_detained"] is False

    @pytest.mark.asyncio
    async def test_get_progression_history(
        self, 
        async_client: AsyncClient, 
        auth_headers, 
        progression_data,
        test_db_session
    ):
        """Test getting progression history"""
        student = progression_data["student"]
        
        # Create a history record
        history = StudentYearProgressionModel(
            student_id=student.id,
            from_year_level=1,
            to_year_level=2,
            academic_year_id=progression_data["current_year"].id,
            promotion_date=date.today(),
            promotion_type="regular"
        )
        test_db_session.add(history)
        test_db_session.commit()
        
        response = await async_client.get(
            f"/api/v1/student-progression/students/{student.id}/history",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["student_id"] == student.id

    @pytest.mark.asyncio
    async def test_get_year_statistics(
        self, 
        async_client: AsyncClient, 
        admin_auth_headers, 
        progression_data
    ):
        """Test getting year statistics"""
        response = await async_client.get(
            "/api/v1/student-progression/year/1/statistics",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["year_level"] == 1
        assert "total_students" in data
