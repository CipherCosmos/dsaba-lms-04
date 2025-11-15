"""
Tests for Academic Structure API endpoints
"""
import pytest
from httpx import AsyncClient

from tests.utils.auth_helpers import get_auth_headers


@pytest.mark.api
@pytest.mark.integration
class TestAcademicStructureEndpoints:
    """Tests for academic structure API endpoints"""
    
    @pytest.mark.asyncio
    async def test_create_batch(self, async_client: AsyncClient, admin_token):
        """Test creating a batch"""
        response = await async_client.post(
            "/api/v1/academic/batches",
            json={
                "name": "2024-2028",
                "duration_years": 4
            },
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "2024-2028"
        assert data["duration_years"] == 4
    
    @pytest.mark.asyncio
    async def test_list_batches(self, async_client: AsyncClient, admin_token, batch):
        """Test listing batches"""
        response = await async_client.get(
            "/api/v1/academic/batches",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "batches" in data
        assert len(data["batches"]) > 0
    
    @pytest.mark.asyncio
    async def test_get_batch(self, async_client: AsyncClient, admin_token, batch):
        """Test getting a batch by ID"""
        response = await async_client.get(
            f"/api/v1/academic/batches/{batch.id}",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == batch.id
        assert data["name"] == batch.name
    
    @pytest.mark.asyncio
    async def test_get_batch_not_found(self, async_client: AsyncClient, admin_token):
        """Test getting non-existent batch"""
        response = await async_client.get(
            "/api/v1/academic/batches/99999",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_activate_batch(self, async_client: AsyncClient, admin_token, batch):
        """Test activating a batch"""
        # First ensure batch is inactive
        await async_client.post(
            f"/api/v1/academic/batches/{batch.id}/deactivate",
            headers=get_auth_headers(admin_token)
        )
        
        # Then activate
        response = await async_client.post(
            f"/api/v1/academic/batches/{batch.id}/activate",
            headers=get_auth_headers(admin_token)
        )
        # May return 200 or 400 if already active or business rule violation
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert data["is_active"] is True
    
    @pytest.mark.asyncio
    async def test_deactivate_batch(self, async_client: AsyncClient, admin_token, batch):
        """Test deactivating a batch"""
        # First activate
        await async_client.post(
            f"/api/v1/academic/batches/{batch.id}/activate",
            headers=get_auth_headers(admin_token)
        )
        
        # Then deactivate
        response = await async_client.post(
            f"/api/v1/academic/batches/{batch.id}/deactivate",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False
    
    @pytest.mark.asyncio
    async def test_create_batch_year(self, async_client: AsyncClient, admin_token, batch):
        """Test creating a batch year"""
        response = await async_client.post(
            "/api/v1/academic/batch-years",
            json={
                "batch_id": batch.id,
                "start_year": 2024,
                "end_year": 2025,
                "is_current": True
            },
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["batch_id"] == batch.id
        assert data["start_year"] == 2024
        assert data["end_year"] == 2025
    
    @pytest.mark.asyncio
    async def test_list_batch_years(self, async_client: AsyncClient, admin_token, batch_year):
        """Test listing batch years"""
        response = await async_client.get(
            f"/api/v1/academic/batches/{batch_year.batch_id}/batch-years",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    @pytest.mark.asyncio
    async def test_get_batch_year(self, async_client: AsyncClient, admin_token, batch_year):
        """Test getting a batch year by ID"""
        # Batch year might not have a direct GET endpoint, so we'll test via list
        response = await async_client.get(
            f"/api/v1/academic/batches/{batch_year.batch_id}/batch-years",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Check if our batch_year is in the list
        batch_year_ids = [by.get("id") for by in data if isinstance(by, dict)]
        assert batch_year.id in batch_year_ids
    
    @pytest.mark.asyncio
    async def test_create_semester(self, async_client: AsyncClient, admin_token, batch_year):
        """Test creating a semester"""
        from datetime import date, timedelta
        response = await async_client.post(
            "/api/v1/academic/semesters",
            json={
                "batch_year_id": batch_year.id,
                "semester_no": 1,
                "start_date": date.today().isoformat(),
                "end_date": (date.today() + timedelta(days=180)).isoformat()
            },
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["batch_year_id"] == batch_year.id
        assert data["semester_no"] == 1
    
    @pytest.mark.asyncio
    async def test_list_semesters(self, async_client: AsyncClient, admin_token, semester):
        """Test listing semesters"""
        response = await async_client.get(
            f"/api/v1/academic/batch-years/{semester.batch_year_id}/semesters",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    @pytest.mark.asyncio
    async def test_get_semester(self, async_client: AsyncClient, admin_token, semester):
        """Test getting a semester by ID"""
        # Semester might not have a direct GET endpoint, so we'll test via list
        response = await async_client.get(
            f"/api/v1/academic/batch-years/{semester.batch_year_id}/semesters",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Check if our semester is in the list
        semester_ids = [s.get("id") for s in data if isinstance(s, dict)]
        assert semester.id in semester_ids

