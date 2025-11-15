import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import AdminDashboard from '../components/Dashboard/AdminDashboard'
import HODDashboard from '../components/Dashboard/HODDashboard'
import TeacherDashboard from '../components/Dashboard/TeacherDashboard'
import StudentDashboard from '../components/Dashboard/StudentDashboard'

const Dashboard = () => {
  const { user } = useSelector((state: RootState) => state.auth)

  switch (user?.role) {
    case 'admin':
      return <AdminDashboard />
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
        </div>
      )
  }
}

export default Dashboard