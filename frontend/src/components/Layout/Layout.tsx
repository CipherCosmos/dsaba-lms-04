import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useSidebar } from '../../contexts/SidebarContext'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const { isCollapsed, isMobileMenuOpen } = useSidebar()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      <Header />
      <div className="flex">
        <Sidebar />
        <main 
          className={`
            flex-1 p-6 pt-24 transition-all duration-300 ease-in-out
            ${isCollapsed ? 'ml-16' : 'ml-64'}
            ${isMobileMenuOpen ? 'lg:ml-64' : 'lg:ml-64'}
          `}
        >
          <div className="page-container animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout