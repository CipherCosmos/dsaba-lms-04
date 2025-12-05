"""
Batch Instance API Tests
Tests for batch instance endpoints
"""

import pytest
from tests.utils.auth_helpers import get_auth_headers

class TestBatchInstanceEndpoints:
    """Tests for batch instance API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_create_batch_instance(self, client, admin_token, academic_year, department, batch):
        """Test creating a batch instance"""
        response = client.post(
            "/api/v1/batch-instances",
            headers=get_auth_headers(admin_token),
            json={
                "academic_year_id": academic_year.id,
                "department_id": department.id,
                "batch_id": batch.id,
                "admission_year": 2024,
                "sections": ["A", "B"]
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["academic_year_id"] == academic_year.id
        assert data["department_id"] == department.id
        assert data["batch_id"] == batch.id
        assert data["admission_year"] == 2024
        assert data["is_active"] is True

    @pytest.mark.api
    @pytest.mark.integration
    def test_create_batch_instance_unauthorized(self, client, student_token, academic_year, department, batch):
        """Test creating batch instance without admin rights"""
        response = client.post(
            "/api/v1/batch-instances",
            headers=get_auth_headers(student_token),
            json={
                "academic_year_id": academic_year.id,
                "department_id": department.id,
                "batch_id": batch.id,
                "admission_year": 2024
            }
        )
        
        assert response.status_code == 403

    @pytest.mark.api
    @pytest.mark.integration
    def test_list_batch_instances(self, client, admin_token, batch_instance):
        """Test listing batch instances"""
        response = client.get(
            "/api/v1/batch-instances",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert any(item["id"] == batch_instance.id for item in data["items"])

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_batch_instance(self, client, admin_token, batch_instance):
        """Test getting batch instance by ID"""
        response = client.get(
            f"/api/v1/batch-instances/{batch_instance.id}",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == batch_instance.id

    @pytest.mark.api
    @pytest.mark.integration
    def test_manage_sections(self, client, admin_token, batch_instance):
        """Test adding and listing sections"""
        # Add section
        response = client.post(
            f"/api/v1/batch-instances/{batch_instance.id}/sections",
            headers=get_auth_headers(admin_token),
            json={
                "batch_instance_id": batch_instance.id,
                "section_name": "C",
                "capacity": 60
            }
        )
        assert response.status_code == 201
        
        # List sections
        response = client.get(
            f"/api/v1/batch-instances/{batch_instance.id}/sections",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert any(item["section_name"] == "C" for item in data["items"])

    @pytest.mark.api
    @pytest.mark.integration
    def test_lifecycle_operations(self, client, admin_token, batch_instance):
        """Test activate and deactivate operations"""
        # Deactivate
        response = client.put(
            f"/api/v1/batch-instances/{batch_instance.id}/deactivate",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 200
        assert response.json()["is_active"] is False
        
        # Activate
        response = client.put(
            f"/api/v1/batch-instances/{batch_instance.id}/activate",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 200
        assert response.json()["is_active"] is True
