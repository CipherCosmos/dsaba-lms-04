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
const AcademicYearManagement = lazy(() => import('../../pages/Admin/AcademicYearManagement'))
const BatchInstanceManagement = lazy(() => import('../../pages/Admin/BatchInstanceManagement'))
const MarksFreeze = lazy(() => import('../../pages/Principal/MarksFreeze'))
const AdminDashboard = lazy(() => import('../../components/Dashboard/AdminDashboard'))

/**
 * Admin Module Routes
 * All admin routes with proper RBAC
 * Returns an array of Route elements for React Router v6
 */
export const AdminRoutes = () => {
  return [
    <Route
      key="admin"
      path="/admin"
      element={
        <RoleGuard allowedRoles={[UserRole.ADMIN]}>
          <AdminDashboard />
        </RoleGuard>
      }
    />,
    <Route
      key="admin-departments"
      path="/admin/departments"
      element={
        <RoleGuard
          allowedRoles={[UserRole.ADMIN, UserRole.HOD]}
          requiredPermissions={[Permission.DEPARTMENT_READ]}
        >
          <DepartmentManagement />
        </RoleGuard>
      }
    />,
    <Route
      key="admin-classes"
      path="/admin/classes"
      element={
        <RoleGuard
          allowedRoles={[UserRole.ADMIN, UserRole.HOD]}
          requiredPermissions={[Permission.SUBJECT_READ]}
        >
          <ClassManagement />
        </RoleGuard>
      }
    />,
    <Route
      key="admin-subjects"
      path="/admin/subjects"
      element={
        <RoleGuard
          allowedRoles={[UserRole.ADMIN, UserRole.HOD]}
          requiredPermissions={[Permission.SUBJECT_READ]}
        >
          <SubjectManagement />
        </RoleGuard>
      }
    />,
    <Route
      key="admin-users"
      path="/admin/users"
      element={
        <RoleGuard
          allowedRoles={[UserRole.ADMIN, UserRole.HOD]}
          requiredPermissions={[Permission.USER_READ]}
        >
          <UserManagement />
        </RoleGuard>
      }
    />,
    <Route
      key="admin-co-management"
      path="/admin/co-management"
      element={
        <RoleGuard
          allowedRoles={[UserRole.ADMIN, UserRole.HOD]}
          requiredPermissions={[Permission.CO_READ]}
        >
          <COManagement />
        </RoleGuard>
      }
    />,
    <Route
      key="admin-po-management"
      path="/admin/po-management"
      element={
        <RoleGuard
          allowedRoles={[UserRole.ADMIN, UserRole.HOD]}
          requiredPermissions={[Permission.CO_READ]}
        >
          <POManagement />
        </RoleGuard>
      }
    />,
    <Route
      key="admin-co-targets"
      path="/admin/co-targets"
      element={
        <RoleGuard
          allowedRoles={[UserRole.ADMIN, UserRole.HOD, UserRole.TEACHER]}
          requiredPermissions={[Permission.CO_UPDATE]}
        >
          <COTargetsManagement />
        </RoleGuard>
      }
    />,
    <Route
      key="admin-academic-years"
      path="/admin/academic-years"
      element={
        <RoleGuard
          allowedRoles={[UserRole.ADMIN, UserRole.PRINCIPAL]}
          requiredPermissions={[Permission.ACADEMIC_STRUCTURE_WRITE]}
        >
          <AcademicYearManagement />
        </RoleGuard>
      }
    />,
    <Route
      key="admin-batch-instances"
      path="/admin/batch-instances"
      element={
        <RoleGuard
          allowedRoles={[UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.HOD]}
          requiredPermissions={[Permission.ACADEMIC_STRUCTURE_WRITE]}
        >
          <BatchInstanceManagement />
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
  ]
}

