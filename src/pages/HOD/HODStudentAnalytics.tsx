import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store/store'
import { fetchUsers } from '../../store/slices/userSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchClasses } from '../../store/slices/classSlice'
import { fetchExams } from '../../store/slices/examSlice'
import { Bar, Doughnut } from 'react-chartjs-2'
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
import { TrendingUp, Users, Award, Target, Download, Search } from 'lucide-react'

const HODStudentAnalytics: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { users } = useSelector((state: RootState) => state.users)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { classes } = useSelector((state: RootState) => state.classes)
  const { exams } = useSelector((state: RootState) => state.exams)

  const [selectedClass, setSelectedClass] = useState<number | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    dispatch(fetchUsers())
    dispatch(fetchSubjects())
    dispatch(fetchClasses())
    dispatch(fetchExams())
  }, [dispatch])

  // Filter data for HOD's department
  const departmentUsers = users.filter(u => u.department_id === user?.department_id)
  const departmentClasses = classes.filter(c => c.department_id === user?.department_id)
  const departmentSubjects = subjects.filter(s => {
    const subjectClass = classes.find(c => c.id === s.class_id)
    return subjectClass?.department_id === user?.department_id
  })
  const departmentExams = exams.filter(e => {
    const examSubject = subjects.find(s => s.id === e.subject_id)
    const subjectClass = classes.find(c => c.id === examSubject?.class_id)
    return subjectClass?.department_id === user?.department_id
  })

  // Get students from selected class or all department students
  const students = selectedClass 
    ? departmentUsers.filter(u => u.role === 'student' && u.class_id === selectedClass)
    : departmentUsers.filter(u => u.role === 'student')

  // Filter students by search term
  const filteredStudents = students.filter(student =>
    student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate performance data
  const performanceData = filteredStudents.map(student => {
    const studentExams = departmentExams.filter(exam => {
      const examSubject = subjects.find(s => s.id === exam.subject_id)
      const subjectClass = classes.find(c => c.id === examSubject?.class_id)
      return subjectClass?.id === student.class_id
    })

    const totalMarks = studentExams.reduce((sum, exam) => sum + (exam.total_marks || 0), 0)
    const averagePercentage = studentExams.length > 0 ? (totalMarks / studentExams.length) : 0

    return {
      name: `${student.first_name} ${student.last_name}`,
      class: classes.find(c => c.id === student.class_id)?.name || 'Unknown',
      percentage: Math.round(averagePercentage),
      exams: studentExams.length,
      status: averagePercentage >= 80 ? 'Excellent' : averagePercentage >= 60 ? 'Good' : 'Needs Improvement'
    }
  })

  // Class performance data
  const classPerformanceData = departmentClasses.map(cls => {
    const classStudents = students.filter(s => s.class_id === cls.id)
    const classExams = departmentExams.filter(exam => {
      const examSubject = subjects.find(s => s.id === exam.subject_id)
      return examSubject?.class_id === cls.id
    })

    const totalPercentage = classStudents.reduce((sum, _student) => {
      const studentExams = classExams.filter(exam => {
        const examSubject = subjects.find(s => s.id === exam.subject_id)
        return examSubject?.class_id === cls.id
      })
      const totalMarks = studentExams.reduce((s, exam) => s + (exam.total_marks || 0), 0)
      return sum + (studentExams.length > 0 ? totalMarks / studentExams.length : 0)
    }, 0)

    const averagePercentage = classStudents.length > 0 ? totalPercentage / classStudents.length : 0

    return {
      class: cls.name,
      students: classStudents.length,
      average: Math.round(averagePercentage),
      semester: cls.semester
    }
  })

  // Subject performance data
  const subjectPerformanceData = departmentSubjects.map(subject => {
    const subjectExams = departmentExams.filter(exam => exam.subject_id === subject.id)
    const subjectStudents = students.filter(s => s.class_id === subject.class_id)

    const totalPercentage = subjectStudents.reduce((sum, _student) => {
      const studentExams = subjectExams
      const totalMarks = studentExams.reduce((s, exam) => s + (exam.total_marks || 0), 0)
      return sum + (studentExams.length > 0 ? totalMarks / studentExams.length : 0)
    }, 0)

    const averagePercentage = subjectStudents.length > 0 ? totalPercentage / subjectStudents.length : 0

    return {
      subject: subject.name,
      code: subject.code,
      average: Math.round(averagePercentage),
      students: subjectStudents.length,
      exams: subjectExams.length
    }
  })

  // Grade distribution
  const gradeDistribution = [
    { name: 'A+ (90-100)', value: performanceData.filter(p => p.percentage >= 90).length, color: '#10B981' },
    { name: 'A (80-89)', value: performanceData.filter(p => p.percentage >= 80 && p.percentage < 90).length, color: '#34D399' },
    { name: 'B (70-79)', value: performanceData.filter(p => p.percentage >= 70 && p.percentage < 80).length, color: '#FBBF24' },
    { name: 'C (60-69)', value: performanceData.filter(p => p.percentage >= 60 && p.percentage < 70).length, color: '#F59E0B' },
    { name: 'D (50-59)', value: performanceData.filter(p => p.percentage >= 50 && p.percentage < 60).length, color: '#EF4444' },
    { name: 'F (<50)', value: performanceData.filter(p => p.percentage < 50).length, color: '#DC2626' }
  ]

  const COLORS = ['#10B981', '#34D399', '#FBBF24', '#F59E0B', '#EF4444', '#DC2626']

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Student Analytics</h1>
        <p className="text-gray-600">Comprehensive analysis of student performance in your department</p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Classes</option>
            {departmentClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} (Semester {cls.semester})
              </option>
            ))}
          </select>

          <select
            value={selectedSubject || ''}
            onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Subjects</option>
            {departmentSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.code})
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
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900">{students.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Performance</p>
              <p className="text-2xl font-semibold text-gray-900">
                {performanceData.length > 0 
                  ? Math.round(performanceData.reduce((sum, p) => sum + p.percentage, 0) / performanceData.length)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <Award className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Excellent Students</p>
              <p className="text-2xl font-semibold text-gray-900">
                {performanceData.filter(p => p.percentage >= 80).length}
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
                {performanceData.filter(p => p.percentage < 60).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Class Performance */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Performance</h3>
          <div className="h-80">
            <Bar
              data={{
                labels: classPerformanceData.map(item => item.class),
                datasets: [
                  {
                    label: 'Average Performance (%)',
                    data: classPerformanceData.map(item => item.average),
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
                  y: {
                    beginAtZero: true,
                    max: 100,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
          <div className="h-80">
            <Doughnut
              data={{
                labels: gradeDistribution.map(item => item.name),
                datasets: [
                  {
                    data: gradeDistribution.map(item => item.value),
                    backgroundColor: COLORS,
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Subject Performance */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance</h3>
        <div className="h-80">
          <Bar
            data={{
              labels: subjectPerformanceData.map(item => item.code),
              datasets: [
                {
                  label: 'Average Performance (%)',
                  data: subjectPerformanceData.map(item => item.average),
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
                y: {
                  beginAtZero: true,
                  max: 100,
                },
              },
            }}
          />
        </div>
      </div>

      {/* Student Performance Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Performance Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
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
              {performanceData.map((student, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{student.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.class}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${
                            student.percentage >= 80 ? 'bg-green-500' :
                            student.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${student.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{student.percentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      student.status === 'Excellent' ? 'bg-green-100 text-green-800' :
                      student.status === 'Good' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.exams}
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

export default HODStudentAnalytics
