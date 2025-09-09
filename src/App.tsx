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
import ExamConfiguration from './pages/Teacher/ExamConfiguration'
import MarksEntry from './pages/Teacher/MarksEntry'
import TeacherAnalytics from './pages/Teacher/TeacherAnalytics'
import StudentAnalytics from './pages/Student/StudentAnalytics'
import StudentProgress from './pages/Student/StudentProgress'
import HODAnalytics from './pages/HOD/HODAnalytics'
import Reports from './pages/HOD/Reports'

function App() {
  const dispatch = useDispatch<AppDispatch>()
  const { user, isAuthenticated, loading } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    dispatch(initializeAuth())
    const token = localStorage.getItem('token')
    if (token && !user) {
      dispatch(fetchCurrentUser())
    }
  }, [dispatch, user])

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
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App