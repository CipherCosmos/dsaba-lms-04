import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { LogOut, User, Bell, GraduationCap } from 'lucide-react'
import { logout } from '../../store/slices/authSlice'
import { RootState, AppDispatch } from '../../store/store'

const Header = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)

  const handleLogout = () => {
    dispatch(logout())
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-md border-b border-gray-200/60 px-6 py-4 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
            <GraduationCap className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Internal Exam Management System
            </h1>
            <p className="text-xs text-gray-500">Learning Management Platform</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="p-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 relative group">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/20 rounded-full animate-ping"></span>
          </button>
          
          <div className="flex items-center space-x-3">
            <Link
              to="/profile"
              className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl px-4 py-2 transition-all duration-200 cursor-pointer border border-gray-200/60 shadow-sm hover:shadow-md transform hover:scale-105"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || `${user?.first_name} ${user?.last_name}`}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-200"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center ring-2 ring-blue-200">
                  <User size={18} className="text-white" />
                </div>
              )}
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold text-gray-800">
                  {user?.full_name || `${user?.first_name} ${user?.last_name}`}
                </span>
                <span className="text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-0.5 rounded-full font-medium">
                  {user?.role?.toUpperCase() || user?.roles?.[0]?.toUpperCase() || 'USER'}
                </span>
              </div>
            </Link>
            
            <button
              onClick={handleLogout}
              className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 transform hover:scale-110"
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