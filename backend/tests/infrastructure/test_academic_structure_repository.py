"""
Academic Structure Repository Tests
Tests for Batch, BatchYear, and Semester repository implementations
"""
import pytest
from datetime import date, timedelta
from src.infrastructure.database.repositories.academic_structure_repository_impl import (
    BatchRepository, BatchYearRepository, SemesterRepository
)
from src.domain.entities.academic_structure import Batch, BatchYear, Semester
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError


@pytest.mark.integration
@pytest.mark.repository
class TestBatchRepository:
    """Tests for BatchRepository"""
    
    async def test_create_batch(self, test_db_session):
        """Test creating a batch"""
        repo = BatchRepository(test_db_session)
        
        batch = Batch(
            id=None,
            name="2025-2029",
            duration_years=4
        )
        
        created = await repo.create(batch)
        assert created.id is not None
        assert created.name == "2025-2029"
        assert created.duration_years == 4
    
    async def test_get_by_id(self, test_db_session, batch):
        """Test getting batch by ID"""
        repo = BatchRepository(test_db_session)
        
        found = await repo.get_by_id(batch.id)
        assert found is not None
        assert found.id == batch.id
        assert found.name == batch.name
    
    async def test_get_all(self, test_db_session, batch):
        """Test getting all batches"""
        repo = BatchRepository(test_db_session)
        
        batches = await repo.get_all()
        assert len(batches) > 0
        assert any(b.id == batch.id for b in batches)
    
    async def test_name_exists(self, test_db_session, batch):
        """Test checking if name exists"""
        repo = BatchRepository(test_db_session)
        
        assert await repo.name_exists(batch.name) is True
        assert await repo.name_exists("NONEXISTENT") is False


@pytest.mark.integration
@pytest.mark.repository
class TestBatchYearRepository:
    """Tests for BatchYearRepository"""
    
    async def test_create_batch_year(self, test_db_session, batch):
        """Test creating a batch year"""
        repo = BatchYearRepository(test_db_session)
        
        batch_year = BatchYear(
            id=None,
            batch_id=batch.id,
            start_year=2025,
            end_year=2026
        )
        
        created = await repo.create(batch_year)
        assert created.id is not None
        assert created.batch_id == batch.id
        assert created.start_year == 2025
    
    async def test_get_by_id(self, test_db_session, batch_year):
        """Test getting batch year by ID"""
        repo = BatchYearRepository(test_db_session)
        
        found = await repo.get_by_id(batch_year.id)
        assert found is not None
        assert found.id == batch_year.id
    
    async def test_get_by_batch(self, test_db_session, batch, batch_year):
        """Test getting batch years by batch"""
        repo = BatchYearRepository(test_db_session)
        
        batch_years = await repo.get_by_batch(batch.id)
        assert len(batch_years) > 0
        assert all(by.batch_id == batch.id for by in batch_years)


@pytest.mark.integration
@pytest.mark.repository
class TestSemesterRepository:
    """Tests for SemesterRepository"""
    
    async def test_create_semester(self, test_db_session, batch_year):
        """Test creating a semester"""
        repo = SemesterRepository(test_db_session)
        
        semester = Semester(
            id=None,
            batch_year_id=batch_year.id,
            semester_no=2,
            start_date=date.today() + timedelta(days=180),
            end_date=date.today() + timedelta(days=360)
        )
        
        created = await repo.create(semester)
        assert created.id is not None
        assert created.semester_no == 2
        assert created.batch_year_id == batch_year.id
    
    async def test_get_by_id(self, test_db_session, semester):
        """Test getting semester by ID"""
        repo = SemesterRepository(test_db_session)
        
        found = await repo.get_by_id(semester.id)
        assert found is not None
        assert found.id == semester.id
    
    async def test_get_by_batch_year(self, test_db_session, batch_year, semester):
        """Test getting semesters by batch year"""
        repo = SemesterRepository(test_db_session)
        
        semesters = await repo.get_by_batch_year(batch_year.id)
        assert len(semesters) > 0
        assert all(s.batch_year_id == batch_year.id for s in semesters)

