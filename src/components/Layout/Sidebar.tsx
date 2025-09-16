import React, { useMemo, useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { useSidebar } from '../../contexts/SidebarContext'
import {
  Home, Users, Building, BookOpen, GraduationCap,
  ClipboardList, BarChart3, FileText, Settings,
  TrendingUp, Award, PieChart, Target, Layers, Gauge, Brain,
  UserCheck, BookMarked, BarChart2, FileBarChart, 
  Activity, ChevronLeft, ChevronRight, Menu, X,
  Search, Bell, Star, Clock, ChevronDown, ChevronUp
} from 'lucide-react'

// Types
interface MenuItem {
  name: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  section: string
  badge?: number
  isNew?: boolean
  description?: string
  keywords?: string[]
}

interface MenuSection {
  id: string
  title: string
  items: MenuItem[]
  isCollapsible?: boolean
  defaultExpanded?: boolean
}

interface SidebarProps {
  className?: string
}

// Enhanced Menu Item Component
const MenuItemComponent = React.memo<{
  item: MenuItem
  isActive: boolean
  isCollapsed: boolean
  onItemClick: () => void
}>(({ item, isActive, isCollapsed, onItemClick }) => {
  const Icon = item.icon
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <Link
      to={item.href}
      onClick={onItemClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      className={`
        flex items-center rounded-lg transition-all duration-200 group relative
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${isCollapsed ? 'justify-center px-3 py-2.5' : 'space-x-3 px-3 py-2.5'}
        ${isActive
          ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600 shadow-sm'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
        }
      `}
      aria-label={item.description || item.name}
      role="menuitem"
    >
      <div className="relative flex items-center">
        <Icon 
          size={20} 
          className={`transition-colors ${
            isActive 
              ? 'text-primary-600' 
              : 'text-gray-400 group-hover:text-gray-600'
          }`} 
        />
        
        {/* Badge */}
        {item.badge && item.badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
        
        {/* New indicator */}
        {item.isNew && (
          <span className="absolute -top-1 -right-1 bg-green-500 h-2 w-2 rounded-full"></span>
        )}
      </div>
      
      {!isCollapsed && (
        <div className="flex-1 flex items-center justify-between min-w-0">
          <span className="font-medium text-sm truncate">{item.name}</span>
          {(item.badge && item.badge > 0) && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
          {item.isNew && (
            <span className="ml-2 bg-green-500 text-white text-xs rounded-full px-2 py-0.5">
              New
            </span>
          )}
        </div>
      )}
      
      {/* Tooltip for collapsed state */}
      {isCollapsed && showTooltip && (
        <div 
          className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg"
          role="tooltip"
        >
          <div className="font-medium">{item.name}</div>
          {item.description && (
            <div className="text-xs text-gray-300 mt-1">{item.description}</div>
          )}
          <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
        </div>
      )}
    </Link>
  )
})

MenuItemComponent.displayName = 'MenuItemComponent'

// Section Component
const SectionComponent = React.memo<{
  section: MenuSection
  isCollapsed: boolean
  onItemClick: () => void
  activeHref: string
}>(({ section, isCollapsed, onItemClick, activeHref }) => {
  const [isExpanded, setIsExpanded] = useState(section.defaultExpanded ?? true)

  const toggleSection = useCallback(() => {
    if (section.isCollapsible && !isCollapsed) {
      setIsExpanded(prev => !prev)
    }
  }, [section.isCollapsible, isCollapsed])

  if (section.items.length === 0) return null

  return (
    <div className="space-y-2">
      {/* Section Header */}
      {section.id !== 'main' && !isCollapsed && (
        <button
          onClick={toggleSection}
          className={`
            w-full px-3 py-2 flex items-center justify-between text-left
            ${section.isCollapsible ? 'hover:bg-gray-50 rounded-lg cursor-pointer' : 'cursor-default'}
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg
          `}
          disabled={!section.isCollapsible}
          aria-expanded={isExpanded}
          aria-controls={`section-${section.id}`}
        >
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {section.title}
          </h3>
          {section.isCollapsible && (
            <div className="text-gray-400">
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          )}
        </button>
      )}
      
      {/* Section Items */}
      <div 
        id={`section-${section.id}`}
        className={`space-y-1 transition-all duration-200 ${
          isCollapsed || isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
        role="menu"
        aria-labelledby={`section-${section.id}-header`}
      >
        {section.items.map((item) => (
          <MenuItemComponent
            key={item.href}
            item={item}
            isActive={activeHref === item.href}
            isCollapsed={isCollapsed}
            onItemClick={onItemClick}
          />
        ))}
      </div>
    </div>
  )
})

SectionComponent.displayName = 'SectionComponent'

// Search Component
const SearchComponent: React.FC<{
  searchTerm: string
  onSearchChange: (term: string) => void
  isCollapsed: boolean
}> = React.memo(({ searchTerm, onSearchChange, isCollapsed }) => {
  if (isCollapsed) return null

  return (
    <div className="px-3 py-2 border-b border-gray-200">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search menu..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>
    </div>
  )
})

SearchComponent.displayName = 'SearchComponent'

// Main Sidebar Component
const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const { isCollapsed, toggleSidebar, isMobileMenuOpen, toggleMobileMenu } = useSidebar()
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [recentItems, setRecentItems] = useState<string[]>([])

  // Memoized menu items
  const menuItems = useMemo((): MenuItem[] => {
    const baseItems: MenuItem[] = [
      { 
        name: 'Dashboard', 
        href: '/', 
        icon: Home, 
        section: 'main',
        description: 'Overview and quick stats',
        keywords: ['home', 'overview', 'stats']
      },
    ]

    const roleSpecificItems: Record<string, MenuItem[]> = {
      admin: [
        // System Management
        { 
          name: 'Departments', 
          href: '/admin/departments', 
          icon: Building, 
          section: 'system',
          description: 'Manage organizational departments',
          keywords: ['departments', 'organization']
        },
        { 
          name: 'Classes', 
          href: '/admin/classes', 
          icon: Users, 
          section: 'system',
          description: 'Manage student classes',
          keywords: ['classes', 'students']
        },
        { 
          name: 'Subjects', 
          href: '/admin/subjects', 
          icon: BookOpen, 
          section: 'system',
          description: 'Manage academic subjects',
          keywords: ['subjects', 'academics']
        },
        { 
          name: 'Users', 
          href: '/admin/users', 
          icon: GraduationCap, 
          section: 'system',
          description: 'Manage system users',
          keywords: ['users', 'accounts']
        },
        // Academic Management
        { 
          name: 'CO Management', 
          href: '/admin/co-management', 
          icon: Target, 
          section: 'academic',
          description: 'Course Outcomes management',
          keywords: ['co', 'outcomes', 'course']
        },
        { 
          name: 'PO Management', 
          href: '/admin/po-management', 
          icon: Layers, 
          section: 'academic',
          description: 'Program Outcomes management',
          keywords: ['po', 'program', 'outcomes']
        },
        { 
          name: 'CO Targets', 
          href: '/admin/co-targets', 
          icon: Gauge, 
          section: 'academic',
          description: 'Set attainment targets',
          keywords: ['targets', 'attainment']
        },
        // Analytics & Reports
        { 
          name: 'Analytics', 
          href: '/admin/analytics', 
          icon: BarChart3, 
          section: 'analytics',
          description: 'System analytics and insights',
          keywords: ['analytics', 'data', 'insights']
        },
        { 
          name: 'Reports', 
          href: '/admin/reports', 
          icon: FileText, 
          section: 'analytics',
          description: 'Generate system reports',
          keywords: ['reports', 'documents']
        },
      ],
      
      hod: [
        // Department Management
        { 
          name: 'Department Users', 
          href: '/hod/users', 
          icon: UserCheck, 
          section: 'department',
          description: 'Manage department staff',
          keywords: ['users', 'staff', 'department']
        },
        { 
          name: 'Department Classes', 
          href: '/hod/classes', 
          icon: Users, 
          section: 'department',
          description: 'Department class management',
          keywords: ['classes', 'department']
        },
        { 
          name: 'Department Subjects', 
          href: '/hod/subjects', 
          icon: BookMarked, 
          section: 'department',
          description: 'Department subject management',
          keywords: ['subjects', 'department']
        },
        // Academic Management
        { 
          name: 'CO Management', 
          href: '/admin/co-management', 
          icon: Target, 
          section: 'academic',
          description: 'Course Outcomes management',
          keywords: ['co', 'outcomes']
        },
        { 
          name: 'PO Management', 
          href: '/admin/po-management', 
          icon: Layers, 
          section: 'academic',
          description: 'Program Outcomes management',
          keywords: ['po', 'program']
        },
        { 
          name: 'CO Targets', 
          href: '/admin/co-targets', 
          icon: Gauge, 
          section: 'academic',
          description: 'Set attainment targets',
          keywords: ['targets', 'attainment']
        },
        // Analytics & Insights
        { 
          name: 'Department Analytics', 
          href: '/hod/analytics', 
          icon: BarChart2, 
          section: 'analytics',
          description: 'Department performance analytics',
          keywords: ['analytics', 'department'],
          badge: 3
        },
        { 
          name: 'Student Analytics', 
          href: '/hod/student-analytics', 
          icon: TrendingUp, 
          section: 'analytics',
          description: 'Student performance tracking',
          keywords: ['students', 'performance']
        },
        { 
          name: 'Teacher Analytics', 
          href: '/hod/teacher-analytics', 
          icon: Activity, 
          section: 'analytics',
          description: 'Teacher performance insights',
          keywords: ['teachers', 'performance']
        },
        { 
          name: 'Strategic Dashboard', 
          href: '/hod/strategic-dashboard', 
          icon: Brain, 
          section: 'analytics',
          description: 'Strategic insights and planning',
          keywords: ['strategy', 'planning'],
          isNew: true
        },
        // Reports & Documentation
        { 
          name: 'Reports & Analytics', 
          href: '/hod/reports', 
          icon: FileBarChart, 
          section: 'reports',
          description: 'Comprehensive reports',
          keywords: ['reports', 'documentation']
        },
      ],
      
      teacher: [
        // Teaching Tools
        { 
          name: 'Exam Configuration', 
          href: '/teacher/exam-config', 
          icon: Settings, 
          section: 'teaching',
          description: 'Configure exam settings',
          keywords: ['exam', 'configuration']
        },
        { 
          name: 'Marks Entry', 
          href: '/teacher/marks-entry', 
          icon: ClipboardList, 
          section: 'teaching',
          description: 'Enter student marks',
          keywords: ['marks', 'grades', 'entry']
        },
        // Analytics & Insights
        { 
          name: 'Comprehensive Analytics', 
          href: '/teacher/comprehensive-analytics', 
          icon: BarChart3, 
          section: 'analytics',
          description: 'Advanced analytics with multiple analysis types',
          keywords: ['analytics', 'comprehensive', 'advanced'],
          isNew: true
        },
        { 
          name: 'Performance Analytics', 
          href: '/teacher/analytics', 
          icon: Activity, 
          section: 'analytics',
          description: 'Class performance analytics',
          keywords: ['analytics', 'performance', 'class']
        },
        { 
          name: 'Attainment Analytics', 
          href: '/teacher/attainment-analytics', 
          icon: Target, 
          section: 'analytics',
          description: 'Student attainment tracking',
          keywords: ['attainment', 'tracking', 'co', 'po']
        },
        { 
          name: 'Student Analytics', 
          href: '/teacher/student-analytics', 
          icon: Users, 
          section: 'analytics',
          description: 'Individual student performance analysis',
          keywords: ['students', 'individual', 'performance']
        },
        { 
          name: 'Question Analytics', 
          href: '/teacher/question-analytics', 
          icon: BookOpen, 
          section: 'analytics',
          description: 'Question difficulty and analysis',
          keywords: ['questions', 'difficulty', 'analysis']
        },
        { 
          name: 'Exam Analytics', 
          href: '/teacher/exam-analytics', 
          icon: FileText, 
          section: 'analytics',
          description: 'Exam performance and trends',
          keywords: ['exams', 'trends', 'performance']
        },
        { 
          name: 'Predictive Analytics', 
          href: '/teacher/predictive-analytics', 
          icon: Brain, 
          section: 'analytics',
          description: 'AI-powered predictive insights',
          keywords: ['predictive', 'ai', 'insights', 'forecasting'],
          isNew: true
        },
        // Reports
        { 
          name: 'Report Management', 
          href: '/teacher/reports', 
          icon: FileText, 
          section: 'reports',
          description: 'Generate and manage reports',
          keywords: ['reports', 'management']
        },
      ],
      
      student: [
        // Student Tools
        { 
          name: 'My Analytics', 
          href: '/student/analytics', 
          icon: TrendingUp, 
          section: 'student',
          description: 'Personal performance analytics',
          keywords: ['analytics', 'personal']
        },
        { 
          name: 'Progress Tracking', 
          href: '/student/progress', 
          icon: Award, 
          section: 'student',
          description: 'Track your academic progress',
          keywords: ['progress', 'tracking']
        },
      ]
    }

    return [...baseItems, ...(roleSpecificItems[user?.role || ''] || [])]
  }, [user?.role])

  // Create sections from menu items
  const sections = useMemo((): MenuSection[] => {
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

    // Filter items based on search
    const filteredItems = searchTerm 
      ? menuItems.filter(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      : menuItems

    // Group items by section
    const groupedItems = filteredItems.reduce((acc, item) => {
      const section = item.section || 'other'
      if (!acc[section]) acc[section] = []
      acc[section].push(item)
      return acc
    }, {} as Record<string, MenuItem[]>)

    return Object.entries(groupedItems).map(([sectionId, items]) => ({
      id: sectionId,
      title: sectionTitles[sectionId] || sectionId,
      items,
      isCollapsible: sectionId !== 'main',
      defaultExpanded: true
    }))
  }, [menuItems, searchTerm])

  // Handle item click
  const handleItemClick = useCallback(() => {
    if (isMobileMenuOpen) {
      toggleMobileMenu()
    }
    
    // Add to recent items
    const currentPath = location.pathname
    setRecentItems(prev => {
      const filtered = prev.filter(item => item !== currentPath)
      return [currentPath, ...filtered].slice(0, 5)
    })
  }, [isMobileMenuOpen, toggleMobileMenu, location.pathname])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        toggleMobileMenu()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMobileMenuOpen, toggleMobileMenu])

  // Focus trap for mobile menu
  useEffect(() => {
    if (isMobileMenuOpen) {
      const sidebar = document.getElementById('sidebar')
      const focusableElements = sidebar?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled])'
      )
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus()
      }
    }
  }, [isMobileMenuOpen])

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-lg border border-gray-200 hover:shadow-xl transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={toggleMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        id="sidebar"
        className={`
          fixed left-0 top-16 h-full bg-white shadow-lg border-r border-gray-200 z-40 transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isMobileMenuOpen ? 'translate-x-0' : 'lg:translate-x-0 -translate-x-full'}
          ${className}
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Header with toggle button */}
        <header className="flex justify-between items-center p-3 border-b border-gray-200 bg-gray-50">
          {!isCollapsed && (
            <h2 className="text-sm font-semibold text-gray-700 truncate">Navigation</h2>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </header>

        {/* Search */}
        <SearchComponent
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          isCollapsed={isCollapsed}
        />

        {/* Navigation content */}
        <nav 
          className={`flex-1 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'px-2' : 'px-4'} py-4 space-y-4`}
          style={{ maxHeight: 'calc(100vh - 140px)' }}
          role="menubar"
        >
          {sections.length > 0 ? (
            sections.map((section) => (
              <SectionComponent
                key={section.id}
                section={section}
                isCollapsed={isCollapsed}
                onItemClick={handleItemClick}
                activeHref={location.pathname}
              />
            ))
          ) : (
            <div className="px-3 py-8 text-center text-gray-500 text-sm">
              {searchTerm ? 'No items found' : 'No menu items available'}
            </div>
          )}
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <footer className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500 text-center">
              Role: <span className="font-medium capitalize">{user?.role || 'Guest'}</span>
            </div>
          </footer>
        )}
      </aside>
    </>
  )
}

export default React.memo(Sidebar)
