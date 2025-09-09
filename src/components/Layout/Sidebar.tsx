import { Link, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import {
  Home, Users, Building, BookOpen, GraduationCap,
  ClipboardList, BarChart3, FileText, Settings,
  TrendingUp, Award, PieChart
} from 'lucide-react'

const Sidebar = () => {
  const location = useLocation()
  const { user } = useSelector((state: RootState) => state.auth)

  const getMenuItems = () => {
    const baseItems = [
      { name: 'Dashboard', href: '/', icon: Home },
    ]

    switch (user?.role) {
      case 'admin':
      case 'hod':
        return [
          ...baseItems,
          { name: 'Departments', href: '/admin/departments', icon: Building },
          { name: 'Classes', href: '/admin/classes', icon: Users },
          { name: 'Subjects', href: '/admin/subjects', icon: BookOpen },
          { name: 'Users', href: '/admin/users', icon: GraduationCap },
          { name: 'Analytics', href: '/hod/analytics', icon: BarChart3 },
          { name: 'Reports', href: '/hod/reports', icon: FileText },
        ]
      
      case 'teacher':
        return [
          ...baseItems,
          { name: 'Exam Configuration', href: '/teacher/exam-config', icon: Settings },
          { name: 'Marks Entry', href: '/teacher/marks-entry', icon: ClipboardList },
          { name: 'Analytics', href: '/teacher/analytics', icon: PieChart },
        ]
      
      case 'student':
        return [
          ...baseItems,
          { name: 'My Analytics', href: '/student/analytics', icon: TrendingUp },
          { name: 'Progress Tracking', href: '/student/progress', icon: Award },
        ]
      
      default:
        return baseItems
    }
  }

  const menuItems = getMenuItems()

  return (
    <div className="fixed left-0 top-16 h-full w-64 bg-white shadow-sm border-r border-gray-200 z-40">
      <nav className="p-4 space-y-2 overflow-y-auto h-full pb-20">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default Sidebar