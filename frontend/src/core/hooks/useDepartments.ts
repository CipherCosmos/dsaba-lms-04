import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { departmentAPI } from '../../services/api'
import { queryKeys } from './queryKeys'
import toast from 'react-hot-toast'
import type { AxiosErrorResponse } from '../types'
import type { DepartmentUpdateRequest } from '../types/api'

/**
 * Hook to fetch all departments
 */
export function useDepartments(skip: number = 0, limit: number = 100, filters?: { is_active?: boolean; has_hod?: boolean }) {
  return useQuery({
    queryKey: queryKeys.departments.list({ skip, limit, ...filters }),
    queryFn: () => departmentAPI.getAll(skip, limit, filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch a single department
 */
export function useDepartment(id: number) {
  return useQuery({
    queryKey: queryKeys.departments.detail(id),
    queryFn: () => departmentAPI.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to create a department
 */
export function useCreateDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: departmentAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.lists() })
      toast.success('Department created successfully')
    },
    onError: (error: AxiosErrorResponse) => {
      toast.error(error.response?.data?.detail || 'Failed to create department')
    },
  })
}

/**
 * Hook to update a department
 */
export function useUpdateDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DepartmentUpdateRequest }) => departmentAPI.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.lists() })
      toast.success('Department updated successfully')
    },
    onError: (error: AxiosErrorResponse) => {
      toast.error(error.response?.data?.detail || 'Failed to update department')
    },
  })
}

/**
 * Hook to delete a department
 */
export function useDeleteDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: departmentAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.lists() })
      toast.success('Department deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete department')
    },
  })
}

