"""
Password Value Object
Strong password with validation
"""

import re
from typing import Optional
from ..entities.base import ValueObject
from ..exceptions.validation_exceptions import WeakPasswordError


class Password(ValueObject):
    """
    Password value object
    
    Ensures password meets security requirements
    """
    
    MIN_LENGTH = 12
    MAX_LENGTH = 128
    
    COMMON_PASSWORDS = {
        'password', 'password123', '123456', '123456789', 'qwerty',
        'abc123', 'monkey', '1234567', 'letmein', 'trustno1',
        'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
        'ashley', 'bailey', 'passw0rd', 'shadow', '123123',
        'admin', 'admin123', 'welcome', 'welcome123', 'password1'
    }
    
    def __init__(
        self,
        plain_password: str,
        require_uppercase: bool = True,
        require_lowercase: bool = True,
        require_digits: bool = True,
        require_special: bool = True
    ):
        """
        Create password with validation
        
        Args:
            plain_password: Plain text password
            require_uppercase: Require at least one uppercase letter
            require_lowercase: Require at least one lowercase letter
            require_digits: Require at least one digit
            require_special: Require at least one special character
        
        Raises:
            WeakPasswordError: If password doesn't meet requirements
        """
        if not plain_password:
            raise WeakPasswordError("Password cannot be empty")
        
        self._validate(
            plain_password,
            require_uppercase,
            require_lowercase,
            require_digits,
            require_special
        )
        
        self._password = plain_password
    
    def _validate(
        self,
        password: str,
        require_uppercase: bool,
        require_lowercase: bool,
        require_digits: bool,
        require_special: bool
    ) -> None:
        """Validate password strength"""
        
        # Check length
        if len(password) < self.MIN_LENGTH:
            raise WeakPasswordError(
                f"Password must be at least {self.MIN_LENGTH} characters long"
            )
        
        if len(password) > self.MAX_LENGTH:
            raise WeakPasswordError(
                f"Password must be at most {self.MAX_LENGTH} characters long"
            )
        
        # Check for common passwords
        if password.lower() in self.COMMON_PASSWORDS:
            raise WeakPasswordError("Password is too common")
        
        # Check character requirements
        if require_uppercase and not re.search(r'[A-Z]', password):
            raise WeakPasswordError("Password must contain at least one uppercase letter")
        
        if require_lowercase and not re.search(r'[a-z]', password):
            raise WeakPasswordError("Password must contain at least one lowercase letter")
        
        if require_digits and not re.search(r'\d', password):
            raise WeakPasswordError("Password must contain at least one digit")
        
        if require_special and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise WeakPasswordError(
                "Password must contain at least one special character (!@#$%^&*...)"
            )
    
    @property
    def value(self) -> str:
        """Get plain password (use with caution)"""
        return self._password
    
    def calculate_strength(self) -> int:
        """
        Calculate password strength (0-100)
        
        Returns:
            Strength score from 0 to 100
        """
        score = 0
        
        # Length bonus
        if len(self._password) >= 12:
            score += 20
        if len(self._password) >= 16:
            score += 10
        if len(self._password) >= 20:
            score += 10
        
        # Character variety
        if re.search(r'[a-z]', self._password):
            score += 10
        if re.search(r'[A-Z]', self._password):
            score += 10
        if re.search(r'\d', self._password):
            score += 10
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', self._password):
            score += 10
        
        # Multiple character types
        char_types = sum([
            bool(re.search(r'[a-z]', self._password)),
            bool(re.search(r'[A-Z]', self._password)),
            bool(re.search(r'\d', self._password)),
            bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', self._password)),
        ])
        score += char_types * 5
        
        # No repeated characters
        if not re.search(r'(.)\1{2,}', self._password):
            score += 10
        
        return min(score, 100)
    
    @property
    def strength_label(self) -> str:
        """Get strength label"""
        strength = self.calculate_strength()
        if strength < 40:
            return "Weak"
        elif strength < 70:
            return "Medium"
        elif strength < 90:
            return "Strong"
        else:
            return "Very Strong"
    
    def __str__(self) -> str:
        return "*" * len(self._password)
    
    def __repr__(self) -> str:
        return f"Password(*****, strength={self.strength_label})"

