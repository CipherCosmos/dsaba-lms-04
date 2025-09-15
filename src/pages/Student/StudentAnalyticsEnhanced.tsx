import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchStudentAnalytics } from '../../store/slices/analyticsSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchExams } from '../../store/slices/examSlice'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale } from 'chart.js'
import { Line, Doughnut, Radar, Bar } from 'react-chartjs-2'
import { 
  TrendingUp, Award, BookOpen, Star, AlertCircle, Trophy, Brain, Target, Download, 
  BarChart3, PieChart, Activity, TrendingDown, ArrowUp, ArrowDown, Calendar, Settings, 
  Eye, RefreshCw, Users, FileText, Zap, Shield, Globe, Database, Clock, CheckCircle,
  AlertTriangle, BookMarked, GraduationCap, UserCheck, Target as TargetIcon
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

const StudentAnalyticsEnhanced = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { studentAnalytics, loading } = useSelector((state: RootState) => state.analytics)
  const { user } = useSelector((state: RootState) => state.auth)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { exams } = useSelector((state: RootState) => state.exams)
  
  // Enhanced state management
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [timeRange, setTimeRange] = useState<'all' | 'current' | 'last6months' | 'lastyear'>('all')
  const [viewMode, setViewMode] = useState<'dashboard' | 'detailed' | 'comparative'>('dashboard')
  const [showFilters, setShowFilters] = useState(false)
  const [showCharts, setShowCharts] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf')
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set(['performance', 'attainment', 'progress']))

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchStudentAnalytics(user.id))
    }
    dispatch(fetchSubjects())
    dispatch(fetchExams())
  }, [dispatch, user])

  const classSubjects = subjects?.filter(s => s && s.class_id === user?.class_id) || []

  // Enhanced analytics calculations
  const enhancedAnalytics = useMemo(() => {
    if (!studentAnalytics) return null

    const performanceTrend = studentAnalytics.performance_trend || []
    const coAttainment = studentAnalytics.co_attainment || {}
    const poAttainment = studentAnalytics.po_attainment || {}

    // Performance metrics
    const performanceMetrics = {
      currentPercentage: studentAnalytics.percentage || 0,
      currentRank: studentAnalytics.rank || 0,
      totalMarks: studentAnalytics.total_marks || 0,
      averagePerformance: performanceTrend.reduce((sum, p) => sum + p.percentage, 0) / performanceTrend.length || 0,
      highestPerformance: Math.max(...performanceTrend.map(p => p.percentage), 0),
      lowestPerformance: Math.min(...performanceTrend.map(p => p.percentage), 0),
      performanceImprovement: performanceTrend.length > 1 ? 
        performanceTrend[performanceTrend.length - 1].percentage - performanceTrend[0].percentage : 0,
      totalExams: performanceTrend.length
    }

    // CO/PO attainment metrics
    const attainmentMetrics = {
      coAttainment: {
        total: Object.keys(coAttainment).length,
        achieved: Object.values(coAttainment).filter((value: any) => value >= 70).length,
        average: Object.values(coAttainment).reduce((sum: number, value: any) => sum + value, 0) / Object.keys(coAttainment).length || 0,
        highest: Math.max(...Object.values(coAttainment), 0),
        lowest: Math.min(...Object.values(coAttainment), 0)
      },
      poAttainment: {
        total: Object.keys(poAttainment).length,
        achieved: Object.values(poAttainment).filter((value: any) => value >= 70).length,
        average: Object.values(poAttainment).reduce((sum: number, value: any) => sum + value, 0) / Object.keys(poAttainment).length || 0,
        highest: Math.max(...Object.values(poAttainment), 0),
        lowest: Math.min(...Object.values(poAttainment), 0)
      }
    }

    // Grade analysis
    const gradeAnalysis = {
      A: performanceTrend.filter(p => p.percentage >= 90).length,
      B: performanceTrend.filter(p => p.percentage >= 80 && p.percentage < 90).length,
      C: performanceTrend.filter(p => p.percentage >= 70 && p.percentage < 80).length,
      D: performanceTrend.filter(p => p.percentage >= 60 && p.percentage < 70).length,
      F: performanceTrend.filter(p => p.percentage < 60).length
    }

    // Study recommendations
    const studyRecommendations = []
    if (performanceMetrics.averagePerformance < 70) {
      studyRecommendations.push('Focus on improving overall performance through regular study')
    }
    if (attainmentMetrics.coAttainment.average < 70) {
      studyRecommendations.push('Work on Course Outcomes (COs) understanding and application')
    }
    if (attainmentMetrics.poAttainment.average < 70) {
      studyRecommendations.push('Enhance Program Outcomes (POs) through practical applications')
    }
    if (performanceMetrics.performanceImprovement < 0) {
      studyRecommendations.push('Review study methods and seek additional help if needed')
    }

    return {
      performanceMetrics,
      attainmentMetrics,
      gradeAnalysis,
      studyRecommendations,
      performanceTrend,
      coAttainment,
      poAttainment
    }
  }, [studentAnalytics])

  // Chart data preparation
  const chartData = useMemo(() => {
    if (!enhancedAnalytics) return null

    const { performanceTrend, coAttainment, poAttainment } = enhancedAnalytics

    return {
      performanceTrendChart: {
        labels: performanceTrend.map(p => p.exam),
        datasets: [
          {
            label: 'Your Performance (%)',
            data: performanceTrend.map(p => p.percentage),
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      coAttainmentRadar: {
        labels: Object.keys(coAttainment),
        datasets: [
          {
            label: 'CO Attainment (%)',
            data: Object.values(coAttainment),
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            borderColor: 'rgba(34, 197, 94, 1)',
            pointBackgroundColor: 'rgba(34, 197, 94, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(34, 197, 94, 1)'
          }
        ]
      },
      poAttainmentRadar: {
        labels: Object.keys(poAttainment),
        datasets: [
          {
            label: 'PO Attainment (%)',
            data: Object.values(poAttainment),
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
            borderColor: 'rgba(139, 92, 246, 1)',
            pointBackgroundColor: 'rgba(139, 92, 246, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(139, 92, 246, 1)'
          }
        ]
      },
      gradeDistribution: {
        labels: ['A (90-100%)', 'B (80-89%)', 'C (70-79%)', 'D (60-69%)', 'F (<60%)'],
        datasets: [
          {
            data: [
              enhancedAnalytics.gradeAnalysis.A,
              enhancedAnalytics.gradeAnalysis.B,
              enhancedAnalytics.gradeAnalysis.C,
              enhancedAnalytics.gradeAnalysis.D,
              enhancedAnalytics.gradeAnalysis.F
            ],
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(251, 146, 60, 0.8)',
              'rgba(239, 68, 68, 0.8)'
            ],
            borderColor: [
              'rgba(34, 197, 94, 1)',
              'rgba(59, 130, 246, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(251, 146, 60, 1)',
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
        text: 'Student Performance Analytics'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    }
  }

  const radarOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Attainment Analysis'
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100
      }
    }
  }

  // Debug logging
  console.log('Student Analytics Debug:', { 
    studentAnalytics, 
    loading, 
    user, 
    subjects, 
    classSubjects,
    enhancedAnalytics
  })

  if (loading && !studentAnalytics) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!studentAnalytics) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No analytics data available</p>
        <p className="text-sm text-gray-400">Complete some exams to see your analytics</p>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Debug Info:</h3>
            <pre className="text-xs text-gray-600 overflow-auto">
              {JSON.stringify({ studentAnalytics, loading, user, subjects }, null, 2)}
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
            <h1 className="text-3xl font-bold text-gray-900">My Learning Analytics</h1>
            <p className="text-gray-600 mt-1">Track your academic progress and performance insights</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Settings size={18} />
              <span>Settings</span>
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
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'performance', label: 'Performance', icon: TrendingUp },
            { id: 'attainment', label: 'Attainment', icon: Target },
            { id: 'progress', label: 'Progress', icon: Activity },
            { id: 'recommendations', label: 'Recommendations', icon: Brain }
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
                  Subject Filter
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Subjects</option>
                  {classSubjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
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

      {/* Overview Tab */}
      {activeTab === 'overview' && enhancedAnalytics && (
        <div className="space-y-6">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">Current Performance</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {enhancedAnalytics.performanceMetrics.currentPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center">
                <Award className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">Class Rank</p>
                  <p className="text-2xl font-bold text-green-600">
                    #{enhancedAnalytics.performanceMetrics.currentRank}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900">CO Attainment</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {enhancedAnalytics.attainmentMetrics.coAttainment.average.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 p-6 rounded-lg">
              <div className="flex items-center">
                <Star className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-900">PO Attainment</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {enhancedAnalytics.attainmentMetrics.poAttainment.average.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Overall Performance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average:</span>
                    <span className="text-sm font-medium">{enhancedAnalytics.performanceMetrics.averagePerformance.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Highest:</span>
                    <span className="text-sm font-medium">{enhancedAnalytics.performanceMetrics.highestPerformance.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Exams:</span>
                    <span className="text-sm font-medium">{enhancedAnalytics.performanceMetrics.totalExams}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Improvement Trend</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Change:</span>
                    <span className={`text-sm font-medium ${
                      enhancedAnalytics.performanceMetrics.performanceImprovement >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {enhancedAnalytics.performanceMetrics.performanceImprovement >= 0 ? '+' : ''}
                      {enhancedAnalytics.performanceMetrics.performanceImprovement.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`text-sm font-medium ${
                      enhancedAnalytics.performanceMetrics.performanceImprovement >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {enhancedAnalytics.performanceMetrics.performanceImprovement >= 0 ? 'Improving' : 'Declining'}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Grade Distribution</h4>
                <div className="space-y-1">
                  {Object.entries(enhancedAnalytics.gradeAnalysis).map(([grade, count]) => (
                    <div key={grade} className="flex justify-between">
                      <span className="text-xs text-gray-600">Grade {grade}:</span>
                      <span className="text-xs font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          {showCharts && chartData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trend</h3>
                <Line data={chartData.performanceTrendChart} options={chartOptions} />
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Grade Distribution</h3>
                <Doughnut data={chartData.gradeDistribution} options={chartOptions} />
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
                  <p className="text-sm font-medium text-gray-600">Current Performance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {enhancedAnalytics.performanceMetrics.currentPercentage.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Class Rank</p>
                  <p className="text-2xl font-bold text-gray-900">
                    #{enhancedAnalytics.performanceMetrics.currentRank}
                  </p>
                </div>
                <Award className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Marks</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {enhancedAnalytics.performanceMetrics.totalMarks}
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Performance Trend Chart */}
          {showCharts && chartData && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Over Time</h3>
              <Line data={chartData.performanceTrendChart} options={chartOptions} />
            </div>
          )}

          {/* Performance Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Exam Performance History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exam
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
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
                  {enhancedAnalytics.performanceTrend.map((exam, index) => {
                    const grade = exam.percentage >= 90 ? 'A' : 
                                 exam.percentage >= 80 ? 'B' : 
                                 exam.percentage >= 70 ? 'C' : 
                                 exam.percentage >= 60 ? 'D' : 'F'
                    const isImproving = index > 0 ? exam.percentage > enhancedAnalytics.performanceTrend[index - 1].percentage : true
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {exam.exam}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {exam.percentage.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            grade === 'A' ? 'bg-green-100 text-green-800' :
                            grade === 'B' ? 'bg-blue-100 text-blue-800' :
                            grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                            grade === 'D' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            exam.percentage >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {exam.percentage >= 70 ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {isImproving ? (
                              <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                            ) : (
                              <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                            )}
                            <span className={`text-sm ${
                              isImproving ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {isImproving ? 'Improving' : 'Declining'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Attainment Tab */}
      {activeTab === 'attainment' && enhancedAnalytics && (
        <div className="space-y-6">
          {/* Attainment Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">CO Attainment</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Attainment:</span>
                  <span className="text-sm font-medium">{enhancedAnalytics.attainmentMetrics.coAttainment.average.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Achieved COs:</span>
                  <span className="text-sm font-medium">
                    {enhancedAnalytics.attainmentMetrics.coAttainment.achieved}/{enhancedAnalytics.attainmentMetrics.coAttainment.total}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Highest:</span>
                  <span className="text-sm font-medium">{enhancedAnalytics.attainmentMetrics.coAttainment.highest.toFixed(1)}%</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">PO Attainment</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Attainment:</span>
                  <span className="text-sm font-medium">{enhancedAnalytics.attainmentMetrics.poAttainment.average.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Achieved POs:</span>
                  <span className="text-sm font-medium">
                    {enhancedAnalytics.attainmentMetrics.poAttainment.achieved}/{enhancedAnalytics.attainmentMetrics.poAttainment.total}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Highest:</span>
                  <span className="text-sm font-medium">{enhancedAnalytics.attainmentMetrics.poAttainment.highest.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Attainment Charts */}
          {showCharts && chartData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">CO Attainment Radar</h3>
                <Radar data={chartData.coAttainmentRadar} options={radarOptions} />
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">PO Attainment Radar</h3>
                <Radar data={chartData.poAttainmentRadar} options={radarOptions} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && enhancedAnalytics && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Study Recommendations</h3>
            <div className="space-y-4">
              {enhancedAnalytics.studyRecommendations.length > 0 ? (
                enhancedAnalytics.studyRecommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                    <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
                    <p className="text-sm text-gray-700">{recommendation}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">Great job! No specific recommendations at this time.</p>
                  <p className="text-sm text-gray-500 mt-2">Keep up the excellent work!</p>
                </div>
              )}
            </div>
          </div>

          {/* Study Tips */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">General Study Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Time Management</h4>
                <p className="text-sm text-green-700">Create a study schedule and stick to it. Allocate specific time slots for each subject.</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Active Learning</h4>
                <p className="text-sm text-blue-700">Engage with the material through practice problems, discussions, and teaching others.</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Regular Review</h4>
                <p className="text-sm text-purple-700">Review your notes regularly and practice past exam questions to reinforce learning.</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">Seek Help</h4>
                <p className="text-sm text-orange-700">Don't hesitate to ask teachers or peers for help when you encounter difficulties.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentAnalyticsEnhanced
