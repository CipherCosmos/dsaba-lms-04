import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import AdminDashboard from '../components/Dashboard/AdminDashboard'
import HODDashboard from '../components/Dashboard/HODDashboard'
import TeacherDashboard from '../components/Dashboard/TeacherDashboard'
import StudentDashboard from '../components/Dashboard/StudentDashboard'
import PrincipalDashboard from '../components/Dashboard/PrincipalDashboard'

const Dashboard = () => {
  const { user, loading } = useSelector((state: RootState) => state.auth)

  // Show loading state while user data is being fetched
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  // Ensure role is normalized from roles array if needed
  const userRole = user.role || (user.roles && user.roles.length > 0 ? user.roles[0] : null)

  if (!userRole) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">Unable to determine user role. Please contact support.</p>
        <p className="text-gray-500">User roles: {user.roles ? JSON.stringify(user.roles) : 'None'}</p>
      </div>
    )
  }

  switch (userRole) {
    case 'admin':
      return <AdminDashboard />
    case 'principal':
      return <PrincipalDashboard />
    case 'hod':
      return <HODDashboard />
    case 'teacher':
      return <TeacherDashboard />
    case 'student':
      return <StudentDashboard />
    default:
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">Welcome to the Internal Exam Management System</p>
          <p className="text-sm text-gray-400 mt-2">Role: {userRole}</p>
        </div>
      )
  }
}

export default Dashboard