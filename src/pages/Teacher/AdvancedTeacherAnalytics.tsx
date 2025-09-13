import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchTeacherAnalytics } from '../../store/slices/analyticsSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchAdvancedTeacherAnalytics } from '../../store/slices/advancedAnalyticsSlice'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale } from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { 
  TrendingUp, AlertTriangle, CheckCircle, Target, BookOpen, 
  BarChart3, Minus, Star, Activity, XCircle, Eye, Shield, Brain, Filter, Download
} from 'lucide-react'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement, 
  Title, Tooltip, Legend, ArcElement, RadialLinearScale
)

/*
interface ClassPerformanceIntelligence {
  distribution_analysis: {
    percentile_rankings: Array<{
      range: string
      count: number
      percentage: number
    }>
    statistical_breakdown: {
      mean: number
      median: number
      mode: number
      standard_deviation: number
      skewness: number
    }
  }
  performance_heatmap: {
    [key: string]: {
      [key: string]: number
    }
  }
  comparative_trends: Array<{
    exam: string
    class_average: number
    previous_average: number
    improvement: number
  }>
}
*/

/*
interface QuestionLevelAnalytics {
  attempt_rate_analysis: Array<{
    question_id: string
    question_number: string
    attempt_rate: number
    success_rate: number
    difficulty_level: 'easy' | 'medium' | 'hard'
  }>
  success_rate_metrics: {
    full_marks: number
    partial_marks: number
    zero_marks: number
    average_marks: number
  }
  difficulty_flagging: Array<{
    question_id: string
    question_number: string
    success_rate: number
    flagged: boolean
    reason: string
  }>
  content_effectiveness: Array<{
    topic: string
    effectiveness_score: number
    student_engagement: number
    improvement_potential: number
  }>
}
*/

/*
interface StudentRiskManagement {
  at_risk_students: Array<{
    student_id: number
    student_name: string
    risk_level: 'low' | 'medium' | 'high'
    risk_factors: string[]
    predicted_performance: number
    intervention_priority: 'high' | 'medium' | 'low'
  }>
  intervention_recommendations: Array<{
    student_id: number
    student_name: string
    recommendation: string
    expected_impact: number
    timeline: string
    resources: string[]
  }>
  progress_monitoring: Array<{
    student_id: number
    student_name: string
    current_performance: number
    previous_performance: number
    trend: 'improving' | 'declining' | 'stable'
    trajectory: number[]
  }>
}
*/

/*
interface TeachingEffectivenessAnalysis {
  multi_subject_comparison: Array<{
    subject: string
    outcome_achievement: number
    student_satisfaction: number
    teaching_effectiveness: number
  }>
  pedagogical_insights: Array<{
    method: string
    effectiveness: number
    usage_frequency: number
    student_response: number
  }>
  continuous_improvement: Array<{
    area: string
    current_score: number
    target_score: number
    improvement_actions: string[]
    expected_outcome: number
  }>
}
*/

