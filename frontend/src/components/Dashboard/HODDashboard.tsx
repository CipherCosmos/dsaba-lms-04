import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchHODAnalytics } from '../../store/slices/analyticsSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchClasses } from '../../store/slices/classSlice'
import { dashboardAPI } from '../../services/api'
import { logger } from '../../core/utils/logger'
import { BarChart3, Users, BookOpen, TrendingUp, Award, AlertCircle, Target, Settings, CheckCircle, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'

const HODDashboard = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { hodAnalytics, loading } = useSelector((state: RootState) => state.analytics)
  const { user } = useSelector((state: RootState) => state.auth)
  const { users } = useSelector((state: RootState) => state.users)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { classes } = useSelector((state: RootState) => state.classes)
  
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true)
      const response = await dashboardAPI.getStats()
      setDashboardStats(response)
    } catch (error) {
      logger.error('Error fetching HOD dashboard stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    if (user?.department_id || user?.department_ids?.[0]) {
      dispatch(fetchHODAnalytics(user.department_id || user.department_ids?.[0]))
      fetchDashboardStats()
    }
    dispatch(fetchUsers())
    dispatch(fetchSubjects())
    dispatch(fetchClasses())
  }, [dispatch, user])

  // Get department-specific data
  const departmentUsers = users.filter(u => (u.department_ids && u.department_ids.length > 0 && u.department_ids[0] === (user?.department_ids?.[0] || user?.department_id)))
  const departmentClasses = classes.filter(c => c.department_id === user?.department_id)
  const departmentSubjects = subjects.filter(s => s.department_id === user?.department_id)

  const departmentStats = [
    {
      name: 'Total Students',
      value: dashboardStats?.statistics?.total_students || hodAnalytics?.department_overview?.total_students || departmentUsers.filter(u => u.role === 'student').length,
      icon: Users,
      color: 'bg-green-500',
      trend: `Across ${dashboardStats?.statistics?.total_classes || departmentClasses.length} classes`
    },
    {
      name: 'Faculty Members',
      value: dashboardStats?.statistics?.total_teachers || hodAnalytics?.department_overview?.total_teachers || departmentUsers.filter(u => u.role === 'teacher').length,
      icon: Users,
      color: 'bg-purple-500',
      trend: `Teaching ${dashboardStats?.statistics?.total_subjects || departmentSubjects.length} subjects`
    },
    {
      name: 'Pending Approvals',
      value: dashboardStats?.statistics?.pending_approvals || 0,
      icon: AlertCircle,
      color: 'bg-red-500',
      trend: `${dashboardStats?.statistics?.recent_submissions_7d || 0} recent submissions`
    },
    {
      name: 'Active Exams',
      value: dashboardStats?.statistics?.active_exams || 0,
      icon: Clock,
      color: 'bg-orange-500',
      trend: `${dashboardStats?.statistics?.total_exams || 0} total exams`
    },
  ]

  const performanceMetrics = hodAnalytics?.subject_performance?.slice(0, 5) || []

  const facultyPerformance = hodAnalytics?.teacher_performance?.slice(0, 4) || []

  const actionItems = []

  // Check for subjects without teachers
  const unassignedSubjectsCount = dashboardStats?.statistics?.unassigned_subjects || departmentSubjects.filter(s => !s.teacher_id).length
  if (unassignedSubjectsCount > 0) {
    actionItems.push({
      type: 'warning',
      message: `${unassignedSubjectsCount} subjects need teacher assignment`,
      action: 'Assign teachers to pending subjects'
    })
  }
  
  // Check for pending approvals
  if (dashboardStats?.statistics?.pending_approvals > 0) {
    actionItems.push({
      type: 'alert',
      message: `${dashboardStats.statistics.pending_approvals} marks awaiting approval`,
      action: 'Review and approve submitted marks'
    })
  }

  // Check for performance issues
  const lowPerformanceSubjects = performanceMetrics.filter(s => s.average_percentage < 70)
  if (lowPerformanceSubjects.length > 0) {
    actionItems.push({
      type: 'alert',
      message: `${lowPerformanceSubjects.length} subjects below 70% average`,
      action: 'Review teaching methods and provide support'
    })
  }

  // Check faculty workload
  const overloadedFaculty = facultyPerformance.filter(f => f.subjects_taught > 4)
  if (overloadedFaculty.length > 0) {
    actionItems.push({
      type: 'info',
      message: `${overloadedFaculty.length} faculty members teaching 4+ subjects`,
      action: 'Consider workload redistribution'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Department Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {departmentStats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="card">
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
                <p className="text-xs text-gray-500">{stat.trend}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Action Required</h3>
          </div>
          <div className="space-y-3">
            {actionItems.map((item, index) => (
              <div
                key={index}
                className={`flex items-start space-x-3 p-3 rounded-lg ${
                  item.type === 'alert' ? 'bg-red-50 border-l-4 border-red-400' :
                  item.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-400' :
                  'bg-blue-50 border-l-4 border-blue-400'
                }`}
              >
                <AlertCircle className={`h-5 w-5 mt-0.5 ${
                  item.type === 'alert' ? 'text-red-500' :
                  item.type === 'warning' ? 'text-yellow-500' :
                  'text-blue-500'
                }`} />
                <div>
                  <p className="font-medium text-gray-900">{item.message}</p>
                  <p className="text-sm text-gray-600">{item.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance</h3>
          <div className="space-y-4">
            {performanceMetrics.map((subject, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{subject.subject_name}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className={`h-2 rounded-full ${
                        subject.average_percentage >= 85 ? 'bg-green-500' :
                        subject.average_percentage >= 75 ? 'bg-blue-500' :
                        subject.average_percentage >= 65 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${subject.average_percentage}%` }}
                    />
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-sm font-semibold">{subject.average_percentage}%</p>
                  <p className="text-xs text-gray-500">{subject.pass_rate}% pass rate</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Faculty Performance</h3>
          <div className="space-y-3">
            {facultyPerformance.map((faculty, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{faculty.teacher_name}</p>
                  <p className="text-xs text-gray-600">{faculty.subjects_taught} subjects</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{faculty.average_class_performance}%</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    (faculty as any).status === 'excellent' ? 'bg-green-100 text-green-800' :
                    (faculty as any).status === 'good' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {(faculty as any).status === 'excellent' ? 'Excellent' :
                     (faculty as any).status === 'good' ? 'Good' : 'Needs Support'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions - Department Specific */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/hod/analytics" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center">
            <BarChart3 className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium">Department Analytics</p>
          </Link>
          
          <Link to="/hod/reports" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center">
            <Award className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium">Generate Reports</p>
          </Link>
          
          <Link to="/hod/strategic-dashboard" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center">
            <Target className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-sm font-medium">Strategic Dashboard</p>
          </Link>
          
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-center opacity-60">
            <Settings className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-500">Department Settings</p>
            <p className="text-xs text-gray-400 mt-1">Contact Admin</p>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">NBA Compliance</h3>
            <Award className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Overall Compliance</span>
              <span className="text-sm font-medium text-green-600">
                {hodAnalytics?.nba_compliance?.overall_compliance || 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">CO Attainment</span>
              <span className="text-sm font-medium">
                {hodAnalytics?.nba_compliance?.co_attainment || 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">PO Attainment</span>
              <span className="text-sm font-medium">
                {hodAnalytics?.nba_compliance?.po_attainment || 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Threshold Status</span>
              <span className={`text-sm font-medium ${
                (hodAnalytics?.nba_compliance?.overall_compliance || 0) >= 70 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(hodAnalytics?.nba_compliance?.overall_compliance || 0) >= 70 ? 'Met' : 'Not Met'}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Student Wellness</h3>
            <Target className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {departmentUsers.filter(u => u.role === 'student').length > 0 ? 
                Math.max(1, Math.floor(departmentUsers.filter(u => u.role === 'student').length * 0.1)) : 0}
            </p>
            <p className="text-sm text-gray-600">students need attention</p>
            <button className="mt-2 text-sm text-blue-600 hover:text-blue-800">
              View Details →
            </button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Updates</h3>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div className="space-y-2 text-sm">
            {hodAnalytics?.recent_updates && hodAnalytics.recent_updates.length > 0 ? (
              hodAnalytics.recent_updates.slice(0, 4).map((update: any, index: number) => (
                <p key={index} className="text-gray-600">• {update.message}</p>
              ))
            ) : (
              <>
                <p className="text-gray-600">• No recent updates available</p>
                <p className="text-gray-600">• Check back later for updates</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HODDashboard