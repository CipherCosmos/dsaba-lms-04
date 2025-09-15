"""
Comprehensive error handling for the exam management system.
"""

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from pydantic import ValidationError as PydanticValidationError
import logging
from typing import Union
import traceback

from validation import ValidationError, BusinessLogicError, handle_validation_error, handle_business_logic_error

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def setup_error_handlers(app: FastAPI) -> None:
    """Setup comprehensive error handlers for the FastAPI app"""
    
    @app.exception_handler(ValidationError)
    async def validation_error_handler(request: Request, exc: ValidationError):
        """Handle custom validation errors"""
        logger.warning(f"Validation error on {request.url.path}: {exc.message}")
        return handle_validation_error(exc)
    
    @app.exception_handler(BusinessLogicError)
    async def business_logic_error_handler(request: Request, exc: BusinessLogicError):
        """Handle business logic errors"""
        logger.warning(f"Business logic error on {request.url.path}: {exc.message}")
        return handle_business_logic_error(exc)
    
    @app.exception_handler(RequestValidationError)
    async def request_validation_error_handler(request: Request, exc: RequestValidationError):
        """Handle FastAPI request validation errors"""
        logger.warning(f"Request validation error on {request.url.path}: {exc.errors()}")
        
        # Format validation errors for better frontend consumption
        formatted_errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            formatted_errors.append({
                "field": field,
                "message": error["msg"],
                "type": error["type"]
            })
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "message": "Validation failed",
                "errors": formatted_errors
            }
        )
    
    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError):
        """Handle database integrity errors"""
        logger.error(f"Database integrity error on {request.url.path}: {str(exc)}")
        
        # Parse common integrity error messages
        error_message = str(exc.orig)
        
        if "duplicate key" in error_message.lower():
            if "username" in error_message:
                return JSONResponse(
                    status_code=status.HTTP_409_CONFLICT,
                    content={
                        "message": "Username already exists",
                        "field": "username"
                    }
                )
            elif "email" in error_message:
                return JSONResponse(
                    status_code=status.HTTP_409_CONFLICT,
                    content={
                        "message": "Email already exists",
                        "field": "email"
                    }
                )
            elif "code" in error_message:
                return JSONResponse(
                    status_code=status.HTTP_409_CONFLICT,
                    content={
                        "message": "Code already exists",
                        "field": "code"
                    }
                )
            else:
                return JSONResponse(
                    status_code=status.HTTP_409_CONFLICT,
                    content={
                        "message": "Duplicate entry - this record already exists"
                    }
                )
        
        elif "foreign key" in error_message.lower():
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "message": "Referenced record not found - please check your data"
                }
            )
        
        elif "not null" in error_message.lower():
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "message": "Required field is missing"
                }
            )
        
        else:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "message": "Database constraint violation"
                }
            )
    
    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
        """Handle general SQLAlchemy errors"""
        logger.error(f"Database error on {request.url.path}: {str(exc)}")
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "message": "Database operation failed",
                "error": "Internal server error"
            }
        )
    
    @app.exception_handler(PydanticValidationError)
    async def pydantic_validation_error_handler(request: Request, exc: PydanticValidationError):
        """Handle Pydantic validation errors"""
        logger.warning(f"Pydantic validation error on {request.url.path}: {exc.errors()}")
        
        formatted_errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            formatted_errors.append({
                "field": field,
                "message": error["msg"],
                "type": error["type"]
            })
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "message": "Data validation failed",
                "errors": formatted_errors
            }
        )
    
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        """Handle ValueError exceptions"""
        logger.warning(f"Value error on {request.url.path}: {str(exc)}")
        
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "message": str(exc)
            }
        )
    
    @app.exception_handler(KeyError)
    async def key_error_handler(request: Request, exc: KeyError):
        """Handle KeyError exceptions"""
        logger.warning(f"Key error on {request.url.path}: {str(exc)}")
        
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "message": f"Missing required field: {str(exc)}"
            }
        )
    
    @app.exception_handler(AttributeError)
    async def attribute_error_handler(request: Request, exc: AttributeError):
        """Handle AttributeError exceptions"""
        logger.warning(f"Attribute error on {request.url.path}: {str(exc)}")
        
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "message": "Invalid attribute access"
            }
        )
    
    @app.exception_handler(FileNotFoundError)
    async def file_not_found_error_handler(request: Request, exc: FileNotFoundError):
        """Handle FileNotFoundError exceptions"""
        logger.warning(f"File not found error on {request.url.path}: {str(exc)}")
        
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "message": "Requested file not found"
            }
        )
    
    @app.exception_handler(PermissionError)
    async def permission_error_handler(request: Request, exc: PermissionError):
        """Handle PermissionError exceptions"""
        logger.warning(f"Permission error on {request.url.path}: {str(exc)}")
        
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "message": "Insufficient permissions"
            }
        )
    
    @app.exception_handler(TimeoutError)
    async def timeout_error_handler(request: Request, exc: TimeoutError):
        """Handle TimeoutError exceptions"""
        logger.warning(f"Timeout error on {request.url.path}: {str(exc)}")
        
        return JSONResponse(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            content={
                "message": "Request timed out"
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handle all other exceptions"""
        logger.error(f"Unexpected error on {request.url.path}: {str(exc)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Don't expose internal error details in production
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "message": "An unexpected error occurred",
                "error": "Internal server error"
            }
        )


class ErrorResponse:
    """Standardized error response format"""
    
    @staticmethod
    def validation_error(message: str, field: str = None, errors: list = None) -> JSONResponse:
        """Create a validation error response"""
        content = {
            "message": message,
            "type": "validation_error"
        }
        
        if field:
            content["field"] = field
        
        if errors:
            content["errors"] = errors
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=content
        )
    
    @staticmethod
    def business_logic_error(message: str, code: str = None) -> JSONResponse:
        """Create a business logic error response"""
        content = {
            "message": message,
            "type": "business_logic_error"
        }
        
        if code:
            content["code"] = code
        
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=content
        )
    
    @staticmethod
    def not_found(message: str = "Resource not found") -> JSONResponse:
        """Create a not found error response"""
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "message": message,
                "type": "not_found"
            }
        )
    
    @staticmethod
    def forbidden(message: str = "Access forbidden") -> JSONResponse:
        """Create a forbidden error response"""
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "message": message,
                "type": "forbidden"
            }
        )
    
    @staticmethod
    def unauthorized(message: str = "Authentication required") -> JSONResponse:
        """Create an unauthorized error response"""
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": message,
                "type": "unauthorized"
            }
        )
    
    @staticmethod
    def conflict(message: str = "Resource conflict") -> JSONResponse:
        """Create a conflict error response"""
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "message": message,
                "type": "conflict"
            }
        )
    
    @staticmethod
    def internal_error(message: str = "Internal server error") -> JSONResponse:
        """Create an internal error response"""
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "message": message,
                "type": "internal_error"
            }
        )


def log_error(request: Request, error: Exception, context: str = None) -> None:
    """Log error with context information"""
    error_info = {
        "url": str(request.url),
        "method": request.method,
        "client_ip": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent", "unknown"),
        "error_type": type(error).__name__,
        "error_message": str(error),
        "context": context
    }
    
    logger.error(f"Error occurred: {error_info}")


def create_error_response(
    status_code: int,
    message: str,
    error_type: str = "error",
    details: dict = None
) -> JSONResponse:
    """Create a standardized error response"""
    content = {
        "message": message,
        "type": error_type
    }
    
    if details:
        content["details"] = details
    
    return JSONResponse(
        status_code=status_code,
        content=content
    )
