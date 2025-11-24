import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicYearAPI } from '../../services/api'
import { queryKeys } from './queryKeys'
import toast from 'react-hot-toast'
import type { AxiosErrorResponse } from '../types'

/**
 * Hook to fetch all academic years
 */
export function useAcademicYears(
  skip: number = 0,
  limit: number = 100,
  filters?: { status?: string; is_current?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.academicYears.list(skip, limit, filters),
    queryFn: () => academicYearAPI.getAll(skip, limit, filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch current academic year
 */
export function useCurrentAcademicYear() {
  return useQuery({
    queryKey: queryKeys.academicYears.current(),
    queryFn: () => academicYearAPI.getCurrent(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry on 404 (no current year exists)
    throwOnError: false, // Don't throw error, return undefined instead
  })
}

/**
 * Hook to fetch academic year by ID
 */
export function useAcademicYear(id: number) {
  return useQuery({
    queryKey: queryKeys.academicYears.detail(id),
    queryFn: () => academicYearAPI.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to create academic year
 * Error handling: Displays toast with API error detail or generic message on failure
 */
export function useCreateAcademicYear() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { start_year: number; end_year: number; start_date?: string; end_date?: string }) =>
      academicYearAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears.all })
      toast.success('Academic year created successfully')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } }
      toast.error(err.response?.data?.detail || 'Failed to create academic year')
    },
  })
}

/**
 * Hook to update academic year
 * Error handling: Displays toast with API error detail or generic message on failure
 */
export function useUpdateAcademicYear() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { start_date?: string; end_date?: string } }) =>
      academicYearAPI.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears.all })
      toast.success('Academic year updated successfully')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } }
      toast.error(err.response?.data?.detail || 'Failed to update academic year')
    },
  })
}

/**
 * Hook to activate academic year
 * Error handling: Displays toast with API error detail or generic message on failure
 */
export function useActivateAcademicYear() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => academicYearAPI.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears.current() })
      toast.success('Academic year activated successfully')
    },
    onError: (error: AxiosErrorResponse) => {
      toast.error(error.response?.data?.detail || 'Failed to activate academic year')
    },
  })
}

/**
 * Hook to archive academic year
 * Error handling: Displays toast with API error detail or generic message on failure
 */
export function useArchiveAcademicYear() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => academicYearAPI.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears.all })
      toast.success('Academic year archived successfully')
    },
    onError: (error: AxiosErrorResponse) => {
      toast.error(error.response?.data?.detail || 'Failed to archive academic year')
    },
  })
}