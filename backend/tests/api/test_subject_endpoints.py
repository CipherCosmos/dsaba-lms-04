"""
Subject API Tests
Tests for subject management endpoints
"""

import pytest
from tests.utils.auth_helpers import get_auth_headers


class TestSubjectEndpoints:
    """Tests for subject API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_create_subject(self, client, admin_token, department):
        """Test creating a subject"""
        response = client.post(
            "/api/v1/subjects",
            headers=get_auth_headers(admin_token),
            json={
                "code": "CS102",
                "name": "Algorithms",
                "department_id": department.id,
                "credits": 4.0
            }
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["code"] == "CS102"
        assert data["name"] == "Algorithms"
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_subjects(self, client, admin_token, subject):
        """Test getting list of subjects"""
        response = client.get(
            "/api/v1/subjects",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) or ("items" in data or "subjects" in data)
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_subject_by_id(self, client, admin_token, subject):
        """Test getting subject by ID"""
        response = client.get(
            f"/api/v1/subjects/{subject.id}",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == subject.id
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_subjects_by_department(self, client, admin_token, department, subject):
        """Test getting subjects by department"""
        response = client.get(
            f"/api/v1/subjects/department/{department.id}",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "subjects" in data
        assert isinstance(data["subjects"], list)
        assert len(data["subjects"]) > 0
        assert "total" in data
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_update_subject(self, client, admin_token, subject):
        """Test updating a subject"""
        response = client.put(
            f"/api/v1/subjects/{subject.id}",
            headers=get_auth_headers(admin_token),
            json={
                "name": "Updated Subject Name"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Subject Name"
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_delete_subject(self, client, admin_token, subject):
        """Test deleting a subject"""
        response = client.delete(
            f"/api/v1/subjects/{subject.id}",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code in [200, 204]

