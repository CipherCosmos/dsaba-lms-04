import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subjectAPI } from '../../services/api'
import { queryKeys } from './queryKeys'
import toast from 'react-hot-toast'
import type { AxiosErrorResponse } from '../types'
import type { SubjectUpdateRequest } from '../types/api'

/**
 * Hook to fetch all subjects
 */
export function useSubjects(skip: number = 0, limit: number = 100, filters?: { department_id?: number; is_active?: boolean }) {
  return useQuery({
    queryKey: queryKeys.subjects.list({ skip, limit, ...filters }),
    queryFn: () => subjectAPI.getAll(skip, limit, filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook to fetch a single subject
 */
export function useSubject(id: number) {
  return useQuery({
    queryKey: queryKeys.subjects.detail(id),
    queryFn: () => subjectAPI.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch subjects by department
 */
export function useSubjectsByDepartment(departmentId: number, skip: number = 0, limit: number = 100) {
  return useQuery({
    queryKey: queryKeys.subjects.byDepartment(departmentId, skip, limit),
    queryFn: () => subjectAPI.getByDepartment(departmentId, skip, limit),
    enabled: !!departmentId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook to create a subject
 */
export function useCreateSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: subjectAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.lists() })
      toast.success('Subject created successfully')
    },
    onError: (error: AxiosErrorResponse) => {
      toast.error(error.response?.data?.detail || 'Failed to create subject')
    },
  })
}

/**
 * Hook to update a subject
 */
export function useUpdateSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SubjectUpdateRequest }) => subjectAPI.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.lists() })
      toast.success('Subject updated successfully')
    },
    onError: (error: AxiosErrorResponse) => {
      toast.error(error.response?.data?.detail || 'Failed to update subject')
    },
  })
}

/**
 * Hook to delete a subject
 */
export function useDeleteSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: subjectAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.lists() })
      toast.success('Subject deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete subject')
    },
  })
}

