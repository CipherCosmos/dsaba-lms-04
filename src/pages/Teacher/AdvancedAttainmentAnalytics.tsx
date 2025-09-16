import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import StudentDetailedModal from '../../components/Analytics/StudentDetailedModal'
import ExportManager from '../../components/Analytics/ExportManager'
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
} from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

import {
  Users, TrendingUp, TrendingDown, Target, Award, BookOpen, 
  BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon,
  Download, RefreshCw, Eye, EyeOff, Filter, Search, Calendar,
  User, GraduationCap, FileText, AlertTriangle, CheckCircle,
  ArrowUp, ArrowDown, Minus, Star, Clock, Bookmark, Loader2,
  XCircle, Info
} from 'lucide-react'

// Types
interface StudentDetailedData {
  student_id: number
  student_name: string
  student_username: string
  subject_id: number
  subject_name: string
  overall_attainment: number
  target_attainment: number
  gap: number
  co_attainment: Record<string, any>
  exam_performance: Record<string, any>
  performance_trend: Array<{
    exam_name: string
    exam_type: string
    percentage: number
    date: string
  }>
  total_exams: number
  exams_attempted: number
  total_questions_attempted: number
  average_exam_percentage: number
}

interface ClassComparisonData {
  subject_id: number
  subject_name: string
  class_statistics: {
    total_students: number
    average_attainment: number
    median_attainment: number
    std_deviation: number
    min_attainment: number
    max_attainment: number
    target_attainment: number
    students_above_target: number
    students_below_target: number
    passing_rate: number
    excellent_rate: number
  }
  grade_distribution: {
    A_grade: number
    B_grade: number
    C_grade: number
    D_grade: number
    F_grade: number
  }
  co_performance: Record<string, any>
  quartiles: {
    Q1: number
    Q2: number
    Q3: number
  }
  top_performers: Array<{
    student_name: string
    attainment: number
    gap: number
  }>
  bottom_performers: Array<{
    student_name: string
    attainment: number
    gap: number
  }>
  student_details: StudentDetailedData[]
}

interface ExamComparisonData {
  subject_id: number
  exam_analytics: Record<string, any>
  exam_trends: Array<{
    exam_name: string
    exam_type: string
    average_percentage: number
    passing_rate: number
    students_attempted: number
    created_at: string
  }>
  trend_analysis: {
    overall_trend: string
    percentage_change: number
    passing_rate_change: number
    total_exams: number
    average_per_exam: number
  }
}

interface ComprehensiveData {
  summary: {
    total_students_analyzed: number
    average_class_attainment: number
    total_exams_analyzed: number
    class_performance_level: string
  }
  insights: string[]
  recommendations: string[]
  class_comparison?: ClassComparisonData
  exam_comparison?: ExamComparisonData
  student_analytics?: Record<string, StudentDetailedData>
}

type TabType = 'overview' | 'students' | 'class' | 'exams' | 'comprehensive'

// Utility functions
const getGradeColor = (grade: string): string => {
  const colors: Record<string, string> = {
    'A': 'text-green-600 bg-green-100',
    'B': 'text-blue-600 bg-blue-100',
    'C': 'text-yellow-600 bg-yellow-100',
    'D': 'text-orange-600 bg-orange-100',
    'F': 'text-red-600 bg-red-100'
  }
  return colors[grade] || 'text-gray-600 bg-gray-100'
}

const getPerformanceColor = (percentage: number): string => {
  if (percentage >= 90) return 'text-green-600'
  if (percentage >= 80) return 'text-blue-600'
  if (percentage >= 70) return 'text-yellow-600'
  if (percentage >= 60) return 'text-orange-600'
  return 'text-red-600'
}

const getGradeFromPercentage = (percentage: number): string => {
  if (percentage >= 90) return 'A'
  if (percentage >= 80) return 'B'
  if (percentage >= 70) return 'C'
  if (percentage >= 60) return 'D'
  return 'F'
}

