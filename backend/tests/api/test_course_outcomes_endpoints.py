"""
Tests for Course Outcomes API endpoints
"""
import pytest
from httpx import AsyncClient

from tests.utils.auth_helpers import get_auth_headers


@pytest.mark.api
@pytest.mark.integration
class TestCourseOutcomesEndpoints:
    """Tests for course outcomes API endpoints"""
    
    @pytest.mark.asyncio
    async def test_create_co(self, async_client: AsyncClient, admin_token, subject):
        """Test creating a course outcome"""
        response = await async_client.post(
            "/api/v1/course-outcomes",
            json={
                "subject_id": subject.id,
                "code": "CO1",
                "title": "Understand fundamental concepts",
                "description": "Students will understand the fundamental concepts of the subject",
                "target_attainment": 70.0,
                "l1_threshold": 60.0,
                "l2_threshold": 70.0,
                "l3_threshold": 80.0
            },
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["code"] == "CO1"
        assert data["subject_id"] == subject.id
    
    @pytest.mark.asyncio
    async def test_get_co(self, async_client: AsyncClient, admin_token, course_outcome):
        """Test getting a course outcome by ID"""
        response = await async_client.get(
            f"/api/v1/course-outcomes/{course_outcome.id}",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == course_outcome.id
        assert data["code"] == course_outcome.code
    
    @pytest.mark.asyncio
    async def test_list_cos(self, async_client: AsyncClient, admin_token, course_outcome):
        """Test listing course outcomes"""
        response = await async_client.get(
            f"/api/v1/course-outcomes/subject/{course_outcome.subject_id}",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data or isinstance(data, list)
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_update_co(self, client, admin_token, course_outcome):
        """Test updating a course outcome"""
        response = client.put(
            f"/api/v1/course-outcomes/{course_outcome.id}",
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
    async def test_delete_co(self, async_client: AsyncClient, admin_token, course_outcome):
        """Test deleting a course outcome"""
        response = await async_client.delete(
            f"/api/v1/course-outcomes/{course_outcome.id}",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 204
    
    @pytest.mark.asyncio
    async def test_get_co_not_found(self, async_client: AsyncClient, admin_token):
        """Test getting non-existent course outcome"""
        response = await async_client.get(
            "/api/v1/course-outcomes/99999",
            headers=get_auth_headers(admin_token)
        )
        assert response.status_code == 404

