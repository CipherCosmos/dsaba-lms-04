import { Link, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { useSidebar } from '../../contexts/SidebarContext'
import {
  Home, Users, Building, BookOpen, GraduationCap,
  ClipboardList, BarChart3, FileText, Settings,
  TrendingUp, Award, PieChart, Target, Layers, Gauge, Brain,
  UserCheck, BookMarked, BarChart2, FileBarChart, 
  Calendar, Shield, Monitor, Database, Activity,
  ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react'

const Sidebar = () => {
  const location = useLocation()
  const { user } = useSelector((state: RootState) => state.auth)
  const { isCollapsed, toggleSidebar, isMobileMenuOpen, toggleMobileMenu } = useSidebar()

  const getMenuItems = () => {
    const baseItems = [
      { name: 'Dashboard', href: '/', icon: Home, section: 'main' },
    ]

    switch (user?.role) {
      case 'admin':
        return [
          ...baseItems,
          // System Management
          { name: 'Departments', href: '/admin/departments', icon: Building, section: 'system' },
          { name: 'Classes', href: '/admin/classes', icon: Users, section: 'system' },
          { name: 'Subjects', href: '/admin/subjects', icon: BookOpen, section: 'system' },
          { name: 'Users', href: '/admin/users', icon: GraduationCap, section: 'system' },
          // Academic Management
          { name: 'CO Management', href: '/admin/co-management', icon: Target, section: 'academic' },
          { name: 'PO Management', href: '/admin/po-management', icon: Layers, section: 'academic' },
          { name: 'CO Targets', href: '/admin/co-targets', icon: Gauge, section: 'academic' },
          // Analytics & Reports
          { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, section: 'analytics' },
          { name: 'Reports', href: '/admin/reports', icon: FileText, section: 'analytics' },
        ]
      
      case 'hod':
        return [
          ...baseItems,
          // Department Management
          { name: 'Department Users', href: '/hod/users', icon: UserCheck, section: 'department' },
          { name: 'Department Classes', href: '/hod/classes', icon: Users, section: 'department' },
          { name: 'Department Subjects', href: '/hod/subjects', icon: BookMarked, section: 'department' },
          // Academic Management
          { name: 'CO Management', href: '/admin/co-management', icon: Target, section: 'academic' },
          { name: 'PO Management', href: '/admin/po-management', icon: Layers, section: 'academic' },
          { name: 'CO Targets', href: '/admin/co-targets', icon: Gauge, section: 'academic' },
          // Analytics & Insights
          { name: 'Department Analytics', href: '/hod/analytics', icon: BarChart2, section: 'analytics' },
          { name: 'Student Analytics', href: '/hod/student-analytics', icon: TrendingUp, section: 'analytics' },
          { name: 'Teacher Analytics', href: '/hod/teacher-analytics', icon: Activity, section: 'analytics' },
          { name: 'Strategic Dashboard', href: '/hod/strategic-dashboard', icon: Brain, section: 'analytics' },
          // Reports & Documentation
          { name: 'Reports & Analytics', href: '/hod/reports', icon: FileBarChart, section: 'reports' },
        ]
      
      case 'teacher':
        return [
          ...baseItems,
          // Teaching Tools
          { name: 'Exam Configuration', href: '/teacher/exam-config', icon: Settings, section: 'teaching' },
          { name: 'Marks Entry', href: '/teacher/marks-entry', icon: ClipboardList, section: 'teaching' },
          // Analytics & Insights
          { name: 'Analytics', href: '/teacher/analytics', icon: PieChart, section: 'analytics' },
          { name: 'Attainment Analytics', href: '/teacher/attainment-analytics', icon: BarChart3, section: 'analytics' },
          { name: 'Comprehensive Analytics', href: '/teacher/comprehensive-analytics', icon: TrendingUp, section: 'analytics' },
          // Reports
          { name: 'Report Management', href: '/teacher/reports', icon: FileText, section: 'reports' },
        ]
      
      case 'student':
        return [
          ...baseItems,
          // Student Tools
          { name: 'My Analytics', href: '/student/analytics', icon: TrendingUp, section: 'student' },
          { name: 'Progress Tracking', href: '/student/progress', icon: Award, section: 'student' },
        ]
      
      default:
        return baseItems
    }
  }

  const getSectionTitle = (section: string) => {
    const sectionTitles: Record<string, string> = {
      main: 'Main',
      system: 'System Management',
      department: 'Department Management',
      academic: 'Academic Management',
      teaching: 'Teaching Tools',
      analytics: 'Analytics & Insights',
      reports: 'Reports & Documentation',
      student: 'Student Tools'
    }
    return sectionTitles[section] || section
  }

  const menuItems = getMenuItems()

  // Group menu items by section
  const groupedItems = menuItems.reduce((acc, item) => {
    const section = item.section || 'other'
    if (!acc[section]) acc[section] = []
    acc[section].push(item)
    return acc
  }, {} as Record<string, typeof menuItems>)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md border border-gray-200"
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-16 h-full bg-white shadow-sm border-r border-gray-200 z-40 transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isMobileMenuOpen ? 'translate-x-0' : 'lg:translate-x-0 -translate-x-full'}
      `}>
        {/* Toggle button */}
        <div className="flex justify-end p-2 border-b border-gray-200">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className={`p-4 space-y-4 overflow-y-auto h-full pb-20 ${isCollapsed ? 'px-2' : ''}`} style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section} className="space-y-2">
              {/* Section Header */}
              {section !== 'main' && !isCollapsed && (
                <div className="px-3 py-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {getSectionTitle(section)}
                  </h3>
                </div>
              )}
              
              {/* Section Items */}
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => toggleMobileMenu()}
                      className={`
                        flex items-center rounded-lg transition-colors group relative
                        ${isCollapsed ? 'justify-center px-3 py-2' : 'space-x-3 px-3 py-2'}
                        ${isActive
                          ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <Icon 
                        size={20} 
                        className={`transition-colors ${
                          isActive 
                            ? 'text-primary-600' 
                            : 'text-gray-400 group-hover:text-gray-600'
                        }`} 
                      />
                      {!isCollapsed && (
                        <span className="font-medium text-sm">{item.name}</span>
                      )}
                      
                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </>
  )
}

export default Sidebar