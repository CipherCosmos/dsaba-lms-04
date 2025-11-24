"""
Application Configuration
Environment-based settings management using Pydantic
"""

from typing import Optional, List, Union
from pydantic_settings import BaseSettings
from pydantic import Field, PostgresDsn, RedisDsn, validator, HttpUrl
import os
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # ============================================
    # Application Settings
    # ============================================
    APP_NAME: str = "DSABA LMS"
    APP_VERSION: str = "2.0.0"
    API_VERSION: str = "v1"
    DEBUG: bool = False
    ENVIRONMENT: str = Field(default="development", env="ENV")
    
    # ============================================
    # Server Settings
    # ============================================
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True  # Hot reload for development
    
    # ============================================
    # Security Settings
    # ============================================
    JWT_SECRET_KEY: str = Field(..., env="JWT_SECRET_KEY")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    PASSWORD_MIN_LENGTH: int = 12
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_DIGITS: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = True
    
    BCRYPT_ROUNDS: int = 14  # High security
    
    # CORS settings
    CORS_ORIGINS: Union[List[str], str] = Field(
        default=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
        env="CORS_ORIGINS"
    )
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # Frontend URL for password reset links
    FRONTEND_URL: Optional[str] = Field(default="http://localhost:5173", env="FRONTEND_URL")
    
    # ============================================
    # Database Settings
    # ============================================
    DATABASE_URL: Union[str, PostgresDsn] = Field(..., env="DATABASE_URL")
    DB_ECHO: bool = False  # SQL logging
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 40
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600  # 1 hour
    DB_POOL_PRE_PING: bool = True
    
    # ============================================
    # Redis Settings
    # ============================================
    REDIS_URL: RedisDsn = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    REDIS_MAX_CONNECTIONS: int = 50
    
    # Cache TTL settings (seconds)
    CACHE_TTL_SHORT: int = 300  # 5 minutes
    CACHE_TTL_MEDIUM: int = 1800  # 30 minutes
    CACHE_TTL_LONG: int = 3600  # 1 hour
    CACHE_TTL_VERY_LONG: int = 86400  # 24 hours
    
    # ============================================
    # Celery Settings
    # ============================================
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/1", env="CELERY_BROKER_URL")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/2", env="CELERY_RESULT_BACKEND")
    CELERY_TASK_ALWAYS_EAGER: bool = False  # Set True for testing
    
    # ============================================
    # Storage Settings
    # ============================================
    STORAGE_TYPE: str = "local"  # "local" or "s3"
    
    # Local storage
    UPLOAD_DIR: str = "uploads"
    REPORT_DIR: str = "reports"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # S3 storage
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: Optional[str] = None
    AWS_S3_CDN_URL: Optional[str] = None
    
    # ============================================
    # Email Settings
    # ============================================
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "DSABA LMS"
    SMTP_USE_TLS: bool = True
    
    # ============================================
    # Rate Limiting
    # ============================================
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 100
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 5
    RATE_LIMIT_BURST: int = 200
    
    # ============================================
    # Logging Settings
    # ============================================
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # "json" or "text"
    LOG_FILE: Optional[str] = "logs/app.log"
    LOG_ROTATION: str = "1 day"
    LOG_RETENTION: str = "30 days"
    
    # ============================================
    # Monitoring Settings
    # ============================================
    SENTRY_DSN: Optional[str] = None
    SENTRY_ENVIRONMENT: str = "development"
    SENTRY_TRACES_SAMPLE_RATE: float = 1.0

    PROMETHEUS_ENABLED: bool = False
    PROMETHEUS_PORT: int = 9090

    # ============================================
    # Audit Settings
    # ============================================
    AUDIT_API_REQUESTS: bool = True
    AUDIT_SENSITIVE_DATA_ACCESS: bool = True
    AUDIT_RETENTION_DAYS: int = 365  # Keep audit logs for 1 year

    # ============================================
    # Backup Settings
    # ============================================
    BACKUP_DIR: str = "backups"
    BACKUP_RETENTION_DAYS: int = 30
    BACKUP_SCHEDULE_ENABLED: bool = True
    BACKUP_SCHEDULE_HOUR: int = 2  # 2 AM daily
    BACKUP_COMPRESSION_ENABLED: bool = True
    
    # ============================================
    # Feature Flags
    # ============================================
    FEATURE_CACHING_ENABLED: bool = True
    FEATURE_CELERY_ENABLED: bool = True
    FEATURE_EMAIL_ENABLED: bool = False
    FEATURE_SMS_ENABLED: bool = False
    FEATURE_WEBSOCKET_ENABLED: bool = False
    
    # ============================================
    # Business Logic Settings
    # ============================================
    # Marks edit window
    MARKS_EDIT_WINDOW_DAYS: int = 7
    
    # Grading scale (default)
    GRADING_SCALE: dict = {
        "A+": 90,
        "A": 80,
        "B+": 70,
        "B": 60,
        "C": 50,
        "D": 40,
        "F": 0
    }
    
    # Internal calculation method (default)
    INTERNAL_CALCULATION_METHOD: str = "best"  # "best", "avg", "weighted"
    
    # Pagination defaults
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 200
    
    # ============================================
    # Testing Settings
    # ============================================
    TESTING: bool = False
    TEST_DATABASE_URL: Optional[PostgresDsn] = None
    
    # ============================================
    # Validators
    # ============================================
    @validator("JWT_SECRET_KEY")
    def validate_jwt_secret(cls, v):
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
        return v
    
    @validator("ENVIRONMENT")
    def validate_environment(cls, v):
        allowed = ["development", "staging", "production", "test"]
        if v not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of {allowed}")
        return v
    
    @validator("INTERNAL_CALCULATION_METHOD")
    def validate_internal_method(cls, v):
        allowed = ["best", "avg", "weighted"]
        if v not in allowed:
            raise ValueError(f"INTERNAL_CALCULATION_METHOD must be one of {allowed}")
        return v
    
    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS_ORIGINS from comma-separated string or list"""
        if isinstance(v, str):
            # Split by comma and strip whitespace
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    # ============================================
    # Computed Properties
    # ============================================
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"
    
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"
    
    @property
    def is_testing(self) -> bool:
        return self.TESTING
    
    @property
    def api_prefix(self) -> str:
        return f"/api/{self.API_VERSION}"
    
    @property
    def database_url_sync(self) -> str:
        """Synchronous database URL for SQLAlchemy"""
        return str(self.DATABASE_URL)
    
    @property
    def redis_url_str(self) -> str:
        """Redis URL as string"""
        return str(self.REDIS_URL)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields from old .env files


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance
    
    Uses lru_cache to ensure settings are loaded only once
    """
    return Settings()


# Convenience instance for imports
settings = get_settings()

