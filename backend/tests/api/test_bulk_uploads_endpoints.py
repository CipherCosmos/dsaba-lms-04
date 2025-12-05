
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from src.main import app
from src.api.v1.bulk_uploads import get_bulk_upload_service
from tests.utils.auth_helpers import get_auth_headers

class TestBulkUploadsEndpoints:
    
    @pytest.fixture
    def mock_bulk_upload_service(self):
        service = MagicMock()
        app.dependency_overrides[get_bulk_upload_service] = lambda: service
        yield service
        app.dependency_overrides = {}

    def test_upload_questions_authorized(self, client: TestClient, teacher_token, mock_bulk_upload_service):
        """Test uploading questions as teacher"""
        headers = get_auth_headers(teacher_token)
        
        # Mock service response - make it async compatible if needed, 
        # but MagicMock return_value is synchronous. 
        # The endpoint awaits it: await service.upload_questions_from_excel(...)
        # So we need an AsyncMock or configure MagicMock to return a coroutine.
        # However, in python 3.8+ unittest.mock.AsyncMock is available.
        # Or we can just set return_value to a future.
        
        # Better: use AsyncMock if available, or just a simple async function wrapper
        async def mock_upload(*args, **kwargs):
            return {
                "total_rows": 10,
                "success_count": 10,
                "error_count": 0,
                "errors": []
            }
        mock_bulk_upload_service.upload_questions_from_excel.side_effect = mock_upload
        
        # Create dummy file
        file_content = b"dummy excel content"
        files = {"file": ("questions.xlsx", file_content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        
        response = client.post("/api/v1/bulk-uploads/questions/1", headers=headers, files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["success_count"] == 10
        assert data["total_rows"] == 10

    def test_upload_questions_unauthorized(self, client: TestClient, student_token):
        """Test uploading questions as student (unauthorized)"""
        headers = get_auth_headers(student_token)
        
        file_content = b"dummy excel content"
        files = {"file": ("questions.xlsx", file_content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        
        response = client.post("/api/v1/bulk-uploads/questions/1", headers=headers, files=files)
        assert response.status_code == 403

    def test_upload_marks_authorized(self, client: TestClient, teacher_token, mock_bulk_upload_service):
        """Test uploading marks as teacher"""
        headers = get_auth_headers(teacher_token)
        
        async def mock_upload(*args, **kwargs):
            return {
                "total_rows": 50,
                "success_count": 50,
                "error_count": 0,
                "errors": []
            }
        mock_bulk_upload_service.upload_marks_from_excel.side_effect = mock_upload
        
        file_content = b"dummy excel content"
        files = {"file": ("marks.xlsx", file_content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        
        response = client.post("/api/v1/bulk-uploads/marks/1", headers=headers, files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["success_count"] == 50
        assert data["total_rows"] == 50

    def test_upload_marks_unauthorized(self, client: TestClient, student_token):
        """Test uploading marks as student (unauthorized)"""
        headers = get_auth_headers(student_token)
        
        file_content = b"dummy excel content"
        files = {"file": ("marks.xlsx", file_content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        
        response = client.post("/api/v1/bulk-uploads/marks/1", headers=headers, files=files)
        assert response.status_code == 403

    def test_get_template(self, client: TestClient, teacher_token, mock_bulk_upload_service):
        """Test downloading template"""
        headers = get_auth_headers(teacher_token)
        
        async def mock_get_template(*args, **kwargs):
            return b"template content"
        mock_bulk_upload_service.get_upload_template.side_effect = mock_get_template
        
        response = client.get("/api/v1/bulk-uploads/template/questions", headers=headers)
        assert response.status_code == 200
        assert response.content == b"template content"
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers["content-type"]
