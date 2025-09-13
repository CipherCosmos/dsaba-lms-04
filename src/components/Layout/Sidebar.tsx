import { Link, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import {
  Home, Users, Building, BookOpen, GraduationCap,
  ClipboardList, BarChart3, FileText, Settings,
  TrendingUp, Award, PieChart, Target, Layers, Gauge, Brain
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
        return [
          ...baseItems,
          { name: 'Departments', href: '/admin/departments', icon: Building },
          { name: 'Classes', href: '/admin/classes', icon: Users },
          { name: 'Subjects', href: '/admin/subjects', icon: BookOpen },
          { name: 'Users', href: '/admin/users', icon: GraduationCap },
          { name: 'CO Management', href: '/admin/co-management', icon: Target },
          { name: 'PO Management', href: '/admin/po-management', icon: Layers },
          { name: 'CO Targets', href: '/admin/co-targets', icon: Gauge },
          { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
          { name: 'Reports', href: '/admin/reports', icon: FileText },
        ]
      
      case 'hod':
        return [
          ...baseItems,
          { name: 'Department Users', href: '/hod/users', icon: GraduationCap },
          { name: 'Department Classes', href: '/hod/classes', icon: Users },
          { name: 'Department Subjects', href: '/hod/subjects', icon: BookOpen },
          { name: 'CO Management', href: '/admin/co-management', icon: Target },
          { name: 'PO Management', href: '/admin/po-management', icon: Layers },
          { name: 'CO Targets', href: '/admin/co-targets', icon: Gauge },
          { name: 'Department Analytics', href: '/hod/analytics', icon: BarChart3 },
          { name: 'Student Analytics', href: '/hod/student-analytics', icon: TrendingUp },
          { name: 'Teacher Analytics', href: '/hod/teacher-analytics', icon: Users },
          { name: 'Strategic Dashboard', href: '/hod/strategic-dashboard', icon: Brain },
          { name: 'Reports', href: '/hod/reports', icon: FileText },
        ]
      
      case 'teacher':
        return [
          ...baseItems,
          { name: 'Exam Configuration', href: '/teacher/exam-config', icon: Settings },
          { name: 'Marks Entry', href: '/teacher/marks-entry', icon: ClipboardList },
          { name: 'Analytics', href: '/teacher/analytics', icon: PieChart },
          { name: 'Attainment Analytics', href: '/teacher/attainment-analytics', icon: BarChart3 },
          { name: 'Comprehensive Analytics', href: '/teacher/comprehensive-analytics', icon: TrendingUp },
          { name: 'Report Management', href: '/teacher/reports', icon: FileText },
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