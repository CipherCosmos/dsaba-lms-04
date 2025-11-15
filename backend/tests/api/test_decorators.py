"""
Tests for API decorators
"""
import pytest
from fastapi import HTTPException, status
from unittest.mock import AsyncMock, MagicMock

from src.api.decorators import (
    require_roles,
    require_permission,
    require_department_access,
    require_role_dependency,
    require_permission_dependency
)
from src.domain.entities.user import User
from src.domain.enums.user_role import UserRole, Permission
from src.domain.value_objects.email import Email


@pytest.mark.unit
@pytest.mark.api
class TestRequireRoles:
    """Tests for require_roles decorator"""
    
    @pytest.mark.asyncio
    async def test_require_roles_allowed(self):
        """Test decorator allows access for user with required role"""
        @require_roles(UserRole.ADMIN)
        async def test_endpoint(current_user: User):
            return {"message": "success"}
        
        from src.infrastructure.security.password_hasher import PasswordHasher
        password_hasher = PasswordHasher()
        
        user = User(
            id=1,
            username="admin",
            email=Email("admin@test.com"),
            first_name="Admin",
            last_name="User",
            hashed_password=password_hasher.hash("password123")
        )
        user.add_role(UserRole.ADMIN)
        
        result = await test_endpoint(current_user=user)
        assert result == {"message": "success"}
    
    @pytest.mark.asyncio
    async def test_require_roles_denied(self):
        """Test decorator denies access for user without required role"""
        @require_roles(UserRole.ADMIN)
        async def test_endpoint(current_user: User):
            return {"message": "success"}
        
        from src.infrastructure.security.password_hasher import PasswordHasher
        password_hasher = PasswordHasher()
        
        user = User(
            id=1,
            username="student",
            email=Email("student@test.com"),
            first_name="Student",
            last_name="User",
            hashed_password=password_hasher.hash("password123")
        )
        user.add_role(UserRole.STUDENT)
        
        with pytest.raises(HTTPException) as exc_info:
            await test_endpoint(current_user=user)
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    
    @pytest.mark.asyncio
    async def test_require_roles_no_user(self):
        """Test decorator raises error when no user provided"""
        @require_roles(UserRole.ADMIN)
        async def test_endpoint():
            return {"message": "success"}
        
        with pytest.raises(HTTPException) as exc_info:
            await test_endpoint()
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    
    @pytest.mark.asyncio
    async def test_require_roles_multiple_allowed(self):
        """Test decorator allows access for user with one of multiple allowed roles"""
        @require_roles(UserRole.ADMIN, UserRole.PRINCIPAL)
        async def test_endpoint(current_user: User):
            return {"message": "success"}
        
        from src.infrastructure.security.password_hasher import PasswordHasher
        password_hasher = PasswordHasher()
        
        user = User(
            id=1,
            username="principal",
            email=Email("principal@test.com"),
            first_name="Principal",
            last_name="User",
            hashed_password=password_hasher.hash("password123")
        )
        user.add_role(UserRole.PRINCIPAL)
        
        result = await test_endpoint(current_user=user)
        assert result == {"message": "success"}


@pytest.mark.unit
@pytest.mark.api
class TestRequirePermission:
    """Tests for require_permission decorator"""
    
    @pytest.mark.asyncio
    async def test_require_permission_allowed(self):
        """Test decorator allows access for user with required permission"""
        @require_permission(Permission.EXAM_CREATE)
        async def test_endpoint(current_user: User):
            return {"message": "success"}
        
        from src.infrastructure.security.password_hasher import PasswordHasher
        password_hasher = PasswordHasher()
        
        user = User(
            id=1,
            username="teacher",
            email=Email("teacher@test.com"),
            first_name="Teacher",
            last_name="User",
            hashed_password=password_hasher.hash("password123")
        )
        user.add_role(UserRole.TEACHER)
        
        result = await test_endpoint(current_user=user)
        assert result == {"message": "success"}
    
    @pytest.mark.asyncio
    async def test_require_permission_denied(self):
        """Test decorator denies access for user without required permission"""
        @require_permission(Permission.USER_DELETE)
        async def test_endpoint(current_user: User):
            return {"message": "success"}
        
        from src.infrastructure.security.password_hasher import PasswordHasher
        password_hasher = PasswordHasher()
        
        user = User(
            id=1,
            username="student",
            email=Email("student@test.com"),
            first_name="Student",
            last_name="User",
            hashed_password=password_hasher.hash("password123")
        )
        user.add_role(UserRole.STUDENT)
        
        with pytest.raises(HTTPException) as exc_info:
            await test_endpoint(current_user=user)
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    
    @pytest.mark.asyncio
    async def test_require_permission_no_user(self):
        """Test decorator raises error when no user provided"""
        @require_permission(Permission.EXAM_CREATE)
        async def test_endpoint():
            return {"message": "success"}
        
        with pytest.raises(HTTPException) as exc_info:
            await test_endpoint()
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.unit
@pytest.mark.api
class TestRequireDepartmentAccess:
    """Tests for require_department_access decorator"""
    
    @pytest.mark.asyncio
    async def test_require_department_access_principal(self):
        """Test principal can access any department"""
        @require_department_access()
        async def test_endpoint(department_id: int, current_user: User):
            return {"message": "success"}
        
        from src.infrastructure.security.password_hasher import PasswordHasher
        password_hasher = PasswordHasher()
        
        user = User(
            id=1,
            username="principal",
            email=Email("principal@test.com"),
            first_name="Principal",
            last_name="User",
            hashed_password=password_hasher.hash("password123")
        )
        user.add_role(UserRole.PRINCIPAL)
        
        result = await test_endpoint(department_id=1, current_user=user)
        assert result == {"message": "success"}
    
    @pytest.mark.asyncio
    async def test_require_department_access_hod_own_dept(self):
        """Test HOD can access their own department"""
        @require_department_access()
        async def test_endpoint(department_id: int, current_user: User):
            return {"message": "success"}
        
        from src.infrastructure.security.password_hasher import PasswordHasher
        password_hasher = PasswordHasher()
        
        user = User(
            id=1,
            username="hod",
            email=Email("hod@test.com"),
            first_name="HOD",
            last_name="User",
            hashed_password=password_hasher.hash("password123")
        )
        user.add_role(UserRole.HOD)
        user._department_ids = [1]  # Set department_ids directly
        
        result = await test_endpoint(department_id=1, current_user=user)
        assert result == {"message": "success"}
    
    @pytest.mark.asyncio
    async def test_require_department_access_hod_other_dept(self):
        """Test HOD cannot access other departments"""
        @require_department_access()
        async def test_endpoint(department_id: int, current_user: User):
            return {"message": "success"}
        
        from src.infrastructure.security.password_hasher import PasswordHasher
        password_hasher = PasswordHasher()
        
        user = User(
            id=1,
            username="hod",
            email=Email("hod@test.com"),
            first_name="HOD",
            last_name="User",
            hashed_password=password_hasher.hash("password123")
        )
        user.add_role(UserRole.HOD)
        user._department_ids = [1]  # Set department_ids directly
        
        with pytest.raises(HTTPException) as exc_info:
            await test_endpoint(department_id=2, current_user=user)
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    
    @pytest.mark.asyncio
    async def test_require_department_access_no_user(self):
        """Test decorator raises error when no user provided"""
        @require_department_access()
        async def test_endpoint(department_id: int):
            return {"message": "success"}
        
        with pytest.raises(HTTPException) as exc_info:
            await test_endpoint(department_id=1)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.unit
