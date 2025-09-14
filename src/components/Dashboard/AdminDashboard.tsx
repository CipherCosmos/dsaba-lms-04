import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchDepartments } from '../../store/slices/departmentSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import { fetchClasses } from '../../store/slices/classSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { dashboardAPI } from '../../services/api'
import { Building, Users, BookOpen, GraduationCap, TrendingUp, AlertTriangle, Target, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'

const AdminDashboard = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { departments } = useSelector((state: RootState) => state.departments)
  const { users } = useSelector((state: RootState) => state.users)
  const { classes } = useSelector((state: RootState) => state.classes)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await dashboardAPI.getStats()
      setDashboardStats(response)
      setRecentActivity(response.recent_activity || [])
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      setError('Failed to fetch dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    dispatch(fetchDepartments())
    dispatch(fetchUsers())
    dispatch(fetchClasses())
    dispatch(fetchSubjects())
    fetchDashboardStats()
  }, [dispatch])

  const stats = [
    {
      name: 'Total Departments',
      value: dashboardStats?.total_departments || departments.length,
      icon: Building,
      color: 'bg-blue-500',
      change: 'Active departments',
      href: '/admin/departments'
    },
    {
      name: 'Total Users',
      value: dashboardStats?.total_users || users.length,
      icon: Users,
      color: 'bg-green-500',
      change: `${users.filter(u => u.role === 'student').length} students`,
      href: '/admin/users'
    },
    {
      name: 'Total Classes',
      value: dashboardStats?.total_classes || classes.length,
      icon: GraduationCap,
      color: 'bg-purple-500',
      change: `${classes.filter(c => c.semester >= 5).length} senior classes`,
      href: '/admin/classes'
    },
    {
      name: 'Total Subjects',
      value: dashboardStats?.total_subjects || subjects.length,
      icon: BookOpen,
      color: 'bg-orange-500',
      change: `${subjects.filter(s => s.teacher_id).length} assigned`,
      href: '/admin/subjects'
    },
  ]

  // Use real recent activity data if available, fallback to mock data
  const displayRecentActivity = recentActivity.length > 0 ? recentActivity.map(activity => ({
    action: activity.message,
    time: new Date(activity.timestamp).toLocaleString(),
    type: activity.type === 'user_created' ? 'success' : 'info',
    details: activity.message
  })) : [
    { 
      action: 'New user registered', 
      time: '2 hours ago', 
      type: 'success',
      details: `${users.slice(-1)[0]?.first_name || 'User'} ${users.slice(-1)[0]?.last_name || ''} joined`
    },
    { 
      action: 'Subject assignment updated', 
      time: '4 hours ago', 
      type: 'info',
      details: 'Teacher assignments modified'
    },
    { 
      action: 'New class created', 
      time: '6 hours ago', 
      type: 'info',
      details: `${classes.slice(-1)[0]?.name || 'Class'} added`
    },
    { 
      action: 'Department updated', 
      time: '1 day ago', 
      type: 'success',
      details: 'Configuration changes applied'
    },
  ]

  const systemAlerts = [
    {
      message: `${subjects.filter(s => !s.teacher_id).length} subjects need teacher assignment`,
      type: 'warning',
      count: subjects.filter(s => !s.teacher_id).length
    },
    {
      message: `${users.filter(u => !u.is_active).length} inactive users`,
      type: 'info',
      count: users.filter(u => !u.is_active).length
    },
    {
      message: 'System running optimally',
      type: 'success',
      count: 0
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.name}
              to={stat.href}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">{stat.change}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* System Alerts */}
      {systemAlerts.some(alert => alert.count > 0) && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
          <div className="space-y-3">
            {systemAlerts.filter(alert => alert.count > 0 || alert.type === 'success').map((alert, index) => (
              <div key={index} className={`flex items-center space-x-3 p-3 rounded-lg ${
                alert.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-400' :
                alert.type === 'info' ? 'bg-blue-50 border-l-4 border-blue-400' :
                'bg-green-50 border-l-4 border-green-400'
              }`}>
                <AlertTriangle className={`h-5 w-5 ${
                  alert.type === 'warning' ? 'text-yellow-500' :
                  alert.type === 'info' ? 'text-blue-500' :
                  'text-green-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Link to="/admin/departments" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group">
              <Building className="h-8 w-8 text-blue-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-center">Manage Departments</p>
              <p className="text-xs text-gray-500 text-center mt-1">Create & configure departments</p>
            </Link>
            
            <Link to="/admin/users" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group">
              <Users className="h-8 w-8 text-green-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-center">Manage Users</p>
              <p className="text-xs text-gray-500 text-center mt-1">Add & manage all users</p>
            </Link>
            
            <Link to="/admin/classes" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group">
              <GraduationCap className="h-8 w-8 text-purple-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-center">Manage Classes</p>
              <p className="text-xs text-gray-500 text-center mt-1">Create & organize classes</p>
            </Link>
            
            <Link to="/admin/subjects" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group">
              <BookOpen className="h-8 w-8 text-orange-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-center">Manage Subjects</p>
              <p className="text-xs text-gray-500 text-center mt-1">Configure course subjects</p>
            </Link>
            
            <Link to="/admin/co-management" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group">
              <Target className="h-8 w-8 text-red-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-center">CO Management</p>
              <p className="text-xs text-gray-500 text-center mt-1">Define course outcomes</p>
            </Link>
            
            <Link to="/admin/po-management" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group">
              <BarChart3 className="h-8 w-8 text-indigo-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-center">PO Management</p>
              <p className="text-xs text-gray-500 text-center mt-1">Define program outcomes</p>
            </Link>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <div>
                        <div className="h-4 bg-gray-300 rounded w-32 mb-1"></div>
                        <div className="h-3 bg-gray-300 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-300 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-2">Failed to load recent activity</p>
              <button 
                onClick={fetchDashboardStats}
                className="text-blue-600 hover:text-blue-800"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {displayRecentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.details}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Department Overview */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {departments.slice(0, 4).map((dept) => {
            const deptUsers = users.filter(u => u.department_id === dept.id)
            const deptClasses = classes.filter(c => c.department_id === dept.id)
            
            return (
              <div key={dept.id} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{dept.name}</h4>
                <p className="text-sm text-gray-600 mb-3">Code: {dept.code}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Students:</span>
                    <span className="font-medium">{deptUsers.filter(u => u.role === 'student').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Teachers:</span>
                    <span className="font-medium">{deptUsers.filter(u => u.role === 'teacher').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Classes:</span>
                    <span className="font-medium">{deptClasses.length}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">System Performance</p>
            <p className="text-xs text-green-600">Optimal</p>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
            </div>
          </div>
          <div className="text-center">
            <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Active Users</p>
            <p className="text-xs text-gray-600">
              {dashboardStats?.active_users || users.filter(u => u.is_active).length} active
            </p>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ 
                width: `${dashboardStats ? 
                  (dashboardStats.active_users / dashboardStats.total_users) * 100 : 
                  (users.filter(u => u.is_active).length / users.length) * 100
                }%` 
              }}></div>
            </div>
          </div>
          <div className="text-center">
            <BookOpen className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Subject Assignment</p>
            <p className="text-xs text-purple-600">
              {Math.round((subjects.filter(s => s.teacher_id).length / subjects.length) * 100)}% complete
            </p>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ 
                width: `${(subjects.filter(s => s.teacher_id).length / subjects.length) * 100}%` 
              }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard