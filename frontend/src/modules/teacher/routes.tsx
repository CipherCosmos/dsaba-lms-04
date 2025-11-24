import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { RoleGuard } from '../../core/guards/RoleGuard'
import { UserRole, Permission } from '../../core/types/permissions'

// Lazy load teacher pages for code splitting
const ExamConfiguration = lazy(() => import('../../pages/Teacher/ExamConfiguration'))
// Note: MarksEntry.tsx deprecated - using InternalMarksEntry for all marks operations
const InternalMarksEntry = lazy(() => import('../../pages/Teacher/InternalMarksEntry'))
const TeacherAnalytics = lazy(() => import('../../pages/Teacher/TeacherAnalytics'))
const AttainmentAnalytics = lazy(() => import('../../pages/Teacher/AttainmentAnalytics'))
const ReportManagement = lazy(() => import('../../pages/Teacher/ReportManagement'))
const BloomsTaxonomyAnalytics = lazy(() => import('../../pages/Teacher/BloomsTaxonomyAnalytics'))
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
          <InternalMarksEntry />
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
    <Route
      key="teacher-blooms-analytics"
      path="/teacher/blooms-analytics"
      element={
        <RoleGuard
          allowedRoles={[UserRole.TEACHER]}
          requiredPermissions={[Permission.ANALYTICS_VIEW]}
        >
          <BloomsTaxonomyAnalytics />
        </RoleGuard>
      }
    />,
  ]
}

