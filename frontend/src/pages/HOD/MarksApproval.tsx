/**
 * Marks Approval Page
 * HOD can approve/reject submitted marks
 */

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import {
  useSubmittedMarks,
  useApproveInternalMark,
  useRejectInternalMark,
} from '../../core/hooks'
import { LoadingFallback } from '../../modules/shared/components/LoadingFallback'

interface InternalMark {
  id: number
  student_id: number
  subject_assignment_id: number
  component_type: string
  marks_obtained: number
  max_marks: number
  workflow_state: string
  submitted_at: string
  submitted_by?: number
  notes?: string
  subject?: {
    name: string
    code: string
  }
}

const MarksApproval: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [selectedMark, setSelectedMark] = useState<InternalMark | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  // Get department ID from user (HOD's department)
  const departmentId = (user as any)?.department_id || (user as any)?.department_ids?.[0]

  // React Query hooks
  const { data: marksData, isLoading: loading } = useSubmittedMarks(0, 1000, departmentId)
  const approveMutation = useApproveInternalMark()
  const rejectMutation = useRejectInternalMark()

  const marks = marksData?.items || []

  const handleApprove = async (mark: InternalMark) => {
    if (!window.confirm(`Approve marks for student ${mark.student_id}?`)) {
      return
    }
    approveMutation.mutate(mark.id)
  }

  const handleReject = async () => {
    if (!selectedMark) return
    if (!rejectReason || rejectReason.length < 10) {
      return
    }
    rejectMutation.mutate({
      markId: selectedMark.id,
      reason: rejectReason,
    })
    setShowRejectModal(false)
    setRejectReason('')
    setSelectedMark(null)
  }

  const handleBulkApprove = async (marksToApprove: InternalMark[]) => {
    if (!window.confirm(`Approve ${marksToApprove.length} marks?`)) {
      return
    }
    marksToApprove.forEach((mark) => {
      approveMutation.mutate(mark.id)
    })
  }

  const getComponentLabel = (type: string) => {
    const labels: Record<string, string> = {
      ia1: 'IA1',
      ia2: 'IA2',
      assignment: 'Assignment',
      practical: 'Practical',
      attendance: 'Attendance',
      quiz: 'Quiz',
      project: 'Project'
    }
    return labels[type] || type
  }

  // Group marks by subject assignment
  const groupedMarks = marks.reduce((acc: Record<number, InternalMark[]>, mark: InternalMark) => {
    const key = mark.subject_assignment_id
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(mark)
    return acc
  }, {} as Record<number, InternalMark[]>)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Marks Approval</h1>
        <div className="text-sm text-gray-500">
          {marks.length} marks awaiting approval
        </div>
      </div>

      {loading ? (
        <LoadingFallback />
      ) : marks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No submitted marks awaiting approval
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.entries(groupedMarks) as [string, InternalMark[]][]).map(([assignmentId, assignmentMarks]) => (
            <div key={assignmentId} className="bg-white rounded-lg shadow">
              <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                <h3 className="font-medium">
                  Subject Assignment {assignmentId}
                  {assignmentMarks[0]?.subject && (
                    <span className="text-gray-500 ml-2">
                      - {assignmentMarks[0].subject.name}
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => handleBulkApprove(assignmentMarks)}
                  className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  Approve All ({assignmentMarks.length})
                </button>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Component
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted At
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
                  {assignmentMarks.map((mark: InternalMark) => (
                    <tr key={mark.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mark.student_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getComponentLabel(mark.component_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mark.marks_obtained} / {mark.max_marks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(mark.submitted_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {mark.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(mark)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMark(mark)
                              setShowRejectModal(true)
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedMark && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Reject Marks</h2>
            <p className="text-sm text-gray-600 mb-4">
              Student ID: {selectedMark.student_id} | Component: {getComponentLabel(selectedMark.component_type)} | Marks: {selectedMark.marks_obtained} / {selectedMark.max_marks}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rejection Reason * (minimum 10 characters)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={4}
                required
                minLength={10}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                  setSelectedMark(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MarksApproval

