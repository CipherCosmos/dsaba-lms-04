"""
Email Value Object
Immutable email with validation
"""

import re
from typing import Optional
from ..entities.base import ValueObject
from ..exceptions.validation_exceptions import InvalidEmailError


class Email(ValueObject):
    """
    Email value object
    
    Ensures email format is valid and normalized
    """
    
    # RFC 5322 compliant email regex
    EMAIL_REGEX = re.compile(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
    
    def __init__(self, email: str):
        if not email:
            raise InvalidEmailError("Email cannot be empty")
        
        email = email.strip().lower()  # Normalize
        
        if not self._is_valid(email):
            raise InvalidEmailError(f"Invalid email format: {email}")
        
        self._email = email
        self._local_part, self._domain = email.split('@')
    
    @property
    def email(self) -> str:
        return self._email
    
    @property
    def local_part(self) -> str:
        """Part before @"""
        return self._local_part
    
    @property
    def domain(self) -> str:
        """Part after @"""
        return self._domain
    
    def _is_valid(self, email: str) -> bool:
        """Validate email format"""
        if len(email) > 254:  # RFC 5321
            return False
        
        if not self.EMAIL_REGEX.match(email):
            return False
        
        return True
    
    def mask(self) -> str:
        """Return masked email (for display)"""
        local = self._local_part
        if len(local) > 2:
            masked_local = local[0] + '*' * (len(local) - 2) + local[-1]
        else:
            masked_local = '*' * len(local)
        
        return f"{masked_local}@{self._domain}"
    
    def __str__(self) -> str:
        return self._email
    
    def __repr__(self) -> str:
        return f"Email({self._email})"

