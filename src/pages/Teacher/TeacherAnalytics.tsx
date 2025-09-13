import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchTeacherAnalytics } from '../../store/slices/analyticsSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { TrendingUp, AlertTriangle, CheckCircle, BookOpen, Award } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const TeacherAnalytics = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { teacherAnalytics, loading } = useSelector((state: RootState) => state.analytics)
  const { user } = useSelector((state: RootState) => state.auth)
  const { subjects } = useSelector((state: RootState) => state.subjects)

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchTeacherAnalytics(user.id))
    }
    dispatch(fetchSubjects())
  }, [dispatch, user])

  const teacherSubjects = subjects.filter(s => s.teacher_id === user?.id)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!teacherAnalytics) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No analytics data available</p>
        <p className="text-sm text-gray-400">Configure exams and enter marks to see analytics</p>
      </div>
    )
  }

  const performanceData = {
    labels: ['Average Performance', 'Pass Rate', 'Top Performers', 'At Risk'],
    datasets: [
      {
        label: 'Class Statistics',
        data: [
          teacherAnalytics.class_performance.average_percentage,
          teacherAnalytics.class_performance.pass_rate,
          teacherAnalytics.class_performance.top_performers,
          teacherAnalytics.class_performance.at_risk_students
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 1
      }
    ]
  }

  const coAttainmentData = {
    labels: Object.keys(teacherAnalytics.co_po_attainment.co_attainment),
    datasets: [
      {
        data: Object.values(teacherAnalytics.co_po_attainment.co_attainment),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(6, 182, 212, 0.8)'
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(6, 182, 212, 1)'
        ],
        borderWidth: 2
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    }
  }

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Teaching Analytics</h1>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Performance</p>
              <p className="text-2xl font-semibold text-gray-900">
                {teacherAnalytics.class_performance.average_percentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pass Rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {teacherAnalytics.class_performance.pass_rate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Top Performers</p>
              <p className="text-2xl font-semibold text-gray-900">
                {teacherAnalytics.class_performance.top_performers}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">At Risk Students</p>
              <p className="text-2xl font-semibold text-gray-900">
                {teacherAnalytics.class_performance.at_risk_students}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Performance Overview</h3>
          <div className="h-64">
            <Bar data={performanceData} options={chartOptions} />
          </div>
        </div>

        {Object.keys(teacherAnalytics.co_po_attainment.co_attainment).length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">CO Attainment</h3>
            <div className="h-64">
              <Doughnut data={coAttainmentData} options={doughnutOptions} />
            </div>
          </div>
        )}
      </div>

      {/* Question Analysis */}
      {teacherAnalytics.question_analysis.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Question-wise Analysis</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Question</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Max Marks</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Avg Marks</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Success Rate</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Attempt Rate</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Difficulty</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Section</th>
                </tr>
              </thead>
              <tbody>
                {teacherAnalytics.question_analysis.map((question, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      Q{question.question_id}
                    </td>
                    <td className="py-3 px-4 text-center">10</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-semibold ${
                        (question.average_marks / 10) >= 0.7 ? 'text-green-600' :
                        (question.average_marks / 10) >= 0.5 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {question.average_marks}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-semibold ${
                        question.success_rate >= 70 ? 'text-green-600' :
                        question.success_rate >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {question.success_rate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold">{question.attempt_rate}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        question.success_rate >= 80 ? 'bg-green-100 text-green-800' :
                        question.success_rate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {question.success_rate >= 80 ? 'Easy' : question.success_rate >= 60 ? 'Medium' : 'Hard'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                        A
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subject Breakdown */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Subjects</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teacherSubjects.map(subject => (
            <div key={subject.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{subject.name}</h4>
                  <p className="text-sm text-gray-600">{subject.code}</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Credits:</span>
                  <span className="font-medium">{subject.credits}</span>
                </div>
                {subject.cos && subject.cos.length > 0 && (
                  <div>
                    <span className="text-gray-600">COs:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {subject.cos.map((co, idx) => (
                        <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          {co}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
          <div className="space-y-3">
            {teacherAnalytics.class_performance.average_percentage >= 75 && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle size={16} />
                <span className="text-sm">Strong overall class performance</span>
              </div>
            )}
            
            {teacherAnalytics.class_performance.pass_rate >= 85 && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle size={16} />
                <span className="text-sm">Excellent pass rate achieved</span>
              </div>
            )}
            
            {teacherAnalytics.class_performance.top_performers >= 5 && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Award size={16} />
                <span className="text-sm">Good number of top performers</span>
              </div>
            )}
            
            {teacherAnalytics.class_performance.at_risk_students > 0 && (
              <div className="flex items-center space-x-2 text-amber-600">
                <AlertTriangle size={16} />
                <span className="text-sm">{teacherAnalytics.class_performance.at_risk_students} students need attention</span>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Action Items</h3>
          <div className="space-y-3">
            {teacherAnalytics.class_performance.at_risk_students > 0 && (
              <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
                <p className="text-sm font-medium text-red-800">Schedule remedial sessions</p>
                <p className="text-xs text-red-600">Focus on students below 50% performance</p>
              </div>
            )}
            
            {teacherAnalytics.question_analysis.some(q => q.success_rate < 50) && (
              <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <p className="text-sm font-medium text-yellow-800">Review difficult questions</p>
                <p className="text-xs text-yellow-600">Consider additional practice materials</p>
              </div>
            )}
            
            <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
              <p className="text-sm font-medium text-blue-800">Continue effective methods</p>
              <p className="text-xs text-blue-600">Maintain current teaching strategies</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeacherAnalytics