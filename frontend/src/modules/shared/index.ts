/**
 * Shared Module
 * Exports shared components, hooks, and utilities used across all role modules
 */

// Components
export { PermissionGate } from './components/PermissionGate'
export { LoadingFallback } from './components/LoadingFallback'
export { ErrorBoundary } from './components/ErrorBoundary'

// Hooks
export {
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions,
  useHasRole,
  useHasAnyRole,
  useUserRole,
} from './hooks/usePermissions'

// Re-export core types and guards
export { UserRole, Permission, hasPermission, hasAnyPermission, hasAllPermissions } from '../../core/types/permissions'
export { RoleGuard } from '../../core/guards/RoleGuard'

