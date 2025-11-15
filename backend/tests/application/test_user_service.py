"""
User Service Tests
Tests for UserService
"""

import pytest
from src.application.services.user_service import UserService
from src.infrastructure.database.repositories.user_repository_impl import UserRepository
from src.domain.enums.user_role import UserRole
from src.domain.value_objects.email import Email
from src.domain.value_objects.password import Password


class TestUserService:
    """Tests for UserService"""
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_create_user(self, test_db_session, department):
        """Test creating a user"""
        user_repo = UserRepository(test_db_session)
        service = UserService(user_repo)
        
        user = await service.create_user(
            username="testuser",
            email="testuser@test.com",  # String, not Email object
            first_name="Test",
            last_name="User",
            password="TestPassword123!@#",  # String, not Password object
            roles=[UserRole.STUDENT],
            department_ids=[department.id] if department else []
        )
        
        assert user is not None
        assert user.username == "testuser"
        assert user.email.email == "testuser@test.com"
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_user(self, test_db_session, admin_user):
        """Test getting a user"""
        user_repo = UserRepository(test_db_session)
        service = UserService(user_repo)
        
        user = await service.get_user(admin_user.id)
        
        assert user is not None
        assert user.id == admin_user.id
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_list_users(self, test_db_session, admin_user):
        """Test listing users"""
        user_repo = UserRepository(test_db_session)
        service = UserService(user_repo)
        
        users = await service.list_users(skip=0, limit=10)
        
        assert isinstance(users, list)
        assert len(users) > 0
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_update_user(self, test_db_session, admin_user):
        """Test updating a user"""
        user_repo = UserRepository(test_db_session)
        service = UserService(user_repo)
        
        updated = await service.update_user(
            user_id=admin_user.id,
            first_name="Updated"
        )
        
        assert updated.first_name == "Updated"
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_delete_user(self, test_db_session):
        """Test deleting a user"""
        from src.infrastructure.database.models import UserModel
        from src.infrastructure.security.password_hasher import PasswordHasher
        
        user_repo = UserRepository(test_db_session)
        service = UserService(user_repo)
        
        # Create a test user
        password_hasher = PasswordHasher()
        test_user = UserModel(
            username="deleteme",
            email="deleteme@test.com",
            first_name="Delete",
            last_name="Me",
            hashed_password=password_hasher.hash("TestPassword123!@#"),
            is_active=True
        )
        test_db_session.add(test_user)
        test_db_session.commit()
        test_db_session.refresh(test_user)
        
        # Delete the user
        deleted = await service.delete_user(test_user.id)
        
        assert deleted is True

