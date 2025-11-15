"""
Department Repository Tests
Tests for DepartmentRepository implementation
"""
import pytest
from src.infrastructure.database.repositories.department_repository_impl import DepartmentRepository
from src.domain.entities.department import Department
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError


@pytest.mark.integration
@pytest.mark.repository
class TestDepartmentRepository:
    """Tests for DepartmentRepository"""
    
    async def test_create_department(self, test_db_session):
        """Test creating a department"""
        repo = DepartmentRepository(test_db_session)
        
        dept = Department(
            id=None,
            name="Mechanical Engineering",
            code="ME"
        )
        
        created = await repo.create(dept)
        assert created.id is not None
        assert created.name == "Mechanical Engineering"
        assert created.code == "ME"
    
    async def test_get_by_id(self, test_db_session, department):
        """Test getting department by ID"""
        repo = DepartmentRepository(test_db_session)
        
        found = await repo.get_by_id(department.id)
        assert found is not None
        assert found.id == department.id
        assert found.name == department.name
    
    async def test_get_by_id_not_found(self, test_db_session):
        """Test getting non-existent department"""
        repo = DepartmentRepository(test_db_session)
        
        found = await repo.get_by_id(99999)
        assert found is None
    
    async def test_get_by_code(self, test_db_session, department):
        """Test getting department by code"""
        repo = DepartmentRepository(test_db_session)
        
        found = await repo.get_by_code(department.code)
        assert found is not None
        assert found.code == department.code
    
    async def test_get_all(self, test_db_session, department):
        """Test getting all departments"""
        repo = DepartmentRepository(test_db_session)
        
        departments = await repo.get_all()
        assert len(departments) > 0
        assert any(d.id == department.id for d in departments)
    
    async def test_code_exists(self, test_db_session, department):
        """Test checking if code exists"""
        repo = DepartmentRepository(test_db_session)
        
        assert await repo.code_exists(department.code) is True
        assert await repo.code_exists("NONEXISTENT") is False
    
    async def test_update_department(self, test_db_session, department):
        """Test updating a department"""
        repo = DepartmentRepository(test_db_session)
        
        # Get the entity first
        dept_entity = await repo.get_by_id(department.id)
        # Use update_info method
        dept_entity.update_info(name="Updated Department Name")
        
        updated = await repo.update(dept_entity)
        assert updated.name == "Updated Department Name"
    
    async def test_delete_department(self, test_db_session, department):
        """Test deleting a department"""
        repo = DepartmentRepository(test_db_session)
        
        dept_id = department.id
        await repo.delete(dept_id)
        
        found = await repo.get_by_id(dept_id)
        assert found is None

