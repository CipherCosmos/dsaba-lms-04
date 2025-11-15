/**
 * Core Hooks
 * Centralized exports for all core hooks
 */

// Query keys
export { queryKeys } from './queryKeys'

// Auth hooks
export {
  useCurrentUser,
  useLogin,
  useLogout,
} from './useAuth'

// User hooks
export {
  useUsers,
  useUser,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useResetPassword,
} from './useUsers'

// Exam hooks
export {
  useExams,
  useExam,
  useExamQuestions,
  useCreateExam,
  useUpdateExam,
  useDeleteExam,
  useActivateExam,
  useLockExam,
} from './useExams'

// Marks hooks
export {
  useMarksByExam,
  useMarksByStudent,
  useExamLockStatus,
  useCreateMark,
  useBulkCreateMarks,
  useUpdateMark,
  useDeleteMark,
} from './useMarks'

// Subject hooks
export {
  useSubjects,
  useSubject,
  useSubjectsByDepartment,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
} from './useSubjects'

// Department hooks
export {
  useDepartments,
  useDepartment,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from './useDepartments'

// Question hooks
export {
  useQuestionsByExam,
  useQuestion,
  useQuestionCOMappings,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useCreateQuestionCOMapping,
  useDeleteQuestionCOMapping,
} from './useQuestions'

// Analytics hooks
export {
  useStudentAnalytics,
  useTeacherAnalytics,
  useClassAnalytics,
  useSubjectAnalytics,
  useHODAnalytics,
  useCOAttainment,
  usePOAttainment,
  useStrategicDashboard,
} from './useAnalytics'

