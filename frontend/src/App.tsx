import { useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from './store/store'
import { fetchCurrentUser, initializeAuth } from './store/slices/authSlice'
import { SidebarProvider } from './contexts/SidebarContext'
import PWAInstallPrompt from './components/PWA/PWAInstallPrompt'
import PWAStatus from './components/PWA/PWAStatus'
import { LoadingFallback } from './modules/shared/components/LoadingFallback'
import { ErrorBoundary } from './modules/shared/components/ErrorBoundary'
import { AdminRoutes } from './modules/admin/routes'
import { TeacherRoutes } from './modules/teacher/routes'
import { StudentRoutes } from './modules/student/routes'
import { HODRoutes } from './modules/hod/routes'
import Layout from './components/Layout/Layout'

// Lazy load auth and dashboard pages
const Login = lazy(() => import('./pages/Login'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))

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

  // Auth state managed by Redux

  if (loading) {
    return <LoadingFallback />
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <ErrorBoundary>
      <SidebarProvider>
        <Layout>
          <PWAInstallPrompt />
          <PWAStatus />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              
              {/* Role-based modular routes */}
              <AdminRoutes />
              <TeacherRoutes />
              <StudentRoutes />
              <HODRoutes />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Layout>
      </SidebarProvider>
    </ErrorBoundary>
  )
}

export default App