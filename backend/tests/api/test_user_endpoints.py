"""
User API Tests
Tests for user management endpoints
"""

import pytest
from tests.utils.auth_helpers import get_auth_headers


class TestUserEndpoints:
    """Tests for user API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_users_admin(self, client, admin_token):
        """Test admin can get all users"""
        response = client.get(
            "/api/v1/users",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        assert "total" in data
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_users_unauthorized(self, client):
        """Test getting users without authentication"""
        response = client.get("/api/v1/users")
        
        # FastAPI HTTPBearer returns 403 when no token is provided
        assert response.status_code in [401, 403]
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_user_by_id(self, client, admin_token, admin_user):
        """Test getting user by ID"""
        response = client.get(
            f"/api/v1/users/{admin_user.id}",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == admin_user.id
        assert data["username"] == "admin"
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_create_user_admin(self, client, admin_token):
        """Test admin can create user"""
        response = client.post(
            "/api/v1/users",
            headers=get_auth_headers(admin_token),
            json={
                "username": "newuser",
                "email": "newuser@test.com",
                "first_name": "New",
                "last_name": "User",
                "password": "NewUser123!@#",
                "roles": ["student"]  # Use lowercase to match UserRole enum
            }
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["username"] == "newuser"
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_create_user_teacher_forbidden(self, client, teacher_token):
        """Test teacher cannot create user"""
        response = client.post(
            "/api/v1/users",
            headers=get_auth_headers(teacher_token),
            json={
                "username": "newuser",
                "email": "newuser@test.com",
                "first_name": "New",
                "last_name": "User",
                "password": "NewUser123!@#",
                "roles": ["student"]  # Add roles to avoid 422 validation error
            }
        )
        
        assert response.status_code == 403

