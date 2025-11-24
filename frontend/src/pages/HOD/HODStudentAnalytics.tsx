import React, { useState, useEffect, useMemo, memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store/store'
import { fetchUsers } from '../../store/slices/userSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchClasses } from '../../store/slices/classSlice'
import { fetchExams } from '../../store/slices/examSlice'
import { subjectAssignmentAPI, marksAPI } from '../../services/api'
import { useExamSubjectAssignments } from '../../core/hooks/useSubjectAssignments'
import { useMarksByExam } from '../../core/hooks/useMarks'
import AnalyticsChart from '../../components/shared/AnalyticsChart'
import DataExport from '../../components/shared/DataExport'
import AnalyticsFilters from '../../components/shared/AnalyticsFilters'
import { TrendingUp, Users, Award, Target } from 'lucide-react'

const HODStudentAnalytics: React.FC = memo(() => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { users } = useSelector((state: RootState) => state.users)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { classes } = useSelector((state: RootState) => state.classes)
  const { exams } = useSelector((state: RootState) => state.exams)

  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [marksData, setMarksData] = useState<any[]>([])
  // Note: selectedClass removed - analytics now based on department/semester/enrollment

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Load basic data
        await Promise.all([
          dispatch(fetchUsers()),
          dispatch(fetchSubjects()),
          dispatch(fetchClasses()),
          dispatch(fetchExams())
        ])

        // Fetch marks for all department exams
        const allMarks: any[] = []
        for (const exam of exams) {
          try {
            const examMarks = await marksAPI.getByExam(exam.id, 0, 1000)
            allMarks.push(...(examMarks.items || []))
          } catch (err) {
            console.warn(`Failed to fetch marks for exam ${exam.id}:`, err)
          }
        }
        setMarksData(allMarks)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load data:', err)
        setError('Failed to load analytics data. Please try again.')
        setLoading(false)
      }
    }

    loadData()
  }, [dispatch])

  // Filter data for HOD's department
  const userDeptId = user?.department_ids?.[0] || (user as any)?.department_id
  const departmentUsers = users.filter(u => {
    if (u.department_ids && u.department_ids.length > 0) {
      return u.department_ids[0] === userDeptId
    }
    return (u as any).department_id === userDeptId
  })
  // Subjects belong to departments directly
  const departmentSubjects = subjects.filter(s => s.department_id === user?.department_id && (!selectedSemester || (s as any).semester === selectedSemester))
  // Get subject assignments for exams
  const { getSubjectForExam } = useExamSubjectAssignments(exams)
  
  const departmentExams = exams.filter(e => {
    const examSubject = getSubjectForExam(e)
    return examSubject?.department_id === user?.department_id
  })

  // Get all department students (no longer filtering by legacy class_id)
  const students = departmentUsers.filter(u => u.role === 'student')

  // Filter students by search term
  const filteredStudents = students.filter(student =>
    student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  )


  // Note: Removed exam-class mapping - analytics now based on subject/department associations

  // Calculate performance data based on actual student marks
  const performanceData = useMemo(() => {
    return filteredStudents.map(student => {
      // Get all marks for this student from department exams
      const studentMarks = marksData.filter(mark => mark.student_id === student.id)

      if (studentMarks.length === 0) {
        return {
          name: `${student.first_name} ${student.last_name}`,
          class: 'Department Student',
          percentage: 0,
          exams: 0,
          status: 'No Data'
        }
      }

      // Calculate total marks obtained and total possible marks
      let totalObtained = 0
      let totalPossible = 0

      // Group marks by exam to calculate percentage per exam
      const examMarksMap = new Map<number, { obtained: number; possible: number }>()

      studentMarks.forEach(mark => {
        const exam = departmentExams.find(e => e.id === mark.exam_id)
        if (exam) {
          const examTotal = exam.total_marks || 100 // fallback to 100 if not set
          if (!examMarksMap.has(mark.exam_id)) {
            examMarksMap.set(mark.exam_id, { obtained: 0, possible: examTotal })
          }
          examMarksMap.get(mark.exam_id)!.obtained += mark.marks_obtained
        }
      })

      // Calculate weighted average percentage
      examMarksMap.forEach(({ obtained, possible }) => {
        if (possible > 0) {
          totalObtained += obtained
          totalPossible += possible
        }
      })

      const averagePercentage = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0

      return {
        name: `${student.first_name} ${student.last_name}`,
        class: 'Department Student',
        percentage: Math.round(averagePercentage),
        exams: examMarksMap.size,
        status: averagePercentage >= 80 ? 'Excellent' : averagePercentage >= 60 ? 'Good' : 'Needs Improvement'
      }
    })
  }, [filteredStudents, departmentExams, marksData])

  // Subject-based performance data (replacing legacy class performance)
  const classPerformanceData = useMemo(() => {
    return departmentSubjects.slice(0, 5).map(subject => {
      const subjectExams = departmentExams.filter(exam => {
        const examSubject = getSubjectForExam(exam)
        return examSubject?.id === subject.id
      })

      // Calculate average performance for this subject based on actual marks
      let totalPercentage = 0
      let studentCount = 0

      students.forEach(student => {
        const studentSubjectMarks = marksData.filter(mark => {
          const exam = departmentExams.find(e => e.id === mark.exam_id)
          const examSubject = exam ? getSubjectForExam(exam) : null
          return mark.student_id === student.id && examSubject?.id === subject.id
        })

        if (studentSubjectMarks.length > 0) {
          let studentTotalObtained = 0
          let studentTotalPossible = 0

          studentSubjectMarks.forEach(mark => {
            const exam = departmentExams.find(e => e.id === mark.exam_id)
            const examTotal = exam?.total_marks || 100
            studentTotalObtained += mark.marks_obtained
            studentTotalPossible += examTotal
          })

          if (studentTotalPossible > 0) {
            const studentPercentage = (studentTotalObtained / studentTotalPossible) * 100
            totalPercentage += studentPercentage
            studentCount++
          }
        }
      })

      const averagePercentage = studentCount > 0 ? totalPercentage / studentCount : 0

      return {
        class: subject.name, // Using subject name for chart labels
        students: studentCount,
        average: Math.round(averagePercentage),
        semester: 'N/A'
      }
    })
  }, [departmentSubjects, students, departmentExams, getSubjectForExam, marksData])

  // Subject performance data based on department
  const subjectPerformanceData = useMemo(() => {
    return departmentSubjects.map(subject => {
      const subjectExams = departmentExams.filter(exam => {
        const examSubject = getSubjectForExam(exam)
        return examSubject?.id === subject.id
      })

      // Calculate average performance for this subject based on actual marks
      let totalPercentage = 0
      let studentCount = 0

      students.forEach(student => {
        const studentSubjectMarks = marksData.filter(mark => {
          const exam = departmentExams.find(e => e.id === mark.exam_id)
          const examSubject = exam ? getSubjectForExam(exam) : null
          return mark.student_id === student.id && examSubject?.id === subject.id
        })

        if (studentSubjectMarks.length > 0) {
          let studentTotalObtained = 0
          let studentTotalPossible = 0

          studentSubjectMarks.forEach(mark => {
            const exam = departmentExams.find(e => e.id === mark.exam_id)
            const examTotal = exam?.total_marks || 100
            studentTotalObtained += mark.marks_obtained
            studentTotalPossible += examTotal
          })

          if (studentTotalPossible > 0) {
            const studentPercentage = (studentTotalObtained / studentTotalPossible) * 100
            totalPercentage += studentPercentage
            studentCount++
          }
        }
      })

      const averagePercentage = studentCount > 0 ? totalPercentage / studentCount : 0

      return {
        subject: subject.name,
        code: subject.code,
        average: Math.round(averagePercentage),
        students: studentCount,
        exams: subjectExams.length
      }
    })
  }, [departmentSubjects, departmentExams, students, getSubjectForExam, marksData])

  // Grade distribution
  const gradeDistribution = [
    { name: 'A+ (90-100)', value: performanceData.filter(p => p.percentage >= 90).length, color: '#10B981' },
    { name: 'A (80-89)', value: performanceData.filter(p => p.percentage >= 80 && p.percentage < 90).length, color: '#34D399' },
    { name: 'B (70-79)', value: performanceData.filter(p => p.percentage >= 70 && p.percentage < 80).length, color: '#FBBF24' },
    { name: 'C (60-69)', value: performanceData.filter(p => p.percentage >= 60 && p.percentage < 70).length, color: '#F59E0B' },
    { name: 'D (50-59)', value: performanceData.filter(p => p.percentage >= 50 && p.percentage < 60).length, color: '#EF4444' },
    { name: 'F (<50)', value: performanceData.filter(p => p.percentage < 50).length, color: '#DC2626' }
  ]


  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Student Analytics</h1>
        <p className="text-gray-600">Comprehensive analysis of student performance in your department</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="ml-4 text-gray-600">Loading analytics data...</p>
        </div>
      ) : error ? (
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center">
          <p className="text-gray-500">No students found in your department.</p>
        </div>
      ) : (
        <>

      <AnalyticsFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search students..."
        filters={{
          subject: {
            value: selectedSubject,
            options: [
              { value: '', label: 'All Subjects' },
              ...departmentSubjects.map(subject => ({
                value: subject.id,
                label: `${subject.name} (${subject.code})`
              }))
            ],
            placeholder: 'All Subjects',
            onChange: (value) => setSelectedSubject(value as number | null)
          },
          semester: {
            value: selectedSemester,
            options: [
              { value: '', label: 'All Semesters' },
              { value: 1, label: 'Semester 1' },
              { value: 2, label: 'Semester 2' },
              { value: 3, label: 'Semester 3' },
              { value: 4, label: 'Semester 4' },
              { value: 5, label: 'Semester 5' },
              { value: 6, label: 'Semester 6' },
              { value: 7, label: 'Semester 7' },
              { value: 8, label: 'Semester 8' }
            ],
            placeholder: 'All Semesters',
            onChange: (value) => setSelectedSemester(value as number | null)
          }
        }}
      />

      <div className="mb-6 flex justify-end">
        <DataExport
          data={{
            headers: ['Student Name', 'Performance (%)', 'Status', 'Exams Taken'],
            rows: performanceData.map(student => [
              student.name,
              student.percentage,
              student.status,
              student.exams
            ])
          }}
          filename={`student-analytics-${new Date().toISOString().split('T')[0]}.csv`}
        />
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
        <AnalyticsChart
          type="bar"
          title="Class Performance"
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
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
              },
            },
          }}
        />

        <AnalyticsChart
          type="doughnut"
          title="Grade Distribution"
          data={{
            labels: gradeDistribution.map(item => item.name),
            datasets: [
              {
                label: 'Students',
                data: gradeDistribution.map(item => item.value),
                backgroundColor: ['#10B981', '#34D399', '#FBBF24', '#F59E0B', '#EF4444', '#DC2626'],
                borderWidth: 1,
              },
            ],
          }}
        />
      </div>

      <AnalyticsChart
        type="bar"
        title="Subject Performance"
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
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
            },
          },
        }}
      />

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
        </>
      )}
    </div>
  )
})

HODStudentAnalytics.displayName = 'HODStudentAnalytics'

export default HODStudentAnalytics
