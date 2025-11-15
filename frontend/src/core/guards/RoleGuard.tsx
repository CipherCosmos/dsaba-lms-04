import { ReactNode, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from '../../store/store'
import { UserRole, Permission, hasPermission, hasAnyPermission } from '../types/permissions'
import { AlertTriangle, Home } from 'lucide-react'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles?: UserRole[]
  requiredPermissions?: Permission[]
  requireAllPermissions?: boolean
  fallbackPath?: string
}

/**
 * RoleGuard - Comprehensive RBAC guard component
 * 
 * Features:
 * - Role-based access control
 * - Permission-based access control
 * - Automatic redirection on access denial
 * - Loading state handling
 */
export const RoleGuard = ({
  children,
  allowedRoles,
  requiredPermissions,
  requireAllPermissions = false,
  fallbackPath,
}: RoleGuardProps) => {
  const { user, isAuthenticated, loading } = useSelector((state: RootState) => state.auth)
  const navigate = useNavigate()

  // Normalize role from roles array if needed
  const userRole = user?.role || (user?.roles && user.roles.length > 0 ? user.roles[0] : null)

  useEffect(() => {
    // Don't navigate during loading or if user data is not ready
    if (loading || !user || !isAuthenticated) {
      return
    }

    // Ensure role is available before checking access
    if (!userRole) {
      console.error('User role not available', { user })
      return
    }

    // Check role-based access
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole as UserRole)) {
      const dashboardPath = getDashboardPath(userRole)
      // Use requestAnimationFrame to defer navigation until after render
      requestAnimationFrame(() => {
        navigate(fallbackPath || dashboardPath, { replace: true })
      })
      return
    }

    // Check permission-based access
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAccess = requireAllPermissions
        ? requiredPermissions.every(permission => hasPermission(userRole as UserRole, permission))
        : hasAnyPermission(userRole as UserRole, requiredPermissions)

      if (!hasAccess) {
        const dashboardPath = getDashboardPath(userRole)
        // Use requestAnimationFrame to defer navigation until after render
        requestAnimationFrame(() => {
          navigate(fallbackPath || dashboardPath, { replace: true })
        })
        return
      }
    }
  }, [isAuthenticated, user, userRole, loading, allowedRoles, requiredPermissions, requireAllPermissions, fallbackPath, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Please log in to access this page.</p>
        </div>
      </div>
    )
  }

  // Ensure role is available
  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-2">Unable to determine user role.</p>
          <p className="text-gray-500 text-sm">Please contact support.</p>
        </div>
      </div>
    )
  }

  // Check role access
  if (allowedRoles && !allowedRoles.includes(userRole as UserRole)) {
    return <AccessDenied userRole={userRole} />
  }

  // Check permission access
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAccess = requireAllPermissions
      ? requiredPermissions.every(permission => hasPermission(userRole as UserRole, permission))
      : hasAnyPermission(userRole as UserRole, requiredPermissions)

    if (!hasAccess) {
      return <AccessDenied userRole={userRole} />
    }
  }

  return <>{children}</>
}

/**
 * Access Denied Component
 */
const AccessDenied = ({ userRole }: { userRole: string }) => {
  const navigate = useNavigate()

  const getDashboardPath = () => {
    switch (userRole) {
      case 'admin':
        return '/admin'
      case 'teacher':
        return '/teacher'
      case 'student':
        return '/student'
      case 'hod':
        return '/hod'
      default:
        return '/'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-orange-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page. Redirecting you to your dashboard...
        </p>
        <button
          onClick={() => navigate(getDashboardPath())}
          className="btn-primary flex items-center space-x-2 mx-auto"
        >
          <Home size={18} />
          <span>Go to Dashboard</span>
        </button>
      </div>
    </div>
  )
}

/**
 * Helper function to get dashboard path for a role
 */
function getDashboardPath(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'teacher':
      return '/teacher'
    case 'student':
      return '/student'
    case 'hod':
      return '/hod'
    default:
      return '/'
  }
}

/**
 * Hook to check if user has permission
 */
export function useHasPermission(permission: Permission): boolean {
  const { user } = useSelector((state: RootState) => state.auth)
  if (!user) return false
  const userRole = user.role || (user.roles && user.roles.length > 0 ? user.roles[0] : null)
  if (!userRole) return false
  return hasPermission(userRole as UserRole, permission)
}

/**
 * Hook to check if user has any of the permissions
 */
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { user } = useSelector((state: RootState) => state.auth)
  if (!user) return false
  const userRole = user.role || (user.roles && user.roles.length > 0 ? user.roles[0] : null)
  if (!userRole) return false
  return hasAnyPermission(userRole as UserRole, permissions)
}

