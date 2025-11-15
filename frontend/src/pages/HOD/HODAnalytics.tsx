import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchHODAnalytics } from '../../store/slices/analyticsSlice'
import { fetchDepartments } from '../../store/slices/departmentSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { analyticsAPI } from '../../services/api'
import { logger } from '../../core/utils/logger'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale } from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Users, BookOpen, TrendingUp, Award, Target, AlertTriangle, CheckCircle, Star, Download, Filter, Clock } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
)

const HODAnalytics = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { hodAnalytics, loading } = useSelector((state: RootState) => state.analytics)
  const { user } = useSelector((state: RootState) => state.auth)
  const { departments } = useSelector((state: RootState) => state.departments)
  // const { users } = useSelector((state: RootState) => state.users)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [nbaCompliance, setNbaCompliance] = useState<any>(null)
  const [nbaLoading, setNbaLoading] = useState(false)
  const [nbaError, setNbaError] = useState<string | null>(null)

  const fetchNbaCompliance = async (departmentId: number) => {
    try {
      setNbaLoading(true)
      setNbaError(null)
      const response = await analyticsAPI.getStrategicDashboardData(departmentId)
      if (response.departmentalIntelligence?.compliance_monitoring) {
        setNbaCompliance(response.departmentalIntelligence.compliance_monitoring)
      }
    } catch (error) {
      logger.error('Error fetching NBA compliance data:', error)
      setNbaError('Failed to fetch NBA compliance data')
    } finally {
      setNbaLoading(false)
    }
  }

  useEffect(() => {
    if (user?.department_id) {
      dispatch(fetchHODAnalytics(user.department_id))
      fetchNbaCompliance(user.department_id)
    }
    dispatch(fetchDepartments())
    dispatch(fetchUsers())
    dispatch(fetchSubjects())
  }, [dispatch, user])

  const department = departments.find(d => d.id === user?.department_id)

  // Analytics data loaded from Redux store
  if (loading && !hodAnalytics) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!hodAnalytics) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No analytics data available</p>
        <p className="text-sm text-gray-400">Department data will appear once exams are conducted</p>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Debug Info:</h3>
            <pre className="text-xs text-gray-600 overflow-auto">
              {JSON.stringify({ hodAnalytics, loading, user, department }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  // Department performance chart
  const departmentPerformanceData = {
    labels: hodAnalytics.subject_performance.map(s => s.subject_name.length > 15 ? 
      s.subject_name.substring(0, 15) + '...' : s.subject_name),
    datasets: [
      {
        label: 'Average Performance (%)',
        data: hodAnalytics.subject_performance.map(s => s.average_percentage),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      },
      {
        label: 'Pass Rate (%)',
        data: hodAnalytics.subject_performance.map(s => s.pass_rate),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1
      }
    ]
  }

  // Teacher performance chart
  const teacherPerformanceData = {
    labels: hodAnalytics.teacher_performance.map(t => t.teacher_name.split(' ')[0]),
    datasets: [
      {
        label: 'Class Performance (%)',
        data: hodAnalytics.teacher_performance.map(t => t.average_class_performance),
        backgroundColor: hodAnalytics.teacher_performance.map(t => 
          t.average_class_performance >= 80 ? 'rgba(34, 197, 94, 0.8)' :
          t.average_class_performance >= 70 ? 'rgba(59, 130, 246, 0.8)' :
          t.average_class_performance >= 60 ? 'rgba(245, 158, 11, 0.8)' :
          'rgba(239, 68, 68, 0.8)'
        ),
        borderColor: hodAnalytics.teacher_performance.map(t => 
          t.average_class_performance >= 80 ? 'rgba(34, 197, 94, 1)' :
          t.average_class_performance >= 70 ? 'rgba(59, 130, 246, 1)' :
          t.average_class_performance >= 60 ? 'rgba(245, 158, 11, 1)' :
          'rgba(239, 68, 68, 1)'
        ),
        borderWidth: 1
      }
    ]
  }

  // Performance distribution
  const performanceDistribution = {
    labels: ['Excellent (80%+)', 'Good (70-79%)', 'Average (60-69%)', 'Below Average (<60%)'],
    datasets: [
      {
        data: [
          hodAnalytics.subject_performance.filter(s => s.average_percentage >= 80).length,
          hodAnalytics.subject_performance.filter(s => s.average_percentage >= 70 && s.average_percentage < 80).length,
          hodAnalytics.subject_performance.filter(s => s.average_percentage >= 60 && s.average_percentage < 70).length,
          hodAnalytics.subject_performance.filter(s => s.average_percentage < 60).length,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ]
      }
    ]
  }

  // NBA Compliance metrics - use real data if available, fallback to defaults
  const nbaMetrics = nbaCompliance ? {
    coAttainment: nbaCompliance.current_status?.co_attainment || 0,
    poAttainment: nbaCompliance.current_status?.po_attainment || 0,
    overallCompliance: nbaCompliance.compliance_score || 0,
    thresholdMet: nbaCompliance.compliance_score >= 70
  } : {
    coAttainment: 0,
    poAttainment: 0,
    overallCompliance: 0,
    thresholdMet: false
  }

  // Key insights
  const insights = {
    topPerformingSubjects: hodAnalytics.subject_performance
      .filter(s => s.average_percentage >= 80)
      .sort((a, b) => b.average_percentage - a.average_percentage)
      .slice(0, 3),
    
    underPerformingSubjects: hodAnalytics.subject_performance
      .filter(s => s.average_percentage < 60)
      .sort((a, b) => a.average_percentage - b.average_percentage)
      .slice(0, 3),
    
    topTeachers: hodAnalytics.teacher_performance
      .filter(t => t.average_class_performance >= 80)
      .sort((a, b) => b.average_class_performance - a.average_class_performance)
      .slice(0, 3),
    
    teachersNeedingSupport: hodAnalytics.teacher_performance
      .filter(t => t.average_class_performance < 70)
      .sort((a, b) => a.average_class_performance - b.average_class_performance)
      .slice(0, 3)
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'subjects', label: 'Subject Analysis', icon: BookOpen },
    { id: 'faculty', label: 'Faculty Performance', icon: Users },
    { id: 'compliance', label: 'NBA Compliance', icon: Award }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Department Analytics</h1>
          <p className="text-gray-600">{department?.name} - Comprehensive Performance Overview</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary flex items-center space-x-2">
            <Filter size={18} />
            <span>Filter</span>
          </button>
          <button className="btn-secondary flex items-center space-x-2">
            <Download size={18} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Dept. Average</p>
              <p className="text-2xl font-semibold text-gray-900">
                {hodAnalytics.department_overview.average_performance.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  hodAnalytics.department_overview.average_performance >= 80 ? 'bg-green-500' :
                  hodAnalytics.department_overview.average_performance >= 70 ? 'bg-blue-500' :
                  hodAnalytics.department_overview.average_performance >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(hodAnalytics.department_overview.average_performance, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900">
                {hodAnalytics.department_overview.total_students}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              Active across all classes
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Faculty</p>
              <p className="text-2xl font-semibold text-gray-900">
                {hodAnalytics.department_overview.total_teachers}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              Teaching {hodAnalytics.department_overview.total_subjects} subjects
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">NBA Score</p>
              {nbaLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
              ) : nbaError ? (
                <p className="text-red-600 text-sm">Error loading data</p>
              ) : (
                <p className="text-2xl font-semibold text-gray-900">
                  {nbaMetrics.overallCompliance.toFixed(1)}%
                </p>
              )}
            </div>
          </div>
          <div className="mt-4">
            {nbaLoading ? (
              <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
            ) : nbaError ? (
              <p className="text-red-600 text-xs">Failed to load</p>
            ) : (
              <p className={`text-xs ${nbaMetrics.thresholdMet ? 'text-green-600' : 'text-red-600'}`}>
                {nbaMetrics.thresholdMet ? '✓ Threshold met' : '✗ Below threshold'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`mr-2 h-5 w-5 ${
                  activeTab === tab.id ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                }`} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance Overview</h3>
              <div className="h-80">
                <Bar data={departmentPerformanceData} options={chartOptions} />
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Distribution</h3>
              <div className="h-80">
                <Doughnut data={performanceDistribution} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                    }
                  }
                }} />
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Areas</h3>
              <div className="space-y-3">
                {insights.topPerformingSubjects.length > 0 ? (
                  insights.topPerformingSubjects.map((subject, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">{subject.subject_name}</p>
                          <p className="text-sm text-green-700">Pass Rate: {subject.pass_rate.toFixed(1)}%</p>
                        </div>
                      </div>
                      <span className="font-semibold text-green-800">{subject.average_percentage.toFixed(1)}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No subjects with 80%+ performance yet</p>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Areas Needing Attention</h3>
              <div className="space-y-3">
                {insights.underPerformingSubjects.length > 0 ? (
                  insights.underPerformingSubjects.map((subject, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-medium text-red-900">{subject.subject_name}</p>
                          <p className="text-sm text-red-700">Pass Rate: {subject.pass_rate.toFixed(1)}%</p>
                        </div>
                      </div>
                      <span className="font-semibold text-red-800">{subject.average_percentage.toFixed(1)}%</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-green-800">All subjects performing above 60%</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="space-y-6">
          {/* Subject Analysis */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Subject-wise Performance Analysis</h3>
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="input-field"
              >
                <option value="">All Subjects</option>
                {hodAnalytics.subject_performance.map(subject => (
                  <option key={subject.subject_name} value={subject.subject_name}>
                    {subject.subject_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Subject</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Teacher</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Avg Performance</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Pass Rate</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Action Required</th>
                  </tr>
                </thead>
                <tbody>
                  {hodAnalytics.subject_performance
                    .filter(subject => !selectedSubject || subject.subject_name === selectedSubject)
                    .map((subject, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{subject.subject_name}</p>
                          <p className="text-sm text-gray-600">{subject.subject_name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-900">N/A</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-semibold ${
                          subject.average_percentage >= 80 ? 'text-green-600' :
                          subject.average_percentage >= 70 ? 'text-blue-600' :
                          subject.average_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {subject.average_percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-medium">{subject.pass_rate.toFixed(1)}%</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          subject.average_percentage >= 80 ? 'bg-green-100 text-green-800' :
                          subject.average_percentage >= 70 ? 'bg-blue-100 text-blue-800' :
                          subject.average_percentage >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {subject.average_percentage >= 80 ? 'Excellent' :
                           subject.average_percentage >= 70 ? 'Good' :
                           subject.average_percentage >= 60 ? 'Average' : 'Needs Attention'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {subject.average_percentage < 60 ? 'Review teaching methods, provide support' :
                         subject.average_percentage < 70 ? 'Monitor progress, additional resources' :
                         subject.average_percentage < 80 ? 'Maintain standards, aim for excellence' :
                         'Continue excellent work, share best practices'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'faculty' && (
        <div className="space-y-6">
          {/* Teacher Performance Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Faculty Performance Overview</h3>
            <div className="h-80">
              <Bar data={teacherPerformanceData} options={chartOptions} />
            </div>
          </div>

          {/* Faculty Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Faculty</h3>
              <div className="space-y-3">
                {insights.topTeachers.length > 0 ? (
                  insights.topTeachers.map((teacher, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Star className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">{teacher.teacher_name}</p>
                          <p className="text-sm text-green-700">{teacher.subjects_taught} subjects</p>
                        </div>
                      </div>
                      <span className="font-semibold text-green-800">{teacher.average_class_performance.toFixed(1)}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No faculty with 80%+ class performance yet</p>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Faculty Needing Support</h3>
              <div className="space-y-3">
                {insights.teachersNeedingSupport.length > 0 ? (
                  insights.teachersNeedingSupport.map((teacher, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Target className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-yellow-900">{teacher.teacher_name}</p>
                          <p className="text-sm text-yellow-700">{teacher.subjects_taught} subjects</p>
                        </div>
                      </div>
                      <span className="font-semibold text-yellow-800">{teacher.average_class_performance.toFixed(1)}%</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-green-800">All faculty performing above 70%</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Faculty Table */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Faculty Analysis</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Faculty Name</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Subjects</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Students</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Avg Performance</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Rating</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {hodAnalytics.teacher_performance.map((teacher, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-gray-100 p-2 rounded-full">
                            <Users className="h-4 w-4 text-gray-600" />
                          </div>
                          <p className="font-medium text-gray-900">{teacher.teacher_name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                          {teacher.subjects_taught}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-medium">N/A</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-semibold ${
                          teacher.average_class_performance >= 80 ? 'text-green-600' :
                          teacher.average_class_performance >= 70 ? 'text-blue-600' :
                          teacher.average_class_performance >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {teacher.average_class_performance.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= Math.round(teacher.average_class_performance / 20) 
                                  ? 'text-yellow-400 fill-current' 
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {teacher.average_class_performance >= 85 ? 'Excellent! Share best practices' :
                         teacher.average_class_performance >= 75 ? 'Good performance, maintain quality' :
                         teacher.average_class_performance >= 65 ? 'Needs improvement, provide support' :
                         'Urgent intervention needed, remedial training'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {/* NBA Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">CO Attainment</h3>
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-center">
                {nbaLoading ? (
                  <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
                    <div className="animate-spin rounded-full h-24 w-24 border-2 border-gray-200 border-t-green-500"></div>
                  </div>
                ) : nbaError ? (
                  <div className="text-red-600">
                    <p className="text-sm">Error loading data</p>
                  </div>
                ) : (
                  <>
                    <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          className="text-gray-200 h-24 w-24"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 10}`}
                          strokeDashoffset={`${2 * Math.PI * 10 * (1 - nbaMetrics.coAttainment / 100)}`}
                          className="text-green-500 h-24 w-24"
                        />
                      </svg>
                      <span className="absolute text-xl font-bold text-gray-900">
                        {nbaMetrics.coAttainment.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Course Outcomes</p>
                    <p className={`text-xs ${nbaMetrics.coAttainment >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                      {nbaMetrics.coAttainment >= 75 ? 'Target Achieved' : 'Below Target'}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">PO Attainment</h3>
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-center">
                {nbaLoading ? (
                  <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
                    <div className="animate-spin rounded-full h-24 w-24 border-2 border-gray-200 border-t-blue-500"></div>
                  </div>
                ) : nbaError ? (
                  <div className="text-red-600">
                    <p className="text-sm">Error loading data</p>
                  </div>
                ) : (
                  <>
                    <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          className="text-gray-200 h-24 w-24"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 10}`}
                          strokeDashoffset={`${2 * Math.PI * 10 * (1 - nbaMetrics.poAttainment / 100)}`}
                          className="text-blue-500 h-24 w-24"
                        />
                      </svg>
                      <span className="absolute text-xl font-bold text-gray-900">
                        {nbaMetrics.poAttainment.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Program Outcomes</p>
                    <p className={`text-xs ${nbaMetrics.poAttainment >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                      {nbaMetrics.poAttainment >= 70 ? 'Target Achieved' : 'Below Target'}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Overall Compliance</h3>
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-center">
                {nbaLoading ? (
                  <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
                    <div className="animate-spin rounded-full h-24 w-24 border-2 border-gray-200 border-t-purple-500"></div>
                  </div>
                ) : nbaError ? (
                  <div className="text-red-600">
                    <p className="text-sm">Error loading data</p>
                  </div>
                ) : (
                  <>
                    <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          className="text-gray-200 h-24 w-24"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 10}`}
                          strokeDashoffset={`${2 * Math.PI * 10 * (1 - nbaMetrics.overallCompliance / 100)}`}
                          className="text-purple-500 h-24 w-24"
                        />
                      </svg>
                      <span className="absolute text-xl font-bold text-gray-900">
                        {nbaMetrics.overallCompliance.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">NBA Compliance</p>
                    <p className={`text-xs ${nbaMetrics.thresholdMet ? 'text-green-600' : 'text-red-600'}`}>
                      {nbaMetrics.thresholdMet ? 'Compliant' : 'Non-Compliant'}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Compliance Details */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">NBA Compliance Checklist</h3>
            {nbaLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="h-5 w-5 bg-gray-300 rounded"></div>
                        <div>
                          <div className="h-4 bg-gray-300 rounded w-48 mb-2"></div>
                          <div className="h-3 bg-gray-300 rounded w-32"></div>
                        </div>
                      </div>
                      <div className="h-6 bg-gray-300 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : nbaError ? (
              <div className="text-center py-8">
                <p className="text-red-600">Failed to load compliance data</p>
                <button 
                  onClick={() => user?.department_id && fetchNbaCompliance(user.department_id)}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {nbaCompliance?.alerts?.length > 0 ? (
                  nbaCompliance.alerts.map((alert: any, index: number) => (
                    <div key={index} className={`flex items-center justify-between p-4 ${
                      alert.type === 'success' ? 'bg-green-50 border-green-200' : 
                      alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' : 
                      'bg-red-50 border-red-200'
                    } border rounded-lg`}>
                      <div className="flex items-center space-x-3">
                        {alert.type === 'success' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : alert.type === 'warning' ? (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className={`font-medium ${
                            alert.type === 'success' ? 'text-green-900' : 
                            alert.type === 'warning' ? 'text-yellow-900' : 
                            'text-red-900'
                          }`}>
                            {alert.message}
                          </p>
                          <p className={`text-sm ${
                            alert.type === 'success' ? 'text-green-700' : 
                            alert.type === 'warning' ? 'text-yellow-700' : 
                            'text-red-700'
                          }`}>
                            Priority: {alert.priority}
                          </p>
                        </div>
                      </div>
                      <span className={`font-medium ${
                        alert.type === 'success' ? 'text-green-600' : 
                        alert.type === 'warning' ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>
                        {alert.type === 'success' ? 'Complete' : 
                         alert.type === 'warning' ? 'In Progress' : 
                         'Needs Attention'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">CO Attainment Documentation</p>
                          <p className="text-sm text-green-700">All course outcomes properly mapped and evaluated</p>
                        </div>
                      </div>
                      <span className="text-green-600 font-medium">Complete</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">Assessment Methods</p>
                          <p className="text-sm text-green-700">Multiple assessment tools implemented</p>
                        </div>
                      </div>
                      <span className="text-green-600 font-medium">Complete</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-yellow-900">Student Feedback Analysis</p>
                          <p className="text-sm text-yellow-700">In progress - data being collected</p>
                        </div>
                      </div>
                      <span className="text-yellow-600 font-medium">In Progress</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">Faculty Development</p>
                          <p className="text-sm text-green-700">Training programs completed</p>
                        </div>
                      </div>
                      <span className="text-green-600 font-medium">Complete</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Items */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Action Items for NBA Compliance</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="bg-blue-100 p-1 rounded">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Complete Student Feedback Collection</p>
                  <p className="text-xs text-blue-700">Deadline: End of semester</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="bg-purple-100 p-1 rounded">
                  <span className="text-purple-600 font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-900">Update Course Files</p>
                  <p className="text-xs text-purple-700">Ensure all documentation is current</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="bg-orange-100 p-1 rounded">
                  <span className="text-orange-600 font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-900">Prepare Assessment Reports</p>
                  <p className="text-xs text-orange-700">Quarterly assessment analysis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HODAnalytics