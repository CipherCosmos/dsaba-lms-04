import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { RoleGuard } from '../../core/guards/RoleGuard'
import { UserRole, Permission } from '../../core/types/permissions'

// Lazy load student pages for code splitting
const StudentAnalytics = lazy(() => import('../../pages/Student/StudentAnalytics'))
const StudentProgress = lazy(() => import('../../pages/Student/StudentProgress'))
const StudentDashboard = lazy(() => import('../../components/Dashboard/StudentDashboard'))

/**
 * Student Module Routes
 * All student routes with proper RBAC
 */
export const StudentRoutes = () => {
  return (
    <>
      <Route
        path="/student"
        element={
          <RoleGuard allowedRoles={[UserRole.STUDENT]}>
            <StudentDashboard />
          </RoleGuard>
        }
      />
      <Route
        path="/student/analytics"
        element={
          <RoleGuard
            allowedRoles={[UserRole.STUDENT]}
            requiredPermissions={[Permission.ANALYTICS_VIEW]}
          >
            <StudentAnalytics />
          </RoleGuard>
        }
      />
      <Route
        path="/student/progress"
        element={
          <RoleGuard
            allowedRoles={[UserRole.STUDENT]}
            requiredPermissions={[Permission.MARKS_READ]}
          >
            <StudentProgress />
          </RoleGuard>
        }
      />
    </>
  )
}
