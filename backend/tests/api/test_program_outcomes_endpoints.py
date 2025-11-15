"""
Tests for Program Outcomes API endpoints
"""
import pytest
from httpx import AsyncClient

from tests.utils.auth_helpers import get_auth_headers


@pytest.mark.api
@pytest.mark.integration
class TestProgramOutcomesEndpoints:
    """Tests for program outcomes API endpoints"""
    
    @pytest.mark.asyncio
    async def test_create_po(self, async_client: AsyncClient, admin_token, department):
        """Test creating a program outcome"""
        response = await async_client.post(
            "/api/v1/program-outcomes",
            json={
                "department_id": department.id,
                "code": "PO1",
                "title": "Engineering knowledge",
                "description": "Apply knowledge of mathematics, science, and engineering",
                "type": "PO",
                "target_attainment": 70.0
            },
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["code"] == "PO1"
        assert data["department_id"] == department.id
    
    @pytest.mark.asyncio
    async def test_get_po(self, async_client: AsyncClient, admin_token, program_outcome):
        """Test getting a program outcome by ID"""
        response = await async_client.get(
            f"/api/v1/program-outcomes/{program_outcome.id}",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == program_outcome.id
        assert data["code"] == program_outcome.code
    
    @pytest.mark.asyncio
    async def test_list_pos(self, async_client: AsyncClient, admin_token, program_outcome):
        """Test listing program outcomes"""
        response = await async_client.get(
            f"/api/v1/program-outcomes/department/{program_outcome.department_id}",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data or isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_update_po(self, async_client: AsyncClient, admin_token, program_outcome):
        """Test updating a program outcome"""
        response = await async_client.put(
            f"/api/v1/program-outcomes/{program_outcome.id}",
            json={
                "title": "Updated title",
                "target_attainment": 75.0
            },
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated title"
        assert data["target_attainment"] == 75.0
    
    @pytest.mark.asyncio
    async def test_delete_po(self, async_client: AsyncClient, admin_token, program_outcome):
        """Test deleting a program outcome"""
        response = await async_client.delete(
            f"/api/v1/program-outcomes/{program_outcome.id}",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 204
    
    @pytest.mark.asyncio
    async def test_get_po_not_found(self, async_client: AsyncClient, admin_token):
        """Test getting non-existent program outcome"""
        response = await async_client.get(
            "/api/v1/program-outcomes/99999",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 404

