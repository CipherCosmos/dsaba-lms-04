"""
Security Infrastructure Tests
Tests for password hashing and JWT handling
"""

import pytest
from src.infrastructure.security.password_hasher import PasswordHasher
from src.infrastructure.security.jwt_handler import JWTHandler
from src.domain.enums.user_role import UserRole


class TestPasswordHasher:
    """Tests for PasswordHasher"""
    
    @pytest.mark.unit
    @pytest.mark.infrastructure
    def test_hash_password(self, password_hasher):
        """Test password hashing"""
        password = "TestPassword123!@#"
        hashed = password_hasher.hash(password)
        
        assert hashed != password
        assert len(hashed) > 0
        assert hashed.startswith("$2b$")  # bcrypt format
    
    @pytest.mark.unit
    @pytest.mark.infrastructure
    def test_verify_password_correct(self, password_hasher):
        """Test verifying correct password"""
        password = "TestPassword123!@#"
        hashed = password_hasher.hash(password)
        
        assert password_hasher.verify(password, hashed) is True
    
    @pytest.mark.unit
    @pytest.mark.infrastructure
    def test_verify_password_incorrect(self, password_hasher):
        """Test verifying incorrect password"""
        password = "TestPassword123!@#"
        wrong_password = "WrongPassword123!@#"
        hashed = password_hasher.hash(password)
        
        assert password_hasher.verify(wrong_password, hashed) is False
    
    @pytest.mark.unit
    @pytest.mark.infrastructure
    def test_hash_uniqueness(self, password_hasher):
        """Test that same password produces different hashes"""
        password = "TestPassword123!@#"
        hashed1 = password_hasher.hash(password)
        hashed2 = password_hasher.hash(password)
        
        # Bcrypt includes salt, so hashes should be different
        assert hashed1 != hashed2
        
        # But both should verify correctly
        assert password_hasher.verify(password, hashed1) is True
        assert password_hasher.verify(password, hashed2) is True


class TestJWTHandler:
    """Tests for JWTHandler"""
    
    @pytest.mark.unit
    @pytest.mark.infrastructure
    def test_create_access_token(self, jwt_handler):
        """Test creating access token"""
        data = {
            "sub": "testuser",
            "user_id": 1,
            "username": "testuser",
            "roles": ["ADMIN"]
        }
        token = jwt_handler.create_access_token(data)
        
        assert token is not None
        assert len(token) > 0
        assert isinstance(token, str)
    
    @pytest.mark.unit
    @pytest.mark.infrastructure
    def test_decode_access_token(self, jwt_handler):
        """Test decoding access token"""
        data = {
            "sub": "testuser",
            "user_id": 1,
            "username": "testuser",
            "roles": ["ADMIN"]
        }
        token = jwt_handler.create_access_token(data)
        
        payload = jwt_handler.decode_token(token)
        
        assert payload is not None
        assert payload["user_id"] == 1
        assert payload["username"] == "testuser"
        assert "ADMIN" in payload["roles"]
    
    @pytest.mark.unit
    @pytest.mark.infrastructure
    def test_decode_invalid_token(self, jwt_handler):
        """Test decoding invalid token raises error"""
        invalid_token = "invalid.token.here"
        
        with pytest.raises(Exception):  # Should raise JWT decode error
            jwt_handler.decode_token(invalid_token)
    
    @pytest.mark.unit
    @pytest.mark.infrastructure
    def test_token_expiration(self, jwt_handler):
        """Test token expiration"""
        from datetime import timedelta, datetime
        from src.domain.exceptions.auth_exceptions import TokenExpiredError
        from freezegun import freeze_time
        
        data = {
            "sub": "testuser",
            "user_id": 1,
            "username": "testuser",
            "roles": ["ADMIN"]
        }
        
        # Create token with very short expiration (1 second)
        with freeze_time("2024-01-01 12:00:00"):
            token = jwt_handler.create_access_token(
                data,
                expires_delta=timedelta(seconds=1)
            )
        
        # Move time forward past expiration
        with freeze_time("2024-01-01 12:00:02"):
            # Token should be expired
            with pytest.raises(TokenExpiredError):
                jwt_handler.decode_token(token)

