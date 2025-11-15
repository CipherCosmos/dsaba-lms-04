"""
Program Outcome Repository Tests
Tests for ProgramOutcomeRepository implementation
"""
import pytest
from decimal import Decimal
from src.infrastructure.database.repositories.program_outcome_repository_impl import ProgramOutcomeRepository
from src.domain.entities.program_outcome import ProgramOutcome
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError


@pytest.mark.integration
@pytest.mark.repository
class TestProgramOutcomeRepository:
    """Tests for ProgramOutcomeRepository"""
    
    async def test_create_po(self, test_db_session, department):
        """Test creating a program outcome"""
        repo = ProgramOutcomeRepository(test_db_session)
        
        po = ProgramOutcome(
            id=None,
            department_id=department.id,
            code="PO1",
            type="PO",
            title="Engineering Knowledge Application",
            description="Apply knowledge of mathematics, science, and engineering fundamentals",
            target_attainment=Decimal("70.0")
        )
        
        created = await repo.create(po)
        assert created.id is not None
        assert created.code == "PO1"
        assert created.department_id == department.id
    
    async def test_get_by_id(self, test_db_session, program_outcome):
        """Test getting program outcome by ID"""
        repo = ProgramOutcomeRepository(test_db_session)
        
        found = await repo.get_by_id(program_outcome.id)
        assert found is not None
        assert found.id == program_outcome.id
        assert found.code == program_outcome.code
    
    async def test_get_by_department(self, test_db_session, department, program_outcome):
        """Test getting program outcomes by department"""
        repo = ProgramOutcomeRepository(test_db_session)
        
        pos = await repo.get_by_department(department.id)
        assert len(pos) > 0
        assert all(po.department_id == department.id for po in pos)
    
    async def test_get_by_code(self, test_db_session, department, program_outcome):
        """Test getting program outcome by code"""
        repo = ProgramOutcomeRepository(test_db_session)
        
        found = await repo.get_by_code(department.id, program_outcome.code)
        assert found is not None
        assert found.code == program_outcome.code
    
    async def test_code_exists(self, test_db_session, program_outcome):
        """Test checking if code exists"""
        repo = ProgramOutcomeRepository(test_db_session)
        
        assert await repo.code_exists(program_outcome.department_id, program_outcome.code) is True
        assert await repo.code_exists(program_outcome.department_id, "NONEXISTENT") is False
    
    async def test_update_po(self, test_db_session, program_outcome):
        """Test updating a program outcome"""
        repo = ProgramOutcomeRepository(test_db_session)
        
        program_outcome.title = "Updated Title"
        program_outcome.target_attainment = Decimal("75.0")
        
        updated = await repo.update(program_outcome)
        assert updated.title == "Updated Title"
        assert updated.target_attainment == Decimal("75.0")
    
    async def test_delete_po(self, test_db_session, program_outcome):
        """Test deleting a program outcome"""
        repo = ProgramOutcomeRepository(test_db_session)
        
        po_id = program_outcome.id
        await repo.delete(po_id)
        
        found = await repo.get_by_id(po_id)
        assert found is None

