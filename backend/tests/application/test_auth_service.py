"""
Authentication Service Tests
Tests for AuthService
"""

import pytest
from src.application.services.auth_service import AuthService
from src.infrastructure.database.repositories.user_repository_impl import UserRepository
from src.domain.exceptions.auth_exceptions import InvalidCredentialsError, AccountLockedError


class TestAuthService:
    """Tests for AuthService"""
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_login_success(self, test_db_session, admin_user):
        """Test successful login"""
        user_repo = UserRepository(test_db_session)
        auth_service = AuthService(user_repo)
        
        access_token, refresh_token, user_data = await auth_service.login("admin", "admin123")
        
        assert access_token is not None
        assert refresh_token is not None
        assert user_data is not None
        assert user_data["username"] == "admin"
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_login_invalid_username(self, test_db_session):
        """Test login with invalid username"""
        user_repo = UserRepository(test_db_session)
        auth_service = AuthService(user_repo)
        
        with pytest.raises(InvalidCredentialsError):
            await auth_service.login("nonexistent", "password")
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_login_invalid_password(self, test_db_session, admin_user):
        """Test login with invalid password"""
        user_repo = UserRepository(test_db_session)
        auth_service = AuthService(user_repo)
        
        with pytest.raises(InvalidCredentialsError):
            await auth_service.login("admin", "wrongpassword")
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_login_inactive_user(self, test_db_session, password_hasher):
        """Test login with inactive user"""
        from src.infrastructure.database.models import UserModel
        
        # Create inactive user
        inactive_user = UserModel(
            username="inactive",
            email="inactive@test.com",
            first_name="Inactive",
            last_name="User",
            hashed_password=password_hasher.hash("password123"),
            is_active=False
        )
        test_db_session.add(inactive_user)
        test_db_session.commit()
        
        user_repo = UserRepository(test_db_session)
        auth_service = AuthService(user_repo)
        
        # Inactive user should raise AccountLockedError, not InvalidCredentialsError
        with pytest.raises(AccountLockedError):
            await auth_service.login("inactive", "password123")

