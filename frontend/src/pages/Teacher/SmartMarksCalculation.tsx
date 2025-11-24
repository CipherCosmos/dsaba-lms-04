import React, { useState, useEffect } from 'react'
import { Calculator, TrendingUp, Award, RefreshCw, Download } from 'lucide-react'
import { smartMarksAPI, studentEnrollmentAPI, subjectAssignmentAPI } from '../../services/api'
import { SmartMarksCalculation, SGPACalculation, GradingScale } from '../../core/types'
import type { StudentEnrollment, Semester, SubjectAssignment } from '../../core/types/api'

interface StudentMarks {
  student_id: number
  student_name: string
  roll_no: string
  ia1_marks?: number
  ia2_marks?: number
  best_internal?: number
  external_marks?: number
  total_marks?: number
  percentage?: number
  grade?: string
  grade_point?: number
}

export default function SmartMarksCalculationPage() {
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [students, setStudents] = useState<StudentMarks[]>([])
  const [gradingScale, setGradingScale] = useState<GradingScale[]>([])
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [subjects, setSubjects] = useState<SubjectAssignment[]>([])

  useEffect(() => {
    loadGradingScale()
  }, [])

  useEffect(() => {
    if (selectedSemester) {
      loadSubjects()
    }
  }, [selectedSemester])

  useEffect(() => {
    if (selectedSubject) {
      loadStudents()
    }
  }, [selectedSubject])

  const loadGradingScale = async () => {
    try {
      const data = await smartMarksAPI.getGradingScale()
      setGradingScale(data)
    } catch (error) {
      console.error('Failed to load grading scale:', error)
    }
  }

  const loadSubjects = async () => {
    if (!selectedSemester) return
    
    setLoading(true)
    try {
      const response = await subjectAssignmentAPI.getAll(0, 100, {
        semester_id: selectedSemester
      })
      setSubjects(response.items || [])
    } catch (error) {
      console.error('Failed to load subjects:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async () => {
    if (!selectedSemester || !selectedSubject) return
    
    setLoading(true)
    try {
      const enrollmentResponse = await studentEnrollmentAPI.getAll(0, 100, {
        semester_id: selectedSemester
      })
      
      const studentData: StudentMarks[] = enrollmentResponse.items.map((enrollment: StudentEnrollment) => ({
        student_id: enrollment.student_id,
        student_name: (enrollment.student?.user?.full_name) || 'Unknown',
        roll_no: enrollment.roll_no
      }))
      
      setStudents(studentData)
    } catch (error) {
      console.error('Failed to load students:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateBestInternal = async (studentId: number, index: number) => {
    if (!selectedSubject) return
    
    const student = students[index]
    if (!student.ia1_marks || !student.ia2_marks) {
      alert('Please enter both IA1 and IA2 marks')
      return
    }

    try {
      const result = await smartMarksAPI.calculateBestOfTwo({
        student_id: studentId,
        subject_assignment_id: selectedSubject,
        ia1_marks: student.ia1_marks,
        ia2_marks: student.ia2_marks
      })

      const updatedStudents = [...students]
      updatedStudents[index] = {
        ...updatedStudents[index],
        best_internal: result.best_internal,
        total_marks: result.total_marks,
        percentage: result.percentage,
        grade: result.grade,
        grade_point: result.grade_point
      }
      setStudents(updatedStudents)
    } catch (error) {
      console.error('Calculation failed:', error)
      alert('Failed to calculate marks')
    }
  }

  const calculateAllBestInternal = async () => {
    if (!selectedSubject) return
    
    setCalculating(true)
    try {
      for (let i = 0; i < students.length; i++) {
        const student = students[i]
        if (student.ia1_marks && student.ia2_marks) {
          await calculateBestInternal(student.student_id, i)
        }
      }
      alert('All marks calculated successfully!')
    } catch (error) {
      console.error('Bulk calculation failed:', error)
      alert('Some calculations failed')
    } finally {
      setCalculating(false)
    }
  }

  const updateMarks = (index: number, field: keyof StudentMarks, value: string | number) => {
    const updatedStudents = [...students]
    updatedStudents[index] = {
      ...updatedStudents[index],
      [field]: value
    }
    setStudents(updatedStudents)
  }

  const getGradeColor = (grade?: string) => {
    if (!grade) return 'bg-gray-100 text-gray-800'
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800'
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800'
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800'
    if (grade === 'D') return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  const downloadResults = () => {
    // Export to CSV
    const headers = ['Roll No', 'Student Name', 'IA1', 'IA2', 'Best Internal', 'External', 'Total', 'Percentage', 'Grade', 'Grade Point']
    const rows = students.map(s => [
      s.roll_no,
      s.student_name,
      s.ia1_marks || '',
      s.ia2_marks || '',
      s.best_internal || '',
      s.external_marks || '',
      s.total_marks || '',
      s.percentage || '',
      s.grade || '',
      s.grade_point || ''
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smart-marks-${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calculator className="h-8 w-8 text-indigo-600" />
            Smart Marks Calculation
          </h1>
          <p className="text-gray-600 mt-1">
            Best-of-two internal marks calculation with automatic grading
          </p>
        </div>
      </div>

      {/* Grading Scale Card */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-6 border border-indigo-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-indigo-600" />
          Grading Scale
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {gradingScale.map((scale, idx) => (
            <div key={idx} className="bg-white rounded-lg p-3 shadow-sm">
              <div className={`text-2xl font-bold ${scale.grade.startsWith('A') ? 'text-green-600' : scale.grade.startsWith('B') ? 'text-blue-600' : scale.grade === 'F' ? 'text-red-600' : 'text-yellow-600'}`}>
                {scale.grade}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {scale.min_percentage}% - {scale.max_percentage}%
              </div>
              <div className="text-sm font-medium text-gray-700 mt-1">
                GP: {scale.grade_point}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Semester
            </label>
            <select
              value={selectedSemester || ''}
              onChange={(e) => setSelectedSemester(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choose semester...</option>
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Subject
            </label>
            <select
              value={selectedSubject || ''}
              onChange={(e) => setSelectedSubject(Number(e.target.value))}
              disabled={!selectedSemester}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            >
              <option value="">Choose subject...</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.subject?.name} ({sub.subject?.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {students.length > 0 && (
        <div className="flex gap-3">
          <button
            onClick={calculateAllBestInternal}
            disabled={calculating}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {calculating ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="h-5 w-5" />
                Calculate All Best Internal
              </>
            )}
          </button>
          <button
            onClick={downloadResults}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-5 w-5" />
            Download Results
          </button>
        </div>
      )}

      {/* Marks Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : students.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Roll No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Student Name</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">IA1 Marks</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">IA2 Marks</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 bg-indigo-50">Best Internal</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">External</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Total</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">%</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Grade</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">GP</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((student, idx) => (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{student.roll_no}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{student.student_name}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={student.ia1_marks || ''}
                        onChange={(e) => updateMarks(idx, 'ia1_marks', Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={student.ia2_marks || ''}
                        onChange={(e) => updateMarks(idx, 'ia2_marks', Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                    </td>
                    <td className="px-4 py-3 text-center bg-indigo-50">
                      <span className="font-bold text-indigo-900">{student.best_internal || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="80"
                        value={student.external_marks || ''}
                        onChange={(e) => updateMarks(idx, 'external_marks', Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{student.total_marks || '-'}</td>
                    <td className="px-4 py-3 text-center">{student.percentage ? `${student.percentage.toFixed(1)}%` : '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {student.grade && (
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(student.grade)}`}>
                          {student.grade}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{student.grade_point || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => calculateBestInternal(student.student_id, idx)}
                        disabled={!student.ia1_marks || !student.ia2_marks}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:bg-gray-100 disabled:text-gray-400 text-sm"
                      >
                        Calculate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : selectedSemester && selectedSubject ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No students found for the selected semester and subject</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Calculator className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please select a semester and subject to begin</p>
        </div>
      )}
    </div>
  )
}

