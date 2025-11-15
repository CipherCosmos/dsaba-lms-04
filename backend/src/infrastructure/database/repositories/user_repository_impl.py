"""
User Repository Implementation
SQLAlchemy implementation of IUserRepository
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from src.domain.repositories.user_repository import IUserRepository
from src.domain.entities.user import User
from src.domain.value_objects.email import Email
from src.domain.enums.user_role import UserRole
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError

from ..models import UserModel, UserRoleModel, RoleModel, StudentModel


class UserRepository(IUserRepository):
    """
    SQLAlchemy implementation of user repository
    
    Maps between domain User entity and UserModel database model
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: UserModel) -> User:
        """Convert database model to domain entity"""
        if not model:
            return None
        
        user = User(
            id=model.id,
            username=model.username,
            email=Email(model.email),
            first_name=model.first_name,
            last_name=model.last_name,
            hashed_password=model.hashed_password,
            is_active=model.is_active,
            email_verified=model.email_verified,
            phone_number=model.phone_number,
            avatar_url=model.avatar_url,
            bio=model.bio,
            created_at=model.created_at,
            updated_at=model.updated_at
        )
        
        # Load roles
        for user_role in model.user_roles:
            role_enum = UserRole(user_role.role.name)
            user.add_role(role_enum, department_id=user_role.department_id)
        
        return user
    
    def _to_model(self, entity: User) -> UserModel:
        """Convert domain entity to database model"""
        return UserModel(
            id=entity.id,
            username=entity.username,
            email=entity.email.email,
            first_name=entity.first_name,
            last_name=entity.last_name,
            hashed_password=entity.hashed_password,
            is_active=entity.is_active,
            email_verified=entity.email_verified,
            phone_number=entity.phone_number,
            avatar_url=entity.avatar_url,
            bio=entity.bio
        )
    
    async def get_by_id(self, id: int) -> Optional[User]:
        """Get user by ID"""
        model = self.db.query(UserModel).options(
            joinedload(UserModel.user_roles).joinedload(UserRoleModel.role)
        ).filter(UserModel.id == id).first()
        
        return self._to_entity(model)
    
    async def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        model = self.db.query(UserModel).options(
            joinedload(UserModel.user_roles).joinedload(UserRoleModel.role)
        ).filter(UserModel.username == username.lower()).first()
        
        return self._to_entity(model)
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        # Handle both Email value objects and strings
        email_str = email.email if hasattr(email, 'email') else email
        model = self.db.query(UserModel).options(
            joinedload(UserModel.user_roles).joinedload(UserRoleModel.role)
        ).filter(UserModel.email == email_str.lower()).first()
        
        return self._to_entity(model)
    
    async def get_by_role(
        self,
        role: UserRole,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """Get all users with a specific role"""
        models = self.db.query(UserModel).options(
            joinedload(UserModel.user_roles).joinedload(UserRoleModel.role)
        ).join(UserModel.user_roles).join(UserRoleModel.role).filter(
            RoleModel.name == role.value
        ).offset(skip).limit(limit).all()
        
        return [self._to_entity(model) for model in models]
    
    async def get_by_department(
        self,
        department_id: int,
        role: Optional[UserRole] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """Get all users in a department"""
        query = self.db.query(UserModel).options(
            joinedload(UserModel.user_roles).joinedload(UserRoleModel.role)
        ).join(UserModel.user_roles).filter(
            UserRoleModel.department_id == department_id
        )
        
        if role:
            query = query.join(UserRoleModel.role).filter(RoleModel.name == role.value)
        
        models = query.offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def username_exists(self, username: str) -> bool:
        """Check if username exists"""
        return self.db.query(UserModel).filter(
            UserModel.username == username.lower()
        ).count() > 0
    
    async def email_exists(self, email: str) -> bool:
        """Check if email exists"""
        # Handle both Email value objects and strings
        email_str = email.email if hasattr(email, 'email') else email
        return self.db.query(UserModel).filter(
            UserModel.email == email_str.lower()
        ).count() > 0
    
    async def get_active_users(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """Get all active users"""
        models = self.db.query(UserModel).options(
            joinedload(UserModel.user_roles).joinedload(UserRoleModel.role)
        ).filter(UserModel.is_active == True).offset(skip).limit(limit).all()
        
        return [self._to_entity(model) for model in models]
    
    async def search_by_name(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """Search users by name"""
        search_pattern = f"%{search_term}%"
        models = self.db.query(UserModel).options(
            joinedload(UserModel.user_roles).joinedload(UserRoleModel.role)
        ).filter(
            or_(
                UserModel.first_name.ilike(search_pattern),
                UserModel.last_name.ilike(search_pattern)
            )
        ).offset(skip).limit(limit).all()
        
        return [self._to_entity(model) for model in models]
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[User]:
        """Get all users with optional filtering"""
        query = self.db.query(UserModel).options(
            joinedload(UserModel.user_roles).joinedload(UserRoleModel.role)
        )
        
        if filters:
            if 'is_active' in filters:
                query = query.filter(UserModel.is_active == filters['is_active'])
            if 'email_verified' in filters:
                query = query.filter(UserModel.email_verified == filters['email_verified'])
        
        models = query.offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def create(self, entity: User) -> User:
        """Create a new user"""
        # Check for duplicates
        if await self.username_exists(entity.username):
            raise EntityAlreadyExistsError("User", "username", entity.username)
        
        if await self.email_exists(entity.email.email):
            raise EntityAlreadyExistsError("User", "email", entity.email.email)
        
        # Create user model
        model = self._to_model(entity)
        self.db.add(model)
        self.db.flush()  # Get ID
        
        # Create role associations
        for role in entity.roles:
            role_model = self.db.query(RoleModel).filter(RoleModel.name == role.value).first()
            if role_model:
                user_role = UserRoleModel(
                    user_id=model.id,
                    role_id=role_model.id,
                    department_id=entity.department_ids[0] if entity.department_ids else None
                )
                self.db.add(user_role)
        
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(model.id)
    
    async def update(self, entity: User) -> User:
        """Update existing user"""
        model = self.db.query(UserModel).filter(UserModel.id == entity.id).first()
        
        if not model:
            raise EntityNotFoundError("User", entity.id)
        
        # Update fields
        model.username = entity.username
        model.email = entity.email.email
        model.first_name = entity.first_name
        model.last_name = entity.last_name
        model.hashed_password = entity.hashed_password
        model.is_active = entity.is_active
        model.email_verified = entity.email_verified
        model.phone_number = entity.phone_number
        model.avatar_url = entity.avatar_url
        model.bio = entity.bio
        
        # Update roles (delete old, add new)
        self.db.query(UserRoleModel).filter(UserRoleModel.user_id == entity.id).delete()
        
        for role in entity.roles:
            role_model = self.db.query(RoleModel).filter(RoleModel.name == role.value).first()
            if role_model:
                user_role = UserRoleModel(
                    user_id=entity.id,
                    role_id=role_model.id,
                    department_id=entity.department_ids[0] if entity.department_ids else None
                )
                self.db.add(user_role)
        
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(entity.id)
    
    async def delete(self, id: int) -> bool:
        """Delete user"""
        model = self.db.query(UserModel).filter(UserModel.id == id).first()
        
        if not model:
            return False
        
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def exists(self, id: int) -> bool:
        """Check if user exists"""
        return self.db.query(UserModel).filter(UserModel.id == id).count() > 0
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count users with optional filters"""
        query = self.db.query(UserModel)
        
        if filters:
            if 'is_active' in filters:
                query = query.filter(UserModel.is_active == filters['is_active'])
            if 'email_verified' in filters:
                query = query.filter(UserModel.email_verified == filters['email_verified'])
        
        return query.count()
    
    async def get_student_by_roll_no(self, roll_no: str) -> Optional[User]:
        """
        Get student user by roll number
        
        Args:
            roll_no: Student roll number
            
        Returns:
            User if found, None otherwise
        """
        student_model = self.db.query(StudentModel).filter(
            StudentModel.roll_no == roll_no
        ).first()
        
        if not student_model:
            return None
        
        # Get user model
        user_model = self.db.query(UserModel).options(
            joinedload(UserModel.user_roles).joinedload(UserRoleModel.role)
        ).filter(UserModel.id == student_model.user_id).first()
        
        return self._to_entity(user_model)

