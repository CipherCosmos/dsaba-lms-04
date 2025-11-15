import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { RoleGuard } from '../../core/guards/RoleGuard'
import { UserRole, Permission } from '../../core/types/permissions'

// Lazy load admin pages for code splitting
const DepartmentManagement = lazy(() => import('../../pages/Admin/DepartmentManagement'))
const ClassManagement = lazy(() => import('../../pages/Admin/ClassManagement'))
const SubjectManagement = lazy(() => import('../../pages/Admin/SubjectManagement'))
const UserManagement = lazy(() => import('../../pages/Admin/UserManagement'))
const COManagement = lazy(() => import('../../pages/Admin/COManagement'))
const POManagement = lazy(() => import('../../pages/Admin/POManagement'))
const COTargetsManagement = lazy(() => import('../../pages/Admin/COTargetsManagement'))
const AdminDashboard = lazy(() => import('../../components/Dashboard/AdminDashboard'))

/**
 * Admin Module Routes
 * All admin routes with proper RBAC
 */
export const AdminRoutes = () => {
  return (
    <>
      <Route
        path="/admin"
        element={
          <RoleGuard allowedRoles={[UserRole.ADMIN]}>
            <AdminDashboard />
          </RoleGuard>
        }
      />
      <Route
        path="/admin/departments"
        element={
          <RoleGuard
            allowedRoles={[UserRole.ADMIN, UserRole.HOD]}
            requiredPermissions={[Permission.DEPARTMENT_READ]}
          >
            <DepartmentManagement />
          </RoleGuard>
        }
      />
      <Route
        path="/admin/classes"
        element={
          <RoleGuard
            allowedRoles={[UserRole.ADMIN, UserRole.HOD]}
            requiredPermissions={[Permission.SUBJECT_READ]}
          >
            <ClassManagement />
          </RoleGuard>
        }
      />
      <Route
        path="/admin/subjects"
        element={
          <RoleGuard
            allowedRoles={[UserRole.ADMIN, UserRole.HOD]}
            requiredPermissions={[Permission.SUBJECT_READ]}
          >
            <SubjectManagement />
          </RoleGuard>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RoleGuard
            allowedRoles={[UserRole.ADMIN, UserRole.HOD]}
            requiredPermissions={[Permission.USER_READ]}
          >
            <UserManagement />
          </RoleGuard>
        }
      />
      <Route
        path="/admin/co-management"
        element={
          <RoleGuard
            allowedRoles={[UserRole.ADMIN, UserRole.HOD]}
            requiredPermissions={[Permission.CO_READ]}
          >
            <COManagement />
          </RoleGuard>
        }
      />
      <Route
        path="/admin/po-management"
        element={
          <RoleGuard
            allowedRoles={[UserRole.ADMIN, UserRole.HOD]}
            requiredPermissions={[Permission.CO_READ]}
          >
            <POManagement />
          </RoleGuard>
        }
      />
      <Route
        path="/admin/co-targets"
        element={
          <RoleGuard
            allowedRoles={[UserRole.ADMIN, UserRole.HOD, UserRole.TEACHER]}
            requiredPermissions={[Permission.CO_UPDATE]}
          >
            <COTargetsManagement />
          </RoleGuard>
        }
      />
    </>
  )
}

