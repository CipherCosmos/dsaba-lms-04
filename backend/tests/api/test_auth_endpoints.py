"""
Authentication API Tests
Tests for authentication endpoints
"""

import pytest
from tests.utils.auth_helpers import get_auth_headers


class TestAuthEndpoints:
    """Tests for authentication API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_login_success(self, client, admin_user):
        """Test successful login endpoint"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "admin",
                "password": "admin123"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data
        assert data["user"]["username"] == "admin"
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "admin",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_login_missing_fields(self, client):
        """Test login with missing fields"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "admin"
            }
        )
        
        assert response.status_code == 422
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_current_user(self, client, admin_token):
        """Test getting current user"""
        response = client.get(
            "/api/v1/auth/me",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin"
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_current_user_unauthorized(self, client):
        """Test getting current user without token"""
        response = client.get("/api/v1/auth/me")
        
        # FastAPI HTTPBearer returns 403 when no token is provided
        assert response.status_code in [401, 403]
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_refresh_token(self, client, admin_user):
        """Test refreshing access token"""
        # First login to get refresh token
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "admin",
                "password": "admin123"
            }
        )
        
        refresh_token = login_response.json()["refresh_token"]
        
        # Refresh access token
        response = client.post(
            "/api/v1/auth/refresh",
            json={
                "refresh_token": refresh_token
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

