"""
Redis Cache Client
Caching infrastructure for analytics, reports, and frequently accessed data
"""

import json
import pickle
from typing import Optional, Any, Union
from datetime import timedelta
import redis
from redis.exceptions import RedisError, ConnectionError

from src.config import settings
from src.shared.constants import CACHE_KEYS


class CacheService:
    """
    Redis cache service
    
    Provides caching functionality with TTL support
    """
    
    def __init__(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.from_url(
                str(settings.REDIS_URL),
                password=settings.REDIS_PASSWORD,
                db=settings.REDIS_DB,
                max_connections=settings.REDIS_MAX_CONNECTIONS,
                decode_responses=False,  # We'll handle encoding/decoding
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            # Test connection
            self.redis_client.ping()
            self._enabled = True
        except (ConnectionError, RedisError) as e:
            logger.warning(f"Redis connection failed: {e}. Caching disabled.")
            self.redis_client = None
            self._enabled = False
    
    @property
    def is_enabled(self) -> bool:
        """Check if caching is enabled"""
        return self._enabled and self.redis_client is not None
    
    def _serialize(self, value: Any) -> bytes:
        """Serialize value for storage"""
        try:
            # Try JSON first (for simple types)
            if isinstance(value, (dict, list, str, int, float, bool, type(None))):
                return json.dumps(value).encode('utf-8')
            # Use pickle for complex objects
            return pickle.dumps(value)
        except Exception as e:
            raise ValueError(f"Failed to serialize value: {e}")
    
    def _deserialize(self, value: bytes) -> Any:
        """Deserialize value from storage"""
        try:
            # Try JSON first
            decoded = value.decode('utf-8')
            return json.loads(decoded)
        except (UnicodeDecodeError, json.JSONDecodeError):
            # Fall back to pickle
            try:
                return pickle.loads(value)
            except Exception as e:
                raise ValueError(f"Failed to deserialize value: {e}")
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache
        
        Args:
            key: Cache key
        
        Returns:
            Cached value or None if not found
        """
        if not self.is_enabled:
            return None
        
        try:
            value = self.redis_client.get(key)
            if value is None:
                return None
            return self._deserialize(value)
        except (RedisError, ValueError) as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set value in cache
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (None = use default)
        
        Returns:
            True if successful, False otherwise
        """
        if not self.is_enabled:
            return False
        
        try:
            serialized = self._serialize(value)
            if ttl is None:
                ttl = settings.CACHE_TTL_MEDIUM
            
            return self.redis_client.setex(key, ttl, serialized)
        except (RedisError, ValueError) as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete value from cache
        
        Args:
            key: Cache key
        
        Returns:
            True if successful, False otherwise
        """
        if not self.is_enabled:
            return False
        
        try:
            return bool(self.redis_client.delete(key))
        except RedisError as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern
        
        Args:
            pattern: Redis key pattern (e.g., "analytics:*")
        
        Returns:
            Number of keys deleted
        """
        if not self.is_enabled:
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            if not keys:
                return 0
            return self.redis_client.delete(*keys)
        except RedisError as e:
            logger.error(f"Cache delete pattern error for {pattern}: {e}")
            return 0
    
    async def exists(self, key: str) -> bool:
        """
        Check if key exists in cache
        
        Args:
            key: Cache key
        
        Returns:
            True if exists, False otherwise
        """
        if not self.is_enabled:
            return False
        
        try:
            return bool(self.redis_client.exists(key))
        except RedisError:
            return False
    
    async def clear_all(self) -> bool:
        """
        Clear all cache (use with caution!)

        Returns:
            True if successful
        """
        if not self.is_enabled:
            return False

        try:
            self.redis_client.flushdb()
            return True
        except RedisError as e:
            logger.error(f"Cache clear error: {e}")
            return False

    async def clear_cache(self) -> bool:
        """
        Clear all cache keys from Redis

        Returns:
            True if successful
        """
        if not self.is_enabled:
            return False

        try:
            self.redis_client.flushdb()
            return True
        except RedisError as e:
            logger.error(f"Cache clear error: {e}")
            return False

    def get_cache_key(
        self,
        prefix: str,
        *args,
        **kwargs
    ) -> str:
        """
        Generate cache key from prefix and arguments
        
        Args:
            prefix: Key prefix (e.g., "analytics")
            *args: Positional arguments to include in key
            **kwargs: Keyword arguments to include in key
        
        Returns:
            Formatted cache key
        """
        parts = [prefix]
        
        if args:
            parts.extend(str(arg) for arg in args)
        
        if kwargs:
            sorted_kwargs = sorted(kwargs.items())
            parts.extend(f"{k}:{v}" for k, v in sorted_kwargs)
        
        return ":".join(parts)


# Singleton instance
_cache_service: Optional[CacheService] = None


def get_cache_service() -> CacheService:
    """Get cache service instance (singleton)"""
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service

