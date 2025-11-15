import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { LogOut, User, Bell } from 'lucide-react'
import { logout } from '../../store/slices/authSlice'
import { RootState, AppDispatch } from '../../store/store'

const Header = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)

  const handleLogout = () => {
    dispatch(logout())
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-200 px-6 py-4 z-50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Internal Exam Management System
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <Bell size={20} />
          </button>
          
          <div className="flex items-center space-x-3">
            <Link
              to="/profile"
              className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-2 transition-colors cursor-pointer"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || `${user?.first_name} ${user?.last_name}`}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <User size={18} className="text-gray-600" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {user?.full_name || `${user?.first_name} ${user?.last_name}`}
              </span>
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                {user?.role?.toUpperCase() || user?.roles?.[0]?.toUpperCase() || 'USER'}
              </span>
            </Link>
            
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header