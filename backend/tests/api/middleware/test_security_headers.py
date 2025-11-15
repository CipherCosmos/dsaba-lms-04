"""
Tests for security headers middleware
"""
import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from starlette.responses import Response

from src.api.middleware.security_headers import add_security_headers


@pytest.mark.unit
@pytest.mark.api
class TestSecurityHeaders:
    """Tests for security headers middleware"""
    
    @pytest.mark.asyncio
    async def test_security_headers_added(self):
        """Test that security headers are added to responses"""
        app = FastAPI()
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "test"}
        
        # Add middleware
        app.middleware("http")(add_security_headers)
        
        client = TestClient(app)
        response = client.get("/test")
        
        # Check security headers
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"
        assert response.headers.get("Strict-Transport-Security") == "max-age=31536000; includeSubDomains"
        assert response.headers.get("Content-Security-Policy") is not None
        assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert response.headers.get("Permissions-Policy") is not None
    
    @pytest.mark.asyncio
    async def test_api_cache_headers(self):
        """Test that API endpoints have cache control headers"""
        app = FastAPI()
        
        @app.get("/api/v1/test")
        async def test_endpoint():
            return {"message": "test"}
        
        # Add middleware
        app.middleware("http")(add_security_headers)
        
        client = TestClient(app)
        response = client.get("/api/v1/test")
        
        # Check cache control headers for API endpoints
        assert response.headers.get("Cache-Control") == "no-store, no-cache, must-revalidate, private"
        assert response.headers.get("Pragma") == "no-cache"
        assert response.headers.get("Expires") == "0"
    
    @pytest.mark.asyncio
    async def test_non_api_no_cache_headers(self):
        """Test that non-API endpoints don't have cache control headers"""
        app = FastAPI()
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "test"}
        
        # Add middleware
        app.middleware("http")(add_security_headers)
        
        client = TestClient(app)
        response = client.get("/test")
        
        # Non-API endpoints should not have cache control headers
        # (or they might be set by FastAPI itself, but not by our middleware)
        # The middleware only sets them for /api/ paths
        assert "Cache-Control" not in response.headers or response.headers.get("Cache-Control") != "no-store, no-cache, must-revalidate, private"

