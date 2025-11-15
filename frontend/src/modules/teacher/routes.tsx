import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { RoleGuard } from '../../core/guards/RoleGuard'
import { UserRole, Permission } from '../../core/types/permissions'

// Lazy load teacher pages for code splitting
const ExamConfiguration = lazy(() => import('../../pages/Teacher/ExamConfiguration'))
const MarksEntry = lazy(() => import('../../pages/Teacher/MarksEntry'))
const TeacherAnalytics = lazy(() => import('../../pages/Teacher/TeacherAnalytics'))
const AttainmentAnalytics = lazy(() => import('../../pages/Teacher/AttainmentAnalytics'))
const ComprehensiveAnalytics = lazy(() => import('../../pages/Teacher/ComprehensiveAnalytics'))
const ReportManagement = lazy(() => import('../../pages/Teacher/ReportManagement'))
const TeacherDashboard = lazy(() => import('../../components/Dashboard/TeacherDashboard'))

/**
 * Teacher Module Routes
 * All teacher routes with proper RBAC
 * Returns an array of Route elements for React Router v6
 */
export const TeacherRoutes = () => {
  return [
    <Route
      key="teacher"
      path="/teacher"
      element={
        <RoleGuard allowedRoles={[UserRole.TEACHER]}>
          <TeacherDashboard />
        </RoleGuard>
      }
    />,
    <Route
      key="teacher-exam-config"
      path="/teacher/exam-config"
      element={
        <RoleGuard
          allowedRoles={[UserRole.TEACHER]}
          requiredPermissions={[Permission.EXAM_CREATE]}
        >
          <ExamConfiguration />
        </RoleGuard>
      }
    />,
    <Route
      key="teacher-marks-entry"
      path="/teacher/marks-entry"
      element={
        <RoleGuard
          allowedRoles={[UserRole.TEACHER]}
          requiredPermissions={[Permission.MARKS_CREATE]}
        >
          <MarksEntry />
        </RoleGuard>
      }
    />,
    <Route
      key="teacher-analytics"
      path="/teacher/analytics"
      element={
        <RoleGuard
          allowedRoles={[UserRole.TEACHER]}
          requiredPermissions={[Permission.ANALYTICS_VIEW]}
        >
          <TeacherAnalytics />
        </RoleGuard>
      }
    />,
    <Route
      key="teacher-attainment-analytics"
      path="/teacher/attainment-analytics"
      element={
        <RoleGuard
          allowedRoles={[UserRole.TEACHER]}
          requiredPermissions={[Permission.ANALYTICS_VIEW]}
        >
          <AttainmentAnalytics />
        </RoleGuard>
      }
    />,
    <Route
      key="teacher-comprehensive-analytics"
      path="/teacher/comprehensive-analytics"
      element={
        <RoleGuard
          allowedRoles={[UserRole.TEACHER]}
          requiredPermissions={[Permission.ANALYTICS_VIEW]}
        >
          <ComprehensiveAnalytics />
        </RoleGuard>
      }
    />,
    <Route
      key="teacher-reports"
      path="/teacher/reports"
      element={
        <RoleGuard
          allowedRoles={[UserRole.TEACHER]}
          requiredPermissions={[Permission.REPORT_GENERATE]}
        >
          <ReportManagement />
        </RoleGuard>
      }
    />,
  ]
}

