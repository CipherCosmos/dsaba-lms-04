"""
Domain Entities Tests
Tests for domain entities
"""

import pytest
from datetime import datetime
from src.domain.entities.user import User
from src.domain.value_objects.email import Email
from src.domain.enums.user_role import UserRole
from src.domain.exceptions import ValidationError, BusinessRuleViolationError


class TestUserEntity:
    """Tests for User entity"""
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_user(self):
        """Test creating a valid user"""
        email = Email("test@example.com")
        user = User(
            username="testuser",
            email=email,
            first_name="Test",
            last_name="User",
            hashed_password="hashed_password_here"
        )
        
        assert user.username == "testuser"
        assert user.email == email
        assert user.first_name == "Test"
        assert user.last_name == "User"
        assert user.full_name == "Test User"
        assert user.is_active is True
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_username_normalization(self):
        """Test username is normalized to lowercase"""
        email = Email("test@example.com")
        user = User(
            username="TestUser",
            email=email,
            first_name="Test",
            last_name="User",
            hashed_password="hashed"
        )
        assert user.username == "testuser"
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_username_too_short(self):
        """Test username too short raises error"""
        email = Email("test@example.com")
        with pytest.raises(ValidationError):
            User(
                username="ab",
                email=email,
                first_name="Test",
                last_name="User",
                hashed_password="hashed"
            )
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_name_whitespace_trim(self):
        """Test name whitespace is trimmed"""
        email = Email("test@example.com")
        user = User(
            username="testuser",
            email=email,
            first_name="  Test  ",
            last_name="  User  ",
            hashed_password="hashed"
        )
        assert user.first_name == "Test"
        assert user.last_name == "User"
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_add_role(self):
        """Test adding role to user"""
        email = Email("test@example.com")
        user = User(
            username="testuser",
            email=email,
            first_name="Test",
            last_name="User",
            hashed_password="hashed"
        )
        
        user.add_role(UserRole.TEACHER)
        assert UserRole.TEACHER in user.roles
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_has_role(self):
        """Test checking if user has role"""
        email = Email("test@example.com")
        user = User(
            username="testuser",
            email=email,
            first_name="Test",
            last_name="User",
            hashed_password="hashed"
        )
        
        user.add_role(UserRole.TEACHER)
        assert user.has_role(UserRole.TEACHER) is True
        assert user.has_role(UserRole.STUDENT) is False
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_deactivate_user(self):
        """Test deactivating a user"""
        email = Email("test@example.com")
        user = User(
            username="testuser",
            email=email,
            first_name="Test",
            last_name="User",
            hashed_password="hashed"
        )
        
        user.deactivate()
        assert user.is_active is False
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_verify_email(self):
        """Test verifying user email"""
        email = Email("test@example.com")
        user = User(
            username="testuser",
            email=email,
            first_name="Test",
            last_name="User",
            hashed_password="hashed",
            email_verified=False
        )
        
        user.verify_email()
        assert user.email_verified is True

