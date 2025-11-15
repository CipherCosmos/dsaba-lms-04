import { useState, useEffect, useMemo } from 'react'
import { logger } from '../../core/utils/logger'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchStudentAnalytics } from '../../store/slices/analyticsSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchExams } from '../../store/slices/examSlice'
import { studentProgressAPI } from '../../services/api'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import { Target, TrendingUp, Award, Calendar, BookOpen, CheckCircle, AlertTriangle, Star, Clock, Trophy } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const StudentProgress = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { studentAnalytics, loading } = useSelector((state: RootState) => state.analytics)
  const { user } = useSelector((state: RootState) => state.auth)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { exams } = useSelector((state: RootState) => state.exams)

  const [progressLoading, setProgressLoading] = useState(false)
  const [progressError, setProgressError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchStudentAnalytics(user.id))
      fetchProgressData(user.id)
    }
    dispatch(fetchSubjects())
    dispatch(fetchExams())
  }, [dispatch, user])

  const fetchProgressData = async (studentId: number) => {
    try {
      setProgressLoading(true)
      setProgressError(null)
      await studentProgressAPI.getProgress(studentId)
      // Progress data is now in studentAnalytics from Redux
    } catch (error) {
      logger.error('Error fetching progress data:', error)
      setProgressError('Failed to load progress data')
    } finally {
      setProgressLoading(false)
    }
  }

  // Generate goals dynamically from analytics data
  const goals = useMemo(() => {
    if (!studentAnalytics) return []
    
    return [
      {
        id: 1,
        title: 'Achieve 85% overall',
        target: 85,
        current_value: studentAnalytics.percentage || 0,
        description: 'Maintain overall average above 85%'
      },
      {
        id: 2,
        title: 'Top 5 in class',
        target: 100,
        current_value: studentAnalytics.rank && studentAnalytics.rank <= 5 ? 100 : 0,
        description: 'Rank in top 5 students'
      },
      {
        id: 3,
        title: 'All COs above 70%',
        target: 100,
        current_value: (() => {
          const coScores = Object.values(studentAnalytics.co_attainment || {})
          return coScores.length > 0 ? (coScores.filter((score: any) => score >= 70).length / coScores.length) * 100 : 0
        })(),
        description: 'Attain all course outcomes above 70%'
      }
    ]
  }, [studentAnalytics])

  // Generate milestones dynamically from analytics data
  const milestones = useMemo(() => {
    if (!studentAnalytics) return []
    
    const performanceTrend = studentAnalytics.performance_trend || []
    const coAttainment = studentAnalytics.co_attainment || {}
    const rank = studentAnalytics.rank || 999
    
    return [
      {
        id: 1,
        title: 'First A+ Grade',
        description: 'Achieve 90% or above in any exam',
        achieved: performanceTrend.some((p: any) => p.percentage >= 90),
        achieved_date: performanceTrend.find((p: any) => p.percentage >= 90) ? new Date().toISOString() : null
      },
      {
        id: 2,
        title: 'Consistent Performer',
        description: 'Maintain 80%+ in last 3 exams',
        achieved: performanceTrend.length >= 3 && performanceTrend.slice(-3).every((p: any) => p.percentage >= 80),
        achieved_date: performanceTrend.length >= 3 && performanceTrend.slice(-3).every((p: any) => p.percentage >= 80) 
          ? new Date().toISOString()
          : null
      },
      {
        id: 3,
        title: 'Subject Expert',
        description: 'Achieve 95% or above',
        achieved: performanceTrend.some((p: any) => p.percentage >= 95),
        achieved_date: performanceTrend.find((p: any) => p.percentage >= 95) ? new Date().toISOString() : null
      },
      {
        id: 4,
        title: 'Class Leader',
        description: 'Rank in top 3',
        achieved: rank <= 3,
        achieved_date: rank <= 3 ? new Date().toISOString() : null
      },
      {
        id: 5,
        title: 'CO Champion',
        description: 'All COs above 80%',
        achieved: Object.values(coAttainment).length > 0 && Object.values(coAttainment).every((score: any) => score >= 80),
        achieved_date: Object.values(coAttainment).length > 0 && Object.values(coAttainment).every((score: any) => score >= 80)
          ? new Date().toISOString()
          : null
      }
    ]
  }, [studentAnalytics])


  if (loading || progressLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (progressError) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-300 mx-auto mb-3" />
        <p className="text-red-500 mb-2">Error loading progress data</p>
        <p className="text-sm text-gray-400">{progressError}</p>
        <button 
          onClick={() => user?.id && fetchProgressData(user.id)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!studentAnalytics) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No progress data available</p>
        <p className="text-sm text-gray-400">Complete some exams to track your progress</p>
      </div>
    )
  }

  // Progress over time chart
  const progressData = {
    labels: studentAnalytics.performance_trend.map((_, index) => `Exam ${index + 1}`),
    datasets: [
      {
        label: 'Your Progress (%)',
        data: studentAnalytics.performance_trend.map(p => p.percentage),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Target (80%)',
        data: new Array(studentAnalytics.performance_trend.length).fill(80),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderDash: [5, 5],
        tension: 0,
        fill: false
      }
    ]
  }

  // Goal completion chart
  const goalCompletionData = {
    labels: ['Completed', 'In Progress', 'Not Started'],
    datasets: [
      {
        data: [
          goals.filter(g => g.current_value >= g.target).length,
          goals.filter(g => g.current_value > 0 && g.current_value < g.target).length,
          goals.filter(g => g.current_value === 0).length
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(156, 163, 175, 0.8)'
        ]
      }
    ]
  }

  const achievedMilestones = milestones.filter(m => m.achieved).length
  const totalMilestones = milestones.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress Tracking</h1>
          <p className="text-gray-600">Monitor your academic journey and achievements</p>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Current Average</p>
              <p className="text-2xl font-semibold text-gray-900">
                {studentAnalytics.percentage.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center space-x-1">
              {studentAnalytics.performance_trend.length >= 2 && (
                <>
                  {studentAnalytics.performance_trend[studentAnalytics.performance_trend.length - 1].percentage > 
                   studentAnalytics.performance_trend[studentAnalytics.performance_trend.length - 2].percentage ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />
                  )}
                  <span className={`text-sm ${
                    studentAnalytics.performance_trend[studentAnalytics.performance_trend.length - 1].percentage > 
                    studentAnalytics.performance_trend[studentAnalytics.performance_trend.length - 2].percentage ? 
                    'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.abs(
                      studentAnalytics.performance_trend[studentAnalytics.performance_trend.length - 1].percentage - 
                      studentAnalytics.performance_trend[studentAnalytics.performance_trend.length - 2].percentage
                    ).toFixed(1)}% vs last exam
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Target className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Goals Progress</p>
              <p className="text-2xl font-semibold text-gray-900">
                {goals.filter(g => g.current_value >= g.target).length}/{goals.length}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              {((goals.filter(g => g.current_value >= g.target).length / goals.length) * 100).toFixed(0)}% completed
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Award className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Milestones</p>
              <p className="text-2xl font-semibold text-gray-900">
                {achievedMilestones}/{totalMilestones}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              {((achievedMilestones / totalMilestones) * 100).toFixed(0)}% unlocked
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Trophy className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Class Position</p>
              <p className="text-2xl font-semibold text-gray-900">
                #{studentAnalytics.rank}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              {studentAnalytics.rank <= 5 ? '🏆 Top 5!' : 'Keep climbing!'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h3>
          <div className="h-64">
            <Line 
              data={progressData} 
              options={{
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
                    max: 100
                  }
                }
              }} 
            />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Goal Completion Status</h3>
          <div className="h-64">
            <Doughnut 
              data={goalCompletionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Goals Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Goals</h3>
        <div className="space-y-4">
          {goals.map(goal => {
            const progressPercent = Math.min((goal.current_value / goal.target) * 100, 100)
            const isCompleted = goal.current_value >= goal.target
            
            return (
              <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Target className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{goal.title}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Target: {goal.target}{goal.title.includes('%') ? '%' : ''}</span>
                        <span>Current: {goal.current_value.toFixed(1)}{goal.title.includes('%') ? '%' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isCompleted ? 'bg-green-100 text-green-800' :
                    progressPercent >= 70 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {isCompleted ? 'Completed' : `${progressPercent.toFixed(0)}%`}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isCompleted ? 'bg-green-500' :
                      progressPercent >= 70 ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Milestones */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievement Milestones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {milestones.map(milestone => (
            <div key={milestone.id} className={`border-2 rounded-lg p-4 transition-all ${
              milestone.achieved 
                ? 'border-green-200 bg-green-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}>
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  milestone.achieved ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {milestone.achieved ? (
                    <Star className="h-5 w-5 text-green-600" />
                  ) : (
                    <Star className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${
                    milestone.achieved ? 'text-green-900' : 'text-gray-900'
                  }`}>
                    {milestone.title}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    milestone.achieved ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {milestone.description}
                  </p>
                  {milestone.achieved && milestone.achieved_date && (
                    <div className="flex items-center space-x-1 mt-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-600">
                        Achieved on {new Date(milestone.achieved_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Study Plan Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Plan Recommendations</h3>
          <div className="space-y-3">
            {studentAnalytics.percentage >= 85 ? (
              <>
                <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Maintain Excellence</p>
                    <p className="text-xs text-green-700">Continue current study methods. Consider peer tutoring.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Advanced Learning</p>
                    <p className="text-xs text-blue-700">Explore additional projects and research opportunities.</p>
                  </div>
                </div>
              </>
            ) : studentAnalytics.percentage >= 70 ? (
              <>
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Target className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Push for Excellence</p>
                    <p className="text-xs text-yellow-700">Focus on consistency. Review weak topics regularly.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Time Management</p>
                    <p className="text-xs text-blue-700">Allocate more time to challenging subjects.</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Focus Required</p>
                    <p className="text-xs text-red-700">Immediate attention needed. Consider remedial sessions.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <BookOpen className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-900">Back to Basics</p>
                    <p className="text-xs text-orange-700">Review fundamental concepts before moving to advanced topics.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibant text-gray-900 mb-4">Next Steps</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="bg-blue-100 p-1 rounded">
                <span className="text-blue-600 font-bold text-sm">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Review weak COs</p>
                <p className="text-xs text-blue-700">Focus on course outcomes below 60%</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="bg-purple-100 p-1 rounded">
                <span className="text-purple-600 font-bold text-sm">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-purple-900">Practice regularly</p>
                <p className="text-xs text-purple-700">Daily problem-solving in weak areas</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="bg-green-100 p-1 rounded">
                <span className="text-green-600 font-bold text-sm">3</span>
              </div>
              <div>
                <p className="text-sm font-medium text-green-900">Set mini-goals</p>
                <p className="text-xs text-green-700">Weekly targets for improvement</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentProgress