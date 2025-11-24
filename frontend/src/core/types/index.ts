/**
 * Central Type Export
 * Single import point for all TypeScript types/interfaces
 */

// Re-export all API types
export * from './api'

// Re-export permission types
export * from './permissions'

// Common utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type Maybe<T> = T | null | undefined

// Form state types
export type FormMode = 'create' | 'edit' | 'view'
export type FormStatus = 'idle' | 'loading' | 'success' | 'error'

// Data loading states
export interface LoadingState {
  isLoading: boolean
  isError: boolean
  error: Error | null
}

export interface DataState<T> extends LoadingState {
  data: T | null
}

// Table/List states
export interface TableState {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: FilterParams
}

// Component props types
export interface BaseComponentProps {
  className?: string
  style?: React.CSSProperties
}

export interface WithChildren {
  children?: React.ReactNode
}

// Status types
export type WorkflowState = 'draft' | 'submitted' | 'approved' | 'rejected' | 'frozen' | 'published'
export type ExamStatus = 'draft' | 'active' | 'locked' | 'published'
export type AcademicYearStatus = 'draft' | 'active' | 'archived'

// Grade types
export type Grade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'
export type BloomLevel = 1 | 2 | 3 | 4 | 5 | 6
export type Difficulty = 'easy' | 'medium' | 'hard'
export type MappingStrength = 1 | 2 | 3

// Exam component types
export type ComponentType = 'IA1' | 'IA2' | 'assignment' | 'quiz' | 'project' | 'external'
export type ExamType = 'internal1' | 'internal2' | 'external' | 'assignment'

// Promotion types
export type PromotionType = 'regular' | 'lateral' | 'failed' | 'retained'

// Trend types
export type TrendDirection = 'improving' | 'declining' | 'stable' | 'increasing' | 'decreasing'

// NBA compliance types
export type NBAComplianceStatus = 'compliant' | 'non_compliant' | 'partial'

// Attainment level types
export type COLevel = 'L1' | 'L2' | 'L3'
export type POType = 'PO' | 'PSO'

// Date/Time types
export type DateString = string // ISO 8601 format
export type TimeString = string // HH:MM format

// ID types for better type safety
export type ID = number
export type UUID = string

// Response status types
export type ResponseStatus = 'success' | 'error' | 'warning' | 'info'

// Pagination meta
export interface PaginationMeta {
  total: number
  skip: number
  limit: number
  pages: number
  currentPage: number
}

// Filter operators
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like' | 'between'

// Sort direction
export type SortDirection = 'asc' | 'desc'

// API request/response helpers
export interface APIRequest<T = any> {
  params?: T
  body?: T
  headers?: Record<string, string>
}

export interface APIResponse<T = any> {
  data: T
  message?: string
  status: ResponseStatus
}

// Error handling types
export interface APIError {
  message: string
  code?: string
  field?: string
  details?: Record<string, unknown> | string | null
}

export interface ValidationError {
  field: string
  message: string
  type: string
}

// File upload types
export interface FileUpload {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

// Dashboard card types
export interface DashboardCard {
  title: string
  value: number | string
  icon?: string
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    percentage: number
  }
  color?: string
}

// Chart data types
export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

export interface ChartSeries {
  name: string
  data: number[]
  color?: string
}

// Notification types
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

// Modal types
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

// Toast types
export interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

// Search/Filter types
export interface SearchParams {
  query: string
  field?: string
  operator?: FilterOperator
}

// Breadcrumb types
export interface Breadcrumb {
  label: string
  href?: string
  icon?: string
  current?: boolean
}

// Tab types
export interface Tab {
  id: string
  label: string
  icon?: string
  count?: number
  disabled?: boolean
}

// Menu item types
export interface MenuItem {
  id: string
  label: string
  href?: string
  icon?: string
  badge?: number
  children?: MenuItem[]
  permissions?: string[]
}

// Theme types
export type Theme = 'light' | 'dark' | 'auto'

// Language types
export type Language = 'en' | 'hi' | 'kn' | 'te' | 'ta'

// Export status types
export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json'
export type ExportStatus = 'idle' | 'generating' | 'ready' | 'error'

// Batch operation types
export interface BatchOperation<T> {
  action: 'create' | 'update' | 'delete'
  items: T[]
}

export interface BatchResult {
  successful: number
  failed: number
  errors: Array<{
    item: unknown
    error: string
  }>
}

interface AxiosErrorResponse {
  response?: {
    status: number
    data: {
      detail: string | ValidationErrorDetail[]
    }
  }
  message: string
  config?: unknown
}

interface ValidationErrorDetail {
  loc: string[]
  msg: string
  type: string
}

interface FormattedValidationError {
  field: string
  message: string
  type: string
}

type MutationErrorHandler = (error: AxiosErrorResponse) => void

export interface ChartDataPoint {
  label: string
  value: number
  color?: string
  metadata?: Record<string, string | number>
}

interface TimeSeriesDataPoint {
  timestamp: string
  value: number
  label?: string
}

interface BarChartData {
  labels: string[]
  datasets: ChartSeries[]
}

interface ReportTemplate {
  id: string
  name: string
  description: string
  category: 'academic' | 'performance' | 'attainment' | 'comprehensive' | 'department' | 'teacher' | 'student' | 'strategic' | 'accreditation'
  format: ExportFormat
  icon: React.ComponentType<{ className?: string }>
  color: string
  roles?: string[]
}

interface ReportGenerationParams {
  template_id: string
  filters: FilterParams
  format: ExportFormat
  include_charts?: boolean
  include_raw_data?: boolean
}

type LoggerArgs = Array<string | number | boolean | object | null | undefined>

export type {
  AxiosErrorResponse,
  ValidationErrorDetail,
  FormattedValidationError,
  MutationErrorHandler,
  TimeSeriesDataPoint,
  BarChartData,
  ReportTemplate,
  ReportGenerationParams,
  LoggerArgs
}

