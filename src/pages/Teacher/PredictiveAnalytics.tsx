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
  Brain, TrendingUp, TrendingDown, Target, Award, Users,
  BarChart3, Download, Search, Filter, Eye, EyeOff,
  AlertTriangle, CheckCircle, XCircle, Info, Clock,
  Calendar, Star, ArrowUp, ArrowDown, Minus,
  Zap, Activity, Target as TargetIcon, BookOpen, FileText
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

interface PredictiveData {
  student_predictions: Array<{
    student_id: number
    student_name: string
    current_performance: number
    predicted_performance: number
    confidence_level: number
    risk_factors: string[]
    recommendations: string[]
    intervention_needed: boolean
  }>
  class_predictions: {
    predicted_average: number
    predicted_pass_rate: number
    predicted_excellent_rate: number
    confidence_interval: { lower: number; upper: number }
    trend_direction: 'improving' | 'declining' | 'stable'
  }
  co_predictions: Array<{
    co_code: string
    current_attainment: number
    predicted_attainment: number
    confidence_level: number
    improvement_potential: number
  }>
  exam_predictions: Array<{
    exam_name: string
    predicted_difficulty: number
    predicted_performance: number
    recommended_preparation_time: number
    success_probability: number
  }>
  insights: Array<{
    type: 'warning' | 'info' | 'success'
    title: string
    description: string
    impact: 'high' | 'medium' | 'low'
    timeframe: string
  }>
  recommendations: Array<{
    category: string
    priority: 'high' | 'medium' | 'low'
    action: string
    expected_impact: string
    timeline: string
  }>
}

