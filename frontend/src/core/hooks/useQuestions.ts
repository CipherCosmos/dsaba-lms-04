import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { questionAPI } from '../../services/api'
import { queryKeys } from './queryKeys'
import toast from 'react-hot-toast'
import type { AxiosErrorResponse } from '../types'
import type { QuestionUpdateRequest } from '../types/api'

/**
 * Hook to fetch questions by exam
 */
export function useQuestionsByExam(examId: number, section?: 'A' | 'B' | 'C', skip: number = 0, limit: number = 100) {
  return useQuery({
    queryKey: queryKeys.questions.byExam(examId, section),
    queryFn: () => questionAPI.getAll(examId, section, skip, limit),
    enabled: !!examId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch a single question
 */
export function useQuestion(id: number) {
  return useQuery({
    queryKey: queryKeys.questions.detail(id),
    queryFn: () => questionAPI.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch question CO mappings
 */
export function useQuestionCOMappings(questionId: number) {
  return useQuery({
    queryKey: queryKeys.questions.coMappings(questionId),
    queryFn: async () => {
      try {
        return await questionAPI.getCOMappings(questionId)
      } catch (error: AxiosErrorResponse) {
        // If endpoint doesn't exist, return empty array
        if (error.response?.status === 404) {
          return []
        }
        throw error
      }
    },
    enabled: !!questionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to create a question
 */
export function useCreateQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: questionAPI.create,
    onSuccess: (data) => {
      if (data.exam_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.questions.byExam(data.exam_id) })
      }
      toast.success('Question created successfully')
    },
    onError: (error: AxiosErrorResponse) => {
      toast.error(error.response?.data?.detail || 'Failed to create question')
    },
  })
}

/**
 * Hook to update a question
 */
export function useUpdateQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: QuestionUpdateRequest }) => questionAPI.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.detail(variables.id) })
      if (data.exam_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.questions.byExam(data.exam_id) })
      }
      toast.success('Question updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update question')
    },
  })
}

/**
 * Hook to delete a question
 */
export function useDeleteQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: questionAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.all })
      toast.success('Question deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete question')
    },
  })
}

/**
 * Hook to create question CO mapping
 */
export function useCreateQuestionCOMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: questionAPI.createCOMapping,
    onSuccess: (data) => {
      if (data.question_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.questions.coMappings(data.question_id) })
      }
      toast.success('CO mapping created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create CO mapping')
    },
  })
}

/**
 * Hook to delete question CO mapping
 */
export function useDeleteQuestionCOMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ questionId, coId }: { questionId: number; coId: number }) =>
      questionAPI.deleteCOMapping(questionId, coId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.coMappings(variables.questionId) })
      toast.success('CO mapping deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete CO mapping')
    },
  })
}

