"""
Dashboard API Tests
Tests for dashboard endpoints
"""

import pytest
from tests.utils.auth_helpers import get_auth_headers


class TestDashboardEndpoints:
    """Tests for dashboard API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_admin_dashboard(self, client, admin_token):
        """Test getting admin dashboard"""
        response = client.get(
            "/api/v1/dashboard/stats",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "statistics" in data
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_teacher_dashboard(self, client, teacher_token):
        """Test getting teacher dashboard"""
        response = client.get(
            "/api/v1/dashboard/stats",
            headers=get_auth_headers(teacher_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "statistics" in data
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_student_dashboard(self, client, student_token):
        """Test getting student dashboard"""
        response = client.get(
            "/api/v1/dashboard/stats",
            headers=get_auth_headers(student_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "statistics" in data

