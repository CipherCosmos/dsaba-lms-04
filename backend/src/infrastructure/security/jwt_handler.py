"""
JWT Token Handler
JWT creation, validation, and blacklisting
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import redis

from src.config import settings
from src.domain.exceptions import (
    TokenExpiredError,
    TokenInvalidError,
    TokenRevokedError
)


class JWTHandler:
    """
    JWT token handler with Redis-based blacklisting
    
    Handles token creation, validation, and revocation
    """
    
    def __init__(self):
        self.secret_key = settings.JWT_SECRET_KEY
        self.algorithm = settings.JWT_ALGORITHM
        self.access_token_expire = timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
        self.refresh_token_expire = timedelta(
            days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        )
        
        # Redis client for token blacklist
        if settings.FEATURE_CACHING_ENABLED:
            self.redis_client = redis.Redis.from_url(
                settings.redis_url_str,
                password=settings.REDIS_PASSWORD,
                db=settings.REDIS_DB,
                decode_responses=True
            )
        else:
            self.redis_client = None
    
    def create_access_token(
        self,
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create access token
        
        Args:
            data: Data to encode in the token (e.g., {"sub": username})
            expires_delta: Optional custom expiration time
        
        Returns:
            Encoded JWT token
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + self.access_token_expire
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        })
        
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def create_refresh_token(
        self,
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create refresh token
        
        Args:
            data: Data to encode in the token
            expires_delta: Optional custom expiration time
        
        Returns:
            Encoded JWT refresh token
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + self.refresh_token_expire
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        })
        
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def decode_token(self, token: str) -> Dict[str, Any]:
        """
        Decode and validate token
        
        Args:
            token: JWT token to decode
        
        Returns:
            Decoded token payload
        
        Raises:
            TokenInvalidError: If token is invalid
            TokenExpiredError: If token is expired
            TokenRevokedError: If token is blacklisted
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check if token is blacklisted
            if self.is_token_blacklisted(token):
                raise TokenRevokedError()
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise TokenExpiredError()
        except JWTError:
            raise TokenInvalidError()
    
    def blacklist_token(self, token: str) -> None:
        """
        Add token to blacklist
        
        Args:
            token: Token to blacklist
        """
        if not self.redis_client:
            return  # Skip if Redis not available
        
        try:
            # Decode to get expiration
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                options={"verify_exp": False}
            )
            
            exp = payload.get("exp")
            if exp:
                # Calculate time until expiration
                exp_datetime = datetime.utcfromtimestamp(exp)
                now = datetime.utcnow()
                
                if exp_datetime > now:
                    ttl = int((exp_datetime - now).total_seconds())
                    # Store in Redis with TTL
                    self.redis_client.setex(
                        f"blacklist:{token}",
                        ttl,
                        "1"
                    )
        except Exception:
            pass  # Ignore errors in blacklisting
    
    def is_token_blacklisted(self, token: str) -> bool:
        """
        Check if token is blacklisted
        
        Args:
            token: Token to check
        
        Returns:
            True if blacklisted, False otherwise
        """
        if not self.redis_client:
            return False  # Skip if Redis not available
        
        try:
            return self.redis_client.exists(f"blacklist:{token}") > 0
        except Exception:
            return False  # Assume not blacklisted if Redis error
    
    def get_token_expiration(self, token: str) -> Optional[datetime]:
        """
        Get token expiration time
        
        Args:
            token: Token to check
        
        Returns:
            Expiration datetime if valid, None otherwise
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                options={"verify_exp": False}
            )
            exp = payload.get("exp")
            if exp:
                return datetime.utcfromtimestamp(exp)
        except Exception:
            pass
        
        return None


# Singleton instance
jwt_handler = JWTHandler()

