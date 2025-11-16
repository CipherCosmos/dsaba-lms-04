import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { RoleGuard } from '../../core/guards/RoleGuard'
import { UserRole, Permission } from '../../core/types/permissions'

// Lazy load Principal pages for code splitting
const PrincipalDashboard = lazy(() => import('../../components/Dashboard/PrincipalDashboard'))
const MarksFreeze = lazy(() => import('../../pages/Principal/MarksFreeze'))
const AcademicYearManagement = lazy(() => import('../../pages/Admin/AcademicYearManagement'))
const DepartmentManagement = lazy(() => import('../../pages/Admin/DepartmentManagement'))
const UserManagement = lazy(() => import('../../pages/Admin/UserManagement'))
const AuditTrail = lazy(() => import('../../pages/HOD/AuditTrail'))
const Reports = lazy(() => import('../../pages/HOD/Reports'))

/**
 * Principal Module Routes
 * All Principal routes with proper RBAC
 * Returns an array of Route elements for React Router v6
 */
export const PrincipalRoutes = () => {
  return [
    <Route
      key="principal"
      path="/principal"
      element={
        <RoleGuard allowedRoles={[UserRole.PRINCIPAL, UserRole.ADMIN]}>
          <PrincipalDashboard />
        </RoleGuard>
      }
    />,
    <Route
      key="principal-marks-freeze"
      path="/principal/marks-freeze"
      element={
        <RoleGuard
          allowedRoles={[UserRole.PRINCIPAL, UserRole.ADMIN]}
          requiredPermissions={[Permission.MARKS_WRITE]}
        >
          <MarksFreeze />
        </RoleGuard>
      }
    />,
    <Route
      key="principal-academic-years"
      path="/principal/academic-years"
      element={
        <RoleGuard
          allowedRoles={[UserRole.PRINCIPAL, UserRole.ADMIN]}
          requiredPermissions={[Permission.ACADEMIC_STRUCTURE_WRITE]}
        >
          <AcademicYearManagement />
        </RoleGuard>
      }
    />,
    <Route
      key="principal-departments"
      path="/principal/departments"
      element={
        <RoleGuard
          allowedRoles={[UserRole.PRINCIPAL, UserRole.ADMIN]}
          requiredPermissions={[Permission.DEPARTMENT_READ]}
        >
          <DepartmentManagement />
        </RoleGuard>
      }
    />,
    <Route
      key="principal-users"
      path="/principal/users"
      element={
        <RoleGuard
          allowedRoles={[UserRole.PRINCIPAL, UserRole.ADMIN]}
          requiredPermissions={[Permission.USER_READ]}
        >
          <UserManagement />
        </RoleGuard>
      }
    />,
    <Route
      key="principal-audit-trail"
      path="/principal/audit-trail"
      element={
        <RoleGuard
          allowedRoles={[UserRole.PRINCIPAL, UserRole.ADMIN]}
          requiredPermissions={[Permission.AUDIT_VIEW]}
        >
          <AuditTrail />
        </RoleGuard>
      }
    />,
    <Route
      key="principal-reports"
      path="/principal/reports"
      element={
        <RoleGuard
          allowedRoles={[UserRole.PRINCIPAL, UserRole.ADMIN]}
          requiredPermissions={[Permission.REPORT_GENERATE]}
        >
          <Reports />
        </RoleGuard>
      }
    />,
  ]
}

