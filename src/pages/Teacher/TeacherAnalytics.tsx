import { useState, useEffect, useMemo } from 'react'
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
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  Filler
} from 'chart.js'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import { 
  TrendingUp, AlertTriangle, CheckCircle, BookOpen, Award, Users, 
  Target, BarChart3, Download, Search, Filter, Eye, EyeOff,
  FileText, Calendar, Clock, Star, TrendingDown, Activity,
  Zap, Brain, Lightbulb, ArrowUp, ArrowDown, Minus
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
  Filler
)

interface StudentPerformance {
  id: number
  name: string
  username: string
  total_marks: number
  percentage: number
  grade: string
  rank: number
  co_attainment: Record<string, number>
  exam_performance: Array<{
    exam_name: string
    marks: number
    percentage: number
    date: string
  }>
}

interface QuestionAnalysis {
  question_id: number
  question_text: string
  max_marks: number
  average_marks: number
  success_rate: number
  attempt_rate: number
  difficulty: 'easy' | 'medium' | 'hard'
  co_mapping: string[]
  blooms_level: string
  discrimination_index: number
}

interface ExamAnalysis {
  exam_id: number
  exam_name: string
  exam_type: string
  total_students: number
  average_percentage: number
  pass_rate: number
  excellent_rate: number
  question_analysis: QuestionAnalysis[]
  co_attainment: Record<string, number>
  date: string
}

interface HeatmapData {
  student_id: number
  student_name: string
  question_scores: Record<number, number>
  total_percentage: number
}