const PredictiveAnalytics: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects)
  const { user } = useSelector((state: RootState) => state.auth)

  // State management
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [predictiveData, setPredictiveData] = useState<PredictiveData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'short' | 'medium' | 'long'>('medium')
  const [selectedView, setSelectedView] = useState<'overview' | 'students' | 'class' | 'cos' | 'exams'>('overview')
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('excel')

  const teacherSubjects = useMemo(() => 
    subjects.filter(subject => subject.teacher_id === user?.id),
    [subjects, user?.id]
  )

  // Fetch predictive analytics data
  const fetchPredictiveData = useCallback(async (subjectId: number) => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Authentication required')

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      // Fetch predictive analytics from backend
      const response = await fetch(`http://localhost:8000/analytics/teacher/predictive/${subjectId}?timeframe=${selectedTimeframe}`, { headers })
      
      if (!response.ok) throw new Error('Failed to fetch predictive analytics data')
      
      const data = await response.json()
      
      // If no data from backend, generate mock data for demonstration
      if (!data || Object.keys(data).length === 0) {
        const mockData = {
          student_predictions: generateStudentPredictions(),
          class_predictions: generateClassPredictions(),
          co_predictions: generateCOPredictions(),
          exam_predictions: generateExamPredictions(),
          insights: generateInsights(),
          recommendations: generateRecommendations()
        }
        setPredictiveData(mockData)
      } else {
        setPredictiveData(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch predictive data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Generate mock student predictions
  const generateStudentPredictions = () => {
    const students = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'David Brown', 'Lisa Davis']
    return students.map((name, index) => ({
      student_id: index + 1,
      student_name: name,
      current_performance: Math.random() * 40 + 40, // 40-80%
      predicted_performance: Math.random() * 40 + 40, // 40-80%
      confidence_level: Math.random() * 0.4 + 0.6, // 60-100%
      risk_factors: Math.random() > 0.7 ? ['Low attendance', 'Poor participation'] : [],
      recommendations: ['Focus on weak areas', 'Increase study time'],
      intervention_needed: Math.random() > 0.6
    }))
  }

  // Generate mock class predictions
  const generateClassPredictions = () => ({
    predicted_average: Math.random() * 20 + 60, // 60-80%
    predicted_pass_rate: Math.random() * 20 + 70, // 70-90%
    predicted_excellent_rate: Math.random() * 20 + 20, // 20-40%
    confidence_interval: {
      lower: Math.random() * 10 + 55,
      upper: Math.random() * 10 + 75
    },
    trend_direction: Math.random() > 0.5 ? 'improving' : Math.random() > 0.5 ? 'declining' : 'stable'
  })

  // Generate mock CO predictions
  const generateCOPredictions = () => {
    const cos = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5']
    return cos.map(co => ({
      co_code: co,
      current_attainment: Math.random() * 40 + 40,
      predicted_attainment: Math.random() * 40 + 40,
      confidence_level: Math.random() * 0.4 + 0.6,
      improvement_potential: Math.random() * 30 + 10
    }))
  }

  // Generate mock exam predictions
  const generateExamPredictions = () => {
    const exams = ['Internal 1', 'Internal 2', 'Final Exam']
    return exams.map(exam => ({
      exam_name: exam,
      predicted_difficulty: Math.random() * 0.4 + 0.3, // 0.3-0.7
      predicted_performance: Math.random() * 30 + 50, // 50-80%
      recommended_preparation_time: Math.random() * 20 + 10, // 10-30 days
      success_probability: Math.random() * 0.4 + 0.6 // 60-100%
    }))
  }

  // Generate insights
  const generateInsights = () => [
    {
      type: 'warning' as const,
      title: 'Performance Decline Predicted',
      description: 'Class average is expected to drop by 5% in the next month',
      impact: 'high' as const,
      timeframe: '1 month'
    },
    {
      type: 'info' as const,
      title: 'CO3 Needs Attention',
      description: 'CO3 attainment is predicted to remain below 60%',
      impact: 'medium' as const,
      timeframe: '2 months'
    },
    {
      type: 'success' as const,
      title: 'Student Improvement Trend',
      description: '3 students are predicted to improve significantly',
      impact: 'low' as const,
      timeframe: '3 months'
    }
  ]

  // Generate recommendations
  const generateRecommendations = () => [
    {
      category: 'Teaching Strategy',
      priority: 'high' as const,
      action: 'Implement peer learning groups',
      expected_impact: '15% improvement in class average',
      timeline: '2 weeks'
    },
    {
      category: 'Assessment',
      priority: 'medium' as const,
      action: 'Add more practice questions for CO3',
      expected_impact: '10% improvement in CO3 attainment',
      timeline: '1 month'
    },
    {
      category: 'Student Support',
      priority: 'high' as const,
      action: 'Schedule one-on-one sessions with at-risk students',
      expected_impact: '20% improvement in student retention',
      timeline: '1 week'
    }
  ]

  // Export functions
  const exportData = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!selectedSubjectId || !predictiveData) return

    try {
      const response = await fetch(`http://localhost:8000/reports/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          report_type: 'predictive_analysis',
          format,
          filters: {
            subject_id: selectedSubjectId,
            exam_type: 'all',
            timeframe: selectedTimeframe,
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
      a.download = `predictive_analytics_${format}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data')
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Brain className="h-6 w-6 text-purple-500 mr-2" />
              Predictive Analytics
            </h1>
            <p className="text-gray-600">AI-powered predictions and recommendations for improved outcomes</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="short">Short Term (1 month)</option>
              <option value="medium">Medium Term (3 months)</option>
              <option value="long">Long Term (6 months)</option>
            </select>
            <button
              onClick={() => selectedSubjectId && fetchPredictiveData(selectedSubjectId)}
              disabled={!selectedSubjectId || loading}
              className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
            >
              <Clock className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => exportData(exportFormat)}
              disabled={!selectedSubjectId || !predictiveData}
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
                if (subjectId) fetchPredictiveData(subjectId)
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

      {/* View Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'students', name: 'Student Predictions', icon: Users },
              { id: 'class', name: 'Class Predictions', icon: Target },
              { id: 'cos', name: 'CO Predictions', icon: BookOpen },
              { id: 'exams', name: 'Exam Predictions', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedView(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap ${
                    selectedView === tab.id
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
          {/* Overview Tab */}
          {selectedView === 'overview' && predictiveData && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Students Analyzed</p>
                      <p className="text-2xl font-semibold text-gray-900">{predictiveData.student_predictions.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Predicted Average</p>
                      <p className="text-2xl font-semibold text-gray-900">{predictiveData.class_predictions.predicted_average.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">At Risk Students</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {predictiveData.student_predictions.filter(s => s.intervention_needed).length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Brain className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Insights Generated</p>
                      <p className="text-2xl font-semibold text-gray-900">{predictiveData.insights.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">AI-Generated Insights</h3>
                <div className="space-y-4">
                  {predictiveData.insights.map((insight, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-l-4 ${
                        insight.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                        insight.type === 'info' ? 'bg-blue-50 border-blue-400' :
                        'bg-green-50 border-green-400'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          {insight.type === 'warning' ? (
                            <AlertTriangle className="h-5 w-5 text-yellow-400" />
                          ) : insight.type === 'info' ? (
                            <Info className="h-5 w-5 text-blue-400" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-green-400" />
                          )}
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-gray-900">{insight.title}</h4>
                          <p className="text-sm text-gray-700 mt-1">{insight.description}</p>
                          <div className="mt-2 flex items-center space-x-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(insight.impact)}`}>
                              {insight.impact} impact
                            </span>
                            <span className="text-xs text-gray-500">Timeframe: {insight.timeframe}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
                <div className="space-y-4">
                  {predictiveData.recommendations.map((rec, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{rec.action}</h4>
                          <p className="text-sm text-gray-600 mt-1">{rec.expected_impact}</p>
                          <div className="mt-2 flex items-center space-x-4">
                            <span className="text-xs text-gray-500">Category: {rec.category}</span>
                            <span className="text-xs text-gray-500">Timeline: {rec.timeline}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(rec.priority)}`}>
                          {rec.priority} priority
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Student Predictions Tab */}
          {selectedView === 'students' && predictiveData && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Predicted</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intervention</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {predictiveData.student_predictions.map((student) => (
                        <tr key={student.student_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{student.student_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.current_performance.toFixed(1)}%</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.predicted_performance.toFixed(1)}%</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${getConfidenceColor(student.confidence_level)}`}>
                              {(student.confidence_level * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              student.intervention_needed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {student.intervention_needed ? 'Needed' : 'Not Needed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Class Predictions Tab */}
          {selectedView === 'class' && predictiveData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Performance Predictions</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Predicted Average:</span>
                      <span className="text-lg font-bold text-blue-600">
                        {predictiveData.class_predictions.predicted_average.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Predicted Pass Rate:</span>
                      <span className="text-lg font-bold text-green-600">
                        {predictiveData.class_predictions.predicted_pass_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Excellence Rate:</span>
                      <span className="text-lg font-bold text-purple-600">
                        {predictiveData.class_predictions.predicted_excellent_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Confidence Interval:</span>
                      <span className="text-sm text-gray-600">
                        {predictiveData.class_predictions.confidence_interval.lower.toFixed(1)}% - {predictiveData.class_predictions.confidence_interval.upper.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Trend Direction:</span>
                      <span className={`text-sm font-medium capitalize ${
                        predictiveData.class_predictions.trend_direction === 'improving' ? 'text-green-600' :
                        predictiveData.class_predictions.trend_direction === 'declining' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {predictiveData.class_predictions.trend_direction}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CO Predictions Tab */}
          {selectedView === 'cos' && predictiveData && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CO Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Predicted</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Improvement</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {predictiveData.co_predictions.map((co) => (
                        <tr key={co.co_code} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {co.co_code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {co.current_attainment.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {co.predicted_attainment.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${getConfidenceColor(co.confidence_level)}`}>
                              {(co.confidence_level * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            +{co.improvement_potential.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Exam Predictions Tab */}
          {selectedView === 'exams' && predictiveData && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prep Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {predictiveData.exam_predictions.map((exam, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {exam.exam_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              exam.predicted_difficulty >= 0.7 ? 'bg-red-100 text-red-800' :
                              exam.predicted_difficulty >= 0.5 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {(exam.predicted_difficulty * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {exam.predicted_performance.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {exam.recommended_preparation_time} days
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${
                              exam.success_probability >= 0.8 ? 'text-green-600' :
                              exam.success_probability >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {(exam.success_probability * 100).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
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
          <span className="ml-2 text-gray-600">Generating predictions...</span>
        </div>
      )}
    </div>
  )
}

export default PredictiveAnalytics
