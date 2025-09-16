import React from 'react'
import { X, TrendingUp, TrendingDown, Target, Award, BookOpen, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
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

interface StudentDetailedModalProps {
  student: StudentDetailedData
  isOpen: boolean
  onClose: () => void
}

const StudentDetailedModal: React.FC<StudentDetailedModalProps> = ({ student, isOpen, onClose }) => {
  if (!isOpen) return null

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 80) return 'text-blue-600'
    if (percentage >= 70) return 'text-yellow-600'
    if (percentage >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const getPerformanceBgColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-100'
    if (percentage >= 80) return 'bg-blue-100'
    if (percentage >= 70) return 'bg-yellow-100'
    if (percentage >= 60) return 'bg-orange-100'
    return 'bg-red-100'
  }

  const getGradeFromPercentage = (percentage: number) => {
    if (percentage >= 90) return 'A'
    if (percentage >= 80) return 'B'
    if (percentage >= 70) return 'C'
    if (percentage >= 60) return 'D'
    return 'F'
  }

  // Prepare CO attainment data for charts
  const coData = Object.entries(student.co_attainment).map(([coCode, data]) => ({
    co: coCode,
    attainment: data.attainment_pct,
    target: data.target_pct,
    gap: data.gap
  }))

  // Prepare exam performance data for charts
  const examData = Object.entries(student.exam_performance).map(([examId, data]) => ({
    exam: data.exam_name,
    percentage: data.percentage,
    type: data.exam_type
  }))

  // Prepare performance trend data
  const trendData = student.performance_trend.map((trend, index) => ({
    exam: `Exam ${index + 1}`,
    percentage: trend.percentage,
    type: trend.exam_type
  }))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{student.student_name}</h2>
            <p className="text-gray-600">@{student.student_username} • {student.subject_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-8">
            {/* Overall Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${getPerformanceBgColor(student.overall_attainment)}`}>
                    <Target className={`h-6 w-6 ${getPerformanceColor(student.overall_attainment)}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Overall Attainment</p>
                    <p className={`text-2xl font-bold ${getPerformanceColor(student.overall_attainment)}`}>
                      {student.overall_attainment}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Award className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Grade</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {getGradeFromPercentage(student.overall_attainment)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Exams Attempted</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {student.exams_attempted}/{student.total_exams}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${student.gap >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {student.gap >= 0 ? (
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Gap from Target</p>
                    <p className={`text-2xl font-bold ${student.gap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {student.gap >= 0 ? '+' : ''}{student.gap}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CO Attainment Analysis */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Outcomes (CO) Attainment</h3>
              
              {/* CO Chart */}
              <div className="h-64 mb-6">
                <Bar
                  data={{
                    labels: coData.map(item => item.co),
                    datasets: [
                      {
                        label: 'Actual %',
                        data: coData.map(item => item.attainment),
                        backgroundColor: '#3B82F6',
                        borderColor: '#3B82F6',
                        borderWidth: 1,
                      },
                      {
                        label: 'Target %',
                        data: coData.map(item => item.target),
                        backgroundColor: '#10B981',
                        borderColor: '#10B981',
                        borderWidth: 1,
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
                  }}
                />
              </div>

              {/* CO Details Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CO Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gap</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(student.co_attainment).map(([coCode, data]) => (
                      <tr key={coCode}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {coCode}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {data.co_description || `Course Outcome ${coCode}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.target_pct}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={getPerformanceColor(data.attainment_pct)}>
                            {data.attainment_pct}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={data.gap >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {data.gap >= 0 ? '+' : ''}{data.gap}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {data.attainment_pct >= data.target_pct ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Achieved
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Below Target
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Exam Performance Analysis */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Performance</h3>
              
              {/* Exam Performance Chart */}
              <div className="h-64 mb-6">
                <Line
                  data={{
                    labels: examData.map(exam => exam.exam),
                    datasets: [
                      {
                        label: 'Percentage',
                        data: examData.map(exam => exam.percentage),
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.1,
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
                        max: 100,
                      },
                    },
                  }}
                />
              </div>

              {/* Exam Details Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(student.exam_performance).map(([examId, data]) => (
                      <tr key={examId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {data.exam_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {data.exam_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={getPerformanceColor(data.percentage)}>
                            {data.percentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.questions_attempted}/{data.total_questions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.date ? new Date(data.date).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance Trends */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
              
              <div className="h-64">
                <Line
                  data={{
                    labels: trendData.map(trend => trend.exam),
                    datasets: [
                      {
                        label: 'Percentage',
                        data: trendData.map(trend => trend.percentage),
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.1,
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
                        max: 100,
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Question Analysis */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Analysis</h3>
              
              <div className="space-y-4">
                {Object.entries(student.co_attainment).map(([coCode, data]) => (
                  <div key={coCode} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{coCode} - Question Details</h4>
                    <div className="space-y-2">
                      {data.question_details?.map((question: any, index: number) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex-1">
                            <p className="text-gray-900">{question.question_text}</p>
                            <p className="text-gray-500">
                              {question.exam_name} • {question.difficulty} • {question.blooms_level}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4 text-right">
                            <div>
                              <p className="text-gray-600">Marks</p>
                              <p className="font-medium">{question.obtained_marks}/{question.max_marks}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">%</p>
                              <p className={`font-medium ${getPerformanceColor(question.percentage)}`}>
                                {question.percentage.toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Weight</p>
                              <p className="font-medium">{question.weight_pct}%</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default StudentDetailedModal