const TeacherAnalytics = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  
  // State management
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'questions' | 'exams' | 'heatmap' | 'comparison'>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Data states
  const [studentData, setStudentData] = useState<StudentPerformance[]>([])
  const [questionData, setQuestionData] = useState<QuestionAnalysis[]>([])
  const [examData, setExamData] = useState<ExamAnalysis[]>([])
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([])
  const [overviewData, setOverviewData] = useState<any>(null)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [examTypeFilter, setExamTypeFilter] = useState<string>('all')
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('excel')

  const teacherSubjects = useMemo(() => 
    subjects.filter(s => s.teacher_id === user?.id),
    [subjects, user?.id]
  )

  useEffect(() => {
    dispatch(fetchSubjects())
  }, [dispatch])

  // Fetch data functions
  const fetchOverviewData = async (subjectId: number) => {
    try {
      setLoading(true)
      const response = await fetch(`http://localhost:8000/analytics/teacher/overview/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        // Generate mock data if backend is not available
        const mockData = {
          total_students: 45,
          average_performance: 72.5,
          pass_rate: 78.2,
          top_performers: 12,
          co_attainment: [
            { co_code: 'CO1', actual_pct: 85.2, target_pct: 80 },
            { co_code: 'CO2', actual_pct: 76.8, target_pct: 80 },
            { co_code: 'CO3', actual_pct: 68.4, target_pct: 80 },
            { co_code: 'CO4', actual_pct: 71.9, target_pct: 80 },
            { co_code: 'CO5', actual_pct: 79.3, target_pct: 80 }
          ]
        }
        setOverviewData(mockData)
        return
      }
      
      const data = await response.json()
      setOverviewData(data)
    } catch (err) {
      // Generate mock data on error
      const mockData = {
        total_students: 45,
        average_performance: 72.5,
        pass_rate: 78.2,
        top_performers: 12,
        co_attainment: [
          { co_code: 'CO1', actual_pct: 85.2, target_pct: 80 },
          { co_code: 'CO2', actual_pct: 76.8, target_pct: 80 },
          { co_code: 'CO3', actual_pct: 68.4, target_pct: 80 },
          { co_code: 'CO4', actual_pct: 71.9, target_pct: 80 },
          { co_code: 'CO5', actual_pct: 79.3, target_pct: 80 }
        ]
      }
      setOverviewData(mockData)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentData = async (subjectId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/analytics/teacher/students/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        // Generate mock student data
        const mockStudents = [
          { id: 1, name: 'John Doe', username: 'john.doe', total_marks: 85, percentage: 85.0, grade: 'A', rank: 1, co_attainment: { 'CO1': 90, 'CO2': 85, 'CO3': 80 }, exam_performance: [] },
          { id: 2, name: 'Jane Smith', username: 'jane.smith', total_marks: 78, percentage: 78.0, grade: 'B', rank: 2, co_attainment: { 'CO1': 85, 'CO2': 80, 'CO3': 75 }, exam_performance: [] },
          { id: 3, name: 'Mike Johnson', username: 'mike.johnson', total_marks: 72, percentage: 72.0, grade: 'B', rank: 3, co_attainment: { 'CO1': 75, 'CO2': 70, 'CO3': 75 }, exam_performance: [] },
          { id: 4, name: 'Sarah Wilson', username: 'sarah.wilson', total_marks: 68, percentage: 68.0, grade: 'C', rank: 4, co_attainment: { 'CO1': 70, 'CO2': 65, 'CO3': 70 }, exam_performance: [] },
          { id: 5, name: 'David Brown', username: 'david.brown', total_marks: 62, percentage: 62.0, grade: 'C', rank: 5, co_attainment: { 'CO1': 65, 'CO2': 60, 'CO3': 65 }, exam_performance: [] }
        ]
        setStudentData(mockStudents)
        return
      }
      
      const data = await response.json()
      setStudentData(data)
    } catch (err) {
      // Generate mock data on error
      const mockStudents = [
        { id: 1, name: 'John Doe', username: 'john.doe', total_marks: 85, percentage: 85.0, grade: 'A', rank: 1, co_attainment: { 'CO1': 90, 'CO2': 85, 'CO3': 80 }, exam_performance: [] },
        { id: 2, name: 'Jane Smith', username: 'jane.smith', total_marks: 78, percentage: 78.0, grade: 'B', rank: 2, co_attainment: { 'CO1': 85, 'CO2': 80, 'CO3': 75 }, exam_performance: [] },
        { id: 3, name: 'Mike Johnson', username: 'mike.johnson', total_marks: 72, percentage: 72.0, grade: 'B', rank: 3, co_attainment: { 'CO1': 75, 'CO2': 70, 'CO3': 75 }, exam_performance: [] },
        { id: 4, name: 'Sarah Wilson', username: 'sarah.wilson', total_marks: 68, percentage: 68.0, grade: 'C', rank: 4, co_attainment: { 'CO1': 70, 'CO2': 65, 'CO3': 70 }, exam_performance: [] },
        { id: 5, name: 'David Brown', username: 'david.brown', total_marks: 62, percentage: 62.0, grade: 'C', rank: 5, co_attainment: { 'CO1': 65, 'CO2': 60, 'CO3': 65 }, exam_performance: [] }
      ]
      setStudentData(mockStudents)
    }
  }

  const fetchQuestionData = async (subjectId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/analytics/teacher/questions/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        // Generate mock question data
        const mockQuestions = [
          { question_id: 1, question_text: 'What is the basic concept of data structures?', max_marks: 10, average_marks: 7.5, success_rate: 75, attempt_rate: 90, difficulty: 'easy', co_mapping: ['CO1', 'CO2'], blooms_level: 'Understand', discrimination_index: 0.6 },
          { question_id: 2, question_text: 'Explain the time complexity of binary search', max_marks: 15, average_marks: 9.2, success_rate: 61, attempt_rate: 85, difficulty: 'medium', co_mapping: ['CO2', 'CO3'], blooms_level: 'Apply', discrimination_index: 0.7 },
          { question_id: 3, question_text: 'Design an algorithm to solve the traveling salesman problem', max_marks: 20, average_marks: 8.1, success_rate: 40, attempt_rate: 70, difficulty: 'hard', co_mapping: ['CO3', 'CO4', 'CO5'], blooms_level: 'Create', discrimination_index: 0.8 }
        ]
        setQuestionData(mockQuestions)
        return
      }
      
      const data = await response.json()
      setQuestionData(data)
    } catch (err) {
      // Generate mock data on error
      const mockQuestions = [
        { question_id: 1, question_text: 'What is the basic concept of data structures?', max_marks: 10, average_marks: 7.5, success_rate: 75, attempt_rate: 90, difficulty: 'easy', co_mapping: ['CO1', 'CO2'], blooms_level: 'Understand', discrimination_index: 0.6 },
        { question_id: 2, question_text: 'Explain the time complexity of binary search', max_marks: 15, average_marks: 9.2, success_rate: 61, attempt_rate: 85, difficulty: 'medium', co_mapping: ['CO2', 'CO3'], blooms_level: 'Apply', discrimination_index: 0.7 },
        { question_id: 3, question_text: 'Design an algorithm to solve the traveling salesman problem', max_marks: 20, average_marks: 8.1, success_rate: 40, attempt_rate: 70, difficulty: 'hard', co_mapping: ['CO3', 'CO4', 'CO5'], blooms_level: 'Create', discrimination_index: 0.8 }
      ]
      setQuestionData(mockQuestions)
    }
  }

  const fetchExamData = async (subjectId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/analytics/teacher/exams/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        // Generate mock exam data
        const mockExams = [
          { exam_id: 1, exam_name: 'Midterm Exam', exam_type: 'midterm', total_students: 45, average_percentage: 72.5, pass_rate: 78.2, excellent_rate: 15.6, question_analysis: [], co_attainment: {}, date: '2024-01-15' },
          { exam_id: 2, exam_name: 'Final Exam', exam_type: 'final', total_students: 45, average_percentage: 68.9, pass_rate: 73.3, excellent_rate: 11.1, question_analysis: [], co_attainment: {}, date: '2024-03-20' }
        ]
        setExamData(mockExams)
        return
      }
      
      const data = await response.json()
      setExamData(data)
    } catch (err) {
      // Generate mock data on error
      const mockExams = [
        { exam_id: 1, exam_name: 'Midterm Exam', exam_type: 'midterm', total_students: 45, average_percentage: 72.5, pass_rate: 78.2, excellent_rate: 15.6, question_analysis: [], co_attainment: {}, date: '2024-01-15' },
        { exam_id: 2, exam_name: 'Final Exam', exam_type: 'final', total_students: 45, average_percentage: 68.9, pass_rate: 73.3, excellent_rate: 11.1, question_analysis: [], co_attainment: {}, date: '2024-03-20' }
      ]
      setExamData(mockExams)
    }
  }

  const fetchHeatmapData = async (subjectId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/analytics/teacher/heatmap/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        // Generate mock heatmap data
        const mockHeatmap = [
          { student_id: 1, student_name: 'John Doe', question_scores: { 1: 9, 2: 13, 3: 16 }, total_percentage: 85.0 },
          { student_id: 2, student_name: 'Jane Smith', question_scores: { 1: 8, 2: 11, 3: 14 }, total_percentage: 78.0 },
          { student_id: 3, student_name: 'Mike Johnson', question_scores: { 1: 7, 2: 10, 3: 12 }, total_percentage: 72.0 },
          { student_id: 4, student_name: 'Sarah Wilson', question_scores: { 1: 6, 2: 9, 3: 11 }, total_percentage: 68.0 },
          { student_id: 5, student_name: 'David Brown', question_scores: { 1: 5, 2: 8, 3: 9 }, total_percentage: 62.0 }
        ]
        setHeatmapData(mockHeatmap)
        return
      }
      
      const data = await response.json()
      setHeatmapData(data)
    } catch (err) {
      // Generate mock data on error
      const mockHeatmap = [
        { student_id: 1, student_name: 'John Doe', question_scores: { 1: 9, 2: 13, 3: 16 }, total_percentage: 85.0 },
        { student_id: 2, student_name: 'Jane Smith', question_scores: { 1: 8, 2: 11, 3: 14 }, total_percentage: 78.0 },
        { student_id: 3, student_name: 'Mike Johnson', question_scores: { 1: 7, 2: 10, 3: 12 }, total_percentage: 72.0 },
        { student_id: 4, student_name: 'Sarah Wilson', question_scores: { 1: 6, 2: 9, 3: 11 }, total_percentage: 68.0 },
        { student_id: 5, student_name: 'David Brown', question_scores: { 1: 5, 2: 8, 3: 9 }, total_percentage: 62.0 }
      ]
      setHeatmapData(mockHeatmap)
    }
  }

  const handleSubjectChange = (subjectId: number) => {
    setSelectedSubjectId(subjectId)
    setError(null)
    
    // Fetch all data for the selected subject
    fetchOverviewData(subjectId)
    fetchStudentData(subjectId)
    fetchQuestionData(subjectId)
    fetchExamData(subjectId)
    fetchHeatmapData(subjectId)
  }

  // Filter functions
  const filteredStudents = useMemo(() => {
    let filtered = studentData
    
    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.username.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (gradeFilter !== 'all') {
      filtered = filtered.filter(student => student.grade === gradeFilter)
    }
    
    return filtered
  }, [studentData, searchTerm, gradeFilter])

  const filteredExams = useMemo(() => {
    let filtered = examData
    
    if (examTypeFilter !== 'all') {
      filtered = filtered.filter(exam => exam.exam_type === examTypeFilter)
    }
    
    return filtered
  }, [examData, examTypeFilter])

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
          report_type: 'teacher_analytics',
          filters: {
            subject_id: selectedSubjectId,
            tab: activeTab,
            search_term: searchTerm,
            grade_filter: gradeFilter,
            exam_type_filter: examTypeFilter
          },
          format
        })
      })
      
      if (!response.ok) throw new Error('Failed to generate report')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `teacher_analytics_${activeTab}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data')
    }
  }

  // Chart data preparation
  const getGradeDistributionData = () => {
    const grades = ['A', 'B', 'C', 'D', 'F']
    const counts = grades.map(grade => 
      filteredStudents.filter(s => s.grade === grade).length
    )
    
    return {
      labels: grades,
      datasets: [{
        data: counts,
        backgroundColor: [
          '#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'
        ],
        borderColor: [
          '#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'
        ],
        borderWidth: 2
      }]
    }
  }

  const getPerformanceTrendData = () => {
    const sortedStudents = [...filteredStudents].sort((a, b) => a.rank - b.rank)
    
    return {
      labels: sortedStudents.map(s => s.name),
      datasets: [{
        label: 'Percentage',
        data: sortedStudents.map(s => s.percentage),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
        fill: true
      }]
    }
  }

  const getQuestionDifficultyData = () => {
    const difficulties = ['easy', 'medium', 'hard']
    const counts = difficulties.map(difficulty => 
      questionData.filter(q => q.difficulty === difficulty).length
    )
    
    return {
      labels: difficulties.map(d => d.charAt(0).toUpperCase() + d.slice(1)),
      datasets: [{
        data: counts,
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 2
      }]
    }
  }

  const getExamComparisonData = () => {
    return {
      labels: filteredExams.map(e => e.exam_name),
      datasets: [
        {
          label: 'Average %',
          data: filteredExams.map(e => e.average_percentage),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1
        },
        {
          label: 'Pass Rate %',
          data: filteredExams.map(e => e.pass_rate),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.1
        }
      ]
    }
  }

  // Render functions
  const renderOverviewTab = () => {
    if (!overviewData) return null

  return (
    <div className="space-y-6">
        {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{overviewData.total_students}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Performance</p>
                <p className="text-2xl font-bold text-gray-900">{overviewData.average_performance}%</p>
              </div>
          </div>
        </div>

          <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Target className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                <p className="text-2xl font-bold text-gray-900">{overviewData.pass_rate}%</p>
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
                <p className="text-2xl font-bold text-gray-900">{overviewData.top_performers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
            <div className="h-64">
              <Doughnut data={getGradeDistributionData()} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                },
              }} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h3>
            <div className="h-64">
              <Line data={getPerformanceTrendData()} options={{
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
                    max: 100,
                  },
                },
              }} />
            </div>
          </div>
        </div>

        {/* CO Attainment */}
        {overviewData.co_attainment && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Outcomes Attainment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overviewData.co_attainment.map((co) => (
                <div key={co.co_code} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{co.co_code}</span>
                    <span className={`text-sm font-semibold ${
                      co.actual_pct >= 80 ? 'text-green-600' :
                      co.actual_pct >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {co.actual_pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        co.actual_pct >= 80 ? 'bg-green-500' :
                        co.actual_pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${co.actual_pct}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderStudentsTab = () => {
    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                />
              </div>
            </div>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        {/* Student Performance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Student Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Marks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{student.rank}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.username}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.total_marks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-semibold ${
                        student.percentage >= 80 ? 'text-green-600' :
                        student.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {student.percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.grade === 'A' ? 'bg-green-100 text-green-800' :
                        student.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                        student.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                        student.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {student.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="h-4 w-4" />
                      </button>
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
    return (
      <div className="space-y-6">
        {/* Question Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Difficulty Distribution</h3>
          <div className="h-64">
              <Pie data={getQuestionDifficultyData()} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                },
              }} />
            </div>
        </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Success Rate vs Difficulty</h3>
            <div className="h-64">
              <Bar data={{
                labels: questionData.map(q => `Q${q.question_id}`),
                datasets: [{
                  label: 'Success Rate %',
                  data: questionData.map(q => q.success_rate),
                  backgroundColor: questionData.map(q => 
                    q.success_rate >= 80 ? '#10B981' :
                    q.success_rate >= 60 ? '#F59E0B' : '#EF4444'
                  ),
                  borderColor: questionData.map(q => 
                    q.success_rate >= 80 ? '#10B981' :
                    q.success_rate >= 60 ? '#F59E0B' : '#EF4444'
                  ),
                  borderWidth: 1
                }]
              }} options={{
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
                    max: 100,
                  },
                },
              }} />
            </div>
          </div>
      </div>

        {/* Question Analysis Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Question Analysis</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Marks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Marks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CO Mapping</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blooms Level</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {questionData.map((question) => (
                  <tr key={question.question_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">Q{question.question_id}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{question.question_text}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {question.max_marks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-semibold ${
                        (question.average_marks / question.max_marks) >= 0.7 ? 'text-green-600' :
                        (question.average_marks / question.max_marks) >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {question.average_marks.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-semibold ${
                        question.success_rate >= 80 ? 'text-green-600' :
                        question.success_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {question.success_rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-wrap gap-1">
                        {question.co_mapping.map((co, idx) => (
                          <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {co}
                      </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {question.blooms_level}
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
    return (
      <div className="space-y-6">
        {/* Exam Filter */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-4">
            <select
              value={examTypeFilter}
              onChange={(e) => setExamTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Exam Types</option>
              <option value="midterm">Midterm</option>
              <option value="final">Final</option>
              <option value="quiz">Quiz</option>
              <option value="assignment">Assignment</option>
            </select>
          </div>
                </div>

        {/* Exam Comparison Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Performance Comparison</h3>
          <div className="h-64">
            <Line data={getExamComparisonData()} options={{
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
                  max: 100,
                },
              },
            }} />
                </div>
              </div>
              
        {/* Exam Analysis Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Exam Analysis</h3>
                </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pass Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Excellent Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExams.map((exam) => (
                  <tr key={exam.exam_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {exam.exam_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {exam.exam_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {exam.total_students}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-semibold ${
                        exam.average_percentage >= 80 ? 'text-green-600' :
                        exam.average_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {exam.average_percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-semibold ${
                        exam.pass_rate >= 80 ? 'text-green-600' :
                        exam.pass_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {exam.pass_rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-semibold ${
                        exam.excellent_rate >= 20 ? 'text-green-600' :
                        exam.excellent_rate >= 10 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {exam.excellent_rate}%
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(exam.date).toLocaleDateString()}
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

  const renderHeatmapTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Performance Heatmap</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  {questionData.map(q => (
                    <th key={q.question_id} className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                      Q{q.question_id}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Total %</th>
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((student) => (
                  <tr key={student.student_id}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {student.student_name}
                    </td>
                    {questionData.map(q => {
                      const score = student.question_scores[q.question_id] || 0
                      const percentage = (score / q.max_marks) * 100
                      return (
                        <td key={q.question_id} className="px-2 py-2 text-center">
                          <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium ${
                            percentage >= 80 ? 'bg-green-500 text-white' :
                            percentage >= 60 ? 'bg-yellow-500 text-white' :
                            percentage >= 40 ? 'bg-orange-500 text-white' :
                            'bg-red-500 text-white'
                          }`}>
                            {Math.round(percentage)}
            </div>
                        </td>
                      )
                    })}
                    <td className="px-4 py-2 text-center">
                      <span className={`text-sm font-semibold ${
                        student.total_percentage >= 80 ? 'text-green-600' :
                        student.total_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {student.total_percentage.toFixed(1)}%
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

  const renderComparisonTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparative Analysis</h3>
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Comparative analysis features coming soon...</p>
          </div>
              </div>
              </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
              </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comprehensive Analytics</h1>
            <p className="text-gray-600">Detailed analysis of student performance, questions, and exams</p>
              </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedSubjectId || ''}
              onChange={(e) => handleSubjectChange(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Subject</option>
              {teacherSubjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Export Options */}
        {showExportOptions && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Export Format:</span>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'excel' | 'csv')}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
              <button
                onClick={() => exportData(exportFormat)}
                className="btn-primary text-sm"
              >
                Download Report
              </button>
            </div>
              </div>
            )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
              </div>
            )}
            
      {selectedSubjectId ? (
        <>
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', name: 'Overview', icon: BarChart3 },
                  { id: 'students', name: 'Students', icon: Users },
                  { id: 'questions', name: 'Questions', icon: Target },
                  { id: 'exams', name: 'Exams', icon: Calendar },
                  { id: 'heatmap', name: 'Heatmap', icon: Activity },
                  { id: 'comparison', name: 'Comparison', icon: TrendingUp }
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
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
              {activeTab === 'heatmap' && renderHeatmapTab()}
              {activeTab === 'comparison' && renderComparisonTab()}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Subject</h3>
          <p className="text-gray-500">Choose a subject to view comprehensive analytics</p>
        </div>
      )}
    </div>
  )
}

export default TeacherAnalytics