// Custom hooks
const useAnalyticsData = () => {
  const [classData, setClassData] = useState<ClassComparisonData | null>(null)
  const [examData, setExamData] = useState<ExamComparisonData | null>(null)
  const [comprehensiveData, setComprehensiveData] = useState<ComprehensiveData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWithAuth = async (url: string): Promise<Response> => {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Authentication token not found')
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response
  }

  const fetchAnalyticsData = useCallback(async (subjectId: number) => {
    if (!subjectId) return

    setLoading(true)
    setError(null)

    try {
      // Fetch all data concurrently
      const [classResponse, examResponse, comprehensiveResponse] = await Promise.all([
        fetchWithAuth(`http://localhost:8000/analytics/advanced/class-comparison/${subjectId}`),
        fetchWithAuth(`http://localhost:8000/analytics/advanced/exam-comparison/${subjectId}`),
        fetchWithAuth(`http://localhost:8000/analytics/advanced/comprehensive/${subjectId}`)
      ])

      const [classResult, examResult, comprehensiveResult] = await Promise.all([
        classResponse.json(),
        examResponse.json(),
        comprehensiveResponse.json()
      ])

      setClassData(classResult)
      setExamData(examResult)
      setComprehensiveData(comprehensiveResult)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics data'
      setError(errorMessage)
      console.error('Analytics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    classData,
    examData,
    comprehensiveData,
    loading,
    error,
    fetchAnalyticsData,
    setError
  }
}

// Sub-components
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    <span className="ml-2 text-gray-600">{message}</span>
  </div>
)

const ErrorAlert: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-md p-4">
    <div className="flex items-start">
      <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-red-800">Error</h3>
        <p className="text-sm text-red-700 mt-1">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  </div>
)

const StatCard: React.FC<{
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  title: string
  value: string | number
  valueColor?: string
}> = ({ icon: Icon, iconBg, title, value, valueColor = 'text-gray-900' }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center">
      <div className={`p-2 ${iconBg} rounded-lg`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      </div>
    </div>
  </div>
)

const StudentCard: React.FC<{
  student: StudentDetailedData
  onViewDetails: (student: StudentDetailedData) => void
}> = ({ student, onViewDetails }) => (
  <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{student.student_name}</h3>
        <p className="text-sm text-gray-600">@{student.student_username}</p>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(getGradeFromPercentage(student.overall_attainment))}`}>
        Grade {getGradeFromPercentage(student.overall_attainment)}
      </span>
    </div>

    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Overall Attainment</span>
        <span className={`font-semibold ${getPerformanceColor(student.overall_attainment)}`}>
          {student.overall_attainment}%
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Target</span>
        <span className="font-semibold text-gray-900">{student.target_attainment}%</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Gap</span>
        <span className={`font-semibold ${student.gap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {student.gap >= 0 ? '+' : ''}{student.gap}%
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Exams Attempted</span>
        <span className="font-semibold text-gray-900">{student.exams_attempted}/{student.total_exams}</span>
      </div>
    </div>

    <div className="mt-4">
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            student.overall_attainment >= 90 ? 'bg-green-600' :
            student.overall_attainment >= 80 ? 'bg-blue-600' :
            student.overall_attainment >= 70 ? 'bg-yellow-600' :
            student.overall_attainment >= 60 ? 'bg-orange-600' : 'bg-red-600'
          }`}
          style={{ width: `${Math.min(student.overall_attainment, 100)}%` }}
        />
      </div>
    </div>

    <button
      onClick={() => onViewDetails(student)}
      className="mt-4 w-full text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
    >
      View Detailed Analysis
    </button>
  </div>
)

const PerformersList: React.FC<{
  title: string
  performers: Array<{ student_name: string; attainment: number; gap: number }>
  type: 'top' | 'bottom'
}> = ({ title, performers, type }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
    <div className="space-y-3">
      {performers.map((student, index) => (
        <div key={`${student.student_name}-${index}`} className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
            <span className="text-sm text-gray-900">{student.student_name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-semibold ${getPerformanceColor(student.attainment)}`}>
              {student.attainment}%
            </span>
            <span className={`text-xs ${type === 'top' ? 'text-green-600' : 'text-red-600'}`}>
              ({type === 'top' ? '+' : ''}{student.gap}%)
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
)

