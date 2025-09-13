import { ReactNode, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from '../../store/store'
import { AlertTriangle, Home } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles: string[]
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth)
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && user && !allowedRoles.includes(user.role)) {
      // Redirect to appropriate dashboard based on user role
      const dashboardPath = user.role === 'admin' ? '/admin/dashboard' :
                           user.role === 'teacher' ? '/teacher/dashboard' :
                           user.role === 'student' ? '/student/dashboard' :
                           user.role === 'hod' ? '/hod/dashboard' :
                           '/dashboard'
      
      navigate(dashboardPath, { replace: true })
    }
  }, [isAuthenticated, user, allowedRoles, navigate])

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Please log in to access this page.</p>
        </div>
      </div>
    )
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page. Redirecting you to your dashboard...
          </p>
          <button
            onClick={() => {
              const dashboardPath = user.role === 'admin' ? '/admin/dashboard' :
                                   user.role === 'teacher' ? '/teacher/dashboard' :
                                   user.role === 'student' ? '/student/dashboard' :
                                   user.role === 'hod' ? '/hod/dashboard' :
                                   '/dashboard'
              navigate(dashboardPath)
            }}
            className="btn-primary flex items-center space-x-2 mx-auto"
          >
            <Home size={18} />
            <span>Go to Dashboard</span>
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute