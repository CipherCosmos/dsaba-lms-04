"""
Repository Tests
Tests for database repository implementations
"""

import pytest
from src.infrastructure.database.repositories.user_repository_impl import UserRepository
from src.infrastructure.database.repositories.department_repository_impl import DepartmentRepository
from src.domain.entities.user import User
from src.domain.value_objects.email import Email
from src.domain.enums.user_role import UserRole


class TestUserRepository:
    """Tests for UserRepository"""
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_create_user(self, test_db_session, password_hasher):
        """Test creating a user"""
        repo = UserRepository(test_db_session)
        
        email = Email("newuser@test.com")
        user = User(
            username="newuser",
            email=email,
            first_name="New",
            last_name="User",
            hashed_password=password_hasher.hash("password123")
        )
        user.add_role(UserRole.STUDENT)
        
        created = await repo.create(user)
        assert created.id is not None
        assert created.username == "newuser"
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_by_id(self, test_db_session, admin_user):
        """Test getting user by ID"""
        repo = UserRepository(test_db_session)
        
        user = await repo.get_by_id(admin_user.id)
        assert user is not None
        assert user.id == admin_user.id
        assert user.username == admin_user.username
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_by_username(self, test_db_session, admin_user):
        """Test getting user by username"""
        repo = UserRepository(test_db_session)
        
        user = await repo.get_by_username("admin")
        assert user is not None
        assert user.username == "admin"
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_by_email(self, test_db_session, admin_user):
        """Test getting user by email"""
        repo = UserRepository(test_db_session)
        
        user = await repo.get_by_email(Email("admin@test.com"))
        assert user is not None
        assert user.email.email == "admin@test.com"
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_update_user(self, test_db_session, admin_user):
        """Test updating a user"""
        repo = UserRepository(test_db_session)
        
        user = await repo.get_by_id(admin_user.id)
        user._first_name = "Updated"
        
        updated = await repo.update(user)
        assert updated.first_name == "Updated"
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_delete_user(self, test_db_session, password_hasher):
        """Test deleting a user"""
        repo = UserRepository(test_db_session)
        
        email = Email("todelete@test.com")
        user = User(
            username="todelete",
            email=email,
            first_name="To",
            last_name="Delete",
            hashed_password=password_hasher.hash("password123")
        )
        user.add_role(UserRole.STUDENT)
        
        created = await repo.create(user)
        await repo.delete(created.id)
        
        deleted = await repo.get_by_id(created.id)
        assert deleted is None


class TestDepartmentRepository:
    """Tests for DepartmentRepository"""
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_create_department(self, test_db_session):
        """Test creating a department"""
        repo = DepartmentRepository(test_db_session)
        
        from src.domain.entities.department import Department
        
        dept = Department(
            name="Test Department",
            code="TEST"
        )
        
        created = await repo.create(dept)
        assert created.id is not None
        assert created.name == "Test Department"
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_by_id(self, test_db_session, department):
        """Test getting department by ID"""
        repo = DepartmentRepository(test_db_session)
        
        dept = await repo.get_by_id(department.id)
        assert dept is not None
        assert dept.id == department.id
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_by_code(self, test_db_session, department):
        """Test getting department by code"""
        repo = DepartmentRepository(test_db_session)
        
        dept = await repo.get_by_code("CSE")
        assert dept is not None
        assert dept.code == "CSE"

