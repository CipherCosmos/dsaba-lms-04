"""
Authentication Test Helpers
Utilities for testing authentication and authorization
"""

from typing import Dict, Optional
from httpx import AsyncClient
from fastapi.testclient import TestClient


def get_auth_headers(token: str) -> Dict[str, str]:
    """Get authorization headers for API requests"""
    return {"Authorization": f"Bearer {token}"}


def make_authenticated_request(
    client: TestClient,
    method: str,
    url: str,
    token: str,
    **kwargs
):
    """Make an authenticated API request"""
    headers = get_auth_headers(token)
    if "headers" in kwargs:
        headers.update(kwargs["headers"])
    kwargs["headers"] = headers
    
    return getattr(client, method.lower())(url, **kwargs)


async def make_authenticated_async_request(
    client: AsyncClient,
    method: str,
    url: str,
    token: str,
    **kwargs
):
    """Make an authenticated async API request"""
    headers = get_auth_headers(token)
    if "headers" in kwargs:
        headers.update(kwargs["headers"])
    kwargs["headers"] = headers
    
    return await getattr(client, method.lower())(url, **kwargs)

