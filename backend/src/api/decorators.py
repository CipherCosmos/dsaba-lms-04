"""
Authorization Decorators
Role-based access control decorators for FastAPI endpoints
"""

from functools import wraps
from typing import List, Optional, Callable
from fastapi import HTTPException, status, Depends

from src.domain.entities.user import User
from src.domain.enums.user_role import UserRole, Permission, has_permission, get_permissions_for_role
from src.api.dependencies import get_current_user


def require_roles(*allowed_roles: UserRole):
    """
    Decorator to require specific roles for endpoint access
    
    Usage:
        @require_roles(UserRole.PRINCIPAL, UserRole.HOD)
        async def endpoint(...):
            ...
    
    Args:
        *allowed_roles: Roles that can access this endpoint
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current user from kwargs (injected by FastAPI)
            current_user: Optional[User] = None
            
            # Try to find current_user in kwargs
            for key, value in kwargs.items():
                if isinstance(value, User):
                    current_user = value
                    break
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check if user has one of the allowed roles
            user_roles = current_user.roles if hasattr(current_user, 'roles') else [current_user.role]
            
            has_access = False
            for role in user_roles:
                if role in allowed_roles:
                    has_access = True
                    break
            
            if not has_access:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_permission(permission: Permission):
    """
    Decorator to require specific permission for endpoint access
    
    Usage:
        @require_permission(Permission.EXAM_CREATE)
        async def endpoint(...):
            ...
    
    Args:
        permission: Permission required to access endpoint
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current user from kwargs
            current_user: Optional[User] = None
            
            for key, value in kwargs.items():
                if isinstance(value, User):
                    current_user = value
                    break
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check if user has permission
            user_roles = current_user.roles if hasattr(current_user, 'roles') else [current_user.role]
            
            has_perm = False
            for role in user_roles:
                if has_permission(role, permission):
                    has_perm = True
                    break
            
            if not has_perm:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Required permission: {permission.value}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_department_access():
    """
    Decorator to ensure user can only access their own department data
    
    Usage:
        @require_department_access()
        async def endpoint(department_id: int, current_user: User = ...):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user: Optional[User] = None
            department_id: Optional[int] = None
            
            # Extract current_user and department_id from kwargs
            for key, value in kwargs.items():
                if isinstance(value, User):
                    current_user = value
                elif key == "department_id" or (isinstance(value, int) and "department" in key.lower()):
                    department_id = value
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Principal can access all departments
            user_roles = current_user.roles if hasattr(current_user, 'roles') else []
            if UserRole.PRINCIPAL in user_roles:
                return await func(*args, **kwargs)
            
            # HOD can only access their own department
            if UserRole.HOD in user_roles:
                dept_ids = current_user.department_ids if hasattr(current_user, 'department_ids') else []
                if department_id and dept_ids and department_id not in dept_ids:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied. You can only access your own department."
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Dependency functions for FastAPI
def require_role_dependency(*allowed_roles: UserRole):
    """
    FastAPI dependency to require specific roles
    
    Usage:
        @router.get("/endpoint")
        async def endpoint(
            current_user: User = Depends(require_role_dependency(UserRole.PRINCIPAL))
        ):
            ...
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_roles = current_user.roles if hasattr(current_user, 'roles') else [current_user.role]
        
        has_access = any(role in allowed_roles for role in user_roles)
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
            )
        
        return current_user
    
    return role_checker


def require_permission_dependency(permission: Permission):
    """
    FastAPI dependency to require specific permission
    
    Usage:
        @router.post("/endpoint")
        async def endpoint(
            current_user: User = Depends(require_permission_dependency(Permission.EXAM_CREATE))
        ):
            ...
    """
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_roles = current_user.roles if hasattr(current_user, 'roles') else [current_user.role]
        
        has_perm = any(has_permission(role, permission) for role in user_roles)
        
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required permission: {permission.value}"
            )
        
        return current_user
    
    return permission_checker

