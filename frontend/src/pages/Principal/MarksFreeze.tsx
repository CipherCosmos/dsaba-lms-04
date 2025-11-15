/**
 * Principal Marks Freeze Interface
 * Allows Principal to freeze approved marks for final lock
 */

import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import {
  useInternalMarks,
  useFreezeInternalMark,
  useCurrentAcademicYear,
  useDepartments,
  useSubjects,
} from '../../core/hooks'
import { academicStructureAPI } from '../../services/api'
import { LoadingFallback } from '../../modules/shared/components/LoadingFallback'
import { UserRole } from '../../core/types/permissions'
import { logger } from '../../core/utils/logger'

interface InternalMark {
  id: number
  student_id: number
  subject_assignment_id: number
  component_type: string
  marks_obtained: number
  max_marks: number
  workflow_state: string
  approved_at?: string
  approved_by?: number
  subject?: { name: string; code: string }
  student?: { first_name: string; last_name: string; roll_no?: string }
}

const COMPONENT_LABELS: Record<string, string> = {
  ia1: 'Internal Assessment 1',
  ia2: 'Internal Assessment 2',
  assignment: 'Assignment',
  practical: 'Practical',
  attendance: 'Attendance',
  quiz: 'Quiz',
  project: 'Project',
  other: 'Other',
}

const MarksFreeze: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [semesters, setSemesters] = useState<Array<{ id: number; semester_no: number; display_name: string }>>([])

  const { data: currentAcademicYear } = useCurrentAcademicYear()
  const academicYearId = currentAcademicYear?.id

  // Fetch departments and subjects for filters
  const { data: departmentsData } = useDepartments(0, 1000)
  const { data: subjectsData } = useSubjects(0, 1000, selectedDepartment ? { department_id: selectedDepartment } : undefined)

  const departments = departmentsData?.items || []
  const subjects = subjectsData?.items || []

  // Fetch semesters for current academic year
  useEffect(() => {
    const fetchSemesters = async () => {
      if (academicYearId) {
        try {
          const response = await academicStructureAPI.getAllSemesters(0, 1000, {
            academic_year_id: academicYearId,
          })
          const semestersList = response.items || []
          setSemesters(semestersList.map((s: any) => ({
            id: s.id,
            semester_no: s.semester_no,
            display_name: `Semester ${s.semester_no}`,
          })))
        } catch (error) {
          logger.error('Error fetching semesters:', error)
        }
      }
    }
    fetchSemesters()
  }, [academicYearId])

  // Fetch approved marks (ready for freezing)
  const { data: marksData, isLoading: loadingMarks } = useInternalMarks(
    0,
    1000,
    academicYearId
      ? {
          academic_year_id: academicYearId,
          workflow_state: 'approved',
          semester_id: selectedSemester || undefined,
        }
      : { workflow_state: 'approved' }
  )

  const freezeMutation = useFreezeInternalMark()

  const marks = marksData?.items || []

  // Group marks by subject assignment
  interface SubjectMarksData {
    subject: { name: string; code: string }
    components: InternalMark[]
    total: number
    maxTotal: number
  }

  const marksBySubject = marks.reduce(
    (acc: Record<number, SubjectMarksData>, mark: InternalMark) => {
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
    },
    {} as Record<number, SubjectMarksData>
  )

  const handleFreeze = async (markId: number) => {
    if (!window.confirm('Are you sure you want to freeze these marks? This action cannot be undone.')) {
      return
    }
    freezeMutation.mutate(markId)
  }

  const handleBulkFreeze = async (marksToFreeze: InternalMark[]) => {
    if (
      !window.confirm(
        `Are you sure you want to freeze ${marksToFreeze.length} marks? This action cannot be undone.`
      )
    ) {
      return
    }
    marksToFreeze.forEach((mark) => {
      freezeMutation.mutate(mark.id)
    })
  }

  if (loadingMarks) {
    return <LoadingFallback />
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Freeze Marks</h1>
        <p className="text-gray-600">
          Freeze approved marks to prevent further modifications. Only approved marks can be frozen.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <select
              value={selectedSemester || ''}
              onChange={(e) => setSelectedSemester(parseInt(e.target.value) || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Semesters</option>
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.display_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={selectedDepartment || ''}
              onChange={(e) => {
                setSelectedDepartment(parseInt(e.target.value) || null)
                setSelectedSubject(null) // Reset subject when department changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Departments</option>
              {departments.map((dept: any) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={selectedSubject || ''}
              onChange={(e) => setSelectedSubject(parseInt(e.target.value) || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={!selectedDepartment}
            >
              <option value="">All Subjects</option>
              {subjects.map((subject: any) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} - {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Approved Marks</div>
          <div className="text-2xl font-bold text-blue-600">{marks.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Subject Assignments</div>
          <div className="text-2xl font-bold text-green-600">{Object.keys(marksBySubject).length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Already Frozen</div>
          <div className="text-2xl font-bold text-gray-600">
            {marks.filter((m: InternalMark) => m.workflow_state === 'frozen').length}
          </div>
        </div>
      </div>

      {/* Marks Display */}
      {marks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg mb-2">No approved marks available for freezing</p>
          <p className="text-gray-400 text-sm">
            Marks must be approved by HOD before they can be frozen.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.entries(marksBySubject) as [string, SubjectMarksData][]).map(
            ([assignmentId, subjectData]) => (
              <div key={assignmentId} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-lg">
                      {subjectData.subject.name} ({subjectData.subject.code})
                    </h3>
                    <p className="text-sm text-gray-500">
                      {subjectData.components.length} marks ready for freezing
                    </p>
                  </div>
                  <button
                    onClick={() => handleBulkFreeze(subjectData.components)}
                    disabled={freezeMutation.isPending}
                    className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {freezeMutation.isPending ? 'Freezing...' : `Freeze All (${subjectData.components.length})`}
                  </button>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Component
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Marks
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Approved At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subjectData.components.map((mark: InternalMark) => (
                      <tr key={mark.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {mark.student
                            ? `${mark.student.first_name} ${mark.student.last_name} (${mark.student.roll_no || mark.student_id})`
                            : `Student ${mark.student_id}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {COMPONENT_LABELS[mark.component_type] || mark.component_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {mark.marks_obtained} / {mark.max_marks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {mark.approved_at
                            ? new Date(mark.approved_at).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              mark.workflow_state === 'frozen'
                                ? 'bg-gray-500 text-white'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {mark.workflow_state === 'frozen' ? 'Frozen' : 'Approved'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {mark.workflow_state !== 'frozen' ? (
                            <button
                              onClick={() => handleFreeze(mark.id)}
                              disabled={freezeMutation.isPending}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Freeze
                            </button>
                          ) : (
                            <span className="text-gray-400">Frozen</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

export default MarksFreeze