@pytest.mark.api
class TestRequireRoleDependency:
    """Tests for require_role_dependency"""
    
    @pytest.mark.asyncio
    async def test_require_role_dependency_allowed(self):
        """Test dependency allows access for user with required role"""
        from src.infrastructure.security.password_hasher import PasswordHasher
        password_hasher = PasswordHasher()
        
        user = User(
            id=1,
            username="admin",
            email=Email("admin@test.com"),
            first_name="Admin",
            last_name="User",
            hashed_password=password_hasher.hash("password123")
        )
        user.add_role(UserRole.ADMIN)
        
        # Mock get_current_user before creating dependency
        from unittest.mock import patch, AsyncMock
        with patch('src.api.decorators.get_current_user', new_callable=AsyncMock, return_value=user):
            dependency = require_role_dependency(UserRole.ADMIN)
            # Call with current_user as kwarg to bypass FastAPI Depends
            result = await dependency(current_user=user)
            assert result == user
    
    @pytest.mark.asyncio
    async def test_require_role_dependency_denied(self):
        """Test dependency denies access for user without required role"""
        from src.infrastructure.security.password_hasher import PasswordHasher
        password_hasher = PasswordHasher()
        
        user = User(
            id=1,
            username="student",
            email=Email("student@test.com"),
            first_name="Student",
            last_name="User",
            hashed_password=password_hasher.hash("password123")
        )
        user.add_role(UserRole.STUDENT)
        
        from unittest.mock import patch, AsyncMock
        with patch('src.api.decorators.get_current_user', new_callable=AsyncMock, return_value=user):
            dependency = require_role_dependency(UserRole.ADMIN)
            with pytest.raises(HTTPException) as exc_info:
                await dependency(current_user=user)
            
            assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.unit
@pytest.mark.api
class TestRequirePermissionDependency:
    """Tests for require_permission_dependency"""
    
    @pytest.mark.asyncio
    async def test_require_permission_dependency_allowed(self):
        """Test dependency allows access for user with required permission"""
        from src.infrastructure.security.password_hasher import PasswordHasher
        password_hasher = PasswordHasher()
        
        user = User(
            id=1,
            username="teacher",
            email=Email("teacher@test.com"),
            first_name="Teacher",
            last_name="User",
            hashed_password=password_hasher.hash("password123")
        )
        user.add_role(UserRole.TEACHER)
        
        from unittest.mock import patch, AsyncMock
        with patch('src.api.decorators.get_current_user', new_callable=AsyncMock, return_value=user):
            dependency = require_permission_dependency(Permission.EXAM_CREATE)
            result = await dependency(current_user=user)
            assert result == user
    
    @pytest.mark.asyncio
    async def test_require_permission_dependency_denied(self):
        """Test dependency denies access for user without required permission"""
        from src.infrastructure.security.password_hasher import PasswordHasher
        password_hasher = PasswordHasher()
        
        user = User(
            id=1,
            username="student",
            email=Email("student@test.com"),
            first_name="Student",
            last_name="User",
            hashed_password=password_hasher.hash("password123")
        )
        user.add_role(UserRole.STUDENT)
        
        from unittest.mock import patch, AsyncMock
        with patch('src.api.decorators.get_current_user', new_callable=AsyncMock, return_value=user):
            dependency = require_permission_dependency(Permission.USER_DELETE)
            with pytest.raises(HTTPException) as exc_info:
                await dependency(current_user=user)
            
            assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

