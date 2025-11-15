"""
Database Infrastructure
Initializes database models and relationships
"""

from .session import Base, get_db, create_tables, verify_database_connection

# Import models - this will trigger model registration
from . import models

# Models are imported - relationships should be configured in models.py
# No additional configuration needed here

# Export all models for convenience
from .models import *

__all__ = [
    "Base",
    "get_db",
    "create_tables",
    "verify_database_connection",
]
