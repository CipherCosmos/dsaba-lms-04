/**
 * Internal Marks Entry Page
 * Teachers can enter internal marks (IA1, IA2, Assignment, etc.) for their assigned subjects
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import {
  useInternalMarks,
  useCreateInternalMark,
  useBulkSubmitInternalMarks,
  useCurrentAcademicYear,
  useUpdateInternalMark,
} from '../../core/hooks'
import { useStudentEnrollments } from '../../core/hooks'
import { subjectAssignmentAPI, internalMarksAPI } from '../../services/api'
import { queryKeys } from '../../core/hooks/queryKeys'
import { LoadingFallback } from '../../modules/shared/components/LoadingFallback'
import { logger } from '../../core/utils/logger'
import { Upload, Download, Save, AlertCircle, CheckCircle2, BarChart3, Keyboard, Loader2, Settings, X, RefreshCw } from 'lucide-react'
import * as XLSX from 'xlsx'
import { queryClient } from '@/core/config/queryClient'

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

// Yup validation schema for marks entry
const marksValidationSchema = yup.object().shape({
  marks: yup
    .number()
    .min(0, 'Marks cannot be negative')
    .max(yup.ref('max_marks'), 'Marks cannot exceed maximum marks')
    .required('Marks are required'),
  max_marks: yup
    .number()
    .min(1, 'Maximum marks must be at least 1')
    .max(1000, 'Maximum marks cannot exceed 1000')
    .required('Maximum marks are required'),
  notes: yup
    .string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
})

/**
 * Debounces a value, delaying updates until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 * @param value - The value to debounce (type-safe for any type T)
 * @param delay - The number of milliseconds to delay
 * @returns The debounced value of type T
 */
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Student Row Component with React.memo for performance
const StudentRow = React.memo(({
  student,
  marks,
  onMarksChange,
  onSave,
  validationErrors,
  createMutation,
  onFocus,
  workflowState
}: {
  student: { id: number; roll_no?: string }
  marks: { marks: number; max_marks: number; notes?: string }
  onMarksChange: (studentId: number, field: string, value: string | number) => void
  onSave: (studentId: number) => void
  validationErrors: Record<number, Record<string, string>>
  createMutation: any
  onFocus: (studentId: number, field: 'marks' | 'max_marks' | 'notes') => void
  workflowState?: string
}) => {
  const studentErrors = validationErrors[student.id] || {}
  const hasErrors = Object.keys(studentErrors).length > 0

  const getWorkflowBadge = (state?: string) => {
    if (!state) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Not Entered
        </span>
      )
    }
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
    <tr className={hasErrors ? 'bg-red-50 border-red-300' : ''}>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {student.roll_no || student.id}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getWorkflowBadge(workflowState)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <input
            id={`student-${student.id}-marks`}
            type="number"
            step="0.01"
            min="0"
            max={marks?.max_marks || 100}
            value={marks?.marks || ''}
            onChange={(e) => onMarksChange(student.id, 'marks', parseFloat(e.target.value) || 0)}
            onFocus={() => onFocus(student.id, 'marks')}
            className={`w-24 px-2 py-1 border rounded-md ${
              studentErrors.marks ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {studentErrors.marks && (
            <p className="text-red-500 text-xs mt-1">{studentErrors.marks}</p>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <input
            id={`student-${student.id}-max_marks`}
            type="number"
            step="0.01"
            min="1"
            value={marks?.max_marks || 100}
            onChange={(e) => onMarksChange(student.id, 'max_marks', parseFloat(e.target.value) || 100)}
            onFocus={() => onFocus(student.id, 'max_marks')}
            className={`w-24 px-2 py-1 border rounded-md ${
              studentErrors.max_marks ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {studentErrors.max_marks && (
            <p className="text-red-500 text-xs mt-1">{studentErrors.max_marks}</p>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div>
          <input
            id={`student-${student.id}-notes`}
            type="text"
            value={marks?.notes || ''}
            onChange={(e) => onMarksChange(student.id, 'notes', e.target.value)}
            onFocus={() => onFocus(student.id, 'notes')}
            className="w-full px-2 py-1 border border-gray-300 rounded-md"
            placeholder="Optional notes"
          />
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={() => onSave(student.id)}
          disabled={createMutation.isPending || hasErrors}
          className={`px-3 py-1 rounded-md text-sm ${
            hasErrors
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {createMutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  )
})

const InternalMarksEntry: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null)
  const [selectedAssignmentDetails, setSelectedAssignmentDetails] = useState<SubjectAssignment | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<string>('ia1')
  const [marks, setMarks] = useState<Record<number, { marks: number; max_marks: number; notes?: string }>>({})
  const [students, setStudents] = useState<Array<{ id: number; roll_no?: string }>>([])

  // New features state
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<number, Record<string, string>>>({})
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [currentFocusIndex, setCurrentFocusIndex] = useState<{ studentId: number; field: 'marks' | 'max_marks' | 'notes' } | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; success: number; errors: number } | null>(null)
  const [bulkErrors, setBulkErrors] = useState<Array<{ student_id: number; error: string }>>([])
  const [showBulkErrorModal, setShowBulkErrorModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50) // Show 50 students per page for performance

  // React Query hooks
  const { data: currentAcademicYear } = useCurrentAcademicYear()
  const { data: marksData, isLoading: loadingMarks } = useInternalMarks(
    0,
    1000,
    selectedAssignment
      ? {
          subject_assignment_id: selectedAssignment,
        }
      : undefined
  )
  const createMutation = useCreateInternalMark()
  const updateMutation = useUpdateInternalMark()
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
      setHasUnsavedChanges(false)
    }
  }, [selectedAssignment])

  useEffect(() => {
    if (selectedAssignmentDetails && enrollmentsData?.items) {
      // Get student IDs from enrollments
      const studentIds = enrollmentsData.items.map((e: { student_id: number }) => e.student_id)
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
      setStudents(enrollmentsData.items.map((e: { student_id: number; roll_no?: string }) => ({ id: e.student_id, roll_no: e.roll_no })))
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

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true)
  }, [marks])

  // Debounced marks for auto-save
  const debouncedMarks = useDebounce(marks, 2000) // 2 second debounce

  // Auto-save effect
  useEffect(() => {
    if (autoSaveEnabled && selectedAssignment && selectedAssignmentDetails && Object.keys(debouncedMarks).length > 0) {
      const autoSaveMarks = async () => {
        setSaving(true)
        try {
          // Auto-save all marks that have been modified
          const promises = Object.entries(debouncedMarks).map(async ([studentId, markData]: [string, any]) => {
            if (markData.marks > 0) {
              const academicYearId = selectedAssignmentDetails.academic_year_id || selectedAssignmentDetails.academic_year || currentAcademicYear?.id
              if (!academicYearId || !selectedAssignmentDetails.semester_id) return
              const existing = existingMarkByStudent.get(parseInt(studentId))

              if (existing?.id) {
                updateMutation.mutate({
                  id: existing.id,
                  data: {
                    marks_obtained: markData.marks,
                    notes: markData.notes,
                  },
                })
              } else {
                createMutation.mutate({
                  student_id: parseInt(studentId),
                  subject_assignment_id: selectedAssignment,
                  semester_id: selectedAssignmentDetails.semester_id,
                  academic_year_id: academicYearId,
                  component_type: selectedComponent,
                  marks_obtained: markData.marks,
                  max_marks: markData.max_marks,
                  notes: markData.notes,
                })
              }
            }
          })

          await Promise.all(promises)
          setLastSaved(new Date())
          setHasUnsavedChanges(false)
        } catch (error) {
          logger.error('Auto-save failed:', error as Error)
          // Don't show toast for auto-save failures to avoid spam
        } finally {
          setSaving(false)
        }
      }

      autoSaveMarks()
    }
  }, [debouncedMarks, selectedAssignment, selectedAssignmentDetails, selectedComponent, currentAcademicYear, autoSaveEnabled, marksData])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S for save all
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleBulkSave()
      }
      // Ctrl+U for bulk upload
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault()
        document.getElementById('bulk-upload')?.click()
      }
      // Ctrl+E for export template
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault()
        handleExportTemplate()
      }
      // F1 for keyboard help
      if (e.key === 'F1') {
        e.preventDefault()
        setShowKeyboardHelp(prev => !prev)
      }
      // Tab navigation
      if (e.key === 'Tab') {
        const target = e.target as HTMLElement | null
        const inGrid = !!target && target.id?.startsWith('student-')
        if (!inGrid) return
        e.preventDefault()
        if (currentFocusIndex) {
          const currentStudentIndex = students.findIndex(s => s.id === currentFocusIndex.studentId)
          if (currentStudentIndex !== -1) {
            let newIndex = currentStudentIndex
            let newField = currentFocusIndex.field

            if (e.shiftKey) {
              // Shift+Tab: previous field
              if (newField === 'marks') newField = 'max_marks'
              else if (newField === 'max_marks') newField = 'notes'
              else {
                // Go to previous student's notes
                newIndex = Math.max(currentStudentIndex - 1, 0)
                newField = 'notes'
              }
            } else {
              // Tab: next field
              if (newField === 'marks') newField = 'max_marks'
              else if (newField === 'max_marks') newField = 'notes'
              else {
                // Go to next student's marks
                newIndex = Math.min(currentStudentIndex + 1, students.length - 1)
                newField = 'marks'
              }
            }

            setCurrentFocusIndex({ studentId: students[newIndex].id, field: newField })
            const elementId = `student-${students[newIndex].id}-${newField}`
            setTimeout(() => {
              const element = document.getElementById(elementId)
              if (element) {
                element.focus()
                ;(element as HTMLInputElement).select()
              }
            }, 0)
          }
        }
      }
      // Arrow navigation
      if (currentFocusIndex && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const target = e.target as HTMLElement | null
        const inGrid = !!target && target.id?.startsWith('student-')
        if (!inGrid) return
        const currentStudentIndex = students.findIndex(s => s.id === currentFocusIndex.studentId)
        if (currentStudentIndex !== -1) {
          let newIndex = currentStudentIndex
          let newField = currentFocusIndex.field

          switch (e.key) {
            case 'ArrowDown':
              e.preventDefault()
              newIndex = Math.min(currentStudentIndex + 1, students.length - 1)
              break
            case 'ArrowUp':
              e.preventDefault()
              newIndex = Math.max(currentStudentIndex - 1, 0)
              break
            case 'ArrowRight':
              e.preventDefault()
              if (newField === 'marks') newField = 'max_marks'
              else if (newField === 'max_marks') newField = 'notes'
              break
            case 'ArrowLeft':
              e.preventDefault()
              if (newField === 'notes') newField = 'max_marks'
              else if (newField === 'max_marks') newField = 'marks'
              break
            case 'Enter':
              e.preventDefault()
              handleSave(students[newIndex].id)
              break
          }

          if (newIndex !== currentStudentIndex || newField !== currentFocusIndex.field) {
            setCurrentFocusIndex({ studentId: students[newIndex].id, field: newField })
            const elementId = `student-${students[newIndex].id}-${newField}`
            setTimeout(() => {
              const element = document.getElementById(elementId)
              if (element) {
                element.focus()
                ;(element as HTMLInputElement).select()
              }
            }, 0)
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, []) // Empty dependency array; handlers are accessed via refs below

  // Before unload handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Calculate stats
  const stats = useMemo(() => {
    const studentMarks = Object.values(marks)
    const totalStudents = students.length
    const enteredMarks = studentMarks.filter(m => m.marks > 0).length
    const incompleteCount = totalStudents - enteredMarks
    const average = enteredMarks > 0
      ? studentMarks.reduce((sum, m) => sum + (m.marks > 0 ? m.marks : 0), 0) / enteredMarks
      : 0
    const maxScore = Math.max(...studentMarks.map(m => m.marks).filter(m => m > 0), 0)
    const minScore = Math.min(...studentMarks.map(m => m.marks).filter(m => m > 0), 100)

    return {
      totalStudents,
      enteredMarks,
      incompleteCount,
      average: average.toFixed(2),
      maxScore,
      minScore,
      completionRate: totalStudents > 0 ? ((enteredMarks / totalStudents) * 100).toFixed(1) : '0'
    }
  }, [marks, students])

  // Paginated students
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return students.slice(startIndex, endIndex)
  }, [students, currentPage, pageSize])

  const totalPages = Math.ceil(students.length / pageSize)

  const existingMarkByStudent = useMemo(() => {
    const map = new Map<number, InternalMark>()
    if (marksData?.items && selectedComponent) {
      marksData.items.forEach((m: InternalMark) => {
        if (m.component_type === selectedComponent) {
          map.set(m.student_id, m)
        }
      })
    }
    return map
  }, [marksData, selectedComponent])

  const fetchSubjectAssignments = async () => {
    try {
      // Fetch assignments for current teacher (using user_id)
      const response = await subjectAssignmentAPI.getByUserId(user?.id || 0, 0, 100)
      setSubjectAssignments(response.items || [])
    } catch (error) {
      logger.error('Error fetching subject assignments:', error as Error)
    }
  }

  const fetchAssignmentDetails = async () => {
    if (!selectedAssignment) return
    try {
      const assignment = await subjectAssignmentAPI.getById(selectedAssignment)
      setSelectedAssignmentDetails(assignment)
    } catch (error) {
      logger.error('Error fetching assignment details:', error as Error)
    }
  }

  const handleMarksChange = useCallback(async (studentId: number, field: string, value: any) => {
    const newMarks = {
      ...marks,
      [studentId]: {
        ...marks[studentId],
        [field]: value
      }
    }
    setMarks(newMarks)
    if (field === 'marks' || field === 'max_marks') {
      // Debounced validation
      setTimeout(() => validateMarks(studentId, newMarks[studentId]), 300)
    }
  }, [marks])

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
    const items = (marksData?.items || []).filter((m: InternalMark) => m.component_type === selectedComponent)
    const counts = {
      draft: items.filter((m: InternalMark) => m.workflow_state === 'draft').length,
      submitted: items.filter((m: InternalMark) => m.workflow_state === 'submitted').length,
      approved: items.filter((m: InternalMark) => m.workflow_state === 'approved').length,
      rejected: items.filter((m: InternalMark) => m.workflow_state === 'rejected').length,
    }
    if (!window.confirm(`Submit ${counts.draft} draft marks for approval? (Submitted: ${counts.submitted}, Approved: ${counts.approved}, Rejected: ${counts.rejected})`)) {
      return
    }
    const markIds = (marksData?.items || [])
      .filter((m: InternalMark) => m.component_type === selectedComponent && m.workflow_state === 'draft')
      .map((m: InternalMark) => m.id)
    bulkSubmitMutation.mutate({
      subject_assignment_id: selectedAssignment,
      mark_ids: markIds,
    })
  }

  const handleBulkSave = useCallback(async () => {
    if (!selectedAssignment || !selectedAssignmentDetails) return

    try {
      setSaving(true)
      const promises = Object.entries(marks).map(async ([studentId, markData]) => {
        if (markData.marks > 0) {
          const academicYearId = selectedAssignmentDetails.academic_year_id || selectedAssignmentDetails.academic_year || currentAcademicYear?.id
          if (!academicYearId || !selectedAssignmentDetails.semester_id) return

          const existing = existingMarkByStudent.get(parseInt(studentId))

          if (existing?.id) {
            await updateMutation.mutateAsync({
              id: existing.id,
              data: {
                marks_obtained: markData.marks,
                notes: markData.notes,
              },
            })
          } else {
            await createMutation.mutateAsync({
              student_id: parseInt(studentId),
              subject_assignment_id: selectedAssignment,
              semester_id: selectedAssignmentDetails.semester_id,
              academic_year_id: academicYearId,
              component_type: selectedComponent,
              marks_obtained: markData.marks,
              max_marks: markData.max_marks,
              notes: markData.notes,
            })
          }
        }
      })

      await Promise.all(promises)
      setLastSaved(new Date())
      setHasUnsavedChanges(false)
      toast.success('All marks saved successfully!')
    } catch (error) {
      logger.error('Bulk save failed:', error as Error)
      toast.error('Failed to save some marks. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [selectedAssignment, selectedAssignmentDetails, currentAcademicYear, marks, selectedComponent, marksData])

  const handleExportTemplate = useCallback(() => {
    if (!students.length) {
      toast.error('No students found to export template')
      return
    }

    // Create template data
    const templateData = students.map(student => ({
      'Student ID': student.id,
      'Roll No': student.roll_no || '',
      'Marks Obtained': '',
      'Max Marks': 100,
      'Notes': ''
    }))

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Marks Template')

    // Download file
    XLSX.writeFile(wb, `marks_template_${selectedComponent}_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Template exported successfully!')
  }, [students, selectedComponent])

  const handleBulkUpload = async (file: File) => {
    if (!selectedAssignment || !selectedAssignmentDetails) {
      toast.error('Please select a subject assignment first')
      return
    }

    setBulkUploading(true)
    setBulkProgress({ current: 0, total: 0, success: 0, errors: 0 })
    setBulkErrors([])
    try {
      let data: any[] = []

      // Parse file based on extension
      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const text = await file.text()
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length < 2) {
          toast.error('CSV file must contain at least a header row and one data row')
          return
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        const studentIdIdx = headers.findIndex(h => h.includes('student') && h.includes('id'))
        const rollNoIdx = headers.findIndex(h => h.includes('roll'))
        const marksIdx = headers.findIndex(h => h.includes('marks') && h.includes('obtained'))
        const maxMarksIdx = headers.findIndex(h => h.includes('max') && h.includes('marks'))
        const notesIdx = headers.findIndex(h => h.includes('notes'))

        if (studentIdIdx === -1 || marksIdx === -1) {
          toast.error('CSV must contain "Student ID" and "Marks Obtained" columns')
          return
        }

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim())
          if (values[studentIdIdx] && values[marksIdx]) {
            data.push({
              student_id: parseInt(values[studentIdIdx]),
              marks: parseFloat(values[marksIdx]) || 0,
              max_marks: parseFloat(values[maxMarksIdx]) || 100,
              notes: values[notesIdx] || ''
            })
          }
        }
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Parse Excel
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        data = XLSX.utils.sheet_to_json(worksheet)

        // Transform Excel data to expected format
        data = data.map((row: any) => ({
          student_id: parseInt(row['Student ID'] || row['student_id'] || row['StudentID']),
          marks: parseFloat(row['Marks Obtained'] || row['marks'] || row['Marks']) || 0,
          max_marks: parseFloat(row['Max Marks'] || row['max_marks'] || row['MaxMarks']) || 100,
          notes: row['Notes'] || row['notes'] || ''
        }))
      }

      if (data.length === 0) {
        toast.error('No valid data found in file')
        return
      }

      setBulkProgress({ current: 0, total: data.length, success: 0, errors: 0 })

      // Validate and save data
      const academicYearId = selectedAssignmentDetails.academic_year_id || selectedAssignmentDetails.academic_year || currentAcademicYear?.id
      if (!academicYearId || !selectedAssignmentDetails.semester_id) {
        toast.error('Missing academic year or semester information')
        return
      }

      const errors: Array<{ student_id: number; error: string }> = []
      const promises = data.map(async (row: any, index: number) => {
        try {
          // Validate using Yup
          await marksValidationSchema.validate({
            marks: row.marks,
            max_marks: row.max_marks,
            notes: row.notes
          })

          // Check if student exists
          const studentExists = students.some(s => s.id === row.student_id)
          if (!studentExists) {
            errors.push({ student_id: row.student_id, error: 'Student not found in this subject' })
            return
          }

          const existing = existingMarkByStudent.get(row.student_id)
          if (existing?.id) {
            await updateMutation.mutateAsync({
              id: existing.id,
              data: {
                marks_obtained: row.marks,
                notes: row.notes,
              },
            })
          } else {
            await createMutation.mutateAsync({
              student_id: row.student_id,
              subject_assignment_id: selectedAssignment,
              semester_id: selectedAssignmentDetails.semester_id,
              academic_year_id: academicYearId,
              component_type: selectedComponent,
              marks_obtained: row.marks,
              max_marks: row.max_marks,
              notes: row.notes,
            })
          }

          setBulkProgress(prev => prev ? { ...prev, current: prev.current + 1, success: prev.success + 1 } : null)
        } catch (error: any) {
          errors.push({ student_id: row.student_id, error: error.message })
          setBulkProgress(prev => prev ? { ...prev, current: prev.current + 1, errors: prev.errors + 1 } : null)
        }
      })

      await Promise.all(promises)

      setBulkErrors(errors)

      if (errors.length > 0) {
        setShowBulkErrorModal(true)
        toast.error(`${errors.length} rows had errors. Check the error report.`)
      } else {
        toast.success(`Successfully uploaded ${data.length} marks!`)
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
        if (selectedAssignment) {
          const qc = useQueryClient()
          qc.invalidateQueries({
            queryKey: queryKeys.internalMarks.list(0, 1000, { subject_assignment_id: selectedAssignment }),
          })
        }
      }
    } catch (error: any) {
      logger.error('Bulk upload failed:', error)
      toast.error(`Upload failed: ${error.message}`)
    } finally {
      setBulkUploading(false)
      setBulkProgress(null)
    }
  }

  const handleDownloadErrorReport = () => {
    if (bulkErrors.length === 0) return

    const errorData = bulkErrors.map(error => ({
      'Student ID': error.student_id,
      'Error': error.error
    }))

    const ws = XLSX.utils.json_to_sheet(errorData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Error Report')

    XLSX.writeFile(wb, `bulk_upload_errors_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleRetryFailedUploads = async () => {
    if (bulkErrors.length === 0 || !selectedAssignment || !selectedAssignmentDetails) return

    setBulkUploading(true)
    setBulkProgress({ current: 0, total: bulkErrors.length, success: 0, errors: 0 })

    const academicYearId = selectedAssignmentDetails.academic_year_id || selectedAssignmentDetails.academic_year || currentAcademicYear?.id
    if (!academicYearId || !selectedAssignmentDetails.semester_id) {
      toast.error('Missing academic year or semester information')
      return
    }

    const remainingErrors: Array<{ student_id: number; error: string }> = []

    const promises = bulkErrors.map(async (errorItem, index) => {
      try {
        // Find original data for retry - this is simplified, in real implementation you'd store original data
        const student = students.find(s => s.id === errorItem.student_id)
        if (!student) {
          remainingErrors.push(errorItem)
          return
        }

        const markData = marks[student.id]
        if (!markData) {
          remainingErrors.push(errorItem)
          return
        }

        await createMutation.mutateAsync({
          student_id: student.id,
          subject_assignment_id: selectedAssignment,
          semester_id: selectedAssignmentDetails.semester_id,
          academic_year_id: academicYearId,
          component_type: selectedComponent,
          marks_obtained: markData.marks,
          max_marks: markData.max_marks,
          notes: markData.notes,
        })

        setBulkProgress(prev => prev ? { ...prev, current: prev.current + 1, success: prev.success + 1 } : null)
      } catch (error: any) {
        remainingErrors.push({ ...errorItem, error: error.message })
        setBulkProgress(prev => prev ? { ...prev, current: prev.current + 1, errors: prev.errors + 1 } : null)
      }
    })

    await Promise.all(promises)

    setBulkErrors(remainingErrors)

      if (remainingErrors.length === 0) {
        toast.success('All failed uploads retried successfully!')
        setShowBulkErrorModal(false)
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
        if (selectedAssignment) {
          const qc = useQueryClient()
          qc.invalidateQueries({
            queryKey: queryKeys.internalMarks.list(0, 1000, { subject_assignment_id: selectedAssignment }),
          })
        }
    } else {
      toast.error(`${remainingErrors.length} uploads still failed.`)
    }

    setBulkUploading(false)
    setBulkProgress(null)
  }

  const validateMarks = async (studentId: number, fieldData: { marks: number; max_marks: number; notes?: string }) => {
    try {
      await marksValidationSchema.validate(fieldData)
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[studentId]
        return newErrors
      })
      return true
    } catch (error: any) {
      setValidationErrors(prev => ({
        ...prev,
        [studentId]: { [error.path]: error.message }
      }))
      return false
    }
  }

  const handleAssignmentChange = (newAssignment: number | null) => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Are you sure you want to change the assignment?')) {
      return
    }
    setSelectedAssignment(newAssignment)
  }

  const handleComponentChange = (newComponent: string) => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Are you sure you want to change the component?')) {
      return
    }
    setSelectedComponent(newComponent)
  }

  const handleFixAllErrors = () => {
    const firstErrorStudent = Object.keys(validationErrors).find(studentId => Object.keys(validationErrors[parseInt(studentId)]).length > 0)
    if (firstErrorStudent) {
      const studentId = parseInt(firstErrorStudent)
      const firstErrorField = Object.keys(validationErrors[studentId])[0] as 'marks' | 'max_marks' | 'notes'
      setCurrentFocusIndex({ studentId, field: firstErrorField })
      const elementId = `student-${studentId}-${firstErrorField}`
      setTimeout(() => {
        const element = document.getElementById(elementId)
        if (element) {
          element.focus()
          ;(element as HTMLInputElement).select()
        }
      }, 0)
    }
  }

  const getWorkflowStateForStudent = (studentId: number) => {
    if (!marksData?.items) return undefined
    const mark = marksData.items.find((m: InternalMark) => m.student_id === studentId && m.component_type === selectedComponent)
    return mark?.workflow_state
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Internal Marks Entry</h1>
          <div className="flex items-center space-x-4 mt-2">
            {saving ? (
              <span className="text-blue-600 flex items-center">
                <Loader2 size={16} className="mr-1 animate-spin" />
                Saving...
              </span>
            ) : lastSaved ? (
              <span className="text-green-600 flex items-center">
                <CheckCircle2 size={16} className="mr-1" />
                All changes saved
              </span>
            ) : null}
            <button
              onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
              className={`px-3 py-1 rounded-md text-sm flex items-center ${autoSaveEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
              title="Toggle Auto-Save"
            >
              <Settings size={14} className="mr-1" />
              Auto-Save {autoSaveEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
              className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
              title="Keyboard Shortcuts (F1)"
            >
              <Keyboard size={16} className="mr-1" />
              Shortcuts
            </button>
          </div>
        </div>
        {selectedAssignment && (
          <div className="flex space-x-2">
            <button
              onClick={handleBulkSave}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              title="Save All (Ctrl+S)"
            >
              <Save size={16} className="mr-2" />
              Save All
            </button>
            <button
              onClick={handleExportTemplate}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
              title="Export Template (Ctrl+E)"
            >
              <Download size={16} className="mr-2" />
              Template
            </button>
            <button
              onClick={() => document.getElementById('bulk-upload')?.click()}
              disabled={bulkUploading}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center"
              title="Bulk Upload (Ctrl+U)"
            >
              <Upload size={16} className="mr-2" />
              {bulkUploading ? 'Uploading...' : 'Upload'}
            </button>
            <input
              id="bulk-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleBulkUpload(e.target.files[0])}
            />
            <button
              onClick={handleBulkSubmit}
              disabled={bulkSubmitMutation.isPending}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkSubmitMutation.isPending ? 'Submitting...' : 'Submit All for Approval'}
            </button>
          </div>
        )}
      </div>

      {/* Validation Error Summary */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex justify-between items-center">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-800 font-medium">
              {Object.keys(validationErrors).length} validation error(s) found
            </span>
          </div>
          <button
            onClick={handleFixAllErrors}
            className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700"
          >
            Fix All Errors
          </button>
        </div>
      )}

      {/* Bulk Upload Progress */}
      {bulkProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-800 font-medium">Bulk Upload Progress</span>
            <span className="text-sm text-blue-600">
              {bulkProgress.current}/{bulkProgress.total} processed
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-green-600">Success: {bulkProgress.success}</span>
            <span className="text-red-600">Errors: {bulkProgress.errors}</span>
          </div>
        </div>
      )}

      {/* Bulk Error Modal */}
      {showBulkErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Bulk Upload Errors</h3>
              <button
                onClick={() => setShowBulkErrorModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2 mb-4">
              {bulkErrors.map((error, index) => (
                <div key={index} className="bg-red-50 p-3 rounded border">
                  <span className="font-medium">Student {error.student_id}:</span> {error.error}
                </div>
              ))}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleDownloadErrorReport}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Download Error Report
              </button>
              <button
                onClick={handleRetryFailedUploads}
                disabled={bulkUploading}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {bulkUploading ? 'Retrying...' : 'Retry Failed Uploads'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      {showKeyboardHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">Keyboard Shortcuts</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div><kbd className="bg-white px-2 py-1 rounded">Ctrl+S</kbd> Save All</div>
            <div><kbd className="bg-white px-2 py-1 rounded">Ctrl+U</kbd> Bulk Upload</div>
            <div><kbd className="bg-white px-2 py-1 rounded">Ctrl+E</kbd> Export Template</div>
            <div><kbd className="bg-white px-2 py-1 rounded">F1</kbd> Toggle Help</div>
            <div><kbd className="bg-white px-2 py-1 rounded">↑↓</kbd> Navigate Rows</div>
            <div><kbd className="bg-white px-2 py-1 rounded">←→</kbd> Navigate Fields</div>
            <div><kbd className="bg-white px-2 py-1 rounded">Enter</kbd> Save Row</div>
            <div><kbd className="bg-white px-2 py-1 rounded">Tab</kbd> Next Field</div>
            <div><kbd className="bg-white px-2 py-1 rounded">Shift+Tab</kbd> Previous Field</div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {selectedAssignment && students.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalStudents}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.enteredMarks}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Incomplete</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.incompleteCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.average}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Highest</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.maxScore}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Lowest</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.minScore}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-indigo-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completion</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completionRate}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Assignment *
            </label>
            <select
              value={selectedAssignment || ''}
              onChange={(e) => handleAssignmentChange(parseInt(e.target.value) || null)}
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
              onChange={(e) => handleComponentChange(e.target.value)}
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
                  Status
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
              {paginatedStudents.map((student) => (
                <StudentRow
                  key={student.id}
                  student={student}
                  marks={marks[student.id] || { marks: 0, max_marks: 100, notes: '' }}
                  onMarksChange={handleMarksChange}
                  onSave={handleSave}
                  validationErrors={validationErrors}
                  createMutation={createMutation}
                  onFocus={(studentId, field) => setCurrentFocusIndex({ studentId, field })}
                  workflowState={getWorkflowStateForStudent(student.id)}
                />
              ))}
            </tbody>
          </table>
          {students.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No students found for this subject assignment
            </div>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, students.length)} of {students.length} students
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default InternalMarksEntry
