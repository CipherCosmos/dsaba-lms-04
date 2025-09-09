import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchStudentAnalytics } from '../../store/slices/analyticsSlice'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { Target, TrendingUp, AlertCircle, CheckCircle, Clock, BookOpen, Brain, Lightbulb } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const StudentProgress = () => {
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
        <p className="text-gray-500">No progress data available</p>
      </div>
    )
  }

  // Generate recommendations based on performance
  const generateRecommendations = () => {
    const recommendations = []
    
    // CO-based recommendations
    Object.entries(studentAnalytics.co_attainment).forEach(([co, attainment]) => {
      if (attainment < 60) {
        recommendations.push({
          type: 'improvement',
          priority: 'high',
          title: `Strengthen ${co}`,
          description: `Your attainment in ${co} is ${attainment.toFixed(1)}%. Focus on related topics and practice more problems.`,
          action: 'Review course materials and attempt practice questions',
          icon: Brain
        })
      } else if (attainment >= 90) {
        recommendations.push({
          type: 'strength',
          priority: 'info',
          title: `Excellent in ${co}`,
          description: `Outstanding performance with ${attainment.toFixed(1)}% attainment. Consider helping peers in this area.`,
          action: 'Maintain proficiency and help others',
          icon: CheckCircle
        })
      }
    })

    // Performance trend recommendations
    if (studentAnalytics.performance_trend.length >= 2) {
      const latest = studentAnalytics.performance_trend[studentAnalytics.performance_trend.length - 1]
      const previous = studentAnalytics.performance_trend[studentAnalytics.performance_trend.length - 2]
      
      if (latest.percentage < previous.percentage) {
        recommendations.push({
          type: 'alert',
          priority: 'high',
          title: 'Performance Decline',
          description: `Your performance dropped from ${previous.percentage.toFixed(1)}% to ${latest.percentage.toFixed(1)}%.`,
          action: 'Review recent topics and seek help if needed',
          icon: TrendingUp
        })
      } else if (latest.percentage > previous.percentage + 5) {
        recommendations.push({
          type: 'improvement',
          priority: 'medium',
          title: 'Great Progress!',
          description: `You improved from ${previous.percentage.toFixed(1)}% to ${latest.percentage.toFixed(1)}%.`,
          action: 'Keep up the excellent work and maintain momentum',
          icon: TrendingUp
        })
      }
    }

    // Rank-based recommendations
    if (studentAnalytics.rank > 10) {
      recommendations.push({
        type: 'goal',
        priority: 'medium',
        title: 'Improve Class Ranking',
        description: `Currently ranked #${studentAnalytics.rank}. With focused effort, you can climb higher.`,
        action: 'Set a goal to reach top 10 in next assessment',
        icon: Target
      })
    }

    return recommendations.slice(0, 6) // Limit to 6 recommendations
  }

  const recommendations = generateRecommendations()

  // Generate learning goals
  const generateLearningGoals = () => {
    const goals = []
    
    Object.entries(studentAnalytics.co_attainment).forEach(([co, attainment]) => {
      if (attainment < 75) {
        const targetImprovement = Math.min(90, attainment + 15)
        goals.push({
          id: co,
          title: `Improve ${co} to ${targetImprovement.toFixed(0)}%`,
          current: attainment,
          target: targetImprovement,
          progress: (attainment / targetImprovement) * 100,
          priority: attainment < 50 ? 'high' : 'medium',
          timeframe: 'Next 4 weeks'
        })
      }
    })

    // Overall performance goal
    if (studentAnalytics.percentage < 85) {
      const targetOverall = Math.min(95, studentAnalytics.percentage + 10)
      goals.push({
        id: 'overall',
        title: `Reach ${targetOverall.toFixed(0)}% Overall Performance`,
        current: studentAnalytics.percentage,
        target: targetOverall,
        progress: (studentAnalytics.percentage / targetOverall) * 100,
        priority: 'high',
        timeframe: 'End of semester'
      })
    }

    return goals.slice(0, 5) // Limit to 5 goals
  }

  const learningGoals = generateLearningGoals()

  const progressData = {
    labels: Object.keys(studentAnalytics.co_attainment),
    datasets: [
      {
        label: 'Current Attainment (%)',
        data: Object.values(studentAnalytics.co_attainment),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      },
      {
        label: 'Target (75%)',
        data: Object.keys(studentAnalytics.co_attainment).map(() => 75),
        backgroundColor: 'rgba(34, 197, 94, 0.3)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
        type: 'line' as const
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Learning Progress Tracker</h1>

      {/* Learning Goals */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Target className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">My Learning Goals</h3>
        </div>
        <div className="space-y-4">
          {learningGoals.map(goal => (
            <div key={goal.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{goal.title}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  goal.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {goal.priority} priority
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Current: {goal.current.toFixed(1)}%</span>
                <span>Target: {goal.target.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full ${
                    goal.progress >= 90 ? 'bg-green-500' :
                    goal.progress >= 70 ? 'bg-blue-500' :
                    goal.progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(goal.progress, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{goal.progress.toFixed(1)}% complete</span>
                <span>{goal.timeframe}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">CO Attainment vs Targets</h3>
        <div className="h-64">
          <Bar data={progressData} options={chartOptions} />
        </div>
      </div>

      {/* Personalized Recommendations */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">Personalized Recommendations</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec, index) => {
            const Icon = rec.icon
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  rec.type === 'improvement' ? 'bg-blue-50 border-blue-400' :
                  rec.type === 'strength' ? 'bg-green-50 border-green-400' :
                  rec.type === 'alert' ? 'bg-red-50 border-red-400' :
                  'bg-yellow-50 border-yellow-400'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${
                    rec.type === 'improvement' ? 'text-blue-500' :
                    rec.type === 'strength' ? 'text-green-500' :
                    rec.type === 'alert' ? 'text-red-500' :
                    'text-yellow-500'
                  }`} />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{rec.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                    <p className="text-sm font-medium text-gray-800">{rec.action}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Study Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Study Plan */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900">Weekly Study Plan</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(studentAnalytics.co_attainment)
              .filter(([_, attainment]) => attainment < 70)
              .slice(0, 5)
              .map(([co, attainment]) => {
                const hoursNeeded = Math.ceil((70 - attainment) / 10)
                return (
                  <div key={co} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">{co}</span>
                      <p className="text-sm text-gray-600">Current: {attainment.toFixed(1)}%</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-purple-600">{hoursNeeded}h/week</span>
                      <p className="text-xs text-gray-500">recommended</p>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Resource Recommendations */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <BookOpen className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900">Recommended Resources</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(studentAnalytics.co_attainment)
              .filter(([_, attainment]) => attainment < 75)
              .slice(0, 4)
              .map(([co, attainment]) => (
                <div key={co} className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-1">For {co} Improvement</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Review lecture notes and textbook chapters</li>
                    <li>• Attempt practice problems from question bank</li>
                    <li>• Form study groups with classmates</li>
                    <li>• Schedule office hours with instructor</li>
                  </ul>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Progress Milestones */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievement Milestones</h3>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          <div className="space-y-6">
            {[
              { milestone: 'Reach 60% in all COs', completed: Object.values(studentAnalytics.co_attainment).every(v => v >= 60) },
              { milestone: 'Achieve 75% overall performance', completed: studentAnalytics.percentage >= 75 },
              { milestone: 'Top 10 class ranking', completed: studentAnalytics.rank <= 10 },
              { milestone: 'Excellence in 3+ COs (80%+)', completed: Object.values(studentAnalytics.co_attainment).filter(v => v >= 80).length >= 3 },
              { milestone: '90% overall performance', completed: studentAnalytics.percentage >= 90 }
            ].map((item, index) => (
              <div key={index} className="relative flex items-center space-x-3">
                <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                  item.completed ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {item.completed ? (
                    <CheckCircle className="h-5 w-5 text-white" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${item.completed ? 'text-green-800' : 'text-gray-900'}`}>
                    {item.milestone}
                  </p>
                  <p className={`text-sm ${item.completed ? 'text-green-600' : 'text-gray-500'}`}>
                    {item.completed ? 'Completed! 🎉' : 'In progress...'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentProgress