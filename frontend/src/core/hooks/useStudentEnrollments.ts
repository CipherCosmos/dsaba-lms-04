import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { studentEnrollmentAPI } from '../../services/api'
import { queryKeys } from './queryKeys'
import toast from 'react-hot-toast'
import type { AxiosErrorResponse } from '../types'

/**
 * Hook to fetch student enrollments
 */
export function useStudentEnrollments(
  skip: number = 0,
  limit: number = 100,
  filters?: { student_id?: number; semester_id?: number; academic_year_id?: number }
) {
  return useQuery({
    queryKey: queryKeys.studentEnrollments.list(skip, limit, filters),
    queryFn: () => studentEnrollmentAPI.getAll(skip, limit, filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook to fetch enrollment by ID
 */
export function useStudentEnrollment(id: number) {
  return useQuery({
    queryKey: queryKeys.studentEnrollments.detail(id),
    queryFn: () => studentEnrollmentAPI.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook to create student enrollment
 */
export function useCreateStudentEnrollment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      student_id: number
      semester_id: number
      academic_year_id: number
      roll_no: string
      enrollment_date?: string
    }) => studentEnrollmentAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentEnrollments.all })
      toast.success('Student enrolled successfully')
    },
    onError: (error: AxiosErrorResponse) => {
      toast.error(error.response?.data?.detail || 'Failed to enroll student')
    },
  })
}

/**
 * Hook to bulk create student enrollments
 */
export function useBulkCreateStudentEnrollments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      semester_id: number
      academic_year_id: number
      enrollments: Array<{ student_id: number; roll_no: string; enrollment_date?: string }>
    }) => studentEnrollmentAPI.bulkCreate(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentEnrollments.all })
      toast.success(`${data.enrolled || data.enrollments?.length || 0} students enrolled successfully`)
    },
    onError: (error: AxiosErrorResponse) => {
      toast.error(error.response?.data?.detail || 'Failed to enroll students')
    },
  })
}

/**
 * Hook to promote student
 */
export function usePromoteStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      enrollmentId, 
      nextSemesterId,
      roll_no,
      promotion_type,
      notes
    }: { 
      enrollmentId: number
      nextSemesterId: number
      roll_no?: string
      promotion_type?: 'regular' | 'lateral' | 'failed' | 'retained'
      notes?: string
    }) =>
      studentEnrollmentAPI.promote(enrollmentId, nextSemesterId, {
        roll_no,
        promotion_type,
        notes
      }),
    onSuccess: (newEnrollment, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentEnrollments.detail(variables.enrollmentId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.studentEnrollments.all })
      // Invalidate the new enrollment as well
      if (newEnrollment?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.studentEnrollments.detail(newEnrollment.id) })
      }
      toast.success('Student promoted successfully. New enrollment created in next semester.')
    },
    onError: (error: AxiosErrorResponse) => {
      toast.error(error.response?.data?.detail || 'Failed to promote student')
    },
  })
}

/**
 * Hook for infinite scrolling of student enrollments
 */
export function useInfiniteStudentEnrollments(
  limit: number = 50,
  filters?: { student_id?: number; semester_id?: number; academic_year_id?: number }
) {
  return useInfiniteQuery({
    queryKey: queryKeys.studentEnrollments.lists(),
    queryFn: ({ pageParam = 0 }: { pageParam?: number }) =>
      studentEnrollmentAPI.getAll(pageParam || 0, limit, filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage: any, allPages) => {
      // If the last page has fewer items than the limit, we've reached the end
      if (lastPage.items.length < limit) {
        return undefined
      }
      // Return the next skip value
      return allPages.length * limit
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

