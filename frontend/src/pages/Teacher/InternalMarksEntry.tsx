/**
 * Internal Marks Entry Page
 * Teachers can enter internal marks (IA1, IA2, Assignment, etc.) for their assigned subjects
 */

import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import {
  useInternalMarks,
  useCreateInternalMark,
  useBulkSubmitInternalMarks,
  useCurrentAcademicYear,
} from '../../core/hooks'
import { useStudentEnrollments } from '../../core/hooks'
import { subjectAssignmentAPI } from '../../services/api'
import { LoadingFallback } from '../../modules/shared/components/LoadingFallback'
import { logger } from '../../core/utils/logger'

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
}

interface SubjectAssignment {
  id: number
  subject_id: number
  class_id: number
  semester_id: number
  academic_year?: number
  academic_year_id?: number
  subject?: {
    name: string
    code: string
  }
}

const COMPONENT_TYPES = [
  { value: 'ia1', label: 'Internal Assessment 1 (IA1)' },
  { value: 'ia2', label: 'Internal Assessment 2 (IA2)' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'practical', label: 'Practical' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'project', label: 'Project' }
]

const InternalMarksEntry: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null)
  const [selectedAssignmentDetails, setSelectedAssignmentDetails] = useState<SubjectAssignment | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<string>('ia1')
  const [marks, setMarks] = useState<Record<number, { marks: number; max_marks: number; notes?: string }>>({})
  const [students, setStudents] = useState<any[]>([])

  // React Query hooks
  const { data: currentAcademicYear } = useCurrentAcademicYear()
  const { data: marksData, isLoading: loadingMarks } = useInternalMarks(
    0,
    1000,
    selectedAssignment
      ? {
          subject_assignment_id: selectedAssignment,
          workflow_state: 'draft',
        }
      : undefined
  )
  const createMutation = useCreateInternalMark()
  const bulkSubmitMutation = useBulkSubmitInternalMarks()

  // Fetch students from enrollments when assignment is selected
  const { data: enrollmentsData } = useStudentEnrollments(
    0,
    1000,
    selectedAssignmentDetails?.semester_id && selectedAssignmentDetails?.academic_year_id
      ? {
          semester_id: selectedAssignmentDetails.semester_id,
          academic_year_id: selectedAssignmentDetails.academic_year_id || selectedAssignmentDetails.academic_year,
        }
      : undefined
  )

  useEffect(() => {
    fetchSubjectAssignments()
  }, [user])

  useEffect(() => {
    if (selectedAssignment) {
      fetchAssignmentDetails()
    } else {
      setSelectedAssignmentDetails(null)
      setStudents([])
      setMarks({})
    }
  }, [selectedAssignment])

  useEffect(() => {
    if (selectedAssignmentDetails && enrollmentsData?.items) {
      // Get student IDs from enrollments
      const studentIds = enrollmentsData.items.map((e: any) => e.student_id)
      // Initialize marks for students
      const initialMarks: Record<number, { marks: number; max_marks: number; notes?: string }> = {}
      studentIds.forEach((studentId: number) => {
        initialMarks[studentId] = {
          marks: 0,
          max_marks: 100,
          notes: '',
        }
      })
      setMarks(initialMarks)
      setStudents(enrollmentsData.items.map((e: any) => ({ id: e.student_id, roll_no: e.roll_no })))
    }
  }, [selectedAssignmentDetails, enrollmentsData])

  useEffect(() => {
    if (marksData?.items && selectedComponent) {
      // Process marks into local state
      const marksMap: Record<number, { marks: number; max_marks: number; notes?: string }> = {}
      marksData.items.forEach((mark: InternalMark) => {
        if (mark.component_type === selectedComponent) {
          marksMap[mark.student_id] = {
            marks: mark.marks_obtained,
            max_marks: mark.max_marks,
            notes: mark.notes || '',
          }
        }
      })
      // Merge with existing marks (don't overwrite if user is editing)
      setMarks((prev) => ({ ...prev, ...marksMap }))
    }
  }, [marksData, selectedComponent])

  const fetchSubjectAssignments = async () => {
    try {
      // Fetch assignments for current teacher (using user_id)
      const response = await subjectAssignmentAPI.getByUserId(user?.id || 0, 0, 100)
      setSubjectAssignments(response.items || [])
    } catch (error) {
      logger.error('Error fetching subject assignments:', error)
    }
  }

  const fetchAssignmentDetails = async () => {
    if (!selectedAssignment) return
    try {
      const assignment = await subjectAssignmentAPI.getById(selectedAssignment)
      setSelectedAssignmentDetails(assignment)
    } catch (error) {
      logger.error('Error fetching assignment details:', error)
    }
  }

  const handleSave = async (studentId: number) => {
    if (!selectedAssignment || !selectedAssignmentDetails) return
    const markData = marks[studentId]
    if (!markData || markData.marks === 0) return

    const academicYearId =
      selectedAssignmentDetails.academic_year_id ||
      selectedAssignmentDetails.academic_year ||
      currentAcademicYear?.id

    if (!academicYearId || !selectedAssignmentDetails.semester_id) {
      logger.error('Missing academic year or semester ID')
      return
    }

    createMutation.mutate({
      student_id: studentId,
      subject_assignment_id: selectedAssignment,
      semester_id: selectedAssignmentDetails.semester_id,
      academic_year_id: academicYearId,
      component_type: selectedComponent,
      marks_obtained: markData.marks,
      max_marks: markData.max_marks,
      notes: markData.notes,
    })
  }

  const handleBulkSubmit = async () => {
    if (!selectedAssignment) {
      return
    }
    if (!window.confirm('Submit all marks for approval? This action cannot be undone.')) {
      return
    }
    bulkSubmitMutation.mutate({
      subject_assignment_id: selectedAssignment,
    })
  }

  const getWorkflowBadge = (state: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      draft: { color: 'bg-gray-100 text-gray-800', text: 'Draft' },
      submitted: { color: 'bg-yellow-100 text-yellow-800', text: 'Submitted' },
      approved: { color: 'bg-green-100 text-green-800', text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' },
      frozen: { color: 'bg-blue-100 text-blue-800', text: 'Frozen' },
      published: { color: 'bg-purple-100 text-purple-800', text: 'Published' }
    }
    const badge = badges[state] || badges.draft
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Internal Marks Entry</h1>
        {selectedAssignment && (
          <button
            onClick={handleBulkSubmit}
            disabled={bulkSubmitMutation.isPending}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkSubmitMutation.isPending ? 'Submitting...' : 'Submit All for Approval'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Assignment *
            </label>
            <select
              value={selectedAssignment || ''}
              onChange={(e) => setSelectedAssignment(parseInt(e.target.value) || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select Subject Assignment</option>
              {subjectAssignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.subject?.name || assignment.subject?.code || `Assignment ${assignment.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Component Type *
            </label>
            <select
              value={selectedComponent}
              onChange={(e) => setSelectedComponent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {COMPONENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedAssignment ? (
        <div className="text-center py-8 text-gray-500">
          Please select a subject assignment to enter marks
        </div>
      ) : loadingMarks ? (
        <LoadingFallback />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="font-medium">
              {subjectAssignments.find((a) => a.id === selectedAssignment)?.subject?.name || 'Subject'} - {COMPONENT_TYPES.find((t) => t.value === selectedComponent)?.label}
            </h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roll No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marks Obtained
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Max Marks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.roll_no || student.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={marks[student.id]?.max_marks || 100}
                      value={marks[student.id]?.marks || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        setMarks({
                          ...marks,
                          [student.id]: {
                            ...marks[student.id],
                            marks: value,
                            max_marks: marks[student.id]?.max_marks || 100
                          }
                        })
                      }}
                      className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={marks[student.id]?.max_marks || 100}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 100
                        setMarks({
                          ...marks,
                          [student.id]: {
                            ...marks[student.id],
                            marks: marks[student.id]?.marks || 0,
                            max_marks: value
                          }
                        })
                      }}
                      className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={marks[student.id]?.notes || ''}
                      onChange={(e) => {
                        setMarks({
                          ...marks,
                          [student.id]: {
                            ...marks[student.id],
                            marks: marks[student.id]?.marks || 0,
                            max_marks: marks[student.id]?.max_marks || 100,
                            notes: e.target.value
                          }
                        })
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md"
                      placeholder="Optional notes"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleSave(student.id)}
                      disabled={createMutation.isPending}
                      className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No students found for this subject assignment
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default InternalMarksEntry

