import { ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import Sidebar from './Sidebar'
import Header from './Header'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const { user } = useSelector((state: RootState) => state.auth)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 ml-64 pt-20">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout