import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchDetailedCOAnalysis } from '../../store/slices/advancedAnalyticsSlice'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { 
  AlertTriangle, ArrowUp, ArrowDown, Minus, Users, BarChart3, Eye, CheckCircle
} from 'lucide-react'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement, 
  Title, Tooltip, Legend, ArcElement, RadialLinearScale
)

interface PerStudentCOBreakdown {
  student_id: number
  student_name: string
  class: string
  co_attainments: {
    [key: string]: {
      actual: number
      target: number
      level: string
      gap: number
      trend: 'up' | 'down' | 'stable'
    }
  }
  overall_attainment: number
  rank: number
}

interface QuestionWiseCOContribution {
  question_id: string
  question_number: string
  co_code: string
  max_marks: number
  average_marks: number
  contribution_percentage: number
  difficulty_level: 'easy' | 'medium' | 'hard'
  success_rate: number
  student_attempts: number
}

interface COEvidenceTracker {
  co_code: string
  co_title: string
  evidence_questions: Array<{
    question_id: string
    question_number: string
    marks_contribution: number
    student_performance: number
    evidence_strength: 'strong' | 'moderate' | 'weak'
  }>
  total_evidence: number
  evidence_quality: number
}

interface COCoverageValidation {
  co_code: string
  co_title: string
  coverage_percentage: number
  mapped_questions: number
  total_questions: number
  coverage_status: 'complete' | 'partial' | 'insufficient'
  recommendations: string[]
}

const DetailedCOAnalysis: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { } = useSelector((state: RootState) => state.copo)
  const { 
    detailedCOAnalysis, 
    detailedCOAnalysisLoading, 
    detailedCOAnalysisError 
  } = useSelector((state: RootState) => state.advancedAnalytics)
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState('per_student')
  const [perStudentBreakdown, setPerStudentBreakdown] = useState<PerStudentCOBreakdown[]>([])
  const [questionWiseContribution, setQuestionWiseContribution] = useState<QuestionWiseCOContribution[]>([])
  const [coEvidenceTracker, setCOEvidenceTracker] = useState<COEvidenceTracker[]>([])
  const [coCoverageValidation, setCOCoverageValidation] = useState<COCoverageValidation[]>([])

  // Use real data from Redux store
  const realPerStudentBreakdown = detailedCOAnalysis?.per_student_breakdown || []
  const realQuestionWiseContribution = detailedCOAnalysis?.question_wise_contribution || []
  const realCOEvidenceTracker = detailedCOAnalysis?.co_evidence_tracker || []
  const realCOCoverageValidation = detailedCOAnalysis?.co_coverage_validation || []

  useEffect(() => {
    if (selectedSubject) {
      dispatch(fetchDetailedCOAnalysis(selectedSubject))
    }
  }, [dispatch, selectedSubject])

  useEffect(() => {
    // Fallback to mock data if real data is not available
    if (!detailedCOAnalysis && !detailedCOAnalysisLoading) {
      setPerStudentBreakdown([
      {
        student_id: 101,
        student_name: 'John Doe',
        class: 'CS-2023',
        co_attainments: {
          'CO1': { actual: 85, target: 80, level: 'L3', gap: 5, trend: 'up' },
          'CO2': { actual: 72, target: 80, level: 'L1', gap: -8, trend: 'down' },
          'CO3': { actual: 90, target: 80, level: 'L3', gap: 10, trend: 'up' },
          'CO4': { actual: 65, target: 80, level: 'Below L1', gap: -15, trend: 'down' }
        },
        overall_attainment: 78,
        rank: 3
      },
      {
        student_id: 102,
        student_name: 'Jane Smith',
        class: 'CS-2023',
        co_attainments: {
          'CO1': { actual: 88, target: 80, level: 'L3', gap: 8, trend: 'up' },
          'CO2': { actual: 82, target: 80, level: 'L2', gap: 2, trend: 'up' },
          'CO3': { actual: 85, target: 80, level: 'L3', gap: 5, trend: 'stable' },
          'CO4': { actual: 78, target: 80, level: 'L1', gap: -2, trend: 'up' }
        },
        overall_attainment: 83,
        rank: 1
      },
      {
        student_id: 103,
        student_name: 'Bob Johnson',
        class: 'CS-2023',
        co_attainments: {
          'CO1': { actual: 75, target: 80, level: 'L1', gap: -5, trend: 'stable' },
          'CO2': { actual: 68, target: 80, level: 'Below L1', gap: -12, trend: 'down' },
          'CO3': { actual: 82, target: 80, level: 'L2', gap: 2, trend: 'up' },
          'CO4': { actual: 70, target: 80, level: 'L1', gap: -10, trend: 'down' }
        },
        overall_attainment: 74,
        rank: 5
      }
    ])

    setQuestionWiseContribution([
      { question_id: 'Q1', question_number: '1a', co_code: 'CO1', max_marks: 10, average_marks: 8.5, contribution_percentage: 25, difficulty_level: 'easy', success_rate: 85, student_attempts: 45 },
      { question_id: 'Q2', question_number: '1b', co_code: 'CO1', max_marks: 15, average_marks: 11.2, contribution_percentage: 35, difficulty_level: 'medium', success_rate: 75, student_attempts: 42 },
      { question_id: 'Q3', question_number: '2a', co_code: 'CO2', max_marks: 12, average_marks: 8.6, contribution_percentage: 30, difficulty_level: 'medium', success_rate: 72, student_attempts: 40 },
      { question_id: 'Q4', question_number: '2b', co_code: 'CO2', max_marks: 18, average_marks: 12.1, contribution_percentage: 40, difficulty_level: 'hard', success_rate: 67, student_attempts: 38 },
      { question_id: 'Q5', question_number: '3a', co_code: 'CO3', max_marks: 20, average_marks: 17.8, contribution_percentage: 45, difficulty_level: 'easy', success_rate: 89, student_attempts: 44 },
      { question_id: 'Q6', question_number: '3b', co_code: 'CO3', max_marks: 15, average_marks: 13.2, contribution_percentage: 35, difficulty_level: 'medium', success_rate: 88, student_attempts: 43 },
      { question_id: 'Q7', question_number: '4a', co_code: 'CO4', max_marks: 25, average_marks: 16.3, contribution_percentage: 50, difficulty_level: 'hard', success_rate: 65, student_attempts: 35 },
      { question_id: 'Q8', question_number: '4b', co_code: 'CO4', max_marks: 20, average_marks: 13.0, contribution_percentage: 40, difficulty_level: 'hard', success_rate: 65, student_attempts: 33 }
    ])

    setCOEvidenceTracker([
      {
        co_code: 'CO1',
        co_title: 'Understand fundamental concepts',
        evidence_questions: [
          { question_id: 'Q1', question_number: '1a', marks_contribution: 25, student_performance: 85, evidence_strength: 'strong' },
          { question_id: 'Q2', question_number: '1b', marks_contribution: 35, student_performance: 75, evidence_strength: 'moderate' }
        ],
        total_evidence: 60,
        evidence_quality: 80
      },
      {
        co_code: 'CO2',
        co_title: 'Apply knowledge to solve problems',
        evidence_questions: [
          { question_id: 'Q3', question_number: '2a', marks_contribution: 30, student_performance: 72, evidence_strength: 'moderate' },
          { question_id: 'Q4', question_number: '2b', marks_contribution: 40, student_performance: 67, evidence_strength: 'weak' }
        ],
        total_evidence: 70,
        evidence_quality: 70
      },
      {
        co_code: 'CO3',
        co_title: 'Analyze and evaluate solutions',
        evidence_questions: [
          { question_id: 'Q5', question_number: '3a', marks_contribution: 45, student_performance: 89, evidence_strength: 'strong' },
          { question_id: 'Q6', question_number: '3b', marks_contribution: 35, student_performance: 88, evidence_strength: 'strong' }
        ],
        total_evidence: 80,
        evidence_quality: 88
      },
      {
        co_code: 'CO4',
        co_title: 'Create innovative solutions',
        evidence_questions: [
          { question_id: 'Q7', question_number: '4a', marks_contribution: 50, student_performance: 65, evidence_strength: 'weak' },
          { question_id: 'Q8', question_number: '4b', marks_contribution: 40, student_performance: 65, evidence_strength: 'weak' }
        ],
        total_evidence: 90,
        evidence_quality: 65
      }
    ])

    setCOCoverageValidation([
      {
        co_code: 'CO1',
        co_title: 'Understand fundamental concepts',
        coverage_percentage: 100,
        mapped_questions: 2,
        total_questions: 2,
        coverage_status: 'complete',
        recommendations: ['Maintain current coverage', 'Consider adding more challenging questions']
      },
      {
        co_code: 'CO2',
        co_title: 'Apply knowledge to solve problems',
        coverage_percentage: 100,
        mapped_questions: 2,
        total_questions: 2,
        coverage_status: 'complete',
        recommendations: ['Improve question difficulty distribution', 'Add more practical examples']
      },
      {
        co_code: 'CO3',
        co_title: 'Analyze and evaluate solutions',
        coverage_percentage: 100,
        mapped_questions: 2,
        total_questions: 2,
        coverage_status: 'complete',
        recommendations: ['Excellent coverage maintained', 'Consider advanced case studies']
      },
      {
        co_code: 'CO4',
        co_title: 'Create innovative solutions',
        coverage_percentage: 100,
        mapped_questions: 2,
        total_questions: 2,
        coverage_status: 'complete',
        recommendations: ['Focus on improving student performance', 'Provide additional practice materials']
      }
    ])
    }
  }, [])

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'L3': return 'text-green-600 bg-green-100'
      case 'L2': return 'text-blue-600 bg-blue-100'
      case 'L1': return 'text-yellow-600 bg-yellow-100'
      case 'Below L1': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-500" />
      case 'down': return <ArrowDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
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

  const getEvidenceStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'text-green-600 bg-green-100'
      case 'moderate': return 'text-yellow-600 bg-yellow-100'
      case 'weak': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getCoverageStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-600 bg-green-100'
      case 'partial': return 'text-yellow-600 bg-yellow-100'
      case 'insufficient': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // Use real data when available, fallback to mock data
  const currentPerStudentBreakdown = realPerStudentBreakdown.length > 0 ? realPerStudentBreakdown : perStudentBreakdown
  const currentQuestionWiseContribution = realQuestionWiseContribution.length > 0 ? realQuestionWiseContribution : questionWiseContribution
  const currentCOEvidenceTracker = realCOEvidenceTracker.length > 0 ? realCOEvidenceTracker : coEvidenceTracker
  const currentCOCoverageValidation = realCOCoverageValidation.length > 0 ? realCOCoverageValidation : coCoverageValidation

  // Charts Data
  const studentCOPerformanceData = {
    labels: currentPerStudentBreakdown.map((s: any) => s.student_name),
    datasets: Object.keys(currentPerStudentBreakdown[0]?.co_attainments || {}).map((co, index) => ({
      label: co,
      data: currentPerStudentBreakdown.map((s: any) => s.co_attainments[co]?.actual || 0),
      backgroundColor: `hsl(${index * 90}, 70%, 70%)`,
      borderColor: `hsl(${index * 90}, 70%, 50%)`,
      borderWidth: 1
    }))
  }

  const questionContributionData = {
    labels: currentQuestionWiseContribution.map((q: any) => q.question_number),
    datasets: [
      {
        label: 'Contribution %',
        data: currentQuestionWiseContribution.map((q: any) => q.contribution_percentage),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      },
      {
        label: 'Success Rate %',
        data: currentQuestionWiseContribution.map((q: any) => q.success_rate),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1
      }
    ]
  }

  const evidenceQualityData = {
    labels: currentCOEvidenceTracker.map((co: any) => co.co_code),
    datasets: [
      {
        label: 'Evidence Quality %',
        data: currentCOEvidenceTracker.map((co: any) => co.evidence_quality),
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 1
      },
      {
        label: 'Total Evidence',
        data: currentCOEvidenceTracker.map((co: any) => co.total_evidence),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: 'rgba(245, 158, 11, 1)',
        borderWidth: 1
      }
    ]
  }

  const tabs = [
    { id: 'per_student', label: 'Per-Student Breakdown', icon: Users },
    { id: 'question_wise', label: 'Question-wise Contribution', icon: BarChart3 },
    { id: 'evidence_tracker', label: 'Evidence Tracker', icon: Eye },
    { id: 'coverage_validation', label: 'Coverage Validation', icon: CheckCircle }
  ]

  if (detailedCOAnalysisLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (detailedCOAnalysisError) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-300 mx-auto mb-3" />
        <p className="text-red-500">Error loading detailed CO analysis</p>
        <p className="text-sm text-gray-400">{detailedCOAnalysisError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detailed CO Analysis</h1>
          <p className="text-gray-600">Comprehensive Course Outcome analysis and evidence tracking</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedSubject || ''}
            onChange={(e) => setSelectedSubject(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </select>
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

      {/* Per-Student Breakdown Tab */}
      {activeTab === 'per_student' && (
        <div className="space-y-6">
          {/* Student CO Performance Chart */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Student CO Performance Comparison</h3>
            <div className="h-80">
              <Bar data={studentCOPerformanceData} options={{
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

          {/* Detailed Student Table */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Detailed Student CO Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CO1</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CO2</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CO3</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CO4</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPerStudentBreakdown.map((student: any) => (
                    <tr key={student.student_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.student_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.class}
                      </td>
                      {Object.entries(student.co_attainments).map(([co, data]: [string, any]) => (
                        <td key={co} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <span>{data.actual}%</span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(data.level)}`}>
                              {data.level}
                            </span>
                            {getTrendIcon(data.trend)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Target: {data.target}% | Gap: {data.gap > 0 ? '+' : ''}{data.gap}%
                          </div>
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.overall_attainment}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{student.rank}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Question-wise Contribution Tab */}
      {activeTab === 'question_wise' && (
        <div className="space-y-6">
          {/* Question Contribution Chart */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Question Contribution Analysis</h3>
            <div className="h-80">
              <Bar data={questionContributionData} options={{
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Question-wise CO Contribution Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CO Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Marks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Marks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contribution %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentQuestionWiseContribution.map((question: any) => (
                    <tr key={question.question_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {question.question_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {question.co_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {question.max_marks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {question.average_marks.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {question.contribution_percentage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(question.difficulty_level)}`}>
                          {question.difficulty_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {question.success_rate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {question.student_attempts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Tracker Tab */}
      {activeTab === 'evidence_tracker' && (
        <div className="space-y-6">
          {/* Evidence Quality Chart */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">CO Evidence Quality Analysis</h3>
            <div className="h-80">
              <Bar data={evidenceQualityData} options={{
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

          {/* Evidence Details */}
          <div className="space-y-4">
            {currentCOEvidenceTracker.map((co: any) => (
              <div key={co.co_code} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{co.co_code}</h4>
                    <p className="text-sm text-gray-600">{co.co_title}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{co.evidence_quality}%</div>
                    <div className="text-sm text-gray-600">Evidence Quality</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Evidence Questions</h5>
                    <div className="space-y-2">
                      {co.evidence_questions.map((question: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="text-sm font-medium">{question.question_number}</span>
                            <span className="text-xs text-gray-500 ml-2">({question.marks_contribution}% contribution)</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">{question.student_performance}%</span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEvidenceStrengthColor(question.evidence_strength)}`}>
                              {question.evidence_strength}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Evidence Summary</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Evidence:</span>
                        <span className="font-medium">{co.total_evidence}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Evidence Quality:</span>
                        <span className="font-medium">{co.evidence_quality}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${co.evidence_quality}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coverage Validation Tab */}
      {activeTab === 'coverage_validation' && (
        <div className="space-y-6">
          {/* Coverage Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {coCoverageValidation.map((co) => (
              <div key={co.co_code} className="card">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {co.coverage_percentage}%
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Coverage</div>
                  <div className="text-lg font-medium text-gray-900 mb-1">{co.co_code}</div>
                  <div className="text-xs text-gray-500 mb-3">{co.co_title}</div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCoverageStatusColor(co.coverage_status)}`}>
                    {co.coverage_status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Coverage Details */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">CO Coverage Validation Details</h3>
          <div className="space-y-4">
            {currentCOCoverageValidation.map((co: any) => (
                <div key={co.co_code} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{co.co_code}</h4>
                      <p className="text-sm text-gray-600">{co.co_title}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{co.coverage_percentage}%</div>
                      <div className="text-sm text-gray-600">
                        {co.mapped_questions}/{co.total_questions} questions
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Coverage Progress</span>
                      <span>{co.coverage_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          co.coverage_percentage === 100 ? 'bg-green-500' :
                          co.coverage_percentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${co.coverage_percentage}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Recommendations</h5>
                    <ul className="space-y-1">
                      {co.recommendations.map((rec: any, index: number) => (
                        <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
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

export default DetailedCOAnalysis
