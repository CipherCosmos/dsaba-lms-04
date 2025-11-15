import { ReactNode } from 'react'
import { useHasPermission, useHasAnyPermission, useHasAllPermissions } from '../hooks/usePermissions'
import { Permission } from '../../../core/types/permissions'

interface PermissionGateProps {
  children: ReactNode
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  fallback?: ReactNode
}

/**
 * PermissionGate - Conditionally render children based on permissions
 * 
 * Usage:
 * <PermissionGate permission={Permission.USER_CREATE}>
 *   <CreateUserButton />
 * </PermissionGate>
 * 
 * <PermissionGate permissions={[Permission.USER_CREATE, Permission.USER_UPDATE]} requireAll>
 *   <AdvancedUserActions />
 * </PermissionGate>
 */
export const PermissionGate = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
}: PermissionGateProps) => {
  let hasAccess = false

  if (permission) {
    hasAccess = useHasPermission(permission)
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? useHasAllPermissions(permissions)
      : useHasAnyPermission(permissions)
  } else {
    // If no permission specified, show content
    hasAccess = true
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

