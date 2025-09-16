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
  BookOpen, TrendingUp, TrendingDown, Target, Award, Users,
  BarChart3, Download, Search, Filter, Eye, EyeOff,
  AlertTriangle, CheckCircle, XCircle, Info, Clock,
  FileText, Calendar, Star, ArrowUp, ArrowDown, Minus,
  Brain, Zap, Activity, Target as TargetIcon
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

interface QuestionData {
  id: number
  question_number: string
  question_text: string
  max_marks: number
  average_marks: number
  success_rate: number
  attempt_rate: number
  difficulty: 'easy' | 'medium' | 'hard'
  blooms_level: string
  co_mapping: string[]
  po_mapping: string[]
  discrimination_index: number
  difficulty_index: number
  exam_type: string
  exam_name: string
  student_responses: Array<{
    student_id: number
    student_name: string
    marks_obtained: number
    percentage: number
  }>
  common_errors: string[]
  recommendations: string[]
}

const QuestionAnalytics: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects)
  const { user } = useSelector((state: RootState) => state.auth)

  // State management
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [questionData, setQuestionData] = useState<QuestionData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [bloomsFilter, setBloomsFilter] = useState('all')
  const [examTypeFilter, setExamTypeFilter] = useState('all')
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionData | null>(null)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('excel')

  const teacherSubjects = useMemo(() => 
    subjects.filter(subject => subject.teacher_id === user?.id),
    [subjects, user?.id]
  )

  // Fetch question analytics data
  const fetchQuestionData = useCallback(async (subjectId: number) => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Authentication required')

      const response = await fetch(`http://localhost:8000/analytics/teacher/questions/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to fetch question data')

      const data = await response.json()
      
      // Transform data to include additional analytics
      const transformedData = data.map((question: any) => ({
        ...question,
        // Use real discrimination_index from backend, or calculate from success_rate
        discrimination_index: question.discrimination_index || (question.success_rate / 100),
        // Calculate difficulty index from real success rate
        difficulty_index: question.success_rate / 100,
        common_errors: generateCommonErrors(question),
        recommendations: generateRecommendations(question)
      }))

      setQuestionData(transformedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch question data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Generate common errors based on question performance
  const generateCommonErrors = (question: any): string[] => {
    const errors = []
    if (question.success_rate < 50) {
      errors.push('Conceptual misunderstanding')
      errors.push('Calculation errors')
    }
    if (question.attempt_rate < 80) {
      errors.push('Question complexity too high')
    }
    if (question.difficulty === 'hard') {
      errors.push('Insufficient practice with similar problems')
    }
    return errors
  }

  // Generate recommendations based on question performance
  const generateRecommendations = (question: any): string[] => {
    const recommendations = []
    if (question.success_rate < 50) {
      recommendations.push('Review and simplify question wording')
      recommendations.push('Provide more practice problems of similar type')
    }
    if (question.discrimination_index < 0.3) {
      recommendations.push('Improve question to better differentiate between high and low performers')
    }
    if (question.attempt_rate < 80) {
      recommendations.push('Consider reducing question complexity')
    }
    return recommendations
  }

  // Filter questions based on search and filters
  const filteredQuestions = useMemo(() => {
    let filtered = questionData

    if (searchTerm) {
      filtered = filtered.filter(question => 
        question.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        question.question_number.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(question => question.difficulty === difficultyFilter)
    }

    if (bloomsFilter !== 'all') {
      filtered = filtered.filter(question => question.blooms_level === bloomsFilter)
    }

    if (examTypeFilter !== 'all') {
      filtered = filtered.filter(question => question.exam_type === examTypeFilter)
    }

    return filtered
  }, [questionData, searchTerm, difficultyFilter, bloomsFilter, examTypeFilter])

  // Calculate statistics
  const statistics = useMemo(() => {
    if (questionData.length === 0) return null

    const totalQuestions = questionData.length
    const averageSuccessRate = questionData.reduce((sum, q) => sum + q.success_rate, 0) / totalQuestions
    const averageAttemptRate = questionData.reduce((sum, q) => sum + q.attempt_rate, 0) / totalQuestions
    const difficultQuestions = questionData.filter(q => q.success_rate < 50).length
    const easyQuestions = questionData.filter(q => q.success_rate > 80).length

    // Difficulty distribution
    const difficultyDistribution = {
      easy: questionData.filter(q => q.difficulty === 'easy').length,
      medium: questionData.filter(q => q.difficulty === 'medium').length,
      hard: questionData.filter(q => q.difficulty === 'hard').length
    }

    // Blooms taxonomy distribution
    const bloomsDistribution = questionData.reduce((acc, q) => {
      acc[q.blooms_level] = (acc[q.blooms_level] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalQuestions,
      averageSuccessRate,
      averageAttemptRate,
      difficultQuestions,
      easyQuestions,
      difficultyDistribution,
      bloomsDistribution
    }
  }, [questionData])

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
          report_type: 'question_analysis',
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
      a.download = `question_analytics_${format}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data')
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'hard': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Question Analytics</h1>
            <p className="text-gray-600">Question difficulty analysis and performance insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => selectedSubjectId && fetchQuestionData(selectedSubjectId)}
              disabled={!selectedSubjectId || loading}
              className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
            >
              <Clock className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => exportData(exportFormat)}
              disabled={!selectedSubjectId || questionData.length === 0}
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
                if (subjectId) fetchQuestionData(subjectId)
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
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Questions</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.totalQuestions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Success Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.averageSuccessRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Target className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Attempt Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.averageAttemptRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Difficult Questions</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.difficultQuestions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Easy Questions</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.easyQuestions}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {statistics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Difficulty Distribution</h3>
            <div className="h-64">
              <Doughnut
                data={{
                  labels: Object.keys(statistics.difficultyDistribution),
                  datasets: [{
                    data: Object.values(statistics.difficultyDistribution),
                    backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
                    borderColor: ['#10B981', '#F59E0B', '#EF4444'],
                    borderWidth: 1
                  }]
                }}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Blooms Taxonomy Distribution</h3>
            <div className="h-64">
              <Bar
                data={{
                  labels: Object.keys(statistics.bloomsDistribution),
                  datasets: [{
                    label: 'Number of Questions',
                    data: Object.values(statistics.bloomsDistribution),
                    backgroundColor: '#3B82F6',
                    borderColor: '#3B82F6',
                    borderWidth: 1
                  }]
                }}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
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
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <select
              value={bloomsFilter}
              onChange={(e) => setBloomsFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Blooms Levels</option>
              <option value="Remember">Remember</option>
              <option value="Understand">Understand</option>
              <option value="Apply">Apply</option>
              <option value="Analyze">Analyze</option>
              <option value="Evaluate">Evaluate</option>
              <option value="Create">Create</option>
            </select>
            <select
              value={examTypeFilter}
              onChange={(e) => setExamTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Exam Types</option>
              <option value="internal1">Internal 1</option>
              <option value="internal2">Internal 2</option>
              <option value="final">Final</option>
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
          <span className="ml-2 text-gray-600">Loading question data...</span>
        </div>
      )}

      {/* Question List */}
      {!loading && !error && questionData.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blooms</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuestions.map((question, index) => (
                  <tr key={`${question.id}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">Q{question.question_number}</div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">{question.question_text}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{question.average_marks.toFixed(1)}/{question.max_marks}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getSuccessRateColor(question.success_rate)}`}>
                        {question.success_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {question.blooms_level}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {question.co_mapping.slice(0, 2).map((co, idx) => (
                          <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                            {co}
                          </span>
                        ))}
                        {question.co_mapping.length > 2 && (
                          <span className="text-xs text-gray-500">+{question.co_mapping.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedQuestion(question)
                          setShowQuestionModal(true)
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

      {/* Question Detail Modal */}
      {showQuestionModal && selectedQuestion && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Question Details - Q{selectedQuestion.question_number}</h3>
                <button
                  onClick={() => setShowQuestionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Question Text</label>
                <p className="text-sm text-gray-900 mt-1">{selectedQuestion.question_text}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Max Marks</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedQuestion.max_marks}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Average Marks</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedQuestion.average_marks.toFixed(1)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Success Rate</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedQuestion.success_rate.toFixed(1)}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Attempt Rate</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedQuestion.attempt_rate.toFixed(1)}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Difficulty</label>
                  <p className="text-lg font-semibold text-gray-900 capitalize">{selectedQuestion.difficulty}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Blooms Level</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedQuestion.blooms_level}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">CO Mappings</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedQuestion.co_mapping.map((co, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {co}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Common Errors</label>
                <ul className="mt-1 space-y-1">
                  {selectedQuestion.common_errors.map((error, index) => (
                    <li key={index} className="text-sm text-gray-900 flex items-center">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                      {error}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Recommendations</label>
                <ul className="mt-1 space-y-1">
                  {selectedQuestion.recommendations.map((recommendation, index) => (
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

export default QuestionAnalytics
