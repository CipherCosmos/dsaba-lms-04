import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from './store/store'
import { fetchCurrentUser, initializeAuth } from './store/slices/authSlice'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import DepartmentManagement from './pages/Admin/DepartmentManagement'
import ClassManagement from './pages/Admin/ClassManagement'
import SubjectManagement from './pages/Admin/SubjectManagement'
import UserManagement from './pages/Admin/UserManagement'
import COManagement from './pages/Admin/COManagement'
import POManagement from './pages/Admin/POManagement'
import COTargetsManagement from './pages/Admin/COTargetsManagement'
import ExamConfiguration from './pages/Teacher/ExamConfiguration'
import MarksEntry from './pages/Teacher/MarksEntry'
import TeacherAnalytics from './pages/Teacher/TeacherAnalytics'
import AttainmentAnalytics from './pages/Teacher/AttainmentAnalytics'
import ComprehensiveAnalytics from './pages/Teacher/ComprehensiveAnalytics'
import ReportManagement from './pages/Teacher/ReportManagement'
import StudentAnalytics from './pages/Student/StudentAnalytics'
import StudentProgress from './pages/Student/StudentProgress'
import HODAnalytics from './pages/HOD/HODAnalytics'
import HODUsers from './pages/HOD/HODUsers'
import HODClasses from './pages/HOD/HODClasses'
import HODSubjects from './pages/HOD/HODSubjects'
import HODStudentAnalytics from './pages/HOD/HODStudentAnalytics'
import HODTeacherAnalytics from './pages/HOD/HODTeacherAnalytics'
import Reports from './pages/HOD/Reports'
import StrategicDashboard from './pages/HOD/StrategicDashboard'

function App() {
  const dispatch = useDispatch<AppDispatch>()
  const { user, isAuthenticated, loading } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    dispatch(initializeAuth())
    const token = localStorage.getItem('token')
    if (token) {
      dispatch(fetchCurrentUser())
    }
  }, [dispatch]) // Removed 'user' to prevent infinite loop

  // Debug logs for troubleshooting
  console.log('Auth state:', { user, isAuthenticated, loading })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        
        {/* Admin Routes */}
        <Route 
          path="/admin/departments" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <DepartmentManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/classes" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <ClassManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/subjects" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <SubjectManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <UserManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/co-management" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <COManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/po-management" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod']}>
              <POManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/co-targets" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'hod', 'teacher']}>
              <COTargetsManagement />
            </ProtectedRoute>
          } 
        />
        
        {/* Teacher Routes */}
        <Route 
          path="/teacher/exam-config" 
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <ExamConfiguration />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/teacher/marks-entry" 
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <MarksEntry />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/teacher/analytics" 
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherAnalytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/teacher/attainment-analytics" 
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <AttainmentAnalytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/teacher/comprehensive-analytics" 
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <ComprehensiveAnalytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/teacher/reports" 
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <ReportManagement />
            </ProtectedRoute>
          } 
        />
        
        {/* Student Routes */}
        <Route 
          path="/student/analytics" 
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentAnalytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student/progress" 
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentProgress />
            </ProtectedRoute>
          } 
        />
        
        {/* HOD Routes */}
        <Route 
          path="/hod/analytics" 
          element={
            <ProtectedRoute allowedRoles={['hod', 'admin']}>
              <HODAnalytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/hod/reports" 
          element={
            <ProtectedRoute allowedRoles={['hod', 'admin']}>
              <Reports />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/hod/strategic-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['hod', 'admin']}>
              <StrategicDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/hod/users" 
          element={
            <ProtectedRoute allowedRoles={['hod', 'admin']}>
              <HODUsers />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/hod/classes" 
          element={
            <ProtectedRoute allowedRoles={['hod', 'admin']}>
              <HODClasses />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/hod/subjects" 
          element={
            <ProtectedRoute allowedRoles={['hod', 'admin']}>
              <HODSubjects />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/hod/student-analytics" 
          element={
            <ProtectedRoute allowedRoles={['hod', 'admin']}>
              <HODStudentAnalytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/hod/teacher-analytics" 
          element={
            <ProtectedRoute allowedRoles={['hod', 'admin']}>
              <HODTeacherAnalytics />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App