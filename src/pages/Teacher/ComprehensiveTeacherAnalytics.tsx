import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2'
import {
  TrendingUp, TrendingDown, Target, Award, BookOpen, Users,
  BarChart3, PieChart, LineChart, Activity, Brain, Zap,
  Download, RefreshCw, Filter, Search, Eye, EyeOff,
  AlertTriangle, CheckCircle, XCircle, Info, Clock,
  FileText, Calendar, Star, ArrowUp, ArrowDown, Minus,
  Gauge, Layers, UserCheck, BookMarked, BarChart2,
  FileBarChart, Activity as ActivityIcon, Brain as BrainIcon
} from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

// Types
interface AnalyticsData {
  overview: any
  students: any[]
  questions: any[]
  exams: any[]
  attainment: any
  performance: any
  trends: any
  insights: any[]
}

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv'
  includeCharts: boolean
  includeRawData: boolean
  dateRange: { start: string; end: string }
}

const ComprehensiveTeacherAnalytics: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects)
  const { user } = useSelector((state: RootState) => state.auth)

  // State management
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'questions' | 'exams' | 'attainment' | 'performance' | 'trends' | 'insights'>('overview')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30000)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    includeCharts: true,
    includeRawData: true,
    dateRange: { start: '', end: '' }
  })

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [examTypeFilter, setExamTypeFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const teacherSubjects = useMemo(() => 
    subjects.filter(subject => subject.teacher_id === user?.id),
    [subjects, user?.id]
  )

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !selectedSubjectId) return

    const interval = setInterval(() => {
      fetchAnalyticsData(selectedSubjectId)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, selectedSubjectId, refreshInterval])

  // Fetch comprehensive analytics data
  const fetchAnalyticsData = useCallback(async (subjectId: number) => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Authentication required')

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      // Fetch comprehensive analytics data
      const response = await fetch(`http://localhost:8000/analytics/teacher/comprehensive/${subjectId}`, { headers })
      
      if (!response.ok) throw new Error('Failed to fetch comprehensive analytics data')
      
      const comprehensiveData = await response.json()
      
      // Extract individual components
      const {
        overview,
        students,
        questions,
        exams,
        attainment,
        performance,
        class_comparison: trends,
        insights
      } = comprehensiveData

      setAnalyticsData({
        overview,
        students,
        questions,
        exams,
        attainment,
        performance,
        trends,
        insights
      })

      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Generate insights from data
  const generateInsights = (overview: any, students: any[], questions: any[], exams: any[], attainment: any, performance: any) => {
    const insights = []

    // Performance insights
    if (overview?.average_performance < 60) {
      insights.push({
        type: 'warning',
        title: 'Low Class Performance',
        message: `Class average is ${overview.average_performance?.toFixed(1)}%, below the 60% threshold`,
        recommendation: 'Consider additional support sessions and review teaching methods'
      })
    }

    if (overview?.pass_rate < 70) {
      insights.push({
        type: 'error',
        title: 'Low Pass Rate',
        message: `Pass rate is ${overview.pass_rate?.toFixed(1)}%, below the 70% target`,
        recommendation: 'Implement remedial classes and personalized attention for struggling students'
      })
    }

    // CO attainment insights
    if (attainment?.co_attainment) {
      const lowCOs = attainment.co_attainment.filter((co: any) => co.actual_pct < 60)
      if (lowCOs.length > 0) {
        insights.push({
          type: 'info',
          title: 'Course Outcomes Need Attention',
          message: `${lowCOs.length} CO(s) are below 60% attainment`,
          recommendation: 'Focus on improving teaching methods for these specific learning outcomes'
        })
      }
    }

    // Question difficulty insights
    if (questions?.length > 0) {
      const difficultQuestions = questions.filter((q: any) => q.success_rate < 50)
      if (difficultQuestions.length > 0) {
        insights.push({
          type: 'info',
          title: 'Difficult Questions Identified',
          message: `${difficultQuestions.length} question(s) have success rate below 50%`,
          recommendation: 'Review and potentially revise these questions or provide additional practice'
        })
      }
    }

    return insights
  }

  // Export functions
  const exportData = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!analyticsData || !selectedSubjectId) return

    try {
      const response = await fetch(`http://localhost:8000/reports/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          report_type: 'class_analytics',
          format,
          filters: {
            subject_id: selectedSubjectId,
            exam_type: 'all',
            include_charts: exportOptions.includeCharts,
            include_raw_data: exportOptions.includeRawData
          }
        })
      })

      if (!response.ok) throw new Error('Failed to generate report')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comprehensive_teacher_analytics_${format}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data')
    }
  }

  // Tab configuration
  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3, description: 'Key metrics and summary' },
    { id: 'students', name: 'Students', icon: Users, description: 'Student performance analysis' },
    { id: 'questions', name: 'Questions', icon: BookOpen, description: 'Question analysis and difficulty' },
    { id: 'exams', name: 'Exams', icon: FileText, description: 'Exam performance trends' },
    { id: 'attainment', name: 'Attainment', icon: Target, description: 'CO/PO attainment tracking' },
    { id: 'performance', name: 'Performance', icon: Activity, description: 'Class performance metrics' },
    { id: 'trends', name: 'Trends', icon: TrendingUp, description: 'Performance trends over time' },
    { id: 'insights', name: 'Insights', icon: Brain, description: 'AI-powered insights and recommendations' }
  ]

  // Render functions for each tab
  const renderOverviewTab = () => {
    if (!analyticsData?.overview) return null

    const { overview } = analyticsData

    return (
      <div className="space-y-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-semibold text-gray-900">{overview.total_students || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Performance</p>
                <p className="text-2xl font-semibold text-gray-900">{overview.average_performance?.toFixed(1) || 0}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{overview.pass_rate?.toFixed(1) || 0}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Top Performers</p>
                <p className="text-2xl font-semibold text-gray-900">{overview.top_performers || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
            <div className="h-64">
              {overview.grade_distribution && (
                <Doughnut
                  data={{
                    labels: Object.keys(overview.grade_distribution),
                    datasets: [{
                      data: Object.values(overview.grade_distribution),
                      backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'],
                      borderColor: ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'],
                      borderWidth: 1
                    }]
                  }}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">CO Attainment Overview</h3>
            <div className="h-64">
              {overview.co_attainment && Array.isArray(overview.co_attainment) && (
                <Bar
                  data={{
                    labels: overview.co_attainment.map((co: any) => co.co_code),
                    datasets: [{
                      label: 'Attainment %',
                      data: overview.co_attainment.map((co: any) => co.actual_pct),
                      backgroundColor: '#3B82F6',
                      borderColor: '#3B82F6',
                      borderWidth: 1
                    }]
                  }}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderStudentsTab = () => {
    if (!analyticsData?.students) return null

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Performance Analysis</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CO Attainment</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.students.map((student: any) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">{student.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.percentage?.toFixed(1)}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        student.grade === 'A' ? 'bg-green-100 text-green-800' :
                        student.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                        student.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                        student.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {student.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.co_attainment ? Object.keys(student.co_attainment).length : 0} COs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderQuestionsTab = () => {
    if (!analyticsData?.questions) return null

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Analysis</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CO Mapping</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.questions.map((question: any, index: number) => (
                  <tr key={`question-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">Q{question.question_number || index + 1}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{question.question_text}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        question.success_rate >= 80 ? 'text-green-600' :
                        question.success_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {question.success_rate?.toFixed(1) || 0}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {question.difficulty || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {(question.co_mapping || []).slice(0, 2).map((co: string, idx: number) => (
                          <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                            {co}
                          </span>
                        ))}
                        {(question.co_mapping || []).length > 2 && (
                          <span className="text-xs text-gray-500">+{(question.co_mapping || []).length - 2}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderExamsTab = () => {
    if (!analyticsData?.exams) return null

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.exams.map((exam: any, index: number) => (
                  <tr key={`exam-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{exam.exam_name || `Exam ${index + 1}`}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {exam.exam_type || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        exam.average_percentage >= 80 ? 'text-green-600' :
                        exam.average_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {exam.average_percentage?.toFixed(1) || 0}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        exam.pass_rate >= 80 ? 'text-green-600' :
                        exam.pass_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {exam.pass_rate?.toFixed(1) || 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderAttainmentTab = () => {
    if (!analyticsData?.attainment) return null

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Outcomes Attainment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(analyticsData.attainment.co_attainment || []).map((co: any, index: number) => (
              <div key={`co-${index}`} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{co.co_code || `CO${index + 1}`}</span>
                  <span className={`text-sm font-semibold ${
                    co.actual_pct >= 80 ? 'text-green-600' :
                    co.actual_pct >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {co.actual_pct?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      co.actual_pct >= 80 ? 'bg-green-500' :
                      co.actual_pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${co.actual_pct || 0}%` }}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Target: {co.target_pct?.toFixed(1) || 60}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderPerformanceTab = () => {
    if (!analyticsData?.performance) return null

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-600">Average Score</p>
                  <p className="text-2xl font-bold text-blue-900">{analyticsData.performance.average_score?.toFixed(1) || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-600">Pass Rate</p>
                  <p className="text-2xl font-bold text-green-900">{analyticsData.performance.pass_rate?.toFixed(1) || 0}%</p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center">
                <Award className="h-8 w-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-600">Excellence Rate</p>
                  <p className="text-2xl font-bold text-yellow-900">{analyticsData.performance.excellence_rate?.toFixed(1) || 0}%</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-600">Total Students</p>
                  <p className="text-2xl font-bold text-purple-900">{analyticsData.performance.total_students || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderTrendsTab = () => {
    if (!analyticsData?.trends) return null

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Trend Analysis</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Overall Trend:</span>
                  <span className={`text-sm font-medium ${
                    analyticsData.trends.overall_trend === 'improving' ? 'text-green-600' :
                    analyticsData.trends.overall_trend === 'declining' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {analyticsData.trends.overall_trend || 'Stable'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Performance Change:</span>
                  <span className={`text-sm font-medium ${
                    (analyticsData.trends.performance_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(analyticsData.trends.performance_change || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Key Insights</h4>
              <div className="space-y-2">
                {(analyticsData.trends.insights || []).map((insight: string, index: number) => (
                  <div key={index} className="text-sm text-gray-600 flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderInsightsTab = () => {
    if (!analyticsData?.insights) return null

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Brain className="h-5 w-5 text-purple-500 mr-2" />
            AI-Powered Insights & Recommendations
          </h3>
          <div className="space-y-4">
            {analyticsData.insights.map((insight: any, index: number) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  insight.type === 'error' ? 'bg-red-50 border-red-400' :
                  insight.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                  'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {insight.type === 'error' ? (
                      <XCircle className="h-5 w-5 text-red-400" />
                    ) : insight.type === 'warning' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    ) : (
                      <Info className="h-5 w-5 text-blue-400" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">{insight.title}</h4>
                    <p className="text-sm text-gray-700 mt-1">{insight.message}</p>
                    <p className="text-sm text-gray-600 mt-2 font-medium">Recommendation:</p>
                    <p className="text-sm text-gray-700">{insight.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comprehensive Teacher Analytics</h1>
            <p className="text-gray-600">Advanced analytics with multiple analysis types and export capabilities</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Auto Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`btn-secondary flex items-center space-x-2 ${autoRefresh ? 'bg-green-100 text-green-700' : ''}`}
            >
              <Clock className="h-4 w-4" />
              <span>{autoRefresh ? 'Auto On' : 'Auto Off'}</span>
            </button>

            {/* Export Button */}
            <button
              onClick={() => setShowExportModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => selectedSubjectId && fetchAnalyticsData(selectedSubjectId)}
              disabled={!selectedSubjectId || loading}
              className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {lastRefresh && (
              <div className="text-xs text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subject Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject</label>
            <select
              value={selectedSubjectId || ''}
              onChange={(e) => {
                const subjectId = Number(e.target.value)
                setSelectedSubjectId(subjectId)
                if (subjectId) fetchAnalyticsData(subjectId)
              }}
              disabled={subjectsLoading || loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Choose a subject...</option>
              {teacherSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </div>
      )}

      {/* Content */}
      {selectedSubjectId && !loading && !error && analyticsData && (
        <>
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.name}</span>
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'students' && renderStudentsTab()}
              {activeTab === 'questions' && renderQuestionsTab()}
              {activeTab === 'exams' && renderExamsTab()}
              {activeTab === 'attainment' && renderAttainmentTab()}
              {activeTab === 'performance' && renderPerformanceTab()}
              {activeTab === 'trends' && renderTrendsTab()}
              {activeTab === 'insights' && renderInsightsTab()}
            </div>
          </div>
        </>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Export Analytics Data</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                <select
                  value={exportOptions.format}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="pdf">PDF (.pdf)</option>
                  <option value="csv">CSV (.csv)</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeCharts"
                  checked={exportOptions.includeCharts}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeCharts: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="includeCharts" className="ml-2 text-sm text-gray-700">
                  Include charts and visualizations
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeRawData"
                  checked={exportOptions.includeRawData}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeRawData: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="includeRawData" className="ml-2 text-sm text-gray-700">
                  Include raw data
                </label>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  exportData(exportOptions.format)
                  setShowExportModal(false)
                }}
                className="btn-primary"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ComprehensiveTeacherAnalytics
