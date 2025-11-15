import { useSelector } from 'react-redux'
import { RootState } from '../../../store/store'
import { UserRole, Permission, hasPermission, hasAnyPermission, hasAllPermissions } from '../../../core/types/permissions'

/**
 * Hook to check if current user has a specific permission
 */
export function useHasPermission(permission: Permission): boolean {
  const { user } = useSelector((state: RootState) => state.auth)
  if (!user) return false
  return hasPermission(user.role as UserRole, permission)
}

/**
 * Hook to check if current user has any of the specified permissions
 */
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { user } = useSelector((state: RootState) => state.auth)
  if (!user) return false
  return hasAnyPermission(user.role as UserRole, permissions)
}

/**
 * Hook to check if current user has all of the specified permissions
 */
export function useHasAllPermissions(permissions: Permission[]): boolean {
  const { user } = useSelector((state: RootState) => state.auth)
  if (!user) return false
  return hasAllPermissions(user.role as UserRole, permissions)
}

/**
 * Hook to check if current user has a specific role
 */
export function useHasRole(role: UserRole): boolean {
  const { user } = useSelector((state: RootState) => state.auth)
  if (!user) return false
  return user.role === role
}

/**
 * Hook to check if current user has any of the specified roles
 */
export function useHasAnyRole(roles: UserRole[]): boolean {
  const { user } = useSelector((state: RootState) => state.auth)
  if (!user) return false
  return roles.includes(user.role as UserRole)
}

/**
 * Hook to get current user role
 */
export function useUserRole(): UserRole | null {
  const { user } = useSelector((state: RootState) => state.auth)
  return user ? (user.role as UserRole) : null
}

