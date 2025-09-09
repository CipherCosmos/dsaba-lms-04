import { ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles: string[]
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth)

  if (!isAuthenticated || !user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to access this page.</p>
      </div>
    )
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">You don't have permission to access this page.</p>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute