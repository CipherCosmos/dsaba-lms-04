import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchHODAnalytics } from '../../store/slices/analyticsSlice'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { Users, BookOpen, GraduationCap, TrendingUp, Award, AlertTriangle, Target, BarChart3 } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
)

const HODAnalytics = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { hodAnalytics, loading } = useSelector((state: RootState) => state.analytics)
  const { user } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (user?.department_id) {
      dispatch(fetchHODAnalytics(user.department_id))
    }
  }, [dispatch, user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!hodAnalytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    )
  }

  const subjectPerformanceData = {
    labels: hodAnalytics.subject_performance.map(s => s.subject_name),
    datasets: [
      {
        label: 'Average Percentage',
        data: hodAnalytics.subject_performance.map(s => s.average_percentage),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      },
      {
        label: 'Pass Rate (%)',
        data: hodAnalytics.subject_performance.map(s => s.pass_rate),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1
      }
    ]
  }

  const teacherPerformanceData = {
    labels: hodAnalytics.teacher_performance.map(t => t.teacher_name.split(' ').map(n => n[0]).join('.')),
    datasets: [
      {
        label: 'Average Class Performance',
        data: hodAnalytics.teacher_performance.map(t => t.average_class_performance),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1
      }
    ]
  }

  const departmentOverviewData = {
    labels: ['Students', 'Teachers', 'Subjects'],
    datasets: [
      {
        data: [
          hodAnalytics.department_overview.total_students,
          hodAnalytics.department_overview.total_teachers,
          hodAnalytics.department_overview.total_subjects
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)'
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(245, 158, 11, 1)'
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
        beginAtZero: true
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
      <h1 className="text-2xl font-bold text-gray-900">Department Analytics Dashboard</h1>

      {/* Department Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900">
                {hodAnalytics.department_overview.total_students}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Teachers</p>
              <p className="text-2xl font-semibold text-gray-900">
                {hodAnalytics.department_overview.total_teachers}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <BookOpen className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Subjects</p>
              <p className="text-2xl font-semibold text-gray-900">
                {hodAnalytics.department_overview.total_subjects}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Performance</p>
              <p className="text-2xl font-semibold text-gray-900">
                {hodAnalytics.department_overview.average_performance.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Composition */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Composition</h3>
          <div className="h-64">
            <Doughnut data={departmentOverviewData} options={doughnutOptions} />
          </div>
        </div>

        {/* Teacher Performance Overview */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Teacher Performance Overview</h3>
          <div className="h-64">
            <Bar data={teacherPerformanceData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Subject Performance Analysis */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance Analysis</h3>
        <div className="h-64">
          <Bar data={subjectPerformanceData} options={chartOptions} />
        </div>
      </div>

      {/* Detailed Subject Performance */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Subject</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Average %</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Pass Rate</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Performance Level</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Action Required</th>
              </tr>
            </thead>
            <tbody>
              {hodAnalytics.subject_performance.map((subject, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">{subject.subject_name}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-semibold ${
                      subject.average_percentage >= 80 ? 'text-green-600' :
                      subject.average_percentage >= 70 ? 'text-blue-600' :
                      subject.average_percentage >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {subject.average_percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-semibold ${
                      subject.pass_rate >= 90 ? 'text-green-600' :
                      subject.pass_rate >= 80 ? 'text-blue-600' :
                      subject.pass_rate >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {subject.pass_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      subject.average_percentage >= 80 ? 'bg-green-100 text-green-800' :
                      subject.average_percentage >= 70 ? 'bg-blue-100 text-blue-800' :
                      subject.average_percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {subject.average_percentage >= 80 ? 'Excellent' :
                       subject.average_percentage >= 70 ? 'Good' :
                       subject.average_percentage >= 60 ? 'Average' : 'Needs Attention'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {subject.average_percentage < 60 || subject.pass_rate < 70 ? (
                      <span className="flex items-center justify-center text-red-600">
                        <AlertTriangle size={16} className="mr-1" />
                        Immediate
                      </span>
                    ) : subject.average_percentage < 75 ? (
                      <span className="flex items-center justify-center text-yellow-600">
                        <Target size={16} className="mr-1" />
                        Monitor
                      </span>
                    ) : (
                      <span className="flex items-center justify-center text-green-600">
                        <Award size={16} className="mr-1" />
                        Maintain
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teacher Performance Details */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Faculty Performance Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hodAnalytics.teacher_performance.map((teacher, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{teacher.teacher_name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  teacher.average_class_performance >= 80 ? 'bg-green-100 text-green-800' :
                  teacher.average_class_performance >= 70 ? 'bg-blue-100 text-blue-800' :
                  teacher.average_class_performance >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {teacher.average_class_performance >= 80 ? 'Excellent' :
                   teacher.average_class_performance >= 70 ? 'Good' :
                   teacher.average_class_performance >= 60 ? 'Average' : 'Needs Support'}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subjects:</span>
                  <span className="font-medium">{teacher.subjects_taught}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Performance:</span>
                  <span className="font-medium">{teacher.average_class_performance.toFixed(1)}%</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      teacher.average_class_performance >= 80 ? 'bg-green-500' :
                      teacher.average_class_performance >= 70 ? 'bg-blue-500' :
                      teacher.average_class_performance >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(teacher.average_class_performance, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategic Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Achievements */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Award className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900">Department Achievements</h3>
          </div>
          <div className="space-y-3">
            {hodAnalytics.department_overview.average_performance >= 75 && (
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <BarChart3 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Excellent Department Performance</p>
                  <p className="text-sm text-green-600">Overall average above 75%</p>
                </div>
              </div>
            )}
            
            {hodAnalytics.subject_performance.filter(s => s.average_percentage >= 80).length > 0 && (
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <BookOpen className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">High-Performing Subjects</p>
                  <p className="text-sm text-green-600">
                    {hodAnalytics.subject_performance.filter(s => s.average_percentage >= 80).length} subjects above 80%
                  </p>
                </div>
              </div>
            )}

            {hodAnalytics.teacher_performance.filter(t => t.average_class_performance >= 85).length > 0 && (
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Outstanding Faculty</p>
                  <p className="text-sm text-green-600">
                    {hodAnalytics.teacher_performance.filter(t => t.average_class_performance >= 85).length} teachers with excellent results
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Items */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Action Required</h3>
          </div>
          <div className="space-y-3">
            {hodAnalytics.subject_performance.filter(s => s.average_percentage < 60).map((subject, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">{subject.subject_name}</p>
                  <p className="text-sm text-red-600">Critical performance level - immediate intervention needed</p>
                </div>
              </div>
            ))}

            {hodAnalytics.teacher_performance.filter(t => t.average_class_performance < 65).map((teacher, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                <Users className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">{teacher.teacher_name}</p>
                  <p className="text-sm text-yellow-600">May benefit from additional support and training</p>
                </div>
              </div>
            ))}

            {hodAnalytics.department_overview.average_performance < 65 && (
              <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Department Performance Review</p>
                  <p className="text-sm text-red-600">Overall performance below expectations - strategic review needed</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HODAnalytics