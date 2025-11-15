"""
User Role Enumerations
Defines all user roles in the system
"""

from enum import Enum


class UserRole(str, Enum):
    """
    User roles in the system
    
    Hierarchy:
    - PRINCIPAL: Highest level, full access
    - HOD: Department level, manage department
    - TEACHER: Subject level, manage assigned subjects
    - STUDENT: Read-only access to own data
    """
    
    ADMIN = "admin"  # System administrator (highest level)
    PRINCIPAL = "principal"
    HOD = "hod"
    TEACHER = "teacher"
    STUDENT = "student"
    
    def __str__(self) -> str:
        return self.value
    
    @property
    def display_name(self) -> str:
        """Human-readable name"""
        return {
            self.ADMIN: "Administrator",
            self.PRINCIPAL: "Principal",
            self.HOD: "Head of Department",
            self.TEACHER: "Teacher",
            self.STUDENT: "Student",
        }[self]
    
    @property
    def hierarchy_level(self) -> int:
        """Hierarchy level (higher number = more privileges)"""
        return {
            self.STUDENT: 1,
            self.TEACHER: 2,
            self.HOD: 3,
            self.PRINCIPAL: 4,
            self.ADMIN: 5,
        }[self]
    
    def has_higher_privilege_than(self, other: "UserRole") -> bool:
        """Check if this role has higher privilege than another"""
        return self.hierarchy_level > other.hierarchy_level
    
    @classmethod
    def get_all_roles(cls) -> list["UserRole"]:
        """Get all roles"""
        return list(cls)
    
    @classmethod
    def get_management_roles(cls) -> list["UserRole"]:
        """Get roles that can manage other users"""
        return [cls.ADMIN, cls.PRINCIPAL, cls.HOD]
    
    @classmethod
    def get_teaching_roles(cls) -> list["UserRole"]:
        """Get roles that can teach"""
        return [cls.TEACHER, cls.HOD]


class Permission(str, Enum):
    """
    Granular permissions for actions
    
    Format: RESOURCE:ACTION
    """
    
    # User management
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"
    USER_LIST = "user:list"
    
    # Department management
    DEPARTMENT_CREATE = "department:create"
    DEPARTMENT_READ = "department:read"
    DEPARTMENT_UPDATE = "department:update"
    DEPARTMENT_DELETE = "department:delete"
    
    # Exam management
    EXAM_CREATE = "exam:create"
    EXAM_READ = "exam:read"
    EXAM_UPDATE = "exam:update"
    EXAM_DELETE = "exam:delete"
    EXAM_PUBLISH = "exam:publish"
    
    # Marks management
    MARKS_ENTER = "marks:enter"
    MARKS_READ = "marks:read"
    MARKS_UPDATE = "marks:update"
    MARKS_OVERRIDE = "marks:override"  # After lock period
    
    # Report generation
    REPORT_GENERATE = "report:generate"
    REPORT_EXPORT = "report:export"
    
    # Analytics access
    ANALYTICS_VIEW = "analytics:view"
    ANALYTICS_DEPARTMENT = "analytics:department"
    ANALYTICS_INSTITUTION = "analytics:institution"
    
    def __str__(self) -> str:
        return self.value


# Role-Permission mapping
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [
        # Full system access (same as PRINCIPAL but for system administration)
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.USER_LIST,
        Permission.DEPARTMENT_CREATE,
        Permission.DEPARTMENT_READ,
        Permission.DEPARTMENT_UPDATE,
        Permission.DEPARTMENT_DELETE,
        Permission.EXAM_CREATE,
        Permission.EXAM_READ,
        Permission.EXAM_UPDATE,
        Permission.EXAM_DELETE,
        Permission.EXAM_PUBLISH,
        Permission.MARKS_ENTER,
        Permission.MARKS_READ,
        Permission.MARKS_UPDATE,
        Permission.MARKS_OVERRIDE,
        Permission.REPORT_GENERATE,
        Permission.REPORT_EXPORT,
        Permission.ANALYTICS_VIEW,
        Permission.ANALYTICS_DEPARTMENT,
        Permission.ANALYTICS_INSTITUTION,
    ],
    UserRole.PRINCIPAL: [
        # Full access to everything
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.USER_LIST,
        Permission.DEPARTMENT_CREATE,
        Permission.DEPARTMENT_READ,
        Permission.DEPARTMENT_UPDATE,
        Permission.DEPARTMENT_DELETE,
        Permission.EXAM_CREATE,
        Permission.EXAM_READ,
        Permission.EXAM_UPDATE,
        Permission.EXAM_DELETE,
        Permission.EXAM_PUBLISH,
        Permission.MARKS_ENTER,
        Permission.MARKS_READ,
        Permission.MARKS_UPDATE,
        Permission.MARKS_OVERRIDE,
        Permission.REPORT_GENERATE,
        Permission.REPORT_EXPORT,
        Permission.ANALYTICS_VIEW,
        Permission.ANALYTICS_DEPARTMENT,
        Permission.ANALYTICS_INSTITUTION,
    ],
    UserRole.HOD: [
        # Department-level access
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.USER_LIST,
        Permission.DEPARTMENT_READ,
        Permission.EXAM_CREATE,
        Permission.EXAM_READ,
        Permission.EXAM_UPDATE,
        Permission.EXAM_DELETE,
        Permission.EXAM_PUBLISH,
        Permission.MARKS_ENTER,
        Permission.MARKS_READ,
        Permission.MARKS_UPDATE,
        Permission.MARKS_OVERRIDE,
        Permission.REPORT_GENERATE,
        Permission.REPORT_EXPORT,
        Permission.ANALYTICS_VIEW,
        Permission.ANALYTICS_DEPARTMENT,
    ],
    UserRole.TEACHER: [
        # Subject-level access
        Permission.USER_READ,  # Can view students
        Permission.EXAM_CREATE,
        Permission.EXAM_READ,
        Permission.EXAM_UPDATE,
        Permission.EXAM_DELETE,
        Permission.MARKS_ENTER,
        Permission.MARKS_READ,
        Permission.MARKS_UPDATE,
        Permission.REPORT_GENERATE,
        Permission.ANALYTICS_VIEW,
    ],
    UserRole.STUDENT: [
        # Read-only access to own data
        Permission.MARKS_READ,
        Permission.REPORT_EXPORT,
        Permission.ANALYTICS_VIEW,
    ],
}


def get_permissions_for_role(role: UserRole) -> list[Permission]:
    """Get all permissions for a given role"""
    return ROLE_PERMISSIONS.get(role, [])


def has_permission(role: UserRole, permission: Permission) -> bool:
    """Check if a role has a specific permission"""
    return permission in ROLE_PERMISSIONS.get(role, [])

