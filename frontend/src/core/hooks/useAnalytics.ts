import { useQuery } from '@tanstack/react-query'
import { analyticsAPI } from '../../services/api'
import { queryKeys } from './queryKeys'

/**
 * Hook to fetch student analytics
 */
export function useStudentAnalytics(studentId: number) {
  return useQuery({
    queryKey: queryKeys.analytics.student(studentId),
    queryFn: () => analyticsAPI.getStudentAnalytics(studentId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch teacher analytics
 */
export function useTeacherAnalytics(teacherId: number) {
  return useQuery({
    queryKey: queryKeys.analytics.teacher(teacherId),
    queryFn: () => analyticsAPI.getTeacherAnalytics(teacherId),
    enabled: !!teacherId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch class analytics
 */
export function useClassAnalytics(classId: number) {
  return useQuery({
    queryKey: queryKeys.analytics.class(classId),
    queryFn: () => analyticsAPI.getClassAnalytics(classId),
    enabled: !!classId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch subject analytics
 */
export function useSubjectAnalytics(subjectId: number) {
  return useQuery({
    queryKey: queryKeys.analytics.subject(subjectId),
    queryFn: () => analyticsAPI.getSubjectAnalytics(subjectId),
    enabled: !!subjectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch HOD analytics
 */
export function useHODAnalytics(departmentId: number) {
  return useQuery({
    queryKey: queryKeys.analytics.hod(departmentId),
    queryFn: () => analyticsAPI.getHODAnalytics(departmentId),
    enabled: !!departmentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch CO attainment
 */
export function useCOAttainment(subjectId: number, examType?: 'internal1' | 'internal2' | 'external' | 'all') {
  return useQuery({
    queryKey: queryKeys.analytics.coAttainment(subjectId, examType),
    queryFn: () => analyticsAPI.getCOAttainment(subjectId, examType),
    enabled: !!subjectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch PO attainment
 */
export function usePOAttainment(departmentId: number, subjectId?: number) {
  return useQuery({
    queryKey: queryKeys.analytics.poAttainment(departmentId, subjectId),
    queryFn: () => analyticsAPI.getPOAttainment(departmentId, subjectId),
    enabled: !!departmentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch strategic dashboard data
 */
export function useStrategicDashboard(departmentId: number) {
  return useQuery({
    queryKey: queryKeys.analytics.strategicDashboard(departmentId),
    queryFn: () => analyticsAPI.getStrategicDashboardData(departmentId),
    enabled: !!departmentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