// Main Component
const AdvancedAttainmentAnalytics: React.FC = () => {
  const dispatch = useDispatch()
  const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects)
  const { user } = useSelector((state: RootState) => state.auth)

  // Custom hook for analytics data
  const {
    classData,
    examData,
    comprehensiveData,
    loading,
    error,
    fetchAnalyticsData,
    setError
  } = useAnalyticsData()

  // State management
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [selectedStudent, setSelectedStudent] = useState<StudentDetailedData | null>(null)
  const [showDetailedView, setShowDetailedView] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('excel')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterGrade, setFilterGrade] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [studentsPerPage] = useState(9)
  
  // Advanced features state
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30 seconds
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [performanceAlerts, setPerformanceAlerts] = useState<any[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({
    dateRange: { start: '', end: '' },
    performanceThreshold: 70,
    gradeFilter: 'all',
    examTypeFilter: 'all'
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [comparativeData, setComparativeData] = useState<any>(null)
  const [showComparative, setShowComparative] = useState(false)

  // Memoized values
  const teacherSubjects = useMemo(() => 
    subjects.filter(subject => subject.teacher_id === user?.id),
    [subjects, user?.id]
  )

  const studentData = useMemo(() => 
    classData?.student_details || [],
    [classData]
  )

  const filteredStudents = useMemo(() => {
    let filtered = studentData

    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_username.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterGrade !== 'all') {
      filtered = filtered.filter(student => 
        getGradeFromPercentage(student.overall_attainment) === filterGrade
      )
    }

    return filtered
  }, [studentData, searchTerm, filterGrade])

  // Pagination
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * studentsPerPage
    const endIndex = startIndex + studentsPerPage
    return filteredStudents.slice(startIndex, endIndex)
  }, [filteredStudents, currentPage, studentsPerPage])

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage)

  // Effects
  useEffect(() => {
    dispatch(fetchSubjects())
  }, [dispatch])

  useEffect(() => {
    if (selectedSubjectId) {
      fetchAnalyticsData(selectedSubjectId)
      setLastRefreshTime(new Date())
    }
  }, [selectedSubjectId, fetchAnalyticsData])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !selectedSubjectId) return

    const interval = setInterval(() => {
      fetchAnalyticsData(selectedSubjectId)
      setLastRefreshTime(new Date())
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, selectedSubjectId, refreshInterval, fetchAnalyticsData])

  // Performance alerts effect
  useEffect(() => {
    if (comprehensiveData) {
      generatePerformanceAlerts(comprehensiveData)
    }
  }, [comprehensiveData])

  // Helper functions for advanced features
  const generatePerformanceAlerts = useCallback((data: any) => {
    const alerts: any[] = []
    
    if (data.class_comparison?.class_statistics) {
      const stats = data.class_comparison.class_statistics
      
      // Low performance alert
      if (stats.average_attainment < 60) {
        alerts.push({
          type: 'warning',
          title: 'Low Class Performance',
          message: `Class average attainment is ${stats.average_attainment.toFixed(1)}%, below the 60% threshold`,
          timestamp: new Date()
        })
      }
      
      // High variation alert
      if (stats.std_deviation > 20) {
        alerts.push({
          type: 'info',
          title: 'High Performance Variation',
          message: `Performance variation is high (${stats.std_deviation.toFixed(1)}%), consider differentiated instruction`,
          timestamp: new Date()
        })
      }
      
      // Low pass rate alert
      if (stats.passing_rate < 70) {
        alerts.push({
          type: 'error',
          title: 'Low Pass Rate',
          message: `Pass rate is ${stats.passing_rate.toFixed(1)}%, below the 70% target`,
          timestamp: new Date()
        })
      }
    }
    
    setPerformanceAlerts(alerts)
  }, [])

  const handleRefresh = useCallback(() => {
    if (selectedSubjectId) {
      fetchAnalyticsData(selectedSubjectId)
      setLastRefreshTime(new Date())
    }
  }, [selectedSubjectId, fetchAnalyticsData])

  const handleAdvancedFilterChange = useCallback((filterType: string, value: any) => {
    setAdvancedFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }, [])

  const fetchComparativeData = useCallback(async () => {
    if (!selectedSubjectId) return
    
    try {
      // Fetch data for other subjects taught by the same teacher
      const otherSubjects = teacherSubjects.filter(s => s.id !== selectedSubjectId)
      const comparativeResults = []
      
      for (const subject of otherSubjects.slice(0, 2)) { // Limit to 2 for performance
        try {
          const response = await fetch(`http://localhost:8000/analytics/advanced/class-comparison/${subject.id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          })
          if (response.ok) {
            const data = await response.json()
            comparativeResults.push({
              subject_id: subject.id,
              subject_name: subject.name,
              average_attainment: data.class_statistics?.average_attainment || 0,
              pass_rate: data.class_statistics?.passing_rate || 0
            })
          }
        } catch (err) {
          console.error(`Failed to fetch data for subject ${subject.id}:`, err)
        }
      }
      
      setComparativeData(comparativeResults)
    } catch (err) {
      console.error('Failed to fetch comparative data:', err)
    }
  }, [selectedSubjectId, teacherSubjects])

  // Event handlers
  const handleSubjectChange = useCallback((subjectId: number) => {
    setSelectedSubjectId(subjectId)
    setActiveTab('overview')
    setError(null)
    setCurrentPage(1)
  }, [setError])

  const handleStudentSelect = useCallback((student: StudentDetailedData) => {
    setSelectedStudent(student)
    setShowDetailedView(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setShowDetailedView(false)
    setSelectedStudent(null)
  }, [])

  const handleRetry = useCallback(() => {
    if (selectedSubjectId) {
      fetchAnalyticsData(selectedSubjectId)
    }
  }, [selectedSubjectId, fetchAnalyticsData])

  // Tab rendering functions
  const renderOverviewTab = (): JSX.Element | null => {
    if (!comprehensiveData) return null

    const { summary, insights, recommendations } = comprehensiveData

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Users}
            iconBg="bg-blue-100 text-blue-600"
            title="Total Students"
            value={summary.total_students_analyzed}
          />
          <StatCard
            icon={Target}
            iconBg="bg-green-100 text-green-600"
            title="Avg Attainment"
            value={`${summary.average_class_attainment}%`}
            valueColor={getPerformanceColor(summary.average_class_attainment)}
          />
          <StatCard
            icon={BookOpen}
            iconBg="bg-purple-100 text-purple-600"
            title="Total Exams"
            value={summary.total_exams_analyzed}
          />
          <StatCard
            icon={Award}
            iconBg="bg-yellow-100 text-yellow-600"
            title="Performance"
            value={summary.class_performance_level.replace('_', ' ')}
          />
        </div>

        {/* Insights and Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              Key Insights
            </h3>
            <div className="space-y-2">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Recommendations
            </h3>
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderStudentsTab = (): JSX.Element | null => {
    if (!studentData.length) return null

    return (
      <div className="space-y-6">
        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterGrade}
                onChange={(e) => {
                  setFilterGrade(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Grades</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
                <option value="D">Grade D</option>
                <option value="F">Grade F</option>
              </select>
            </div>
          </div>
        </div>

        {/* Student Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedStudents.map((student) => (
            <StudentCard
              key={student.student_id}
              student={student}
              onViewDetails={handleStudentSelect}
            />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-lg shadow px-6 py-4">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, filteredStudents.length)} of {filteredStudents.length} students
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderClassTab = (): JSX.Element | null => {
    if (!classData) return null

    const { class_statistics, grade_distribution, top_performers, bottom_performers } = classData

    return (
      <div className="space-y-6">
        {/* Class Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Users}
            iconBg="bg-blue-100 text-blue-600"
            title="Total Students"
            value={class_statistics.total_students}
          />
          <StatCard
            icon={Target}
            iconBg="bg-green-100 text-green-600"
            title="Avg Attainment"
            value={`${class_statistics.average_attainment}%`}
            valueColor={getPerformanceColor(class_statistics.average_attainment)}
          />
          <StatCard
            icon={TrendingUp}
            iconBg="bg-yellow-100 text-yellow-600"
            title="Passing Rate"
            value={`${class_statistics.passing_rate}%`}
          />
          <StatCard
            icon={Award}
            iconBg="bg-purple-100 text-purple-600"
            title="Excellent Rate"
            value={`${class_statistics.excellent_rate}%`}
          />
        </div>

        {/* Grade Distribution Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
          <div className="h-64">
            <Bar
              data={{
                labels: ['A', 'B', 'C', 'D', 'F'],
                datasets: [
                  {
                    label: 'Number of Students',
                    data: [
                      grade_distribution.A_grade,
                      grade_distribution.B_grade,
                      grade_distribution.C_grade,
                      grade_distribution.D_grade,
                      grade_distribution.F_grade
                    ],
                    backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'],
                    borderColor: ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'],
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Top and Bottom Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerformersList
            title="Top Performers"
            performers={top_performers}
            type="top"
          />
          <PerformersList
            title="Need Support"
            performers={bottom_performers}
            type="bottom"
          />
        </div>
      </div>
    )
  }

  const renderExamsTab = (): JSX.Element | null => {
    if (!examData) return null

    const { exam_trends, trend_analysis } = examData

    return (
      <div className="space-y-6">
        {/* Trend Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={TrendingUp}
            iconBg="bg-blue-100 text-blue-600"
            title="Overall Trend"
            value={trend_analysis.overall_trend}
          />
          <StatCard
            icon={Target}
            iconBg="bg-green-100 text-green-600"
            title="Avg per Exam"
            value={`${trend_analysis.average_per_exam}%`}
          />
          <StatCard
            icon={trend_analysis.percentage_change >= 0 ? ArrowUp : ArrowDown}
            iconBg={trend_analysis.percentage_change >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}
            title="Change"
            value={`${trend_analysis.percentage_change >= 0 ? '+' : ''}${trend_analysis.percentage_change}%`}
            valueColor={trend_analysis.percentage_change >= 0 ? 'text-green-600' : 'text-red-600'}
          />
          <StatCard
            icon={BookOpen}
            iconBg="bg-purple-100 text-purple-600"
            title="Total Exams"
            value={trend_analysis.total_exams}
          />
        </div>

        {/* Exam Trends Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Performance Trends</h3>
          <div className="h-64">
            <Line
              data={{
                labels: exam_trends.map(exam => exam.exam_name),
                datasets: [
                  {
                    label: 'Average %',
                    data: exam_trends.map(exam => exam.average_percentage),
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.1,
                    fill: true
                  },
                  {
                    label: 'Passing Rate %',
                    data: exam_trends.map(exam => exam.passing_rate),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.1,
                    fill: true
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                  },
                },
                interaction: {
                  intersect: false,
                  mode: 'index',
                },
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  const renderComprehensiveTab = (): JSX.Element | null => {
    if (!comprehensiveData) return null

    const { summary, insights, recommendations, class_comparison, student_analytics } = comprehensiveData

    return (
      <div className="space-y-6">
        {/* Executive Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Executive Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{summary.total_students_analyzed}</div>
              <div className="text-sm text-gray-600">Students Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{summary.average_class_attainment}%</div>
              <div className="text-sm text-gray-600">Average Attainment</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{summary.total_exams_analyzed}</div>
              <div className="text-sm text-gray-600">Exams Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 capitalize">
                {summary.class_performance_level.replace('_', ' ')}
              </div>
              <div className="text-sm text-gray-600">Performance Level</div>
            </div>
          </div>
        </div>

        {/* Key Insights and Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              Key Insights
            </h3>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Recommendations
            </h3>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Distribution */}
        {class_comparison && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Distribution</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3">Grade Distribution</h4>
                <div className="space-y-2">
                  {Object.entries(class_comparison.grade_distribution).map(([grade, count]) => (
                    <div key={grade} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Grade {grade.replace('_grade', '')}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              grade.includes('A') ? 'bg-green-500' :
                              grade.includes('B') ? 'bg-blue-500' :
                              grade.includes('C') ? 'bg-yellow-500' :
                              grade.includes('D') ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${(count as number / class_comparison.class_statistics.total_students) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{count as number}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3">Performance Metrics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average Attainment</span>
                    <span className="text-sm font-medium text-gray-900">
                      {class_comparison.class_statistics.average_attainment}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Passing Rate</span>
                    <span className="text-sm font-medium text-gray-900">
                      {class_comparison.class_statistics.passing_rate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Excellent Rate</span>
                    <span className="text-sm font-medium text-gray-900">
                      {class_comparison.class_statistics.excellent_rate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Standard Deviation</span>
                    <span className="text-sm font-medium text-gray-900">
                      {class_comparison.class_statistics.std_deviation}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CO Performance Analysis */}
        {class_comparison?.co_performance && Object.keys(class_comparison.co_performance).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Outcomes Performance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CO Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Attainment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Std Dev</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Above Target</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Below Target</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(class_comparison.co_performance).map(([coCode, data]: [string, any]) => (
                    <tr key={coCode}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {coCode}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {data.co_description || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={getPerformanceColor(data.average_attainment || 0)}>
                          {data.average_attainment || 0}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.std_deviation || 0}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {data.students_above_target || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {data.students_below_target || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Student Performance Summary */}
        {student_analytics && Object.keys(student_analytics).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Performance Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(student_analytics).slice(0, 6).map((student: any) => (
                <div key={student.student_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{student.student_name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(getGradeFromPercentage(student.overall_attainment))}`}>
                      {getGradeFromPercentage(student.overall_attainment)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Attainment:</span>
                      <span className={getPerformanceColor(student.overall_attainment)}>
                        {student.overall_attainment}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Gap:</span>
                      <span className={student.gap >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {student.gap >= 0 ? '+' : ''}{student.gap}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Exams:</span>
                      <span className="text-gray-900">{student.exams_attempted}/{student.total_exams}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {Object.keys(student_analytics).length > 6 && (
              <div className="mt-4 text-center">
                <span className="text-sm text-gray-500">
                  And {Object.keys(student_analytics).length - 6} more students...
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Main render
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Advanced Attainment Analytics</h1>
            <p className="text-gray-600">Comprehensive analysis with student, class, and exam comparisons</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Performance Alerts */}
            {performanceAlerts.length > 0 && (
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className="relative btn-secondary flex items-center space-x-2"
              >
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>Alerts</span>
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {performanceAlerts.length}
                </span>
              </button>
            )}

            {/* Auto Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`btn-secondary flex items-center space-x-2 ${autoRefresh ? 'bg-green-100 text-green-700' : ''}`}
            >
              <Clock className="h-4 w-4" />
              <span>{autoRefresh ? 'Auto On' : 'Auto Off'}</span>
            </button>

            {/* Advanced Filters */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>

            {/* Comparative Analysis */}
            <button
              onClick={() => {
                setShowComparative(!showComparative)
                if (!showComparative) fetchComparativeData()
              }}
              className="btn-secondary flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Compare</span>
            </button>

            {/* Export */}
            {comprehensiveData && (
              <ExportManager
                data={comprehensiveData}
                filename={teacherSubjects.find(s => s.id === selectedSubjectId)?.name || 'Analytics'}
                exportFormat={exportFormat}
                onExport={(format) => setExportFormat(format)}
                loading={loading}
              />
            )}

            {/* Manual Refresh */}
            <button
              onClick={handleRefresh}
              disabled={!selectedSubjectId || loading}
              className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Last Refresh Time */}
            {lastRefreshTime && (
              <div className="text-xs text-gray-500">
                Last updated: {lastRefreshTime.toLocaleTimeString()}
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
              onChange={(e) => handleSubjectChange(Number(e.target.value))}
              disabled={subjectsLoading || loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Performance Alerts Panel */}
      {showAlerts && performanceAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              Performance Alerts
            </h3>
            <button
              onClick={() => setShowAlerts(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-3">
            {performanceAlerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.type === 'error' ? 'bg-red-50 border-red-400' :
                  alert.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                  'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {alert.type === 'error' ? (
                      <XCircle className="h-5 w-5 text-red-400" />
                    ) : alert.type === 'warning' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    ) : (
                      <Info className="h-5 w-5 text-blue-400" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                    <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {alert.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Filter className="h-5 w-5 text-blue-500 mr-2" />
              Advanced Filters
            </h3>
            <button
              onClick={() => setShowAdvancedFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Performance Threshold</label>
              <input
                type="number"
                value={advancedFilters.performanceThreshold}
                onChange={(e) => handleAdvancedFilterChange('performanceThreshold', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grade Filter</label>
              <select
                value={advancedFilters.gradeFilter}
                onChange={(e) => handleAdvancedFilterChange('gradeFilter', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Grades</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
                <option value="D">Grade D</option>
                <option value="F">Grade F</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
              <select
                value={advancedFilters.examTypeFilter}
                onChange={(e) => handleAdvancedFilterChange('examTypeFilter', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Exams</option>
                <option value="internal1">Internal 1</option>
                <option value="internal2">Internal 2</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Refresh Interval</label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={15000}>15 seconds</option>
                <option value={30000}>30 seconds</option>
                <option value={60000}>1 minute</option>
                <option value={300000}>5 minutes</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Comparative Analysis Panel */}
      {showComparative && comparativeData && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
              Comparative Analysis
            </h3>
            <button
              onClick={() => setShowComparative(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparativeData.map((subject: any) => (
              <div key={subject.subject_id} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{subject.subject_name}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Attainment:</span>
                    <span className={`text-sm font-medium ${getPerformanceColor(subject.average_attainment)}`}>
                      {subject.average_attainment.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Pass Rate:</span>
                    <span className={`text-sm font-medium ${getPerformanceColor(subject.pass_rate)}`}>
                      {subject.pass_rate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <ErrorAlert error={error} onRetry={handleRetry} />
      )}

      {/* Loading State */}
      {loading && (
        <LoadingSpinner message="Loading analytics..." />
      )}

      {/* Content */}
      {selectedSubjectId && !loading && !error && (
        <>
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto">
                {[
                  { id: 'overview' as TabType, name: 'Overview', icon: BarChart3 },
                  { id: 'students' as TabType, name: 'Students', icon: Users },
                  { id: 'class' as TabType, name: 'Class Analysis', icon: GraduationCap },
                  { id: 'exams' as TabType, name: 'Exam Trends', icon: TrendingUp },
                  { id: 'comprehensive' as TabType, name: 'Comprehensive', icon: FileText }
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
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
              {activeTab === 'class' && renderClassTab()}
              {activeTab === 'exams' && renderExamsTab()}
              {activeTab === 'comprehensive' && renderComprehensiveTab()}
            </div>
          </div>
        </>
      )}

      {/* No Subject Selected */}
      {!selectedSubjectId && !loading && (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Subject</h3>
          <p className="text-gray-600">Choose a subject to view advanced attainment analytics</p>
        </div>
      )}

      {/* Student Detailed Modal */}
      {selectedStudent && (
        <StudentDetailedModal
          student={selectedStudent}
          isOpen={showDetailedView}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}

export default AdvancedAttainmentAnalytics
