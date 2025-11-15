"""
Authentication API Endpoints
POST /api/v1/auth/login - User login
POST /api/v1/auth/logout - User logout
POST /api/v1/auth/refresh - Refresh access token
GET  /api/v1/auth/me - Get current user info
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials

from src.application.services.auth_service import AuthService
from src.api.middleware.rate_limiting import limiter
from src.config import settings
from src.application.dto.auth_dto import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    UserInfoResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse
)
from src.api.dependencies import (
    get_auth_service,
    get_current_user,
    get_password_reset_service,
    security
)
from src.domain.entities.user import User
from src.domain.exceptions import (
    InvalidCredentialsError,
    AccountLockedError,
    TokenInvalidError,
    ValidationError,
    EntityNotFoundError
)

# Create router
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
    }
)


@router.post("/login", response_model=LoginResponse)
@limiter.limit(f"{settings.RATE_LIMIT_LOGIN_PER_MINUTE}/minute")
async def login(
    request: Request,
    credentials: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    User login
    
    Authenticates user and returns access + refresh tokens
    
    - **username**: User's username
    - **password**: User's password
    
    Returns:
        - access_token: Short-lived JWT for API access (30 min)
        - refresh_token: Long-lived JWT for token refresh (7 days)
        - user: User information
    """
    try:
        access_token, refresh_token, user_data = await auth_service.login(
            username=credentials.username,
            password=credentials.password
        )
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user_data
        )
        
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except AccountLockedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed",
        )


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    User logout
    
    Revokes the access token by adding it to blacklist
    
    Returns:
        Success message
    """
    try:
        token = credentials.credentials
        await auth_service.logout(token)
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        # Even if logout fails, return success
        return {"message": "Logged out"}


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Refresh access token
    
    Use refresh token to get a new access token
    
    - **refresh_token**: Valid refresh token from login
    
    Returns:
        - access_token: New access token
    """
    try:
        new_access_token = await auth_service.refresh_token(request.refresh_token)
        
        return RefreshTokenResponse(
            access_token=new_access_token
        )
        
    except TokenInvalidError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed",
        )


@router.get("/me", response_model=UserInfoResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user information
    
    Returns information about the currently authenticated user
    
    Requires:
        - Valid access token in Authorization header
    
    Returns:
        User information
    """
    user_dict = current_user.to_dict()
    # Add role field for backward compatibility (use first role)
    if "role" not in user_dict and "roles" in user_dict and len(user_dict["roles"]) > 0:
        user_dict["role"] = user_dict["roles"][0]
    return UserInfoResponse(**user_dict)


@router.post("/forgot-password", response_model=ForgotPasswordResponse, status_code=status.HTTP_200_OK)
@limiter.limit(f"{settings.RATE_LIMIT_LOGIN_PER_MINUTE}/minute")
async def forgot_password(
    request: Request,
    request_data: ForgotPasswordRequest,
    password_reset_service = Depends(get_password_reset_service)
):
    """
    Request password reset (Public endpoint)
    
    Sends a password reset link via email/SMS if the user exists.
    Always returns success message for security (doesn't reveal if user exists).
    
    - **email_or_username**: User's email address or username
    
    Returns:
        Success message (always the same for security)
    """
    from src.config import settings
    
    # Get frontend URL from settings or use default
    reset_url_template = None
    if hasattr(settings, 'FRONTEND_URL') and settings.FRONTEND_URL:
        reset_url_template = f"{settings.FRONTEND_URL}/reset-password?token={{token}}"
    
    await password_reset_service.request_password_reset(
        email_or_username=request_data.email_or_username,
        reset_url_template=reset_url_template
    )
    
    return ForgotPasswordResponse()


@router.post("/reset-password", response_model=ResetPasswordResponse, status_code=status.HTTP_200_OK)
async def reset_password(
    request: ResetPasswordRequest,
    password_reset_service = Depends(get_password_reset_service)
):
    """
    Reset password using token (Public endpoint)
    
    Resets the user's password using a valid reset token.
    
    - **token**: Password reset token from email/SMS
    - **new_password**: New password (minimum 12 characters)
    
    Returns:
        Success message
    """
    try:
        await password_reset_service.reset_password(
            token=request.token,
            new_password=request.new_password
        )
        
        return ResetPasswordResponse()
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )

