"""
Error Handler Middleware
Centralized error handling for all domain exceptions
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import logging

from src.domain.exceptions import (
    DomainException,
    EntityNotFoundError,
    EntityAlreadyExistsError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    BusinessRuleViolationError,
)

logger = logging.getLogger(__name__)


def setup_error_handlers(app: FastAPI):
    """
    Setup error handlers for the FastAPI app
    
    Converts domain exceptions to appropriate HTTP responses
    """
    
    @app.exception_handler(EntityNotFoundError)
    async def handle_entity_not_found(request: Request, exc: EntityNotFoundError):
        """Handle entity not found errors"""
        logger.warning(f"Entity not found: {exc.message}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "success": False,
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details,
                }
            }
        )
    
    @app.exception_handler(EntityAlreadyExistsError)
    async def handle_entity_already_exists(request: Request, exc: EntityAlreadyExistsError):
        """Handle duplicate entity errors"""
        logger.warning(f"Entity already exists: {exc.message}")
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "success": False,
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details,
                }
            }
        )
    
    @app.exception_handler(ValidationError)
    async def handle_validation_error(request: Request, exc: ValidationError):
        """Handle validation errors"""
        logger.warning(f"Validation error: {exc.message}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details,
                }
            }
        )
    
    @app.exception_handler(AuthenticationError)
    async def handle_authentication_error(request: Request, exc: AuthenticationError):
        """Handle authentication errors"""
        logger.warning(f"Authentication error: {exc.message}")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                }
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    @app.exception_handler(AuthorizationError)
    async def handle_authorization_error(request: Request, exc: AuthorizationError):
        """Handle authorization errors"""
        logger.warning(f"Authorization error: {exc.message}")
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "success": False,
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                }
            }
        )
    
    @app.exception_handler(BusinessRuleViolationError)
    async def handle_business_rule_violation(request: Request, exc: BusinessRuleViolationError):
        """Handle business rule violations"""
        logger.warning(f"Business rule violation: {exc.message}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details,
                }
            }
        )
    
    @app.exception_handler(DomainException)
    async def handle_domain_exception(request: Request, exc: DomainException):
        """Handle general domain exceptions"""
        logger.error(f"Domain exception: {exc.message}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details,
                }
            }
        )
    
    @app.exception_handler(RequestValidationError)
    async def handle_request_validation_error(request: Request, exc: RequestValidationError):
        """Handle request validation errors (Pydantic)"""
        logger.warning(f"Request validation error: {exc.errors()}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Invalid request data",
                    "details": exc.errors(),
                }
            }
        )
    
    @app.exception_handler(IntegrityError)
    async def handle_integrity_error(request: Request, exc: IntegrityError):
        """Handle database integrity errors"""
        logger.error(f"Database integrity error: {exc}")
        
        error_msg = str(exc.orig) if hasattr(exc, 'orig') else str(exc)
        
        # Check for specific integrity errors
        if 'unique' in error_msg.lower():
            message = "A record with this value already exists"
        elif 'foreign key' in error_msg.lower():
            message = "Referenced record does not exist"
        else:
            message = "Database integrity constraint violated"
        
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "success": False,
                "error": {
                    "code": "INTEGRITY_ERROR",
                    "message": message,
                }
            }
        )
    
    @app.exception_handler(SQLAlchemyError)
    async def handle_database_error(request: Request, exc: SQLAlchemyError):
        """Handle general database errors"""
        logger.error(f"Database error: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "DATABASE_ERROR",
                    "message": "A database error occurred",
                }
            }
        )
    
    @app.exception_handler(Exception)
    async def handle_general_exception(request: Request, exc: Exception):
        """Handle unexpected errors"""
        logger.exception(f"Unexpected error: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred",
                }
            }
        )

