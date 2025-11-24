"""
Redis Cache Client
Caching infrastructure for analytics, reports, and frequently accessed data
"""

import json
import pickle
import logging
from typing import Optional, Any, Union, Dict
from datetime import datetime, timedelta
import redis
from redis.exceptions import RedisError, ConnectionError
import asyncio
from functools import lru_cache

from src.config import settings
from src.shared.constants import CACHE_KEYS

logger = logging.getLogger(__name__)


class CacheService:
    """
    Multi-level cache service (Memory + Redis)

    Provides caching functionality with TTL support and memory layer for faster access
    """

    def __init__(self):
        """Initialize Redis connection and memory cache"""
        # Memory cache for frequently accessed data
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        self._memory_cache_ttl: Dict[str, datetime] = {}

        # Initialize Redis connection
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
            logger.warning(f"Redis connection failed: {e}. Using memory-only caching.")
            self.redis_client = None
            self._enabled = True  # Still enabled for memory cache
    
    @property
    def is_enabled(self) -> bool:
        """Check if caching is enabled"""
        return self._enabled

    def _is_memory_cache_valid(self, key: str) -> bool:
        """Check if memory cache entry is still valid"""
        if key not in self._memory_cache_ttl:
            return False
        return datetime.utcnow() < self._memory_cache_ttl[key]

    def _get_from_memory(self, key: str) -> Optional[Any]:
        """Get value from memory cache"""
        if self._is_memory_cache_valid(key):
            return self._memory_cache.get(key, {}).get('value')
        else:
            # Clean up expired entry
            self._memory_cache.pop(key, None)
            self._memory_cache_ttl.pop(key, None)
        return None

    def _set_in_memory(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in memory cache"""
        if ttl is None:
            ttl = settings.CACHE_TTL_SHORT  # Default to short TTL for memory

        expiry = datetime.utcnow() + timedelta(seconds=ttl)
        self._memory_cache[key] = {'value': value, 'ttl': ttl}
        self._memory_cache_ttl[key] = expiry

    def _invalidate_memory_cache(self, key: str) -> None:
        """Remove entry from memory cache"""
        self._memory_cache.pop(key, None)
        self._memory_cache_ttl.pop(key, None)

    def _clear_expired_memory_cache(self) -> None:
        """Clear expired entries from memory cache"""
        current_time = datetime.utcnow()
        expired_keys = [
            key for key, expiry in self._memory_cache_ttl.items()
            if current_time >= expiry
        ]
        for key in expired_keys:
            self._memory_cache.pop(key, None)
            self._memory_cache_ttl.pop(key, None)
    
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
        Get value from multi-level cache (Memory first, then Redis)

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        if not self.is_enabled:
            return None

        # Try memory cache first
        memory_value = self._get_from_memory(key)
        if memory_value is not None:
            logger.debug(f"Cache hit (memory): {key}")
            return memory_value

        # Fall back to Redis
        if self.redis_client:
            try:
                value = self.redis_client.get(key)
                if value is not None:
                    deserialized = self._deserialize(value)
                    # Store in memory cache for faster future access
                    self._set_in_memory(key, deserialized, ttl=settings.CACHE_TTL_SHORT)
                    logger.debug(f"Cache hit (redis): {key}")
                    return deserialized
            except (RedisError, ValueError) as e:
                logger.error(f"Cache get error for key {key}: {e}")

        logger.debug(f"Cache miss: {key}")
        return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set value in multi-level cache (Memory + Redis)

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (None = use default)

        Returns:
            True if successful, False otherwise
        """
        if not self.is_enabled:
            return False

        if ttl is None:
            ttl = settings.CACHE_TTL_MEDIUM

        # Store in memory cache (with shorter TTL for memory)
        memory_ttl = min(ttl, settings.CACHE_TTL_SHORT)
        self._set_in_memory(key, value, memory_ttl)

        # Store in Redis if available
        if self.redis_client:
            try:
                serialized = self._serialize(value)
                success = self.redis_client.setex(key, ttl, serialized)
                if success:
                    logger.debug(f"Cache set: {key} (TTL: {ttl}s)")
                return success
            except (RedisError, ValueError) as e:
                logger.error(f"Cache set error for key {key}: {e}")
                return False

        # If Redis is not available, memory cache is still valid
        return True
    
    async def delete(self, key: str) -> bool:
        """
        Delete value from multi-level cache

        Args:
            key: Cache key

        Returns:
            True if successful, False otherwise
        """
        if not self.is_enabled:
            return False

        # Remove from memory cache
        self._invalidate_memory_cache(key)

        # Remove from Redis
        if self.redis_client:
            try:
                result = bool(self.redis_client.delete(key))
                if result:
                    logger.debug(f"Cache deleted: {key}")
                return result
            except RedisError as e:
                logger.error(f"Cache delete error for key {key}: {e}")
                return False

        return True
    
    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern from multi-level cache

        Args:
            pattern: Redis key pattern (e.g., "analytics:*")

        Returns:
            Number of keys deleted
        """
        if not self.is_enabled:
            return 0

        deleted_count = 0

        # Clear matching keys from memory cache
        memory_keys_to_delete = [
            key for key in self._memory_cache.keys()
            if self._matches_pattern(key, pattern)
        ]
        for key in memory_keys_to_delete:
            self._invalidate_memory_cache(key)
            deleted_count += 1

        # Clear from Redis
        if self.redis_client:
            try:
                keys = self.redis_client.keys(pattern)
                if keys:
                    redis_deleted = self.redis_client.delete(*keys)
                    deleted_count += redis_deleted
                    logger.debug(f"Cache pattern delete: {pattern} ({redis_deleted} keys)")
            except RedisError as e:
                logger.error(f"Cache delete pattern error for {pattern}: {e}")

        return deleted_count

    def _matches_pattern(self, key: str, pattern: str) -> bool:
        """Simple pattern matching for cache keys"""
        # Convert Redis pattern to simple wildcard matching
        import fnmatch
        return fnmatch.fnmatch(key, pattern.replace('*', '*'))
    
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
        Clear all cache from both memory and Redis (use with caution!)

        Returns:
            True if successful
        """
        if not self.is_enabled:
            return False

        # Clear memory cache
        self._memory_cache.clear()
        self._memory_cache_ttl.clear()

        # Clear Redis cache
        if self.redis_client:
            try:
                self.redis_client.flushdb()
                logger.info("All cache cleared")
                return True
            except RedisError as e:
                logger.error(f"Cache clear error: {e}")
                return False

        return True

    async def clear_cache(self) -> bool:
        """
        Clear all cache keys from multi-level cache

        Returns:
            True if successful
        """
        return await self.clear_all()

    async def invalidate_by_tags(self, tags: list) -> int:
        """
        Invalidate cache entries by tags

        Args:
            tags: List of tags to invalidate

        Returns:
            Number of keys invalidated
        """
        if not self.is_enabled:
            return 0

        total_deleted = 0

        for tag in tags:
            # Invalidate by tag pattern
            pattern = f"tag:{tag}:*"
            deleted = await self.delete_pattern(pattern)
            total_deleted += deleted

            # Also try direct tag invalidation
            tag_key = f"tag:{tag}"
            if await self.exists(tag_key):
                await self.delete(tag_key)
                total_deleted += 1

        if total_deleted > 0:
            logger.info(f"Invalidated {total_deleted} cache entries for tags: {tags}")

        return total_deleted

    async def set_with_tags(
        self,
        key: str,
        value: Any,
        tags: Optional[list] = None,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set value in cache with tags for invalidation

        Args:
            key: Cache key
            value: Value to cache
            tags: List of tags for invalidation
            ttl: Time to live in seconds

        Returns:
            True if successful
        """
        # Set the main value
        success = await self.set(key, value, ttl)
        if not success or not tags:
            return success

        # Store tag relationships
        for tag in tags:
            tag_key = f"tag:{tag}:{key}"
            await self.set(tag_key, True, ttl)

        return True

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


def cached(
    ttl: Optional[int] = None,
    key_prefix: Optional[str] = None,
    tags: Optional[list] = None
):
    """
    Decorator for caching function results

    Args:
        ttl: Time to live in seconds
        key_prefix: Prefix for cache key
        tags: Tags for cache invalidation

    Returns:
        Decorated function
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            cache_service = get_cache_service()
            if not cache_service.is_enabled:
                return await func(*args, **kwargs)

            # Generate cache key
            prefix = key_prefix or f"{func.__module__}.{func.__name__}"
            cache_key = cache_service.get_cache_key(prefix, *args, **kwargs)

            # Try to get from cache
            cached_result = await cache_service.get(cache_key)
            if cached_result is not None:
                return cached_result

            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache_service.set_with_tags(cache_key, result, tags, ttl)
            return result

        # Preserve function metadata
        wrapper.__name__ = func.__name__
        wrapper.__doc__ = func.__doc__
        return wrapper
    return decorator


def invalidate_cache(tags: Optional[list] = None, patterns: Optional[list] = None):
    """
    Decorator to invalidate cache after function execution

    Args:
        tags: Tags to invalidate
        patterns: Key patterns to invalidate

    Returns:
        Decorated function
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)

            cache_service = get_cache_service()
            if cache_service.is_enabled:
                if tags:
                    await cache_service.invalidate_by_tags(tags)
                if patterns:
                    for pattern in patterns:
                        await cache_service.delete_pattern(pattern)

            return result

        # Preserve function metadata
        wrapper.__name__ = func.__name__
        wrapper.__doc__ = func.__doc__
        return wrapper
    return decorator

