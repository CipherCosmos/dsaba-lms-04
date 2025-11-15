"""
Academic Years API Endpoints Tests
Tests for academic year management endpoints
"""

import pytest
from datetime import date


class TestAcademicYearsEndpoints:
    """Tests for academic years API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_create_academic_year(self, client, admin_token):
        """Test creating an academic year"""
        response = client.post(
            "/api/v1/academic-years",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "start_year": 2024,
                "end_year": 2025,
                "start_date": "2024-06-01",
                "end_date": "2025-05-31"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["start_year"] == 2024
        assert data["end_year"] == 2025
        assert data["display_name"] == "2024-2025"
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_academic_years(self, client, admin_token, academic_year):
        """Test getting list of academic years"""
        response = client.get(
            "/api/v1/academic-years",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"skip": 0, "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) > 0
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_current_academic_year(self, client, admin_token, academic_year):
        """Test getting current academic year"""
        response = client.get(
            "/api/v1/academic-years/current",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_current"] is True
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_activate_academic_year(self, client, admin_token, academic_year):
        """Test activating an academic year"""
        response = client.post(
            f"/api/v1/academic-years/{academic_year.id}/activate",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_current"] is True
        assert data["status"] == "active"
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_archive_academic_year(self, client, admin_token, academic_year):
        """Test archiving an academic year"""
        response = client.post(
            f"/api/v1/academic-years/{academic_year.id}/archive",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "archived"

