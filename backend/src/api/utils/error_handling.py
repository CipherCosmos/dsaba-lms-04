"""
Error Handling Utilities
Provides consistent error handling across API endpoints
"""

from fastapi import HTTPException, status
from typing import Callable, Any
import logging
from functools import wraps

from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    ValidationError,
    BusinessRuleViolationError
)

logger = logging.getLogger(__name__)


def handle_exceptions(func: Callable) -> Callable:
    """
    Decorator to handle common exceptions in API endpoints
    
    Usage:
        @handle_exceptions
        async def my_endpoint(...):
            ...
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except EntityNotFoundError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        except EntityAlreadyExistsError as e:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e)
            )
        except ValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e)
            )
        except BusinessRuleViolationError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e)
            )
        except Exception as e:
            # Log unexpected errors
            logger.error(
                f"Unexpected error in {func.__name__}: {str(e)}",
                exc_info=True,
                extra={
                    "function": func.__name__,
                    "error_type": type(e).__name__,
                    "error_message": str(e)
                }
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An unexpected error occurred: {str(e)}"
            )
    return wrapper


def safe_execute(
    operation: Callable,
    error_message: str = "Operation failed",
    default_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR
) -> Any:
    """
    Safely execute an operation with proper error handling
    
    Args:
        operation: Function to execute
        error_message: Custom error message
        default_status: HTTP status code for unexpected errors
    
    Returns:
        Result of operation
    
    Raises:
        HTTPException: With appropriate status code
    """
    try:
        return operation()
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except EntityAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(
            f"{error_message}: {str(e)}",
            exc_info=True
        )
        raise HTTPException(
            status_code=default_status,
            detail=f"{error_message}: {str(e)}"
        )

