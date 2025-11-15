"""
Password Hashing
Secure password hashing with bcrypt
"""

import bcrypt
from src.config import settings


class PasswordHasher:
    """
    Password hashing service using bcrypt
    
    Provides secure password hashing and verification
    """
    
    def __init__(self):
        # Use bcrypt rounds from settings, default to 12
        self.rounds = getattr(settings, 'BCRYPT_ROUNDS', 12)
    
    def hash(self, plain_password: str) -> str:
        """
        Hash a plain text password
        
        Args:
            plain_password: Plain text password
        
        Returns:
            Hashed password
        """
        # Generate salt and hash password
        salt = bcrypt.gensalt(rounds=self.rounds)
        hashed = bcrypt.hashpw(plain_password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against its hash
        
        Args:
            plain_password: Plain text password
            hashed_password: Hashed password to verify against
        
        Returns:
            True if password matches, False otherwise
        """
        try:
            return bcrypt.checkpw(
                plain_password.encode('utf-8'),
                hashed_password.encode('utf-8')
            )
        except Exception:
            return False
    
    def needs_rehash(self, hashed_password: str) -> bool:
        """
        Check if a password hash needs to be rehashed
        
        This returns True if the hash was created with old parameters
        
        Args:
            hashed_password: Hashed password to check
        
        Returns:
            True if needs rehashing, False otherwise
        """
        try:
            # Extract rounds from bcrypt hash (format: $2b$rounds$...)
            if hashed_password.startswith('$2b$'):
                parts = hashed_password.split('$')
                if len(parts) >= 3:
                    stored_rounds = int(parts[2])
                    return stored_rounds < self.rounds
            return False
        except Exception:
            return False


# Singleton instance
password_hasher = PasswordHasher()

