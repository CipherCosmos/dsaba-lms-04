"""
Academic Year Service Tests
Tests for AcademicYearService
"""

import pytest
from datetime import date
from src.application.services.academic_year_service import AcademicYearService
from src.infrastructure.database.repositories.academic_year_repository_impl import AcademicYearRepository
from src.domain.exceptions import EntityAlreadyExistsError, BusinessRuleViolationError, EntityNotFoundError
from src.infrastructure.database.models import AcademicYearStatus


class TestAcademicYearService:
    """Tests for AcademicYearService"""
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_create_academic_year(self, test_db_session):
        """Test creating an academic year"""
        repo = AcademicYearRepository(test_db_session)
        service = AcademicYearService(repo)
        
        academic_year = await service.create_academic_year(
            start_year=2024,
            end_year=2025,
            start_date=date(2024, 6, 1),
            end_date=date(2025, 5, 31)
        )
        
        assert academic_year is not None
        assert academic_year.start_year == 2024
        assert academic_year.end_year == 2025
        assert academic_year.display_name == "2024-2025"
        assert academic_year.status == AcademicYearStatus.PLANNED
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_create_academic_year_duplicate(self, test_db_session):
        """Test creating duplicate academic year raises error"""
        repo = AcademicYearRepository(test_db_session)
        service = AcademicYearService(repo)
        
        # Create first academic year
        await service.create_academic_year(start_year=2024, end_year=2025)
        
        # Try to create duplicate
        with pytest.raises(EntityAlreadyExistsError):
            await service.create_academic_year(start_year=2024, end_year=2025)
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_create_academic_year_invalid_range(self, test_db_session):
        """Test creating academic year with invalid year range"""
        repo = AcademicYearRepository(test_db_session)
        service = AcademicYearService(repo)
        
        with pytest.raises(BusinessRuleViolationError):
            await service.create_academic_year(start_year=2025, end_year=2024)
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_academic_year(self, test_db_session):
        """Test getting an academic year by ID"""
        repo = AcademicYearRepository(test_db_session)
        service = AcademicYearService(repo)
        
        created = await service.create_academic_year(start_year=2024, end_year=2025)
        retrieved = await service.get_academic_year(created.id)
        
        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.start_year == 2024
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_current_academic_year(self, test_db_session):
        """Test getting current academic year"""
        repo = AcademicYearRepository(test_db_session)
        service = AcademicYearService(repo)
        
        # Create and activate academic year
        ay = await service.create_academic_year(start_year=2024, end_year=2025)
        await service.activate_academic_year(ay.id)
        
        current = await service.get_current_academic_year()
        
        assert current is not None
        assert current.id == ay.id
        assert current.is_current is True
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_activate_academic_year(self, test_db_session):
        """Test activating an academic year"""
        repo = AcademicYearRepository(test_db_session)
        service = AcademicYearService(repo)
        
        # Create two academic years
        ay1 = await service.create_academic_year(start_year=2023, end_year=2024)
        ay2 = await service.create_academic_year(start_year=2024, end_year=2025)
        
        # Activate first one
        await service.activate_academic_year(ay1.id)
        activated1 = await service.get_academic_year(ay1.id)
        assert activated1.is_current is True
        assert activated1.status == AcademicYearStatus.ACTIVE
        
        # Activate second one (should deactivate first)
        await service.activate_academic_year(ay2.id)
        activated2 = await service.get_academic_year(ay2.id)
        deactivated1 = await service.get_academic_year(ay1.id)
        
        assert activated2.is_current is True
        assert deactivated1.is_current is False
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_archive_academic_year(self, test_db_session):
        """Test archiving an academic year"""
        repo = AcademicYearRepository(test_db_session)
        service = AcademicYearService(repo)
        
        ay = await service.create_academic_year(start_year=2023, end_year=2024)
        await service.archive_academic_year(ay.id)
        
        archived = await service.get_academic_year(ay.id)
        assert archived.status == AcademicYearStatus.ARCHIVED
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_list_academic_years(self, test_db_session):
        """Test listing academic years"""
        repo = AcademicYearRepository(test_db_session)
        service = AcademicYearService(repo)
        
        # Create multiple academic years
        await service.create_academic_year(start_year=2022, end_year=2023)
        await service.create_academic_year(start_year=2023, end_year=2024)
        await service.create_academic_year(start_year=2024, end_year=2025)
        
        years = await service.list_academic_years(skip=0, limit=10)
        
        assert len(years) == 3
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_update_academic_year(self, test_db_session):
        """Test updating academic year dates"""
        repo = AcademicYearRepository(test_db_session)
        service = AcademicYearService(repo)
        
        ay = await service.create_academic_year(start_year=2024, end_year=2025)
        
        updated = await service.update_academic_year(
            academic_year_id=ay.id,
            start_date=date(2024, 7, 1),
            end_date=date(2025, 6, 30)
        )
        
        assert updated.start_date == date(2024, 7, 1)
        assert updated.end_date == date(2025, 6, 30)

