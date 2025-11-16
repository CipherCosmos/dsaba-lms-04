import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchStudentAnalytics } from '../../store/slices/analyticsSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchExams } from '../../store/slices/examSlice'
import { dashboardAPI } from '../../services/api'
import { logger } from '../../core/utils/logger'
import { useExamSubjectAssignments } from '../../core/hooks/useSubjectAssignments'
import { TrendingUp, Award, Target, BookOpen, Star, Trophy, Brain, Calendar, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

const StudentDashboard = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { studentAnalytics, loading } = useSelector((state: RootState) => state.analytics)
  const { user } = useSelector((state: RootState) => state.auth)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { exams } = useSelector((state: RootState) => state.exams)
  
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true)
      const response = await dashboardAPI.getStats()
      setDashboardStats(response)
    } catch (error) {
      logger.error('Error fetching student dashboard stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchStudentAnalytics(user.id))
      fetchDashboardStats()
    }
    dispatch(fetchSubjects())
    dispatch(fetchExams())
  }, [dispatch, user])

  // Get student's class subjects
  const classSubjects = subjects.filter(s => s.class_id === user?.class_id)
  
  // Get subject assignments for exams
  const { getSubjectForExam, getClassIdForExam } = useExamSubjectAssignments(exams)
  
  // Get upcoming exams - use backend data if available, otherwise filter from exams
  const upcomingExams = dashboardStats?.statistics?.upcoming_exams_list?.length > 0
    ? dashboardStats.statistics.upcoming_exams_list.slice(0, 3).map((exam: any) => ({
        id: exam.id,
        name: exam.name,
        exam_date: exam.exam_date,
        total_marks: exam.total_marks
      }))
    : exams.filter(exam => {
        const examClassId = getClassIdForExam(exam)
        const examSubject = getSubjectForExam(exam)
        return examClassId === user?.class_id && 
               examSubject && 
               exam.exam_date && 
               new Date(exam.exam_date) > new Date()
      }).slice(0, 3)

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

  const studentStats = [
    {
      name: 'Overall Percentage',
      value: dashboardStats?.statistics?.average_performance 
        ? `${dashboardStats.statistics.average_performance.toFixed(1)}%` 
        : studentAnalytics?.percentage 
        ? `${studentAnalytics.percentage.toFixed(1)}%` 
        : 'N/A',
      icon: TrendingUp,
      color: dashboardStats?.statistics?.average_performance 
        ? getPerformanceBg(dashboardStats.statistics.average_performance) 
        : studentAnalytics ? getPerformanceBg(studentAnalytics.percentage) : 'bg-gray-100',
      trend: 'Current semester',
      href: '/student/analytics'
    },
    {
      name: 'Exams Taken',
      value: dashboardStats?.statistics?.total_exams_taken || 0,
      icon: CheckCircle,
      color: 'bg-green-100',
      trend: `${dashboardStats?.statistics?.upcoming_exams || 0} upcoming`,
      href: '/student/exams'
    },
    {
      name: 'Class Rank',
      value: studentAnalytics ? `#${studentAnalytics.rank}` : 'N/A',
      icon: Trophy,
      color: 'bg-yellow-100',
      trend: 'Out of classmates',
      href: '/student/progress'
    },
    {
      name: 'Subjects Enrolled',
      value: dashboardStats?.statistics?.total_subjects || classSubjects.length,
      icon: BookOpen,
      color: 'bg-blue-100',
      trend: `${dashboardStats?.statistics?.total_subjects || classSubjects.length} enrolled`,
      href: '/student/subjects'
    },
  ]

  const recentPerformance = studentAnalytics?.performance_trend?.slice(-4) || []

  const quickActions = [
    { name: 'View Analytics', icon: TrendingUp, href: '/student/analytics', color: 'bg-blue-500' },
    { name: 'Track Progress', icon: Target, href: '/student/progress', color: 'bg-green-500' },
    { name: 'Study Plan', icon: Brain, href: '/student/study-plan', color: 'bg-purple-500' },
    { name: 'Exam Schedule', icon: Calendar, href: '/student/exams', color: 'bg-orange-500' },
  ]

  // Calculate study reminders based on real upcoming exams and performance
  const studyReminders = React.useMemo(() => {
    const reminders: Array<{subject: string, message: string, priority: string, task: string, dueDate: string}> = []
    
    // Generate reminders based on upcoming exams
    upcomingExams.forEach(exam => {
      const subject = getSubjectForExam(exam)
      if (subject) {
        const examDate = new Date(exam.exam_date || exam.created_at)
        const daysUntil = Math.ceil((examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        
        let priority = 'medium'
        let task = 'Prepare for exam'
        
        if (daysUntil <= 2) {
          priority = 'high'
          task = 'Final exam preparation'
        } else if (daysUntil <= 5) {
          priority = 'high'
          task = 'Intensive study session'
        } else {
          task = 'Start exam preparation'
        }
        
        reminders.push({
          subject: subject.name,
          message: `Study for ${exam.name}`,
          task: task,
          priority: priority,
          dueDate: daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`
        })
      }
    })
    
    // Add performance-based reminders for struggling subjects
    if (studentAnalytics?.co_attainment) {
      Object.entries(studentAnalytics.co_attainment).forEach(([co, percentage]) => {
        if (percentage < 60) {
          const subject = classSubjects.find(s => s.name.toLowerCase().includes(co.toLowerCase()) || 
            co.toLowerCase().includes(s.name.toLowerCase()))
          
          if (subject && !reminders.some(r => r.subject === subject.name)) {
            reminders.push({
              subject: subject.name,
              message: 'Focus on weak areas to improve performance',
              task: 'Focus on weak areas',
              priority: 'high',
              dueDate: 'This week'
            })
          }
        }
      })
    }
    
    return reminders.slice(0, 3) // Limit to 3 reminders
  }, [upcomingExams, classSubjects, studentAnalytics, getSubjectForExam])

  const achievements = []
  if (studentAnalytics) {
    if (studentAnalytics.percentage >= 90) {
      achievements.push({ name: 'Excellence Award', description: '90%+ Overall', icon: Trophy, color: 'text-yellow-500' })
    }
    if (Object.values(studentAnalytics.co_attainment).filter(v => v >= 80).length >= 3) {
      achievements.push({ name: 'CO Champion', description: '3+ COs Above 80%', icon: Star, color: 'text-green-500' })
    }
    if (studentAnalytics.rank <= 3) {
      achievements.push({ name: 'Top Performer', description: 'Top 3 in Class', icon: Award, color: 'text-purple-500' })
    }
    if (studentAnalytics.performance_trend.length >= 2) {
      const latest = studentAnalytics.performance_trend[studentAnalytics.performance_trend.length - 1]
      const previous = studentAnalytics.performance_trend[0]
      if (latest.percentage > previous.percentage) {
        achievements.push({ name: 'Rising Star', description: 'Consistent Improvement', icon: TrendingUp, color: 'text-blue-500' })
      }
    }
  }

  if (loading && !studentAnalytics) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.first_name}!</h1>
          <p className="text-gray-600">Track your academic progress and stay motivated</p>
        </div>
        {studentAnalytics && (
          <div className="text-right">
            <p className="text-sm text-gray-500">Current Rank</p>
            <p className="text-2xl font-bold text-yellow-600">#{studentAnalytics.rank}</p>
          </div>
        )}
      </div>

      {/* Student Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {studentStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.name} to={stat.href} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className={`h-6 w-6 ${
                    stat.name === 'Overall Percentage' && studentAnalytics ? 
                    getPerformanceColor(studentAnalytics.percentage) : 'text-gray-600'
                  }`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">{stat.trend}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Trend */}
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Performance</h3>
          {(dashboardStats?.statistics?.recent_results?.length > 0 || recentPerformance.length > 0) ? (
            <div className="space-y-3">
              {(dashboardStats?.statistics?.recent_results || recentPerformance).map((performance: any, index: number) => {
                const percentage = performance.percentage || (performance.marks_obtained && performance.total_marks 
                  ? (performance.marks_obtained / performance.total_marks * 100) 
                  : 0)
                const examName = performance.exam_name || performance.exam
                return (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{examName}</p>
                      {performance.exam_date && (
                        <p className="text-xs text-gray-500">{new Date(performance.exam_date).toLocaleDateString()}</p>
                      )}
                      <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${
                            percentage >= 80 ? 'bg-green-500' :
                            percentage >= 70 ? 'bg-blue-500' :
                            percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-semibold">{percentage.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">{getGradeFromPercentage(percentage)}</p>
                      {performance.marks_obtained && performance.total_marks && (
                        <p className="text-xs text-gray-400">{performance.marks_obtained}/{performance.total_marks}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No exam results available yet</p>
              <p className="text-sm">Your performance will appear here after exams</p>
            </div>
          )}
        </div>

        {/* Upcoming Exams */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Exams</h3>
          {upcomingExams.length > 0 ? (
            <div className="space-y-3">
              {upcomingExams.map((exam: any, index: number) => {
                const subject = exam.id ? getSubjectForExam(exams.find((e: any) => e.id === exam.id) || exam) : getSubjectForExam(exam)
                return (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium text-gray-900">{exam.name}</p>
                    <p className="text-sm text-gray-600">{subject?.name || 'Unknown Subject'}</p>
                    <p className="text-xs text-blue-600">
                      {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : 'TBD'}
                    </p>
                    {exam.total_marks && (
                      <p className="text-xs text-gray-500 mt-1">Total Marks: {exam.total_marks}</p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No upcoming exams</p>
            </div>
          )}
        </div>
      </div>

      {/* Study Reminders */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Reminders</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {studyReminders.map((reminder, index) => (
            <div key={index} className={`p-4 rounded-lg border-l-4 ${
              reminder.priority === 'high' ? 'bg-red-50 border-red-400' :
              'bg-yellow-50 border-yellow-400'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900">{reminder.subject}</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  reminder.priority === 'high' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {reminder.priority}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{reminder.task}</p>
              <p className="text-xs text-gray-500">Due: {reminder.dueDate}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.name}
                  to={action.href}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                >
                  <div className={`${action.color} p-2 rounded-lg w-fit mx-auto mb-2`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm font-medium">{action.name}</p>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Achievements */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>
          {achievements.length > 0 ? (
            <div className="space-y-3">
              {achievements.map((achievement, index) => {
                const Icon = achievement.icon
                return (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Icon className={`h-6 w-6 ${achievement.color}`} />
                    <div>
                      <p className="font-medium text-gray-900">{achievement.name}</p>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Star className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Achievements will appear here</p>
              <p className="text-xs">Keep studying to unlock badges!</p>
            </div>
          )}
        </div>
      </div>

      {/* Motivation Section */}
      <div className="card bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Stay Motivated!</h3>
            <p className="text-gray-600 mt-1">
              {studentAnalytics && studentAnalytics.percentage >= 80 
                ? "Excellent work! Keep up the great performance."
                : studentAnalytics && studentAnalytics.percentage >= 60
                ? "Good progress! A little more effort will get you to excellence."
                : "Every expert was once a beginner. Keep pushing forward!"
              }
            </p>
            {studentAnalytics && studentAnalytics.rank <= 5 && (
              <p className="text-sm text-blue-600 mt-2">🎉 You're in the top 5 of your class!</p>
            )}
          </div>
          <div className="hidden md:block">
            <Brain className="h-16 w-16 text-blue-400" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard