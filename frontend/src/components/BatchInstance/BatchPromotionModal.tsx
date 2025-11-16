/**
 * Enhanced Batch Promotion Modal
 * Multi-step promotion workflow with pre-checks and validation
 */

import React, { useState, useEffect } from 'react'
import { usePromoteBatch, useBatchInstance } from '../../core/hooks'
import { useSections } from '../../core/hooks'
import { CheckCircle2, AlertCircle, X, ArrowRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface BatchPromotionModalProps {
  isOpen: boolean
  onClose: () => void
  batchInstanceId: number
  currentSemester: number
  onSuccess: () => void
}

const BatchPromotionModal: React.FC<BatchPromotionModalProps> = ({
  isOpen,
  onClose,
  batchInstanceId,
  currentSemester,
  onSuccess,
}) => {
  const [notes, setNotes] = useState('')
  const [promotionChecks, setPromotionChecks] = useState({
    marksFinalized: false,
    attendanceValid: false,
    teacherSubmissionsClosed: false,
    hodValidated: false,
    principalApproved: false,
  })
  const [checking, setChecking] = useState(false)

  const { data: batchInstance } = useBatchInstance(batchInstanceId)
  const { data: sectionsData } = useSections(batchInstanceId)
  const promoteMutation = usePromoteBatch()

  const sections = sectionsData?.items || []
  const nextSemester = currentSemester + 1

  // Simulate pre-promotion checks (in real implementation, these would be API calls)
  useEffect(() => {
    if (isOpen && batchInstanceId) {
      setChecking(true)
      // Simulate checking process
      setTimeout(() => {
        // In real implementation, these would be actual API calls to check:
        // - All subjects have marks finalized
        // - Attendance threshold validation
        // - Teacher submissions closed
        // - HOD validation
        // - Principal approval
        setPromotionChecks({
          marksFinalized: true, // Would check via API
          attendanceValid: true, // Would check via API
          teacherSubmissionsClosed: true, // Would check via API
          hodValidated: true, // Would check via API
          principalApproved: false, // Would check via API
        })
        setChecking(false)
      }, 1000)
    }
  }, [isOpen, batchInstanceId])

  const handlePromote = async () => {
    if (!promotionChecks.marksFinalized || !promotionChecks.attendanceValid || !promotionChecks.teacherSubmissionsClosed) {
      toast.error('Please ensure all pre-promotion checks are passed')
      return
    }

    if (!window.confirm(`Are you sure you want to promote this batch to Semester ${nextSemester}? This action cannot be undone.`)) {
      return
    }

    try {
      await promoteMutation.mutateAsync({
        batch_instance_id: batchInstanceId,
        notes: notes || undefined,
      })

      toast.success(`Batch promoted successfully to Semester ${nextSemester}!`)
      onSuccess()
      onClose()
      setNotes('')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      toast.error(err.response?.data?.detail || 'Failed to promote batch')
    }
  }

  const allChecksPassed = Object.values(promotionChecks).every((check) => check === true)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Promote Batch</h2>
              <p className="text-sm text-gray-600 mt-1">
                Promote batch from Semester {currentSemester} to Semester {nextSemester}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Pre-Promotion Checks */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Pre-Promotion Checks</h3>
            {checking ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin h-6 w-6 text-blue-500" />
                <span className="ml-2 text-gray-600">Checking promotion eligibility...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className={`flex items-center p-3 rounded-lg ${
                  promotionChecks.marksFinalized ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  {promotionChecks.marksFinalized ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mr-3" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">All Subjects Have Marks Finalized</p>
                    <p className="text-sm text-gray-600">
                      {promotionChecks.marksFinalized
                        ? 'All internal marks have been finalized and approved'
                        : 'Some subjects still have pending marks'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center p-3 rounded-lg ${
                  promotionChecks.attendanceValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  {promotionChecks.attendanceValid ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mr-3" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">Attendance Threshold Valid</p>
                    <p className="text-sm text-gray-600">
                      {promotionChecks.attendanceValid
                        ? 'All students meet minimum attendance requirements'
                        : 'Some students do not meet attendance requirements'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center p-3 rounded-lg ${
                  promotionChecks.teacherSubmissionsClosed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  {promotionChecks.teacherSubmissionsClosed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mr-3" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">Teacher Submissions Closed</p>
                    <p className="text-sm text-gray-600">
                      {promotionChecks.teacherSubmissionsClosed
                        ? 'All teachers have submitted their marks'
                        : 'Some teachers have not yet submitted marks'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center p-3 rounded-lg ${
                  promotionChecks.hodValidated ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  {promotionChecks.hodValidated ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mr-3" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">HOD Validation</p>
                    <p className="text-sm text-gray-600">
                      {promotionChecks.hodValidated
                        ? 'HOD has validated all marks'
                        : 'HOD validation pending'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center p-3 rounded-lg ${
                  promotionChecks.principalApproved ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  {promotionChecks.principalApproved ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mr-3" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">Principal Approval</p>
                    <p className="text-sm text-gray-600">
                      {promotionChecks.principalApproved
                        ? 'Principal has approved the promotion'
                        : 'Principal approval pending (optional)'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Promotion Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Promotion Details</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p><strong>Current Semester:</strong> Semester {currentSemester}</p>
              <p><strong>Next Semester:</strong> Semester {nextSemester}</p>
              <p><strong>Sections:</strong> {sections.length} section(s)</p>
              {batchInstance && (
                <p><strong>Batch Instance:</strong> ID {batchInstance.id}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Promotion Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any notes about this promotion..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{notes.length}/500 characters</p>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Important</p>
                <p className="text-sm text-yellow-800 mt-1">
                  This action will:
                </p>
                <ul className="text-sm text-yellow-800 mt-1 list-disc list-inside space-y-1">
                  <li>Freeze the current semester (Semester {currentSemester})</li>
                  <li>Create a new semester (Semester {nextSemester}) in draft status</li>
                  <li>Mark the old semester as archived</li>
                  <li>Promote all students to the next semester</li>
                  <li>Update the batch instance's current semester</li>
                </ul>
                <p className="text-sm text-yellow-800 mt-2 font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePromote}
            disabled={promoteMutation.isPending || !allChecksPassed || checking}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {promoteMutation.isPending ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Promoting...
              </>
            ) : (
              <>
                <ArrowRight size={18} className="mr-1" />
                Promote to Semester {nextSemester}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BatchPromotionModal