const AdvancedTeacherAnalytics: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { teacherAnalytics, loading } = useSelector((state: RootState) => state.analytics)
  const { user } = useSelector((state: RootState) => state.auth)
  const { } = useSelector((state: RootState) => state.subjects)
  const { 
    advancedTeacherAnalytics, 
    advancedTeacherAnalyticsLoading, 
    advancedTeacherAnalyticsError 
  } = useSelector((state: RootState) => state.advancedAnalytics)
  const [activeTab, setActiveTab] = useState('class_performance')

  // Use real data from Redux store
  const realClassPerformanceIntelligence = advancedTeacherAnalytics?.class_performance_intelligence || null
  const realQuestionLevelAnalytics = advancedTeacherAnalytics?.question_level_analytics || null
  const realStudentRiskManagement = advancedTeacherAnalytics?.student_risk_management || null
  const realTeachingEffectivenessAnalysis = advancedTeacherAnalytics?.teaching_effectiveness_analysis || null

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchTeacherAnalytics(user.id))
      dispatch(fetchAdvancedTeacherAnalytics(user.id))
    }
    dispatch(fetchSubjects())
  }, [dispatch, user])

  /*
  useEffect(() => {
    // Fallback to mock data if real data is not available
    if (!advancedTeacherAnalytics && !advancedTeacherAnalyticsLoading) {
      setClassPerformanceIntelligence({
      distribution_analysis: {
        percentile_rankings: [
          { range: '90-100%', count: 5, percentage: 12.5 },
          { range: '80-89%', count: 8, percentage: 20 },
          { range: '70-79%', count: 12, percentage: 30 },
          { range: '60-69%', count: 10, percentage: 25 },
          { range: '50-59%', count: 4, percentage: 10 },
          { range: 'Below 50%', count: 1, percentage: 2.5 }
        ],
        statistical_breakdown: {
          mean: 75.2,
          median: 76.5,
          mode: 78,
          standard_deviation: 12.3,
          skewness: -0.2
        }
      },
      performance_heatmap: {
        'CO1': { 'Q1': 85, 'Q2': 78, 'Q3': 82 },
        'CO2': { 'Q4': 72, 'Q5': 68, 'Q6': 75 },
        'CO3': { 'Q7': 88, 'Q8': 90, 'Q9': 85 },
        'CO4': { 'Q10': 65, 'Q11': 70, 'Q12': 68 }
      },
      comparative_trends: [
        { exam: 'Internal 1', class_average: 72.5, previous_average: 70.2, improvement: 2.3 },
        { exam: 'Internal 2', class_average: 76.8, previous_average: 72.5, improvement: 4.3 },
        { exam: 'Final', class_average: 78.2, previous_average: 76.8, improvement: 1.4 }
      ]
    })

    setQuestionLevelAnalytics({
      attempt_rate_analysis: [
        { question_id: 'Q1', question_number: '1a', attempt_rate: 95, success_rate: 85, difficulty_level: 'easy' },
        { question_id: 'Q2', question_number: '1b', attempt_rate: 90, success_rate: 78, difficulty_level: 'medium' },
        { question_id: 'Q3', question_number: '2a', attempt_rate: 85, success_rate: 72, difficulty_level: 'medium' },
        { question_id: 'Q4', question_number: '2b', attempt_rate: 80, success_rate: 65, difficulty_level: 'hard' },
        { question_id: 'Q5', question_number: '3a', attempt_rate: 75, success_rate: 58, difficulty_level: 'hard' }
      ],
      success_rate_metrics: {
        full_marks: 35,
        partial_marks: 45,
        zero_marks: 20,
        average_marks: 68.5
      },
      difficulty_flagging: [
        { question_id: 'Q4', question_number: '2b', success_rate: 25, flagged: true, reason: 'Success rate below 30%' },
        { question_id: 'Q5', question_number: '3a', success_rate: 28, flagged: true, reason: 'Success rate below 30%' }
      ],
      content_effectiveness: [
        { topic: 'Data Structures', effectiveness_score: 85, student_engagement: 88, improvement_potential: 12 },
        { topic: 'Algorithms', effectiveness_score: 72, student_engagement: 75, improvement_potential: 25 },
        { topic: 'Database Design', effectiveness_score: 78, student_engagement: 82, improvement_potential: 18 }
      ]
    })

    setStudentRiskManagement({
      at_risk_students: [
        { student_id: 101, student_name: 'John Doe', risk_level: 'high', risk_factors: ['Declining performance', 'Low engagement'], predicted_performance: 45, intervention_priority: 'high' },
        { student_id: 102, student_name: 'Jane Smith', risk_level: 'medium', risk_factors: ['Inconsistent performance'], predicted_performance: 65, intervention_priority: 'medium' },
        { student_id: 103, student_name: 'Bob Johnson', risk_level: 'low', risk_factors: ['Minor fluctuations'], predicted_performance: 75, intervention_priority: 'low' }
      ],
      intervention_recommendations: [
        { student_id: 101, student_name: 'John Doe', recommendation: 'One-on-one tutoring sessions', expected_impact: 15, timeline: '2 weeks', resources: ['Extra practice problems', 'Video tutorials'] },
        { student_id: 102, student_name: 'Jane Smith', recommendation: 'Study group participation', expected_impact: 10, timeline: '1 week', resources: ['Study guide', 'Peer mentoring'] }
      ],
      progress_monitoring: [
        { student_id: 101, student_name: 'John Doe', current_performance: 45, previous_performance: 52, trend: 'declining', trajectory: [60, 55, 52, 45] },
        { student_id: 102, student_name: 'Jane Smith', current_performance: 65, previous_performance: 62, trend: 'improving', trajectory: [58, 60, 62, 65] }
      ]
    })

    setTeachingEffectivenessAnalysis({
      multi_subject_comparison: [
        { subject: 'Data Structures', outcome_achievement: 85, student_satisfaction: 88, teaching_effectiveness: 86.5 },
        { subject: 'Database Systems', outcome_achievement: 78, student_satisfaction: 82, teaching_effectiveness: 80 },
        { subject: 'Software Engineering', outcome_achievement: 82, student_satisfaction: 85, teaching_effectiveness: 83.5 }
      ],
      pedagogical_insights: [
        { method: 'Interactive Lectures', effectiveness: 85, usage_frequency: 70, student_response: 88 },
        { method: 'Hands-on Labs', effectiveness: 90, usage_frequency: 60, student_response: 92 },
        { method: 'Group Projects', effectiveness: 78, usage_frequency: 40, student_response: 75 }
      ],
      continuous_improvement: [
        { area: 'Algorithm Teaching', current_score: 72, target_score: 85, improvement_actions: ['More visual aids', 'Step-by-step examples'], expected_outcome: 82 },
        { area: 'Student Engagement', current_score: 80, target_score: 90, improvement_actions: ['Interactive activities', 'Real-world examples'], expected_outcome: 87 }
      ]
    // })
    // }
  // }, [])
  */


  // Use real data from Redux store
  const currentClassPerformanceIntelligence = realClassPerformanceIntelligence
  const currentQuestionLevelAnalytics = realQuestionLevelAnalytics
  const currentStudentRiskManagement = realStudentRiskManagement
  const currentTeachingEffectivenessAnalysis = realTeachingEffectivenessAnalysis

  if (loading || advancedTeacherAnalyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (advancedTeacherAnalyticsError) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-300 mx-auto mb-3" />
        <p className="text-red-500">Error loading advanced teacher analytics</p>
        <p className="text-sm text-gray-400">{advancedTeacherAnalyticsError}</p>
      </div>
    )
  }

  if (!teacherAnalytics && !advancedTeacherAnalytics) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No analytics data available</p>
        <p className="text-sm text-gray-400">Configure exams and enter marks to see analytics</p>
      </div>
    )
  }

  const getRiskColor = (level: string) => {
    switch (level) {
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


  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'easy': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'hard': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // Charts Data
  const distributionData = {
    labels: currentClassPerformanceIntelligence?.distribution_analysis.percentile_rankings.map((p: any) => p.range) || [],
    datasets: [
      {
        label: 'Number of Students',
        data: currentClassPerformanceIntelligence?.distribution_analysis.percentile_rankings.map((p: any) => p.count) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      }
    ]
  }

  const comparativeTrendsData = {
    labels: currentClassPerformanceIntelligence?.comparative_trends.map((t: any) => t.exam) || [],
    datasets: [
      {
        label: 'Class Average',
        data: currentClassPerformanceIntelligence?.comparative_trends.map((t: any) => t.class_average) || [],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Previous Average',
        data: currentClassPerformanceIntelligence?.comparative_trends.map((t: any) => t.previous_average) || [],
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        borderDash: [5, 5]
      }
    ]
  }

  const questionAnalysisData = {
    labels: currentQuestionLevelAnalytics?.attempt_rate_analysis.map((q: any) => q.question_number) || [],
    datasets: [
      {
        label: 'Attempt Rate (%)',
        data: currentQuestionLevelAnalytics?.attempt_rate_analysis.map((q: any) => q.attempt_rate) || [],
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 1
      },
      {
        label: 'Success Rate (%)',
        data: currentQuestionLevelAnalytics?.attempt_rate_analysis.map((q: any) => q.success_rate) || [],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1
      }
    ]
  }

  const tabs = [
    { id: 'class_performance', label: 'Class Performance Intelligence', icon: BarChart3 },
    { id: 'question_analysis', label: 'Question-Level Analytics', icon: Eye },
    { id: 'risk_management', label: 'Student Risk Management', icon: Shield },
    { id: 'teaching_effectiveness', label: 'Teaching Effectiveness', icon: Brain }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Teaching Analytics</h1>
          <p className="text-gray-600">Comprehensive insights for effective teaching and student success</p>
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

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Class Performance Intelligence Tab */}
      {activeTab === 'class_performance' && currentClassPerformanceIntelligence && (
        <div className="space-y-6">
          {/* Statistical Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="card">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Mean</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {currentClassPerformanceIntelligence?.distribution_analysis.statistical_breakdown.mean.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Median</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {currentClassPerformanceIntelligence.distribution_analysis.statistical_breakdown.median.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Star className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Mode</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {currentClassPerformanceIntelligence.distribution_analysis.statistical_breakdown.mode}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Activity className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Std Dev</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {currentClassPerformanceIntelligence.distribution_analysis.statistical_breakdown.standard_deviation.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Skewness</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {currentClassPerformanceIntelligence.distribution_analysis.statistical_breakdown.skewness.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Distribution Chart */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Distribution</h3>
            <div className="h-80">
              <Bar data={distributionData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' }
                },
                scales: {
                  y: { beginAtZero: true }
                }
              }} />
            </div>
          </div>

          {/* Comparative Trends */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Comparative Trends</h3>
            <div className="h-80">
              <Line data={comparativeTrendsData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' }
                },
                scales: {
                  y: { beginAtZero: true, max: 100 }
                }
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Question-Level Analytics Tab */}
      {activeTab === 'question_analysis' && currentQuestionLevelAnalytics && (
        <div className="space-y-6">
          {/* Success Rate Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Full Marks</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {currentQuestionLevelAnalytics.success_rate_metrics.full_marks}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Minus className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Partial Marks</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {currentQuestionLevelAnalytics.success_rate_metrics.partial_marks}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-red-100 p-3 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Zero Marks</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {currentQuestionLevelAnalytics.success_rate_metrics.zero_marks}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Average Marks</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {currentQuestionLevelAnalytics.success_rate_metrics.average_marks}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Question Analysis Chart */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Question Performance Analysis</h3>
            <div className="h-80">
              <Bar data={questionAnalysisData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' }
                },
                scales: {
                  y: { beginAtZero: true, max: 100 }
                }
              }} />
            </div>
          </div>

          {/* Question Details Table */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Question Performance Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempt Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentQuestionLevelAnalytics.attempt_rate_analysis.map((question: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {question.question_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {question.attempt_rate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {question.success_rate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(question.difficulty_level)}`}>
                          {question.difficulty_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {currentQuestionLevelAnalytics.difficulty_flagging.find((f: any) => f.question_id === question.question_id)?.flagged ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-red-600 bg-red-100">
                            Flagged
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-green-600 bg-green-100">
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Content Effectiveness */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Content Effectiveness Analysis</h3>
            <div className="space-y-4">
              {currentQuestionLevelAnalytics.content_effectiveness.map((content: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{content.topic}</h4>
                    <span className="text-sm text-gray-500">Effectiveness: {content.effectiveness_score}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Student Engagement:</span>
                      <span className="ml-2 font-medium">{content.student_engagement}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Improvement Potential:</span>
                      <span className="ml-2 font-medium">{content.improvement_potential}%</span>
                    </div>
                    <div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${content.effectiveness_score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Student Risk Management Tab */}
      {activeTab === 'risk_management' && currentStudentRiskManagement && (
        <div className="space-y-6">
          {/* At-Risk Students */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">At-Risk Students</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Predicted Performance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Factors</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentStudentRiskManagement.at_risk_students.map((student: any) => (
                    <tr key={student.student_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.student_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(student.risk_level)}`}>
                          {student.risk_level.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.predicted_performance}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(student.intervention_priority)}`}>
                          {student.intervention_priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.risk_factors.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Intervention Recommendations */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Intervention Recommendations</h3>
            <div className="space-y-4">
              {currentStudentRiskManagement.intervention_recommendations.map((rec: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{rec.student_name}</h4>
                    <span className="text-sm text-gray-500">Expected Impact: +{rec.expected_impact}%</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{rec.recommendation}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Timeline: {rec.timeline}</span>
                    <span>Resources: {rec.resources.length} available</span>
                  </div>
                  <div className="mt-2">
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Resources:</h5>
                    <div className="flex flex-wrap gap-2">
                      {rec.resources.map((resource: any, resIndex: number) => (
                        <span key={resIndex} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {resource}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Teaching Effectiveness Tab */}
      {activeTab === 'teaching_effectiveness' && currentTeachingEffectivenessAnalysis && (
        <div className="space-y-6">
          {/* Multi-Subject Comparison */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Multi-Subject Comparison</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome Achievement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Satisfaction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teaching Effectiveness</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentTeachingEffectivenessAnalysis.multi_subject_comparison.map((subject: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {subject.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subject.outcome_achievement}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subject.student_satisfaction}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subject.teaching_effectiveness}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pedagogical Insights */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pedagogical Insights</h3>
            <div className="space-y-4">
              {currentTeachingEffectivenessAnalysis.pedagogical_insights.map((insight: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{insight.method}</h4>
                    <span className="text-sm text-gray-500">Effectiveness: {insight.effectiveness}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Usage Frequency:</span>
                      <span className="ml-2 font-medium">{insight.usage_frequency}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Student Response:</span>
                      <span className="ml-2 font-medium">{insight.student_response}%</span>
                    </div>
                    <div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${insight.effectiveness}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Continuous Improvement */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Continuous Improvement Areas</h3>
            <div className="space-y-4">
              {currentTeachingEffectivenessAnalysis.continuous_improvement.map((area: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{area.area}</h4>
                    <span className="text-sm text-gray-500">Current: {area.current_score}% → Target: {area.target_score}%</span>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{area.current_score}% / {area.target_score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(area.current_score / area.target_score) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Improvement Actions:</h5>
                    <div className="flex flex-wrap gap-2">
                      {area.improvement_actions.map((action: any, actionIndex: number) => (
                        <span key={actionIndex} className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Expected Outcome: +{area.expected_outcome}% improvement
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedTeacherAnalytics
