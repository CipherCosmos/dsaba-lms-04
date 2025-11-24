import { useQuery } from '@tanstack/react-query'
import { analyticsAPI } from '../../services/api'
import { queryKeys } from './queryKeys'
import type {
  StudentPerformanceAnalytics,
  TeacherPerformanceAnalytics,
  ClassPerformanceAnalytics,
  SubjectAnalytics,
  DepartmentAnalytics,
  COAttainment,
  POAttainment,
  BloomsTaxonomyAnalysis,
  PerformanceTrend,
  DepartmentComparison,
  NBAAccreditationData,
  COPOAttainmentSummary,
  AttainmentTrend,
} from '../../core/types/api'

/**
 * Hook to fetch student analytics
 */
export function useStudentAnalytics(studentId: number, subjectId?: number, semesterId?: number, academicYearId?: number) {
  return useQuery({
    queryKey: queryKeys.analytics.student(studentId, academicYearId),
    queryFn: () => analyticsAPI.getStudentAnalytics(studentId, subjectId, semesterId, academicYearId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch teacher analytics
 */
export function useTeacherAnalytics(teacherId: number, subjectId?: number, semesterId?: number, academicYearId?: number) {
  return useQuery({
    queryKey: queryKeys.analytics.teacher(teacherId, academicYearId, semesterId),
    queryFn: () => analyticsAPI.getTeacherAnalytics(teacherId, subjectId, semesterId, academicYearId),
    enabled: !!teacherId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch class analytics (legacy - use useClassPerformanceAnalytics instead)
 * @deprecated Use useClassPerformanceAnalytics for enhanced analytics
 */
export function useClassAnalytics(classId: number, subjectId?: number) {
  return useQuery({
    queryKey: queryKeys.analytics.class(classId, undefined, subjectId),
    queryFn: () => analyticsAPI.getClassAnalytics(classId, subjectId),
    enabled: !!classId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch subject analytics (legacy - use useSubjectAnalyticsEnhanced instead)
 * @deprecated Use useSubjectAnalyticsEnhanced for enhanced analytics
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
export function useHODAnalytics(departmentId: number, academicYearId?: number) {
  return useQuery({
    queryKey: queryKeys.analytics.hod(departmentId, academicYearId),
    queryFn: () => analyticsAPI.getHODAnalytics(departmentId, academicYearId),
    enabled: !!departmentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch CO attainment
 */
export function useCOAttainment(subjectId: number, examType?: 'internal1' | 'internal2' | 'external' | 'all', semesterId?: number, academicYearId?: number) {
  return useQuery({
    queryKey: queryKeys.analytics.coAttainment(subjectId, examType, semesterId, academicYearId),
    queryFn: () => analyticsAPI.getCOAttainment(subjectId, examType, semesterId, academicYearId),
    enabled: !!subjectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch PO attainment
 */
export function usePOAttainment(departmentId: number, subjectId?: number, academicYearId?: number, semesterId?: number) {
  return useQuery({
    queryKey: queryKeys.analytics.poAttainment(departmentId, subjectId, academicYearId, semesterId),
    queryFn: () => analyticsAPI.getPOAttainment(departmentId, subjectId, academicYearId, semesterId),
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

// ============================================
// ENHANCED ANALYTICS HOOKS
// ============================================

/**
 * Hook to fetch Bloom's Taxonomy analysis
 */
export function useBloomsTaxonomyAnalysis(subjectId?: number, departmentId?: number, semesterId?: number, examId?: number): ReturnType<typeof useQuery<BloomsTaxonomyAnalysis>> {
  return useQuery({
    queryKey: queryKeys.analytics.bloomsTaxonomy(subjectId, departmentId, semesterId, examId),
    queryFn: () => analyticsAPI.getBloomsTaxonomyAnalysis(subjectId, departmentId, semesterId, examId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch performance trends
 */
export function usePerformanceTrends(studentId?: number, subjectId?: number, departmentId?: number, months?: number): ReturnType<typeof useQuery<PerformanceTrend[]>> {
  return useQuery({
    queryKey: queryKeys.analytics.performanceTrends(studentId, subjectId, departmentId, months),
    queryFn: () => analyticsAPI.getPerformanceTrends(studentId, subjectId, departmentId, months),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch department comparison
 */
export function useDepartmentComparison(academicYearId?: number, semesterId?: number): ReturnType<typeof useQuery<DepartmentComparison>> {
  return useQuery({
    queryKey: queryKeys.analytics.departmentComparison(academicYearId, semesterId),
    queryFn: () => analyticsAPI.getDepartmentComparison(academicYearId, semesterId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch comprehensive student performance analytics
 */
export function useStudentPerformanceAnalytics(studentId: number, academicYearId?: number): ReturnType<typeof useQuery<StudentPerformanceAnalytics>> {
  return useQuery({
    queryKey: queryKeys.analytics.studentPerformanceAnalytics(studentId, academicYearId),
    queryFn: () => analyticsAPI.getStudentPerformanceAnalytics(studentId, academicYearId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch comprehensive teacher performance analytics
 */
export function useTeacherPerformanceAnalytics(teacherId: number, academicYearId?: number, semesterId?: number): ReturnType<typeof useQuery<TeacherPerformanceAnalytics>> {
  return useQuery({
    queryKey: queryKeys.analytics.teacherPerformanceAnalytics(teacherId, academicYearId, semesterId),
    queryFn: () => analyticsAPI.getTeacherPerformanceAnalytics(teacherId, academicYearId, semesterId),
    enabled: !!teacherId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch class performance analytics
 */
export function useClassPerformanceAnalytics(batchInstanceId: number, semesterId?: number, subjectId?: number): ReturnType<typeof useQuery<ClassPerformanceAnalytics>> {
  return useQuery({
    queryKey: queryKeys.analytics.classPerformanceAnalytics(batchInstanceId, semesterId, subjectId),
    queryFn: () => analyticsAPI.getClassPerformanceAnalytics(batchInstanceId, semesterId, subjectId),
    enabled: !!batchInstanceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch subject analytics (enhanced)
 */
export function useSubjectAnalyticsEnhanced(subjectId: number, semesterId?: number, batchInstanceId?: number, includeBloomAnalysis?: boolean): ReturnType<typeof useQuery<SubjectAnalytics>> {
  return useQuery({
    queryKey: queryKeys.analytics.subjectAnalytics(subjectId, semesterId, batchInstanceId, includeBloomAnalysis),
    queryFn: () => analyticsAPI.getSubjectAnalytics(subjectId, semesterId, batchInstanceId, includeBloomAnalysis),
    enabled: !!subjectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch department analytics (enhanced)
 */
export function useDepartmentAnalytics(departmentId: number, academicYearId?: number, includePOAttainment?: boolean, includeTrends?: boolean): ReturnType<typeof useQuery<DepartmentAnalytics>> {
  return useQuery({
    queryKey: queryKeys.analytics.departmentAnalytics(departmentId, academicYearId, includePOAttainment, includeTrends),
    queryFn: () => analyticsAPI.getDepartmentAnalytics(departmentId, academicYearId, includePOAttainment, includeTrends),
    enabled: !!departmentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch NBA accreditation data
 */
export function useNBAAccreditationData(departmentId: number, academicYearId: number, includeIndirectAttainment?: boolean): ReturnType<typeof useQuery<NBAAccreditationData>> {
  return useQuery({
    queryKey: queryKeys.analytics.nbaAccreditationData(departmentId, academicYearId, includeIndirectAttainment),
    queryFn: () => analyticsAPI.getNBAAccreditationData(departmentId, academicYearId, includeIndirectAttainment),
    enabled: !!departmentId && !!academicYearId,
    staleTime: 1000 * 60 * 10, // 10 minutes for accreditation data
  })
}

/**
 * Hook to fetch CO-PO attainment summary
 */
export function useCOPOAttainmentSummary(departmentId: number, academicYearId?: number, semesterId?: number, includeTrends?: boolean): ReturnType<typeof useQuery<COPOAttainmentSummary>> {
  return useQuery({
    queryKey: queryKeys.analytics.coPoAttainmentSummary(departmentId, academicYearId, semesterId, includeTrends),
    queryFn: () => analyticsAPI.getAttainmentSummary(departmentId, academicYearId, semesterId, includeTrends),
    enabled: !!departmentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

