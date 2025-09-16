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
  Users, TrendingUp, TrendingDown, Target, Award, BookOpen,
  BarChart3, Download, Search, Filter, Eye, EyeOff,
  AlertTriangle, CheckCircle, XCircle, Info, Clock,
  FileText, Calendar, Star, ArrowUp, ArrowDown, Minus,
  User, GraduationCap, Activity, Brain, Zap
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

interface StudentData {
  id: number
  name: string
  username: string
  email: string
  class_name: string
  total_marks: number
  percentage: number
  grade: string
  rank: number
  co_attainment: Record<string, number>
  exam_performance: Array<{
    exam_name: string
    exam_type: string
    marks: number
    percentage: number
    date: string
  }>
  attendance: number
  participation: number
  improvement_trend: 'improving' | 'declining' | 'stable'
  risk_level: 'low' | 'medium' | 'high'
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

const StudentAnalytics: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects)
  const { user } = useSelector((state: RootState) => state.auth)

  // State management
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [studentData, setStudentData] = useState<StudentData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('excel')

  const teacherSubjects = useMemo(() => 
    subjects.filter(subject => subject.teacher_id === user?.id),
    [subjects, user?.id]
  )

  // Fetch student analytics data
  const fetchStudentData = useCallback(async (subjectId: number) => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Authentication required')

      const response = await fetch(`http://localhost:8000/analytics/teacher/students/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to fetch student data')

      const data = await response.json()
      
      // Transform data to include additional analytics
      const transformedData = data.map((student: any) => ({
        ...student,
        // Calculate metrics from real data
        improvement_trend: calculateImprovementTrend(student),
        risk_level: student.percentage < 50 ? 'high' : student.percentage < 70 ? 'medium' : 'low',
        strengths: generateStrengths(student),
        weaknesses: generateWeaknesses(student),
        recommendations: generateRecommendations(student)
      }))

      setStudentData(transformedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch student data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Generate strengths based on student performance
  const generateStrengths = (student: any): string[] => {
    const strengths = []
    
    // Performance-based strengths
    if (student.percentage >= 90) strengths.push('Outstanding academic performance')
    else if (student.percentage >= 80) strengths.push('Excellent academic performance')
    else if (student.percentage >= 70) strengths.push('Good academic performance')
    
    // CO-based strengths
    if (student.co_attainment) {
      const coValues = Object.values(student.co_attainment) as number[]
      const strongCOs = coValues.filter(val => val >= 80).length
      const goodCOs = coValues.filter(val => val >= 70).length
      
      if (strongCOs >= 3) strengths.push('Strong mastery of multiple course outcomes')
      else if (goodCOs >= 2) strengths.push('Good understanding of course outcomes')
    }
    
    // Improvement trend
    const trend = calculateImprovementTrend(student)
    if (trend === 'improving') strengths.push('Showing continuous improvement')
    
    return strengths
  }

  // Generate weaknesses based on student performance
  const generateWeaknesses = (student: any): string[] => {
    const weaknesses = []
    
    // Performance-based weaknesses
    if (student.percentage < 40) weaknesses.push('Significant improvement needed in overall performance')
    else if (student.percentage < 60) weaknesses.push('Needs improvement in overall performance')
    
    // CO-based weaknesses
    if (student.co_attainment) {
      const coEntries = Object.entries(student.co_attainment) as [string, number][]
      const weakCOs = coEntries.filter(([, val]) => val < 60)
      
      if (weakCOs.length > 0) {
        weaknesses.push(`Struggling with course outcomes: ${weakCOs.map(([co]) => co).join(', ')}`)
      }
    }
    
    // Decline trend
    const trend = calculateImprovementTrend(student)
    if (trend === 'declining') weaknesses.push('Performance showing declining trend')
    
    return weaknesses
  }

  // Calculate improvement trend from real exam data
  const calculateImprovementTrend = (student: any): string => {
    if (student.exam_performance && student.exam_performance.length >= 2) {
      const performances = student.exam_performance.map((exam: any) => exam.percentage)
      const firstHalf = performances.slice(0, Math.floor(performances.length / 2))
      const secondHalf = performances.slice(Math.floor(performances.length / 2))
      
      if (firstHalf.length > 0 && secondHalf.length > 0) {
        const firstAvg = firstHalf.reduce((sum: number, val: number) => sum + val, 0) / firstHalf.length
        const secondAvg = secondHalf.reduce((sum: number, val: number) => sum + val, 0) / secondHalf.length
        
        const improvement = secondAvg - firstAvg
        
        if (improvement > 5) return 'improving'
        if (improvement < -5) return 'declining'
      }
    }
    
    return 'stable'
  }

  // Generate recommendations based on student performance
  const generateRecommendations = (student: any): string[] => {
    const recommendations = []
    
    // Performance-based recommendations
    if (student.percentage < 50) {
      recommendations.push('Schedule immediate intervention sessions')
      recommendations.push('Focus on basic concept reinforcement')
      recommendations.push('Provide additional practice materials')
    } else if (student.percentage < 70) {
      recommendations.push('Regular progress monitoring needed')
      recommendations.push('Encourage peer study groups')
      recommendations.push('Focus on application-based problems')
    } else if (student.percentage < 85) {
      recommendations.push('Challenge with advanced problems')
      recommendations.push('Encourage leadership roles')
      recommendations.push('Prepare for competitive exams')
    } else {
      recommendations.push('Maintain excellence standards')
      recommendations.push('Mentor struggling classmates')
      recommendations.push('Pursue advanced research projects')
    }
    
    // CO-specific recommendations
    if (student.co_attainment && Object.values(student.co_attainment).some((val: any) => val < 60)) {
      recommendations.push('Focus on specific CO areas that need improvement')
    }
    
    // Trend-based recommendations
    const trend = calculateImprovementTrend(student)
    if (trend === 'improving') {
      recommendations.push('Continue current study methods - showing good progress')
    } else if (trend === 'declining') {
      recommendations.push('Review study methods and seek additional support')
    }
    
    return recommendations
  }

  // Filter students based on search and filters
  const filteredStudents = useMemo(() => {
    let filtered = studentData

    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (gradeFilter !== 'all') {
      filtered = filtered.filter(student => student.grade === gradeFilter)
    }

    if (riskFilter !== 'all') {
      filtered = filtered.filter(student => student.risk_level === riskFilter)
    }

    return filtered
  }, [studentData, searchTerm, gradeFilter, riskFilter])

  // Calculate statistics
  const statistics = useMemo(() => {
    if (studentData.length === 0) return null

    const totalStudents = studentData.length
    const averagePercentage = studentData.reduce((sum, s) => sum + s.percentage, 0) / totalStudents
    const passRate = (studentData.filter(s => s.percentage >= 40).length / totalStudents) * 100
    const excellentRate = (studentData.filter(s => s.percentage >= 80).length / totalStudents) * 100
    const atRiskStudents = studentData.filter(s => s.risk_level === 'high').length

    return {
      totalStudents,
      averagePercentage,
      passRate,
      excellentRate,
      atRiskStudents
    }
  }, [studentData])

  // Export functions
  const exportData = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!selectedSubjectId) return

    try {
      const response = await fetch(`http://localhost:8000/reports/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          report_type: 'student_performance',
          format,
          filters: {
            subject_id: selectedSubjectId,
            exam_type: 'all',
            include_charts: true,
            include_raw_data: true
          }
        })
      })

      if (!response.ok) throw new Error('Failed to generate report')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `student_analytics_${format}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data')
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Analytics</h1>
            <p className="text-gray-600">Individual student performance analysis and insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => selectedSubjectId && fetchStudentData(selectedSubjectId)}
              disabled={!selectedSubjectId || loading}
              className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
            >
              <Clock className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => exportData(exportFormat)}
              disabled={!selectedSubjectId || studentData.length === 0}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
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
                if (subjectId) fetchStudentData(subjectId)
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

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.totalStudents}</p>
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
                <p className="text-2xl font-semibold text-gray-900">{statistics.averagePercentage.toFixed(1)}%</p>
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
                <p className="text-2xl font-semibold text-gray-900">{statistics.passRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Excellent Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.excellentRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">At Risk</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.atRiskStudents}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Grades</option>
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
              <option value="D">Grade D</option>
              <option value="F">Grade F</option>
            </select>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
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
          <Clock className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading student data...</span>
        </div>
      )}

      {/* Student List */}
      {!loading && !error && studentData.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.percentage.toFixed(1)}%</div>
                      <div className="text-sm text-gray-500">{student.total_marks} marks</div>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(student.risk_level)}`}>
                        {student.risk_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getTrendIcon(student.improvement_trend)}
                        <span className="ml-1 text-sm text-gray-600 capitalize">{student.improvement_trend}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedStudent(student)
                          setShowStudentModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {showStudentModal && selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Student Details - {selectedStudent.name}</h3>
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Performance</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedStudent.percentage.toFixed(1)}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Grade</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedStudent.grade}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Risk Level</label>
                  <p className="text-lg font-semibold text-gray-900 capitalize">{selectedStudent.risk_level}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Trend</label>
                  <p className="text-lg font-semibold text-gray-900 capitalize">{selectedStudent.improvement_trend}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Strengths</label>
                <ul className="mt-1 space-y-1">
                  {selectedStudent.strengths.map((strength, index) => (
                    <li key={index} className="text-sm text-gray-900 flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Areas for Improvement</label>
                <ul className="mt-1 space-y-1">
                  {selectedStudent.weaknesses.map((weakness, index) => (
                    <li key={index} className="text-sm text-gray-900 flex items-center">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                      {weakness}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Recommendations</label>
                <ul className="mt-1 space-y-1">
                  {selectedStudent.recommendations.map((recommendation, index) => (
                    <li key={index} className="text-sm text-gray-900 flex items-center">
                      <Brain className="h-4 w-4 text-blue-500 mr-2" />
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentAnalytics
