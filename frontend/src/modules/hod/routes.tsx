import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { RoleGuard } from '../../core/guards/RoleGuard'
import { UserRole, Permission } from '../../core/types/permissions'

// Lazy load HOD pages for code splitting
const HODAnalytics = lazy(() => import('../../pages/HOD/HODAnalytics'))
const HODUsers = lazy(() => import('../../pages/HOD/HODUsers'))
const HODClasses = lazy(() => import('../../pages/HOD/HODClasses'))
const HODSubjects = lazy(() => import('../../pages/HOD/HODSubjects'))
const HODStudentAnalytics = lazy(() => import('../../pages/HOD/HODStudentAnalytics'))
const HODTeacherAnalytics = lazy(() => import('../../pages/HOD/HODTeacherAnalytics'))
const Reports = lazy(() => import('../../pages/HOD/Reports'))
const HODReportManagement = lazy(() => import('../../pages/HOD/HODReportManagement'))
const StrategicDashboard = lazy(() => import('../../pages/HOD/StrategicDashboard'))
const HODDashboard = lazy(() => import('../../components/Dashboard/HODDashboard'))

/**
 * HOD Module Routes
 * All HOD routes with proper RBAC
 */
export const HODRoutes = () => {
  return (
    <>
      <Route
        path="/hod"
        element={
          <RoleGuard allowedRoles={[UserRole.HOD, UserRole.ADMIN]}>
            <HODDashboard />
          </RoleGuard>
        }
      />
      <Route
        path="/hod/analytics"
        element={
          <RoleGuard
            allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
            requiredPermissions={[Permission.ANALYTICS_VIEW]}
          >
            <HODAnalytics />
          </RoleGuard>
        }
      />
      <Route
        path="/hod/users"
        element={
          <RoleGuard
            allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
            requiredPermissions={[Permission.USER_READ]}
          >
            <HODUsers />
          </RoleGuard>
        }
      />
      <Route
        path="/hod/classes"
        element={
          <RoleGuard
            allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
            requiredPermissions={[Permission.SUBJECT_READ]}
          >
            <HODClasses />
          </RoleGuard>
        }
      />
      <Route
        path="/hod/subjects"
        element={
          <RoleGuard
            allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
            requiredPermissions={[Permission.SUBJECT_READ]}
          >
            <HODSubjects />
          </RoleGuard>
        }
      />
      <Route
        path="/hod/student-analytics"
        element={
          <RoleGuard
            allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
            requiredPermissions={[Permission.ANALYTICS_VIEW]}
          >
            <HODStudentAnalytics />
          </RoleGuard>
        }
      />
      <Route
        path="/hod/teacher-analytics"
        element={
          <RoleGuard
            allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
            requiredPermissions={[Permission.ANALYTICS_VIEW]}
          >
            <HODTeacherAnalytics />
          </RoleGuard>
        }
      />
      <Route
        path="/hod/reports"
        element={
          <RoleGuard
            allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
            requiredPermissions={[Permission.REPORT_GENERATE]}
          >
            <Reports />
          </RoleGuard>
        }
      />
      <Route
        path="/hod/report-management"
        element={
          <RoleGuard
            allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
            requiredPermissions={[Permission.REPORT_GENERATE]}
          >
            <HODReportManagement />
          </RoleGuard>
        }
      />
      <Route
        path="/hod/strategic-dashboard"
        element={
          <RoleGuard
            allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
            requiredPermissions={[Permission.ANALYTICS_VIEW]}
          >
            <StrategicDashboard />
          </RoleGuard>
        }
      />
    </>
  )
}

