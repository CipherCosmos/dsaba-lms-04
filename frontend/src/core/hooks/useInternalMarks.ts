import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { internalMarksAPI } from '../../services/api'
import { queryKeys } from './queryKeys'
import toast from 'react-hot-toast'

/**
 * Hook to fetch internal marks
 */
export function useInternalMarks(
  skip: number = 0,
  limit: number = 100,
  filters?: {
    student_id?: number
    subject_assignment_id?: number
    semester_id?: number
    academic_year_id?: number
    workflow_state?: string
  }
) {
  return useQuery({
    queryKey: queryKeys.internalMarks.list(skip, limit, filters),
    queryFn: () => internalMarksAPI.getAll(skip, limit, filters),
    staleTime: 1000 * 60 * 1, // 1 minute (marks change frequently)
  })
}

/**
 * Hook to fetch internal mark by ID
 */
export function useInternalMark(id: number) {
  return useQuery({
    queryKey: queryKeys.internalMarks.detail(id),
    queryFn: () => internalMarksAPI.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 1, // 1 minute
  })
}

/**
 * Hook to fetch submitted marks awaiting approval
 */
export function useSubmittedMarks(skip: number = 0, limit: number = 100, department_id?: number) {
  return useQuery({
    queryKey: queryKeys.internalMarks.submitted(skip, limit, department_id),
    queryFn: () => internalMarksAPI.getSubmitted(skip, limit, department_id),
    staleTime: 1000 * 30, // 30 seconds (submitted marks change frequently)
    refetchInterval: 1000 * 60, // Refetch every minute
  })
}

/**
 * Hook to create/update internal mark
 */
export function useCreateInternalMark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      student_id: number
      subject_assignment_id: number
      semester_id: number
      academic_year_id: number
      component_type: string
      marks_obtained: number
      max_marks: number
      notes?: string
    }) => internalMarksAPI.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.all })
      if (data.subject_assignment_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.internalMarks.list(0, 100, { subject_assignment_id: data.subject_assignment_id }),
        })
      }
      toast.success('Marks saved successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to save marks')
    },
  })
}

/**
 * Hook to update internal mark
 */
export function useUpdateInternalMark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { marks_obtained: number; notes?: string } }) =>
      internalMarksAPI.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.all })
      toast.success('Marks updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update marks')
    },
  })
}

/**
 * Hook to submit mark for approval
 */
export function useSubmitInternalMark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (markId: number) => internalMarksAPI.submit(markId),
    onSuccess: (data, markId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.detail(markId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.all })
      toast.success('Marks submitted for approval')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to submit marks')
    },
  })
}

/**
 * Hook to bulk submit marks
 */
export function useBulkSubmitInternalMarks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { subject_assignment_id: number; mark_ids?: number[] }) =>
      internalMarksAPI.bulkSubmit(data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.internalMarks.list(0, 100, {
          subject_assignment_id: variables.subject_assignment_id,
        }),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.submitted() })
      toast.success(`Successfully submitted ${data.submitted || 0} marks for approval`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to submit marks')
    },
  })
}

/**
 * Hook to approve mark
 */
export function useApproveInternalMark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (markId: number) => internalMarksAPI.approve(markId),
    onSuccess: (data, markId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.detail(markId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.submitted() })
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.all })
      toast.success('Marks approved successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to approve marks')
    },
  })
}

/**
 * Hook to reject mark
 */
export function useRejectInternalMark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ markId, reason }: { markId: number; reason: string }) =>
      internalMarksAPI.reject(markId, reason),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.detail(variables.markId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.submitted() })
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.all })
      toast.success('Marks rejected')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to reject marks')
    },
  })
}

/**
 * Hook to freeze mark
 */
export function useFreezeInternalMark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (markId: number) => internalMarksAPI.freeze(markId),
    onSuccess: (data, markId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.detail(markId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.all })
      toast.success('Marks frozen successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to freeze marks')
    },
  })
}

/**
 * Hook to publish mark
 */
export function usePublishInternalMark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (markId: number) => internalMarksAPI.publish(markId),
    onSuccess: (data, markId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.detail(markId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.internalMarks.all })
      toast.success('Marks published successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to publish marks')
    },
  })
}

