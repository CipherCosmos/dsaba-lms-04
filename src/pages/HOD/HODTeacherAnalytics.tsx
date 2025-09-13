import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store/store'
import { fetchUsers } from '../../store/slices/userSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchClasses } from '../../store/slices/classSlice'
import { fetchExams } from '../../store/slices/examSlice'
import { Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)
import { Users, BookOpen, Award, Target, Download, Search } from 'lucide-react'

const HODTeacherAnalytics: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { users } = useSelector((state: RootState) => state.users)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { classes } = useSelector((state: RootState) => state.classes)
  const { exams } = useSelector((state: RootState) => state.exams)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null)

  useEffect(() => {
    dispatch(fetchUsers())
    dispatch(fetchSubjects())
    dispatch(fetchClasses())
    dispatch(fetchExams())
  }, [dispatch])

  // Filter data for HOD's department
  const departmentUsers = users.filter(u => u.department_id === user?.department_id)
  // Removed unused departmentClasses
  const departmentSubjects = subjects.filter(s => {
    const subjectClass = classes.find(c => c.id === s.class_id)
    return subjectClass?.department_id === user?.department_id
  })
  const departmentExams = exams.filter(e => {
    const examSubject = subjects.find(s => s.id === e.subject_id)
    const subjectClass = classes.find(c => c.id === examSubject?.class_id)
    return subjectClass?.department_id === user?.department_id
  })

  // Get teachers from department
  const teachers = departmentUsers.filter(u => u.role === 'teacher')

  // Filter teachers by search term
  const filteredTeachers = teachers.filter(teacher =>
    teacher.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate teacher performance data
  const teacherPerformanceData = filteredTeachers.map(teacher => {
    const teacherSubjects = departmentSubjects.filter(s => s.teacher_id === teacher.id)
    const teacherExams = departmentExams.filter(e => {
      const examSubject = subjects.find(s => s.id === e.subject_id)
      return examSubject?.teacher_id === teacher.id
    })

    // Calculate average performance for teacher's classes
    const classPerformance = teacherSubjects.map(subject => {
      const subjectStudents = users.filter(u => 
        u.role === 'student' && u.class_id === subject.class_id
      )
      
      const subjectExams = departmentExams.filter(e => e.subject_id === subject.id)
      
      const totalPercentage = subjectStudents.reduce((sum, _student) => {
        const studentExams = subjectExams
        const totalMarks = studentExams.reduce((s, exam) => s + (exam.total_marks || 0), 0)
        return sum + (studentExams.length > 0 ? totalMarks / studentExams.length : 0)
      }, 0)

      return subjectStudents.length > 0 ? totalPercentage / subjectStudents.length : 0
    })

    const averagePerformance = classPerformance.length > 0 
      ? classPerformance.reduce((sum, perf) => sum + perf, 0) / classPerformance.length 
      : 0

    const totalStudents = teacherSubjects.reduce((sum, subject) => {
      const subjectStudents = users.filter(u => 
        u.role === 'student' && u.class_id === subject.class_id
      )
      return sum + subjectStudents.length
    }, 0)

    return {
      name: `${teacher.first_name} ${teacher.last_name}`,
      email: teacher.email,
      subjects: teacherSubjects.length,
      students: totalStudents,
      exams: teacherExams.length,
      performance: Math.round(averagePerformance),
      status: averagePerformance >= 80 ? 'Excellent' : 
              averagePerformance >= 70 ? 'Good' : 
              averagePerformance >= 60 ? 'Average' : 'Needs Improvement'
    }
  })

  // Subject assignment data
  const subjectAssignmentData = departmentSubjects.map(subject => ({
    subject: subject.name,
    code: subject.code,
    teacher: subject.teacher_id ? 
      users.find(u => u.id === subject.teacher_id)?.first_name + ' ' + 
      users.find(u => u.id === subject.teacher_id)?.last_name : 'Unassigned',
    students: users.filter(u => u.role === 'student' && u.class_id === subject.class_id).length,
    class: classes.find(c => c.id === subject.class_id)?.name || 'Unknown'
  }))

  // Workload distribution
  const workloadData = teachers.map(teacher => {
    const teacherSubjects = departmentSubjects.filter(s => s.teacher_id === teacher.id)
    const totalStudents = teacherSubjects.reduce((sum, subject) => {
      const subjectStudents = users.filter(u => 
        u.role === 'student' && u.class_id === subject.class_id
      )
      return sum + subjectStudents.length
    }, 0)

    return {
      teacher: `${teacher.first_name} ${teacher.last_name}`,
      subjects: teacherSubjects.length,
      students: totalStudents,
      workload: teacherSubjects.length * 2 + Math.floor(totalStudents / 10) // Workload score
    }
  })

  // Performance trends (mock data for demonstration)
  const performanceTrends = [
    { month: 'Jan', performance: 75 },
    { month: 'Feb', performance: 78 },
    { month: 'Mar', performance: 82 },
    { month: 'Apr', performance: 85 },
    { month: 'May', performance: 88 },
    { month: 'Jun', performance: 90 }
  ]

  // Removed unused COLORS

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Teacher Analytics</h1>
        <p className="text-gray-600">Comprehensive analysis of teacher performance and workload in your department</p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search teachers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <select
            value={selectedTeacher || ''}
            onChange={(e) => setSelectedTeacher(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Teachers</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.first_name} {teacher.last_name}
              </option>
            ))}
          </select>

          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Teachers</p>
              <p className="text-2xl font-semibold text-gray-900">{teachers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Assigned Subjects</p>
              <p className="text-2xl font-semibold text-gray-900">
                {departmentSubjects.filter(s => s.teacher_id).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <Award className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Excellent Teachers</p>
              <p className="text-2xl font-semibold text-gray-900">
                {teacherPerformanceData.filter(t => t.status === 'Excellent').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Need Support</p>
              <p className="text-2xl font-semibold text-gray-900">
                {teacherPerformanceData.filter(t => t.status === 'Needs Improvement').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Teacher Performance */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Teacher Performance</h3>
          <div className="h-80">
            <Bar
              data={{
                labels: teacherPerformanceData.map(item => item.name),
                datasets: [
                  {
                    label: 'Performance (%)',
                    data: teacherPerformanceData.map(item => item.performance),
                    backgroundColor: '#3B82F6',
                    borderColor: '#3B82F6',
                    borderWidth: 1,
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
                  x: {
                    ticks: {
                      maxRotation: 45,
                    },
                  },
                  y: {
                    beginAtZero: true,
                    max: 100,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Workload Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Workload Distribution</h3>
          <div className="h-80">
            <Bar
              data={{
                labels: workloadData.map(item => item.teacher),
                datasets: [
                  {
                    label: 'Workload Score',
                    data: workloadData.map(item => item.workload),
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
                    display: false,
                  },
                },
                scales: {
                  x: {
                    ticks: {
                      maxRotation: 45,
                    },
                  },
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Performance Trends</h3>
        <div className="h-80">
          <Line
            data={{
              labels: performanceTrends.map(item => item.month),
              datasets: [
                {
                  label: 'Performance (%)',
                  data: performanceTrends.map(item => item.performance),
                  borderColor: '#3B82F6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderWidth: 2,
                  fill: true,
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

      {/* Subject Assignment Status */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Assignment Status</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teacher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Students
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subjectAssignmentData.map((subject, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {subject.subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {subject.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {subject.teacher}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {subject.class}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {subject.students}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      subject.teacher !== 'Unassigned' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {subject.teacher !== 'Unassigned' ? 'Assigned' : 'Unassigned'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teacher Performance Details */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Teacher Performance Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teacher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subjects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Students
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exams
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teacherPerformanceData.map((teacher, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                      <div className="text-sm text-gray-500">{teacher.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {teacher.subjects}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {teacher.students}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${
                            teacher.performance >= 80 ? 'bg-green-500' :
                            teacher.performance >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${teacher.performance}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{teacher.performance}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      teacher.status === 'Excellent' ? 'bg-green-100 text-green-800' :
                      teacher.status === 'Good' ? 'bg-blue-100 text-blue-800' :
                      teacher.status === 'Average' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {teacher.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {teacher.exams}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default HODTeacherAnalytics
