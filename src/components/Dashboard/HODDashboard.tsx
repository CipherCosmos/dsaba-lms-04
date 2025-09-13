import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchHODAnalytics } from '../../store/slices/analyticsSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchClasses } from '../../store/slices/classSlice'
import { BarChart3, Users, BookOpen, TrendingUp, Award, AlertCircle, Target, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'

const HODDashboard = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { hodAnalytics, loading } = useSelector((state: RootState) => state.analytics)
  const { user } = useSelector((state: RootState) => state.auth)
  const { users } = useSelector((state: RootState) => state.users)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { classes } = useSelector((state: RootState) => state.classes)

  useEffect(() => {
    if (user?.department_id) {
      dispatch(fetchHODAnalytics(user.department_id))
    }
    dispatch(fetchUsers())
    dispatch(fetchSubjects())
    dispatch(fetchClasses())
  }, [dispatch, user])

  // Get department-specific data
  const departmentUsers = users.filter(u => u.department_id === user?.department_id)
  const departmentClasses = classes.filter(c => c.department_id === user?.department_id)
  const departmentSubjects = subjects.filter(s => {
    const subjectClass = classes.find(c => c.id === s.class_id)
    return subjectClass?.department_id === user?.department_id
  })

  const departmentStats = [
    {
      name: 'Department Performance',
      value: hodAnalytics?.department_overview.average_performance ? 
        `${hodAnalytics.department_overview.average_performance.toFixed(1)}%` : '0%',
      icon: BarChart3,
      color: 'bg-blue-500',
      trend: 'Based on all assessments'
    },
    {
      name: 'Total Students',
      value: hodAnalytics?.department_overview.total_students || departmentUsers.filter(u => u.role === 'student').length,
      icon: Users,
      color: 'bg-green-500',
      trend: `Across ${departmentClasses.length} classes`
    },
    {
      name: 'Faculty Members',
      value: hodAnalytics?.department_overview.total_teachers || departmentUsers.filter(u => u.role === 'teacher').length,
      icon: Users,
      color: 'bg-purple-500',
      trend: `Teaching ${departmentSubjects.length} subjects`
    },
    {
      name: 'Active Subjects',
      value: hodAnalytics?.department_overview.total_subjects || departmentSubjects.length,
      icon: BookOpen,
      color: 'bg-orange-500',
      trend: `${departmentSubjects.filter(s => s.teacher_id).length} assigned`
    },
  ]

  const performanceMetrics = hodAnalytics?.subject_performance?.slice(0, 5) || [
    { subject_name: 'Data Structures', average_percentage: 85, pass_rate: 92 },
    { subject_name: 'Database Systems', average_percentage: 78, pass_rate: 88 },
    { subject_name: 'Computer Networks', average_percentage: 82, pass_rate: 90 },
    { subject_name: 'Operating Systems', average_percentage: 76, pass_rate: 85 },
    { subject_name: 'Software Engineering', average_percentage: 88, pass_rate: 94 },
  ]

  const facultyPerformance = hodAnalytics?.teacher_performance?.slice(0, 4) || 
    departmentUsers.filter(u => u.role === 'teacher').slice(0, 4).map(teacher => {
      const teacherSubjects = departmentSubjects.filter(s => s.teacher_id === teacher.id)
      const performance = teacherSubjects.length > 0 ? 75 + (teacherSubjects.length * 5) : 70
      return {
        teacher_name: `${teacher.first_name} ${teacher.last_name}`,
        subjects_taught: teacherSubjects.length,
        average_class_performance: Math.min(performance, 95),
        status: performance >= 85 ? 'excellent' : performance >= 75 ? 'good' : 'needs_improvement'
      }
    })

  const actionItems = []

  // Check for subjects without teachers
  const unassignedSubjects = departmentSubjects.filter(s => !s.teacher_id)
  if (unassignedSubjects.length > 0) {
    actionItems.push({
      type: 'warning',
      message: `${unassignedSubjects.length} subjects need teacher assignment`,
      action: 'Assign teachers to pending subjects'
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
              <span className="text-sm font-medium text-green-600">85%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">CO Attainment</span>
              <span className="text-sm font-medium">78%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">PO Attainment</span>
              <span className="text-sm font-medium">75%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Threshold Status</span>
              <span className="text-sm font-medium text-green-600">Met</span>
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
            <p className="text-gray-600">• Internal exam results updated</p>
            <p className="text-gray-600">• New teacher assignments made</p>
            <p className="text-gray-600">• Curriculum review completed</p>
            <p className="text-gray-600">• Student feedback collected</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HODDashboard