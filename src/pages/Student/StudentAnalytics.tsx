import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchStudentAnalytics } from '../../store/slices/analyticsSlice'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement, RadialLinearScale } from 'chart.js'
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2'
import { TrendingUp, Award, Target, BookOpen, Star, AlertCircle, Trophy, Brain } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  RadialLinearScale
)

const StudentAnalytics = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { studentAnalytics, loading } = useSelector((state: RootState) => state.analytics)
  const { user } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchStudentAnalytics(user.id))
    }
  }, [dispatch, user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!studentAnalytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    )
  }

  const performanceTrendData = {
    labels: studentAnalytics.performance_trend.map(p => p.exam),
    datasets: [
      {
        label: 'Percentage (%)',
        data: studentAnalytics.performance_trend.map(p => p.percentage),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        tension: 0.4
      }
    ]
  }

  const coAttainmentData = {
    labels: Object.keys(studentAnalytics.co_attainment),
    datasets: [
      {
        label: 'CO Attainment (%)',
        data: Object.values(studentAnalytics.co_attainment),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2
      }
    ]
  }

  const poAttainmentData = {
    labels: Object.keys(studentAnalytics.po_attainment),
    datasets: [
      {
        label: 'PO Attainment',
        data: Object.values(studentAnalytics.po_attainment),
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(139, 92, 246, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(139, 92, 246, 1)'
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

  const radarOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      r: {
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

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 85) return 'text-green-600'
    if (percentage >= 70) return 'text-blue-600'
    if (percentage >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceBg = (percentage: number) => {
    if (percentage >= 85) return 'bg-green-100'
    if (percentage >= 70) return 'bg-blue-100'
    if (percentage >= 50) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const getGradeFromPercentage = (percentage: number) => {
    if (percentage >= 90) return 'A+'
    if (percentage >= 80) return 'A'
    if (percentage >= 70) return 'B+'
    if (percentage >= 60) return 'B'
    if (percentage >= 50) return 'C'
    return 'F'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Academic Analytics</h1>
        <div className="flex items-center space-x-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <span className="text-lg font-semibold text-gray-900">Rank #{studentAnalytics.rank}</span>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${getPerformanceBg(studentAnalytics.percentage)}`}>
              <TrendingUp className={`h-6 w-6 ${getPerformanceColor(studentAnalytics.percentage)}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overall Percentage</p>
              <p className={`text-2xl font-semibold ${getPerformanceColor(studentAnalytics.percentage)}`}>
                {studentAnalytics.percentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Current Grade</p>
              <p className="text-2xl font-semibold text-gray-900">
                {getGradeFromPercentage(studentAnalytics.percentage)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Trophy className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Class Rank</p>
              <p className="text-2xl font-semibold text-gray-900">
                #{studentAnalytics.rank}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Marks</p>
              <p className="text-2xl font-semibold text-gray-900">
                {studentAnalytics.total_marks}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Trend */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h3>
        <div className="h-64">
          <Line data={performanceTrendData} options={chartOptions} />
        </div>
      </div>

      {/* CO and PO Attainment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Outcomes (CO) Attainment</h3>
          <div className="h-64">
            <Doughnut data={coAttainmentData} options={doughnutOptions} />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Program Outcomes (PO) Attainment</h3>
          <div className="h-64">
            <Radar data={poAttainmentData} options={radarOptions} />
          </div>
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievement Badges</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {studentAnalytics.percentage >= 90 && (
            <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
              <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-yellow-800">Excellence Award</p>
              <p className="text-xs text-yellow-600">90%+ Overall</p>
            </div>
          )}
          
          {Object.values(studentAnalytics.co_attainment).filter(v => v >= 80).length >= 3 && (
            <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <Star className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800">CO Champion</p>
              <p className="text-xs text-green-600">3+ COs Above 80%</p>
            </div>
          )}
          
          {studentAnalytics.rank <= 3 && (
            <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
              <Award className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-purple-800">Top Performer</p>
              <p className="text-xs text-purple-600">Top 3 in Class</p>
            </div>
          )}
          
          {studentAnalytics.performance_trend.length >= 2 && 
           studentAnalytics.performance_trend[studentAnalytics.performance_trend.length - 1].percentage > 
           studentAnalytics.performance_trend[0].percentage && (
            <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-800">Rising Star</p>
              <p className="text-xs text-blue-600">Consistent Improvement</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentAnalytics