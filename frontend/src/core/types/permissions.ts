/**
 * Permission System
 * Defines all permissions and role-based access control
 */

export enum Permission {
  // User Management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  
  // Department Management
  DEPARTMENT_CREATE = 'department:create',
  DEPARTMENT_READ = 'department:read',
  DEPARTMENT_UPDATE = 'department:update',
  DEPARTMENT_DELETE = 'department:delete',
  
  // Subject Management
  SUBJECT_CREATE = 'subject:create',
  SUBJECT_READ = 'subject:read',
  SUBJECT_UPDATE = 'subject:update',
  SUBJECT_DELETE = 'subject:delete',
  
  // Exam Management
  EXAM_CREATE = 'exam:create',
  EXAM_READ = 'exam:read',
  EXAM_UPDATE = 'exam:update',
  EXAM_DELETE = 'exam:delete',
  EXAM_PUBLISH = 'exam:publish',
  
  // Marks Management
  MARKS_CREATE = 'marks:create',
  MARKS_READ = 'marks:read',
  MARKS_UPDATE = 'marks:update',
  MARKS_DELETE = 'marks:delete',
  MARKS_PUBLISH = 'marks:publish',
  MARKS_WRITE = 'marks:write', // General write permission for marks
  
  // Academic Structure
  ACADEMIC_STRUCTURE_READ = 'academic_structure:read',
  ACADEMIC_STRUCTURE_WRITE = 'academic_structure:write',
  
  // Student Management
  STUDENT_READ = 'student:read',
  STUDENT_WRITE = 'student:write',
  STUDENT_CREATE = 'student:create',
  STUDENT_UPDATE = 'student:update',
  
  // CO/PO Management
  CO_CREATE = 'co:create',
  CO_READ = 'co:read',
  CO_UPDATE = 'co:update',
  CO_DELETE = 'co:delete',
  
  PO_CREATE = 'po:create',
  PO_READ = 'po:read',
  PO_UPDATE = 'po:update',
  PO_DELETE = 'po:delete',
  
  // Analytics
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',
  
  // Reports
  REPORT_GENERATE = 'report:generate',
  REPORT_VIEW = 'report:view',
  REPORT_EXPORT = 'report:export',
  
  // Audit
  AUDIT_VIEW = 'audit:view',
}

export enum UserRole {
  ADMIN = 'admin',
  PRINCIPAL = 'principal',
  HOD = 'hod',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

/**
 * Role-Permission Mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Full access to everything
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.DEPARTMENT_CREATE,
    Permission.DEPARTMENT_READ,
    Permission.DEPARTMENT_UPDATE,
    Permission.DEPARTMENT_DELETE,
    Permission.SUBJECT_CREATE,
    Permission.SUBJECT_READ,
    Permission.SUBJECT_UPDATE,
    Permission.SUBJECT_DELETE,
    Permission.EXAM_CREATE,
    Permission.EXAM_READ,
    Permission.EXAM_UPDATE,
    Permission.EXAM_DELETE,
    Permission.EXAM_PUBLISH,
    Permission.MARKS_CREATE,
    Permission.MARKS_READ,
    Permission.MARKS_UPDATE,
    Permission.MARKS_DELETE,
    Permission.MARKS_PUBLISH,
    Permission.MARKS_WRITE,
    Permission.ACADEMIC_STRUCTURE_READ,
    Permission.ACADEMIC_STRUCTURE_WRITE,
    Permission.STUDENT_READ,
    Permission.STUDENT_WRITE,
    Permission.STUDENT_CREATE,
    Permission.STUDENT_UPDATE,
    Permission.CO_CREATE,
    Permission.CO_READ,
    Permission.CO_UPDATE,
    Permission.CO_DELETE,
    Permission.PO_CREATE,
    Permission.PO_READ,
    Permission.PO_UPDATE,
    Permission.PO_DELETE,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.REPORT_GENERATE,
    Permission.REPORT_VIEW,
    Permission.AUDIT_VIEW,
  ],
  [UserRole.PRINCIPAL]: [
    // Principal has full access like admin
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.DEPARTMENT_CREATE,
    Permission.DEPARTMENT_READ,
    Permission.DEPARTMENT_UPDATE,
    Permission.DEPARTMENT_DELETE,
    Permission.SUBJECT_CREATE,
    Permission.SUBJECT_READ,
    Permission.SUBJECT_UPDATE,
    Permission.SUBJECT_DELETE,
    Permission.EXAM_CREATE,
    Permission.EXAM_READ,
    Permission.EXAM_UPDATE,
    Permission.EXAM_DELETE,
    Permission.EXAM_PUBLISH,
    Permission.MARKS_CREATE,
    Permission.MARKS_READ,
    Permission.MARKS_UPDATE,
    Permission.MARKS_DELETE,
    Permission.MARKS_PUBLISH,
    Permission.MARKS_WRITE,
    Permission.ACADEMIC_STRUCTURE_READ,
    Permission.ACADEMIC_STRUCTURE_WRITE,
    Permission.STUDENT_READ,
    Permission.STUDENT_WRITE,
    Permission.STUDENT_CREATE,
    Permission.STUDENT_UPDATE,
    Permission.CO_CREATE,
    Permission.CO_READ,
    Permission.CO_UPDATE,
    Permission.CO_DELETE,
    Permission.PO_CREATE,
    Permission.PO_READ,
    Permission.PO_UPDATE,
    Permission.PO_DELETE,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.REPORT_GENERATE,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.AUDIT_VIEW,
  ],
  [UserRole.HOD]: [
    // Department-level access
    Permission.USER_READ,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.DEPARTMENT_READ,
    Permission.DEPARTMENT_UPDATE,
    Permission.SUBJECT_CREATE,
    Permission.SUBJECT_READ,
    Permission.SUBJECT_UPDATE,
    Permission.SUBJECT_DELETE,
    Permission.EXAM_READ,
    Permission.EXAM_PUBLISH,
    Permission.MARKS_READ,
    Permission.MARKS_UPDATE,
    Permission.MARKS_PUBLISH,
    Permission.MARKS_WRITE,
    Permission.ACADEMIC_STRUCTURE_READ,
    Permission.STUDENT_READ,
    Permission.STUDENT_WRITE,
    Permission.STUDENT_CREATE,
    Permission.STUDENT_UPDATE,
    Permission.CO_CREATE,
    Permission.CO_READ,
    Permission.CO_UPDATE,
    Permission.CO_DELETE,
    Permission.PO_CREATE,
    Permission.PO_READ,
    Permission.PO_UPDATE,
    Permission.PO_DELETE,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.REPORT_GENERATE,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.AUDIT_VIEW,
  ],
  [UserRole.TEACHER]: [
    // Subject-level access
    Permission.EXAM_CREATE,
    Permission.EXAM_READ,
    Permission.EXAM_UPDATE,
    Permission.MARKS_CREATE,
    Permission.MARKS_READ,
    Permission.MARKS_UPDATE,
    Permission.MARKS_WRITE,
    Permission.ACADEMIC_STRUCTURE_READ,
    Permission.STUDENT_READ,
    Permission.CO_READ,
    Permission.CO_UPDATE,
    Permission.ANALYTICS_VIEW,
    Permission.REPORT_VIEW,
  ],
  [UserRole.STUDENT]: [
    // Read-only access
    Permission.EXAM_READ,
    Permission.MARKS_READ,
    Permission.ANALYTICS_VIEW,
    Permission.REPORT_VIEW,
  ],
}

/**
 * Check if user has permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || []
  return rolePermissions.includes(permission)
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

