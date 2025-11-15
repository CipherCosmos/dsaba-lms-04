import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { RoleGuard } from '../../core/guards/RoleGuard'
import { UserRole, Permission } from '../../core/types/permissions'

// Lazy load student pages for code splitting
const StudentAnalytics = lazy(() => import('../../pages/Student/StudentAnalytics'))
const StudentProgress = lazy(() => import('../../pages/Student/StudentProgress'))
const StudentResults = lazy(() => import('../../pages/Student/StudentResults'))
const StudentDashboard = lazy(() => import('../../components/Dashboard/StudentDashboard'))

/**
 * Student Module Routes
 * All student routes with proper RBAC
 * Returns an array of Route elements for React Router v6
 */
export const StudentRoutes = () => {
  return [
    <Route
      key="student"
      path="/student"
      element={
        <RoleGuard allowedRoles={[UserRole.STUDENT]}>
          <StudentDashboard />
        </RoleGuard>
      }
    />,
    <Route
      key="student-analytics"
      path="/student/analytics"
      element={
        <RoleGuard
          allowedRoles={[UserRole.STUDENT]}
          requiredPermissions={[Permission.ANALYTICS_VIEW]}
        >
          <StudentAnalytics />
        </RoleGuard>
      }
    />,
    <Route
      key="student-progress"
      path="/student/progress"
      element={
        <RoleGuard
          allowedRoles={[UserRole.STUDENT]}
          requiredPermissions={[Permission.MARKS_READ]}
        >
          <StudentProgress />
        </RoleGuard>
      }
    />,
    <Route
      key="student-results"
      path="/student/results"
      element={
        <RoleGuard
          allowedRoles={[UserRole.STUDENT]}
          requiredPermissions={[Permission.MARKS_READ]}
        >
          <StudentResults />
        </RoleGuard>
      }
    />,
  ]
}
