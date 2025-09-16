import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchHODAnalytics } from '../../store/slices/analyticsSlice'
import { fetchDepartments } from '../../store/slices/departmentSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { analyticsAPI } from '../../services/api'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale } from 'chart.js'
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2'
import { 
  Users, BookOpen, TrendingUp, Award, Target, AlertTriangle, CheckCircle, Star, Download, Filter, Clock,
  BarChart3, PieChart, Activity, TrendingDown, ArrowUp, ArrowDown, Calendar, Settings, Eye, RefreshCw,
  GraduationCap, UserCheck, BookMarked, FileText, Zap, Shield, Globe, Database
} from 'lucide-react'

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

const HODAnalyticsEnhanced = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { hodAnalytics, loading } = useSelector((state: RootState) => state.analytics)
  const { user } = useSelector((state: RootState) => state.auth)
  const { departments } = useSelector((state: RootState) => state.departments)
  const { users } = useSelector((state: RootState) => state.users)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  
  // Enhanced state management
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [timeRange, setTimeRange] = useState<'all' | 'current' | 'last6months' | 'lastyear'>('all')
  const [viewMode, setViewMode] = useState<'dashboard' | 'detailed' | 'comparative'>('dashboard')
  const [showFilters, setShowFilters] = useState(false)
  const [showCharts, setShowCharts] = useState(true)
  const [nbaCompliance, setNbaCompliance] = useState<any>(null)
  const [nbaLoading, setNbaLoading] = useState(false)
  const [nbaError, setNbaError] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set(['performance', 'attainment', 'compliance']))
  const [attainmentData, setAttainmentData] = useState<any>(null)
  const [attainmentLoading, setAttainmentLoading] = useState(false)
  const [attainmentError, setAttainmentError] = useState<string | null>(null)

  const fetchNbaCompliance = async (departmentId: number) => {
    try {
      setNbaLoading(true)
      setNbaError(null)
      const response = await analyticsAPI.getStrategicDashboardData(departmentId)
      if (response.departmentalIntelligence?.compliance_monitoring) {
        setNbaCompliance(response.departmentalIntelligence.compliance_monitoring)
      }
    } catch (error) {
      console.error('Error fetching NBA compliance data:', error)
      setNbaError('Failed to fetch NBA compliance data')
    } finally {
      setNbaLoading(false)
    }
  }

  const fetchAttainmentData = async (subjectId: number, examType: string = 'all') => {
    try {
      setAttainmentLoading(true)
      setAttainmentError(null)
      const response = await analyticsAPI.getSubjectAttainment(subjectId, examType)
      setAttainmentData(response)
    } catch (error) {
      console.error('Error fetching attainment data:', error)
      setAttainmentError('Failed to fetch attainment data')
    } finally {
      setAttainmentLoading(false)
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

  // Enhanced analytics calculations
  const enhancedAnalytics = useMemo(() => {
    if (!hodAnalytics) return null

    const subjectPerformance = hodAnalytics.subject_performance || []
    const teacherPerformance = hodAnalytics.teacher_performance || []
    const departmentOverview = hodAnalytics.department_overview || {}

    // Performance metrics
    const performanceMetrics = {
      averageSubjectPerformance: subjectPerformance.reduce((sum, s) => sum + s.average_percentage, 0) / subjectPerformance.length || 0,
      averagePassRate: subjectPerformance.reduce((sum, s) => sum + s.pass_rate, 0) / subjectPerformance.length || 0,
      topPerformingSubject: subjectPerformance.reduce((max, s) => s.average_percentage > max.average_percentage ? s : max, subjectPerformance[0]),
      lowestPerformingSubject: subjectPerformance.reduce((min, s) => s.average_percentage < min.average_percentage ? s : min, subjectPerformance[0]),
      totalSubjects: subjectPerformance.length,
      subjectsAboveTarget: subjectPerformance.filter(s => s.average_percentage >= 70).length
    }

    // Teacher metrics
    const teacherMetrics = {
      averageTeacherPerformance: teacherPerformance.reduce((sum, t) => sum + t.average_class_performance, 0) / teacherPerformance.length || 0,
      topPerformingTeacher: teacherPerformance.reduce((max, t) => t.average_class_performance > max.average_class_performance ? t : max, teacherPerformance[0]),
      totalTeachers: teacherPerformance.length,
      teachersAboveTarget: teacherPerformance.filter(t => t.average_class_performance >= 70).length
    }

    // Department health score
    const departmentHealthScore = (
      (performanceMetrics.averageSubjectPerformance * 0.4) +
      (performanceMetrics.averagePassRate * 0.3) +
      (teacherMetrics.averageTeacherPerformance * 0.3)
    )

    return {
      performanceMetrics,
      teacherMetrics,
      departmentHealthScore,
      departmentOverview,
      subjectPerformance,
      teacherPerformance
    }
  }, [hodAnalytics])

  // Chart data preparation
  const chartData = useMemo(() => {
    if (!enhancedAnalytics) return null

    const { subjectPerformance, teacherPerformance } = enhancedAnalytics

    return {
      subjectPerformanceChart: {
        labels: subjectPerformance.map(s => s.subject_name.length > 15 ? s.subject_name.substring(0, 15) + '...' : s.subject_name),
        datasets: [
          {
            label: 'Average Performance (%)',
            data: subjectPerformance.map(s => s.average_percentage),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          },
          {
            label: 'Pass Rate (%)',
            data: subjectPerformance.map(s => s.pass_rate),
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 1
          }
        ]
      },
      teacherPerformanceChart: {
        labels: teacherPerformance.map(t => t.teacher_name),
        datasets: [
          {
            label: 'Average Class Performance (%)',
            data: teacherPerformance.map(t => t.average_class_performance),
            backgroundColor: 'rgba(139, 92, 246, 0.8)',
            borderColor: 'rgba(139, 92, 246, 1)',
            borderWidth: 1
          }
        ]
      },
      performanceDistribution: {
        labels: ['Excellent (90-100%)', 'Good (80-89%)', 'Satisfactory (70-79%)', 'Needs Improvement (<70%)'],
        datasets: [
          {
            data: [
              subjectPerformance.filter(s => s.average_percentage >= 90).length,
              subjectPerformance.filter(s => s.average_percentage >= 80 && s.average_percentage < 90).length,
              subjectPerformance.filter(s => s.average_percentage >= 70 && s.average_percentage < 80).length,
              subjectPerformance.filter(s => s.average_percentage < 70).length
            ],
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(239, 68, 68, 0.8)'
            ],
            borderColor: [
              'rgba(34, 197, 94, 1)',
              'rgba(59, 130, 246, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(239, 68, 68, 1)'
            ],
            borderWidth: 1
          }
        ]
      }
    }
  }, [enhancedAnalytics])

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Department Analytics'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    }
  }

  // Debug logging
  console.log('HOD Analytics Debug:', { 
    hodAnalytics, 
    loading, 
    user, 
    department, 
    departments,
    enhancedAnalytics
  })

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

  return (
    <div className="p-6 space-y-6">
      {/* Enhanced Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Department Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics for {department?.name}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Filter size={18} />
              <span>Filters</span>
            </button>
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="btn-secondary flex items-center space-x-2"
            >
              <BarChart3 size={18} />
              <span>{showCharts ? 'Hide' : 'Show'} Charts</span>
            </button>
            <button
              onClick={() => {/* Export functionality */}}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'performance', label: 'Performance', icon: TrendingUp },
            { id: 'attainment', label: 'Attainment', icon: Target },
            { id: 'compliance', label: 'Compliance', icon: Shield },
            { id: 'teachers', label: 'Teachers', icon: Users },
            { id: 'subjects', label: 'Subjects', icon: BookOpen }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="current">Current Semester</option>
                  <option value="last6months">Last 6 Months</option>
                  <option value="lastyear">Last Year</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  View Mode
                </label>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="detailed">Detailed</option>
                  <option value="comparative">Comparative</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showAdvanced"
                  checked={showAdvanced}
                  onChange={(e) => setShowAdvanced(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="showAdvanced" className="text-sm text-gray-700">
                  Show Advanced Metrics
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Department Overview Cards */}
      {activeTab === 'overview' && enhancedAnalytics && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">Total Students</p>
                  <p className="text-2xl font-bold text-blue-600">{enhancedAnalytics.departmentOverview.total_students || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center">
                <GraduationCap className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">Total Teachers</p>
                  <p className="text-2xl font-bold text-green-600">{enhancedAnalytics.departmentOverview.total_teachers || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900">Total Subjects</p>
                  <p className="text-2xl font-bold text-purple-600">{enhancedAnalytics.departmentOverview.total_subjects || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 p-6 rounded-lg">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-900">Avg Performance</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {enhancedAnalytics.departmentOverview.average_performance?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Department Health Score */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Department Health Score</h3>
              <div className="flex items-center space-x-2">
                <span className={`text-2xl font-bold ${
                  enhancedAnalytics.departmentHealthScore >= 80 ? 'text-green-600' :
                  enhancedAnalytics.departmentHealthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {enhancedAnalytics.departmentHealthScore.toFixed(1)}%
                </span>
                <div className={`w-3 h-3 rounded-full ${
                  enhancedAnalytics.departmentHealthScore >= 80 ? 'bg-green-500' :
                  enhancedAnalytics.departmentHealthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${
                  enhancedAnalytics.departmentHealthScore >= 80 ? 'bg-green-500' :
                  enhancedAnalytics.departmentHealthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${enhancedAnalytics.departmentHealthScore}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {enhancedAnalytics.departmentHealthScore >= 80 ? 'Excellent performance across all metrics' :
               enhancedAnalytics.departmentHealthScore >= 60 ? 'Good performance with room for improvement' :
               'Needs immediate attention and improvement'}
            </p>
          </div>

          {/* Charts */}
          {showCharts && chartData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Subject Performance</h3>
                <Bar data={chartData.subjectPerformanceChart} options={chartOptions} />
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Distribution</h3>
                <Doughnut data={chartData.performanceDistribution} options={chartOptions} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && enhancedAnalytics && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Subject Performance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {enhancedAnalytics.performanceMetrics.averageSubjectPerformance.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Pass Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {enhancedAnalytics.performanceMetrics.averagePassRate.toFixed(1)}%
                  </p>
                </div>
                <Award className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Subjects Above Target</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {enhancedAnalytics.performanceMetrics.subjectsAboveTarget}/{enhancedAnalytics.performanceMetrics.totalSubjects}
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Subject Performance Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Subject Performance Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Average %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pass Rate %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enhancedAnalytics.subjectPerformance.map((subject, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {subject.subject_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subject.average_percentage.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subject.pass_rate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          subject.average_percentage >= 80 ? 'bg-green-100 text-green-800' :
                          subject.average_percentage >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {subject.average_percentage >= 80 ? 'Excellent' :
                           subject.average_percentage >= 70 ? 'Good' : 'Needs Improvement'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm text-gray-600">+5.2%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Teachers Tab */}
      {activeTab === 'teachers' && enhancedAnalytics && (
        <div className="space-y-6">
          {/* Teacher Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Teacher Performance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {enhancedAnalytics.teacherMetrics.averageTeacherPerformance.toFixed(1)}%
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Teachers Above Target</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {enhancedAnalytics.teacherMetrics.teachersAboveTarget}/{enhancedAnalytics.teacherMetrics.totalTeachers}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Top Performer</p>
                  <p className="text-lg font-bold text-gray-900">
                    {enhancedAnalytics.teacherMetrics.topPerformingTeacher?.teacher_name || 'N/A'}
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Teacher Performance Chart */}
          {showCharts && chartData && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Teacher Performance Comparison</h3>
              <Bar data={chartData.teacherPerformanceChart} options={chartOptions} />
            </div>
          )}

          {/* Teacher Performance Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Teacher Performance Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teacher
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subjects Taught
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Performance %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enhancedAnalytics.teacherPerformance.map((teacher, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {teacher.teacher_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {teacher.subjects_taught}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {teacher.average_class_performance.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          teacher.average_class_performance >= 80 ? 'bg-green-100 text-green-800' :
                          teacher.average_class_performance >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {teacher.average_class_performance >= 80 ? 'Excellent' :
                           teacher.average_class_performance >= 70 ? 'Good' : 'Needs Improvement'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          View Details
                        </button>
                        <button className="text-green-600 hover:text-green-900">
                          Send Feedback
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Attainment Tab */}
      {activeTab === 'attainment' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">CO/PO Attainment Analysis</h3>
            <p className="text-gray-600 mb-4">Comprehensive attainment analysis for all subjects in the department</p>
            
            {/* Subject Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Subject
              </label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value)
                if (e.target.value) {
                  fetchAttainmentData(parseInt(e.target.value), timeRange)
                } else {
                  setAttainmentData(null)
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="">All Subjects</option>
                {subjects.filter(s => s.department_id === user?.department_id).map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Attainment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {nbaCompliance?.co_attainment?.toFixed(1) || 0}%
                </div>
                <p className="text-sm text-gray-600">Average CO Attainment</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {nbaCompliance?.po_attainment?.toFixed(1) || 0}%
                </div>
                <p className="text-sm text-gray-600">Average PO Attainment</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {nbaCompliance?.overall_compliance?.toFixed(1) || 0}%
                </div>
                <p className="text-sm text-gray-600">Overall Compliance</p>
              </div>
            </div>

            {/* Exam Type Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Type
              </label>
              <div className="flex space-x-4">
                {['all', 'internal1', 'internal2', 'final'].map(examType => (
                  <button
                    key={examType}
                    onClick={() => {
                      setTimeRange(examType as any)
                      if (selectedSubject) {
                        fetchAttainmentData(parseInt(selectedSubject), examType)
                      }
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      timeRange === examType
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {examType === 'all' ? 'All Exams' : examType.replace('internal', 'Internal ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Attainment Data Display */}
            {attainmentLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mx-auto mb-3"></div>
                <p className="text-gray-500">Loading attainment data...</p>
              </div>
            ) : attainmentError ? (
              <div className="text-center py-8 text-red-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3" />
                <p>{attainmentError}</p>
              </div>
            ) : attainmentData ? (
              <div className="space-y-6">
                {/* CO Attainment Summary */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">CO Attainment Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attainmentData.co_attainment?.map((co: any, index: number) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">{co.co_code}</h5>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            co.actual_pct >= co.target_pct 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {co.level}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{co.co_description}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Actual:</span>
                            <span className="font-medium">{co.actual_pct}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Target:</span>
                            <span className="font-medium">{co.target_pct}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Gap:</span>
                            <span className={`font-medium ${co.gap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {co.gap > 0 ? '+' : ''}{co.gap}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PO Attainment Summary */}
                {attainmentData.po_attainment && attainmentData.po_attainment.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">PO Attainment Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {attainmentData.po_attainment.map((po: any, index: number) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900">{po.po_code}</h5>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              po.total_pct >= 70 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {po.level}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{po.po_description}</p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Total:</span>
                              <span className="font-medium">{po.total_pct}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Direct:</span>
                              <span className="font-medium">{po.direct_pct}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Indirect:</span>
                              <span className="font-medium">{po.indirect_pct}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance Metrics */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {attainmentData.overall_attainment?.toFixed(1) || 0}%
                      </div>
                      <p className="text-sm text-gray-600">Overall Attainment</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {attainmentData.target_attainment?.toFixed(1) || 0}%
                      </div>
                      <p className="text-sm text-gray-600">Target Attainment</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {attainmentData.gap_analysis?.overall_gap?.toFixed(1) || 0}%
                      </div>
                      <p className="text-sm text-gray-600">Gap</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {attainmentData.performance_metrics?.total_students || 0}
                      </div>
                      <p className="text-sm text-gray-600">Total Students</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Select a subject and exam type to view CO/PO attainment details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NBA Compliance Tab */}
      {activeTab === 'compliance' && nbaCompliance && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">NBA Compliance Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {nbaCompliance.overall_compliance?.toFixed(1) || 0}%
                </div>
                <p className="text-sm text-gray-600">Overall Compliance</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {nbaCompliance.co_attainment?.toFixed(1) || 0}%
                </div>
                <p className="text-sm text-gray-600">CO Attainment</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {nbaCompliance.po_attainment?.toFixed(1) || 0}%
                </div>
                <p className="text-sm text-gray-600">PO Attainment</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HODAnalyticsEnhanced
