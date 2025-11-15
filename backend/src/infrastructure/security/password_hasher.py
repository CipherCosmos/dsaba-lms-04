"""
Password Hashing
Secure password hashing with bcrypt
"""

from passlib.context import CryptContext
from src.config import settings


class PasswordHasher:
    """
    Password hashing service using bcrypt
    
    Provides secure password hashing and verification
    """
    
    def __init__(self):
        self.pwd_context = CryptContext(
            schemes=["bcrypt"],
            deprecated="auto",
            bcrypt__rounds=settings.BCRYPT_ROUNDS,
        )
    
    def hash(self, plain_password: str) -> str:
        """
        Hash a plain text password
        
        Args:
            plain_password: Plain text password
        
        Returns:
            Hashed password
        """
        return self.pwd_context.hash(plain_password)
    
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
            return self.pwd_context.verify(plain_password, hashed_password)
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
        return self.pwd_context.needs_update(hashed_password)


# Singleton instance
password_hasher = PasswordHasher()

