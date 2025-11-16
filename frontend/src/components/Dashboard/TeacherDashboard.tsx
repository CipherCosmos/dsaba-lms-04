import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchTeacherAnalytics } from '../../store/slices/analyticsSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchExams } from '../../store/slices/examSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import { dashboardAPI } from '../../services/api'
import { logger } from '../../core/utils/logger'
import { useExamSubjectAssignments } from '../../core/hooks/useSubjectAssignments'
import { ClipboardList, Users, BarChart3, AlertTriangle, CheckCircle, Clock, BookOpen, FileCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

const TeacherDashboard = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { teacherAnalytics, loading } = useSelector((state: RootState) => state.analytics)
  const { user } = useSelector((state: RootState) => state.auth)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { exams } = useSelector((state: RootState) => state.exams)
  const { users } = useSelector((state: RootState) => state.users)
  
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true)
      const response = await dashboardAPI.getStats()
      setDashboardStats(response)
    } catch (error) {
      logger.error('Error fetching teacher dashboard stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchTeacherAnalytics(user.id))
      fetchDashboardStats()
    }
    dispatch(fetchSubjects())
    dispatch(fetchExams())
    dispatch(fetchUsers())
  }, [dispatch, user])

  // Get teacher's subject assignments
  const { getSubjectForExam, getAssignmentForExam } = useExamSubjectAssignments(exams)
  
  // Get teacher's data - filter exams by subject assignments
  const teacherSubjects = subjects.filter(s => s.teacher_id === user?.id)
  const teacherExams = exams.filter(exam => {
    const assignment = getAssignmentForExam(exam)
    if (!assignment) return false
    // Check if assignment's teacher_id matches current user
    // Note: assignment.teacher_id is the teacher profile ID, we need to check via user_id
    const subject = getSubjectForExam(exam)
    return subject?.teacher_id === user?.id
  })

  // Calculate total students
  const totalStudents = teacherSubjects.reduce((total, subject) => {
    const classStudents = users.filter(u => 
      u.role === 'student' && u.class_id === subject.class_id
    ).length
    return total + classStudents
  }, 0)

  const teacherStats = [
    {
      name: 'Subjects Assigned',
      value: dashboardStats?.statistics?.subjects_assigned || teacherSubjects.length,
      icon: BookOpen,
      color: 'bg-blue-500',
      detail: `Across ${new Set(teacherSubjects.map(s => s.class_id)).size} classes`,
      href: '/teacher/subjects'
    },
    {
      name: 'Total Students',
      value: dashboardStats?.statistics?.total_students || totalStudents,
      icon: Users,
      color: 'bg-green-500',
      detail: 'Under your guidance',
      href: '/teacher/students'
    },
    {
      name: 'Pending Marks',
      value: dashboardStats?.statistics?.pending_marks_entry || dashboardStats?.statistics?.pending_internal_marks || 0,
      icon: ClipboardList,
      color: 'bg-red-500',
      detail: `${dashboardStats?.statistics?.submitted_marks_awaiting_approval || 0} submitted`,
      href: '/teacher/marks-entry'
    },
    {
      name: 'Upcoming Exams',
      value: dashboardStats?.statistics?.upcoming_exams_7d || teacherExams.filter(e => e.exam_date && new Date(e.exam_date) > new Date()).length,
      icon: Clock,
      color: 'bg-orange-500',
      detail: 'Next 7 days',
      href: '/teacher/exam-config'
    },
  ]

  // Calculate upcoming tasks based on real data
  const upcomingTasks = React.useMemo(() => {
    const tasks = []
    
    // Find upcoming exams that need grading
    const upcomingExams = teacherExams.filter(exam => {
      const examDate = new Date(exam.exam_date || exam.created_at)
      const daysUntil = Math.ceil((examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil > 0 && daysUntil <= 7
    })
    
    upcomingExams.forEach(exam => {
      const examDate = new Date(exam.exam_date || exam.created_at)
      const daysUntil = Math.ceil((examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      
      tasks.push({
        task: `Grade ${exam.name}`,
        deadline: daysUntil === 1 ? '1 day' : `${daysUntil} days`,
        priority: daysUntil <= 2 ? 'high' : 'medium',
        type: 'grading'
      })
    })
    
    // Add CO-PO mapping task if teacher has subjects
    if (teacherSubjects.length > 0) {
      tasks.push({
        task: 'Submit CO-PO mapping report',
        deadline: '5 days',
        priority: 'medium',
        type: 'report'
      })
    }
    
    // Add question bank preparation task
    if (teacherSubjects.length > 0) {
      tasks.push({
        task: 'Prepare question bank',
        deadline: '1 week',
        priority: 'medium',
        type: 'preparation'
      })
    }
    
    return tasks.slice(0, 4) // Limit to 4 tasks
  }, [teacherExams, subjects, teacherSubjects])

  // Calculate class performance based on real exam data
  const classPerformance = React.useMemo(() => {
    return teacherSubjects.map(subject => {
      const classStudents = users.filter(u => 
        u.role === 'student' && u.class_id === subject.class_id
      )
      
      // Get exams for this subject via subject assignments
      const subjectExams = teacherExams.filter(exam => {
        const examSubject = getSubjectForExam(exam)
        return examSubject?.id === subject.id
      })
      
      // Calculate average performance from actual exam data
      let averagePerformance = 0
      if (subjectExams.length > 0) {
        const totalMarks = subjectExams.reduce((sum, exam) => sum + (exam.total_marks || 0), 0)
        const maxMarks = subjectExams.reduce((sum, exam) => sum + (exam.total_marks || 0), 0)
        averagePerformance = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0
      }
      
      return {
        class: `Class ${subject.class_id}`,
        subject: subject.name,
        average: averagePerformance,
        students: classStudents.length,
        status: averagePerformance >= 85 ? 'excellent' : averagePerformance >= 75 ? 'good' : 'average'
      }
    })
  }, [teacherSubjects, users, teacherExams])

  // Calculate at-risk students based on real performance data
  const atRiskStudents = React.useMemo(() => {
    const atRisk: Array<{student: string, average: number, subjects: any[], riskLevel: string, name: string, percentage: number, class: string}> = []
    
    // Get all students in teacher's classes
    const allStudents = users.filter(u => 
      u.role === 'student' && 
      teacherSubjects.some(subject => subject.class_id === u.class_id)
    )
    
    // For each student, calculate their average performance across teacher's subjects
    allStudents.forEach(student => {
      const studentSubjects = teacherSubjects.filter(subject => subject.class_id === student.class_id)
      let totalPercentage = 0
      let subjectCount = 0
      const strugglingSubjects: Array<{name: string, performance: number}> = []
      
      studentSubjects.forEach(subject => {
        const subjectExams = teacherExams.filter(exam => {
          const examSubject = getSubjectForExam(exam)
          return examSubject?.id === subject.id
        })
        if (subjectExams.length > 0) {
          const totalMarks = subjectExams.reduce((sum, exam) => sum + (exam.total_marks || 0), 0)
          const maxMarks = subjectExams.reduce((sum, exam) => sum + (exam.total_marks || 0), 0)
          if (maxMarks > 0) {
            const percentage = (totalMarks / maxMarks) * 100
            totalPercentage += percentage
            subjectCount++
            
            if (percentage < 50) {
              strugglingSubjects.push({name: subject.name, performance: percentage})
            }
          }
        }
      })
      
      const averagePercentage = subjectCount > 0 ? totalPercentage / subjectCount : 0
      
      if (averagePercentage < 60 && strugglingSubjects.length > 0) {
        atRisk.push({
          student: `${student.first_name} ${student.last_name}`,
          name: `${student.first_name} ${student.last_name}`,
          class: `Class ${student.class_id}`,
          average: Math.round(averagePercentage),
          percentage: Math.round(averagePercentage),
          subjects: strugglingSubjects,
          riskLevel: averagePercentage < 40 ? 'high' : 'medium'
        })
      }
    })
    
    return atRisk.slice(0, 3) // Limit to 3 students
  }, [users, teacherSubjects, teacherExams, getSubjectForExam])

  if (loading && !teacherAnalytics) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Teacher Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {teacherStats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">{stat.detail}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Tasks</h3>
          <div className="space-y-3">
            {upcomingTasks.map((task, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    task.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.task}</p>
                    <p className="text-xs text-gray-600">Due in {task.deadline}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Class Performance */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Performance</h3>
          <div className="space-y-3">
            {classPerformance.slice(0, 4).map((cls, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{cls.subject}</p>
                  <p className="text-xs text-gray-600">{cls.class} • {cls.students} students</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{cls.average}%</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    cls.status === 'excellent' ? 'bg-green-100 text-green-800' :
                    cls.status === 'good' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {cls.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* At-Risk Students */}
      {teacherAnalytics?.class_performance.at_risk_students && teacherAnalytics.class_performance.at_risk_students > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Students Needing Attention</h3>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {atRiskStudents.slice(0, 3).map((student, index) => (
              <div key={index} className="border border-red-200 bg-red-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">{student.name}</p>
                  <span className="text-sm font-medium text-red-600">{student.percentage}%</span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{student.class}</p>
                <div className="space-y-1">
                  {student.subjects.map((subject, idx) => (
                    <span key={idx} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mr-1">
                      {subject}
                    </span>
                  ))}
                </div>
                <button className="mt-3 w-full text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors">
                  Schedule Mentoring
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/teacher/marks-entry" className="card text-center hover:bg-gray-50 transition-colors">
          <ClipboardList className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <p className="text-sm font-medium">Enter Marks</p>
        </Link>
        
        <Link to="/teacher/analytics" className="card text-center hover:bg-gray-50 transition-colors">
          <BarChart3 className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium">View Analytics</p>
        </Link>
        
        <Link to="/teacher/exam-config" className="card text-center hover:bg-gray-50 transition-colors">
          <CheckCircle className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <p className="text-sm font-medium">Configure Exam</p>
        </Link>
        
        <div className="card text-center hover:bg-gray-50 transition-colors cursor-pointer">
          <Users className="h-8 w-8 text-orange-500 mx-auto mb-2" />
          <p className="text-sm font-medium">Student Reports</p>
        </div>
      </div>

      {/* Teaching Insights */}
      {teacherAnalytics && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Teaching Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Achievements</h4>
              <div className="space-y-2">
                {teacherAnalytics.class_performance.average_percentage >= 75 && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle size={16} />
                    <span className="text-sm">Strong class performance</span>
                  </div>
                )}
                {teacherAnalytics.class_performance.pass_rate >= 85 && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle size={16} />
                    <span className="text-sm">High pass rate achieved</span>
                  </div>
                )}
                {teacherAnalytics.class_performance.top_performers > 0 && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle size={16} />
                    <span className="text-sm">{teacherAnalytics.class_performance.top_performers} top performers</span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Focus Areas</h4>
              <div className="space-y-2">
                {teacherAnalytics.class_performance.at_risk_students > 0 && (
                  <div className="flex items-center space-x-2 text-amber-600">
                    <AlertTriangle size={16} />
                    <span className="text-sm">Monitor at-risk students</span>
                  </div>
                )}
                {teacherAnalytics.class_performance.average_percentage < 70 && (
                  <div className="flex items-center space-x-2 text-amber-600">
                    <AlertTriangle size={16} />
                    <span className="text-sm">Improve overall class average</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-blue-600">
                  <BookOpen size={16} />
                  <span className="text-sm">Continue effective teaching methods</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherDashboard