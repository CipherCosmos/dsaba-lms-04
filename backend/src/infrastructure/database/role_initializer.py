"""
Role Initializer
Ensures all required roles exist in the database
"""

from sqlalchemy.orm import Session
from src.infrastructure.database.models import RoleModel
from src.domain.enums.user_role import UserRole
import logging

logger = logging.getLogger(__name__)


def ensure_roles_exist(db: Session) -> None:
    """
    Ensure all required roles exist in the database
    
    Creates missing roles if they don't exist
    """
    required_roles = [
        {"name": UserRole.ADMIN.value, "description": "System Administrator"},
        {"name": UserRole.PRINCIPAL.value, "description": "Principal"},
        {"name": UserRole.HOD.value, "description": "Head of Department"},
        {"name": UserRole.TEACHER.value, "description": "Teacher"},
        {"name": UserRole.STUDENT.value, "description": "Student"},
    ]
    
    created_count = 0
    for role_data in required_roles:
        existing_role = db.query(RoleModel).filter(RoleModel.name == role_data["name"]).first()
        if not existing_role:
            role = RoleModel(**role_data)
            db.add(role)
            created_count += 1
            logger.info(f"Created role: {role_data['name']}")
    
    if created_count > 0:
        db.commit()
        logger.info(f"✅ Created {created_count} missing roles")
    else:
        logger.debug("✅ All roles already exist")


def get_or_create_role(db: Session, role_name: str) -> RoleModel:
    """
    Get existing role or create it if it doesn't exist
    
    Args:
        db: Database session
        role_name: Role name (e.g., 'admin', 'student')
    
    Returns:
        RoleModel instance
    """
    role = db.query(RoleModel).filter(RoleModel.name == role_name).first()
    if not role:
        # Create role if it doesn't exist
        role = RoleModel(
            name=role_name,
            description=f"{role_name.capitalize()} role"
        )
        db.add(role)
        db.commit()
        db.refresh(role)
        logger.info(f"Created missing role: {role_name}")
    return role

