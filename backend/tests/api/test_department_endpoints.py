"""
Department API Tests
Tests for department management endpoints
"""

import pytest
from tests.utils.auth_helpers import get_auth_headers


class TestDepartmentEndpoints:
    """Tests for department API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_create_department(self, client, admin_token):
        """Test creating a department"""
        response = client.post(
            "/api/v1/departments",
            headers=get_auth_headers(admin_token),
            json={
                "name": "Test Department",
                "code": "TEST"
            }
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["name"] == "Test Department"
        assert data["code"] == "TEST"
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_departments(self, client, admin_token, department):
        """Test getting list of departments"""
        response = client.get(
            "/api/v1/departments",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) or ("items" in data or "departments" in data)
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_department_by_id(self, client, admin_token, department):
        """Test getting department by ID"""
        response = client.get(
            f"/api/v1/departments/{department.id}",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == department.id
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_update_department(self, client, admin_token, department):
        """Test updating a department"""
        response = client.put(
            f"/api/v1/departments/{department.id}",
            headers=get_auth_headers(admin_token),
            json={
                "name": "Updated Department Name"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Department Name"
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_delete_department(self, client, admin_token):
        """Test deleting a department"""
        # Create a department first
        create_response = client.post(
            "/api/v1/departments",
            headers=get_auth_headers(admin_token),
            json={
                "name": "To Delete",
                "code": "DEL"
            }
        )
        dept_id = create_response.json()["id"]
        
        # Delete it
        response = client.delete(
            f"/api/v1/departments/{dept_id}",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code in [200, 204]

