/**
 * Student Results View Page
 * Students can view their published internal marks and academic history
 */

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { useInternalMarks, useStudentEnrollments, useCurrentAcademicYear } from '../../core/hooks'
import { LoadingFallback } from '../../modules/shared/components/LoadingFallback'

interface InternalMark {
  id: number
  student_id: number
  subject_assignment_id: number
  semester_id: number
  academic_year_id: number
  component_type: string
  marks_obtained: number
  max_marks: number
  workflow_state: string
  notes?: string
  subject?: {
    name: string
    code: string
  }
}

const COMPONENT_LABELS: Record<string, string> = {
  ia1: 'IA1',
  ia2: 'IA2',
  assignment: 'Assignment',
  practical: 'Practical',
  attendance: 'Attendance',
  quiz: 'Quiz',
  project: 'Project',
  other: 'Other',
}

const StudentResults: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const studentId = user?.id

  const [selectedAcademicYear, setSelectedAcademicYear] = useState<number | null>(null)
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null)

  // Fetch current academic year
  const { data: currentAcademicYear, isLoading: loadingAY } = useCurrentAcademicYear()

  // Fetch student enrollments
  const { data: enrollmentsData, isLoading: loadingEnrollments } = useStudentEnrollments(
    0,
    1000,
    studentId ? { student_id: studentId } : undefined
  )

  // Fetch internal marks (only published)
  const { data: marksData, isLoading: loadingMarks } = useInternalMarks(
    0,
    1000,
    studentId
      ? {
          student_id: studentId,
          academic_year_id: selectedAcademicYear || undefined,
          semester_id: selectedSemester || undefined,
          workflow_state: 'published',
        }
      : undefined
  )

  // Set default academic year
  React.useEffect(() => {
    if (currentAcademicYear && !selectedAcademicYear) {
      setSelectedAcademicYear(currentAcademicYear.id)
    }
  }, [currentAcademicYear, selectedAcademicYear])

  if (!studentId) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Unable to determine student ID. Please contact support.</p>
      </div>
    )
  }

  if (loadingAY || loadingEnrollments || loadingMarks) {
    return <LoadingFallback />
  }

  const marks = marksData?.items || []
  const enrollments = enrollmentsData?.items || []

  // Group marks by subject
  interface SubjectMarksData {
    subject: { name: string; code: string }
    components: InternalMark[]
    total: number
    maxTotal: number
  }

  const marksBySubject = marks.reduce((acc: Record<number, SubjectMarksData>, mark: InternalMark) => {
    const key = mark.subject_assignment_id
    if (!acc[key]) {
      acc[key] = {
        subject: mark.subject || { name: `Subject ${key}`, code: '' },
        components: [],
        total: 0,
        maxTotal: 0,
      }
    }
    acc[key].components.push(mark)
    acc[key].total += mark.marks_obtained
    acc[key].maxTotal += mark.max_marks
    return acc
  }, {} as Record<number, SubjectMarksData>)

  // Get unique academic years from enrollments
  const academicYears: number[] = Array.from(
    new Set(enrollments.map((e: any) => e.academic_year_id).filter((id: any): id is number => Boolean(id)))
  ) as number[]

  // Get unique semesters from enrollments
  const semesters: number[] = Array.from(
    new Set(enrollments.map((e: any) => e.semester_id).filter((id: any): id is number => Boolean(id)))
  ) as number[]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">My Results</h1>
        <p className="text-gray-600">View your published internal marks and academic performance</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Academic Year
            </label>
            <select
              value={selectedAcademicYear || ''}
              onChange={(e) => setSelectedAcademicYear(parseInt(e.target.value) || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Years</option>
              {academicYears.map((ayId: number) => (
                <option key={ayId} value={ayId}>
                  Academic Year {ayId}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <select
              value={selectedSemester || ''}
              onChange={(e) => setSelectedSemester(parseInt(e.target.value) || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Semesters</option>
              {semesters.map((semId: number) => (
                <option key={semId} value={semId}>
                  Semester {semId}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Display */}
      {Object.keys(marksBySubject).length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg mb-2">No published marks available</p>
          <p className="text-gray-400 text-sm">
            Your marks will appear here once they are published by your HOD or Principal.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.entries(marksBySubject) as [string, SubjectMarksData][]).map(([subjectId, subjectData]) => (
            <div key={subjectId} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 bg-gray-50 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">{subjectData.subject.name}</h3>
                    <p className="text-sm text-gray-500">{subjectData.subject.code}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {subjectData.total.toFixed(2)} / {subjectData.maxTotal.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {((subjectData.total / subjectData.maxTotal) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Component
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Marks Obtained
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Max Marks
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subjectData.components.map((mark: InternalMark) => (
                      <tr key={mark.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {COMPONENT_LABELS[mark.component_type] || mark.component_type}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {mark.marks_obtained.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {mark.max_marks.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {((mark.marks_obtained / mark.max_marks) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default StudentResults

