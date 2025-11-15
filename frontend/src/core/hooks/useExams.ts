import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { examAPI, questionAPI } from '../../services/api'
import { queryKeys } from './queryKeys'
import toast from 'react-hot-toast'

/**
 * Hook to fetch all exams
 */
export function useExams(skip: number = 0, limit: number = 100, filters?: { status?: string; exam_type?: string; subject_assignment_id?: number }, forceRefresh = false) {
  return useQuery({
    queryKey: queryKeys.exams.list({ skip, limit, ...filters }),
    queryFn: () => examAPI.getAll(skip, limit, filters, forceRefresh),
    staleTime: forceRefresh ? 0 : 1000 * 60 * 2, // 2 minutes if not forced
  })
}

/**
 * Hook to fetch a single exam
 */
export function useExam(id: number) {
  return useQuery({
    queryKey: queryKeys.exams.detail(id),
    queryFn: () => examAPI.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch exam questions
 */
export function useExamQuestions(examId: number) {
  return useQuery({
    queryKey: queryKeys.exams.questions(examId),
    queryFn: () => examAPI.getQuestions(examId),
    enabled: !!examId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to create an exam
 */
export function useCreateExam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: examAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.lists() })
      toast.success('Exam created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create exam')
    },
  })
}

/**
 * Hook to update an exam
 */
export function useUpdateExam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => examAPI.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.lists() })
      toast.success('Exam updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update exam')
    },
  })
}

/**
 * Hook to delete an exam
 */
export function useDeleteExam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: examAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.lists() })
      toast.success('Exam deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete exam')
    },
  })
}

/**
 * Hook to activate an exam
 */
export function useActivateExam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      // Backend has a separate activate endpoint at POST /exams/{id}/activate
      const apiUrl = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/v1/exams/${id}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) throw new Error('Failed to activate exam')
      return response.json()
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.lists() })
      toast.success('Exam activated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to activate exam')
    },
  })
}

/**
 * Hook to lock an exam
 */
export function useLockExam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      // Backend has a separate lock endpoint at POST /exams/{id}/lock
      const apiUrl = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/v1/exams/${id}/lock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) throw new Error('Failed to lock exam')
      return response.json()
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.marks.all })
      toast.success('Exam locked successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to lock exam')
    },
  })
}

