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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main 
          className={`
            flex-1 p-6 pt-20 transition-all duration-300 ease-in-out
            ${isCollapsed ? 'ml-16' : 'ml-64'}
            ${isMobileMenuOpen ? 'lg:ml-64' : 'lg:ml-64'}
          `}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout