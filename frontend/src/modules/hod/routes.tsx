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
const SemesterPublishing = lazy(() => import('../../pages/HOD/SemesterPublishing'))
const MultiDimensionalAnalytics = lazy(() => import('../../pages/HOD/MultiDimensionalAnalytics'))
const AuditTrail = lazy(() => import('../../pages/HOD/AuditTrail'))
const StudentEnrollment = lazy(() => import('../../pages/HOD/StudentEnrollment'))
const MarksApproval = lazy(() => import('../../pages/HOD/MarksApproval'))
const HODDashboard = lazy(() => import('../../components/Dashboard/HODDashboard'))

/**
 * HOD Module Routes
 * All HOD routes with proper RBAC
 * Returns an array of Route elements for React Router v6
 */
export const HODRoutes = () => {
  return [
    <Route
      key="hod"
      path="/hod"
      element={
        <RoleGuard allowedRoles={[UserRole.HOD, UserRole.ADMIN]}>
          <HODDashboard />
        </RoleGuard>
      }
    />,
    <Route
      key="hod-analytics"
      path="/hod/analytics"
      element={
        <RoleGuard
          allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
          requiredPermissions={[Permission.ANALYTICS_VIEW]}
        >
          <HODAnalytics />
        </RoleGuard>
      }
    />,
    <Route
      key="hod-users"
      path="/hod/users"
      element={
        <RoleGuard
          allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
          requiredPermissions={[Permission.USER_READ]}
        >
          <HODUsers />
        </RoleGuard>
      }
    />,
    <Route
      key="hod-classes"
      path="/hod/classes"
      element={
        <RoleGuard
          allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
          requiredPermissions={[Permission.SUBJECT_READ]}
        >
          <HODClasses />
        </RoleGuard>
      }
    />,
    <Route
      key="hod-subjects"
      path="/hod/subjects"
      element={
        <RoleGuard
          allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
          requiredPermissions={[Permission.SUBJECT_READ]}
        >
          <HODSubjects />
        </RoleGuard>
      }
    />,
    <Route
      key="hod-student-analytics"
      path="/hod/student-analytics"
      element={
        <RoleGuard
          allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
          requiredPermissions={[Permission.ANALYTICS_VIEW]}
        >
          <HODStudentAnalytics />
        </RoleGuard>
      }
    />,
    <Route
      key="hod-teacher-analytics"
      path="/hod/teacher-analytics"
      element={
        <RoleGuard
          allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
          requiredPermissions={[Permission.ANALYTICS_VIEW]}
        >
          <HODTeacherAnalytics />
        </RoleGuard>
      }
    />,
    <Route
      key="hod-reports"
      path="/hod/reports"
      element={
        <RoleGuard
          allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
          requiredPermissions={[Permission.REPORT_GENERATE]}
        >
          <Reports />
        </RoleGuard>
      }
    />,
    <Route
      key="hod-report-management"
      path="/hod/report-management"
      element={
        <RoleGuard
          allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
          requiredPermissions={[Permission.REPORT_GENERATE]}
        >
          <HODReportManagement />
        </RoleGuard>
      }
    />,
    <Route
      key="hod-strategic-dashboard"
      path="/hod/strategic-dashboard"
      element={
        <RoleGuard
          allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
          requiredPermissions={[Permission.ANALYTICS_VIEW]}
        >
          <StrategicDashboard />
        </RoleGuard>
      }
    />,
    <Route
      key="hod-semester-publishing"
      path="/hod/semester-publishing"
      element={
        <RoleGuard
          allowedRoles={[UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL]}
          requiredPermissions={[Permission.MARKS_PUBLISH]}
        >
          <SemesterPublishing />
        </RoleGuard>
      }
    />,
    <Route
      key="hod-multi-analytics"
      path="/hod/multi-analytics"
      element={
        <RoleGuard
          allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
          requiredPermissions={[Permission.ANALYTICS_VIEW]}
        >
          <MultiDimensionalAnalytics />
        </RoleGuard>
      }
    />,
    <Route
      key="hod-audit-trail"
      path="/hod/audit-trail"
      element={
        <RoleGuard
          allowedRoles={[UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL]}
          requiredPermissions={[Permission.AUDIT_VIEW]}
        >
          <AuditTrail />
        </RoleGuard>
      }
    />,
    <Route
      key="hod-student-enrollment"
      path="/hod/student-enrollment"
      element={
        <RoleGuard
          allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
          requiredPermissions={[Permission.STUDENT_WRITE]}
        >
          <StudentEnrollment />
        </RoleGuard>
      }
    />,
    <Route
      key="hod-marks-approval"
      path="/hod/marks-approval"
      element={
        <RoleGuard
          allowedRoles={[UserRole.HOD, UserRole.ADMIN]}
          requiredPermissions={[Permission.MARKS_WRITE]}
        >
          <MarksApproval />
        </RoleGuard>
      }
    />,
  ]
}

