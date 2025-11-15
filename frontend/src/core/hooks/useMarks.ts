import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { marksAPI, examAPI } from '../../services/api'
import { queryKeys } from './queryKeys'
import toast from 'react-hot-toast'

/**
 * Hook to fetch marks by exam
 */
export function useMarksByExam(examId: number, skip: number = 0, limit: number = 1000) {
  return useQuery({
    queryKey: queryKeys.marks.byExam(examId, skip, limit),
    queryFn: () => marksAPI.getByExam(examId, skip, limit),
    enabled: !!examId,
    staleTime: 1000 * 60 * 1, // 1 minute (marks change frequently)
  })
}

/**
 * Hook to fetch marks by student
 */
export function useMarksByStudent(studentId: number) {
  return useQuery({
    queryKey: queryKeys.marks.byStudent(studentId),
    queryFn: () => marksAPI.getByStudent(studentId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook to fetch exam lock status
 */
export function useExamLockStatus(examId: number) {
  return useQuery({
    queryKey: queryKeys.marks.lockStatus(examId),
    queryFn: () => marksAPI.getLockStatus(examId),
    enabled: !!examId,
    staleTime: 1000 * 30, // 30 seconds (status changes)
    refetchInterval: 1000 * 60, // Refetch every minute
  })
}

/**
 * Hook to create marks (single)
 */
export function useCreateMark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => marksAPI.create(data),
    onSuccess: (data: any) => {
      const examId = data.exam_id
      if (examId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.marks.byExam(examId) })
      }
      if (data.student_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.marks.byStudent(data.student_id) })
      }
      toast.success('Marks saved successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to save marks')
    },
  })
}

/**
 * Hook to bulk create marks
 */
export function useBulkCreateMarks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ examId, marks }: { examId: number; marks: any[] }) => marksAPI.bulkCreate(examId, marks),
    onSuccess: (data: any[]) => {
      // Invalidate marks queries for all affected exams and students
      const examIds = new Set(data.map((mark: any) => mark.exam_id))
      const studentIds = new Set(data.map((mark: any) => mark.student_id))
      
      examIds.forEach((examId: number) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.marks.byExam(examId) })
      })
      studentIds.forEach((studentId: number) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.marks.byStudent(studentId) })
      })
      
      toast.success(`Successfully saved marks for ${data.length} students`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to save marks')
    },
  })
}

/**
 * Hook to update marks
 */
export function useUpdateMark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => marksAPI.update(id, data),
    onSuccess: (data: any) => {
      const examId = data.exam_id
      if (examId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.marks.byExam(examId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.marks.lockStatus(examId) })
      }
      if (data.student_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.marks.byStudent(data.student_id) })
      }
      toast.success('Marks updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update marks')
    },
  })
}

/**
 * Hook to delete marks
 */
export function useDeleteMark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: marksAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marks.all })
      toast.success('Marks deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete marks')
    },
  })
}

