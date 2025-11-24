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
```

**Usage**: Replace `onError: (error: any)` with `onError: (error: AxiosErrorResponse)` in React Query mutations.

#### Chart Data Types

```typescript
interface ChartDataPoint {
  label: string
  value: number
  color?: string
  metadata?: Record<string, string | number>  // Extended for additional data
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
```

**Usage**: For analytics dashboards displaying performance trends over time.

#### Report Template Types

```typescript
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
```

**Usage**: For generating typed reports with proper filtering and export options.

#### Logger Utility Types

```typescript
type LoggerArgs = Array<string | number | boolean | object | null | undefined>
```

**Usage**: Type-safe logging that accepts various argument types without `any`.

### API Types (`core/types/api.ts`)

#### DTO Interfaces for API Payloads

```typescript
interface DepartmentCreateRequest {
  name: string
  code: string
  description?: string
  hod_id?: number
  is_active?: boolean
}

interface DepartmentUpdateRequest {
  name?: string
  code?: string
  description?: string
  hod_id?: number
  is_active?: boolean
}

interface SubjectCreateRequest {
  code: string
  name: string
  description?: string
  department_id: number
  credits: number
  max_internal: number
  max_external: number
  is_active?: boolean
}

type SubjectUpdateRequest = Partial<SubjectCreateRequest>

interface UserCreateRequest {
  username: string
  email: string
  password: string
  first_name?: string
  last_name?: string
  roles: Array<{
    role: string
    department_id?: number
  }>
  is_active?: boolean
}

interface UserUpdateRequest {
  username?: string
  email?: string
  first_name?: string
  last_name?: string
  is_active?: boolean
}

interface ExamCreateRequest {
  name: string
  exam_type: 'internal1' | 'internal2' | 'external' | 'assignment'
  subject_assignment_id: number
  total_marks: number
  exam_date?: string
  duration_minutes?: number
  instructions?: string
}

type ExamUpdateRequest = Partial<ExamCreateRequest>

interface QuestionCreateRequest {
  exam_id: number
  question_no: string
  question_text: string
  section: 'A' | 'B' | 'C'
  marks_per_question: number
  required_count?: number
  optional_count?: number
  blooms_level: 1 | 2 | 3 | 4 | 5 | 6
  difficulty: 'easy' | 'medium' | 'hard'
}

type QuestionUpdateRequest = Partial<QuestionCreateRequest>

interface MarkCreateRequest {
  student_id: number
  exam_id: number
  question_id?: number
  marks_obtained: number
  max_marks: number
}
```

**Usage**: These match backend Pydantic models exactly, ensuring 1:1 type safety between frontend and backend.

#### Evidence and Analysis Types

```typescript
interface EvidenceItem {
  type: 'exam' | 'assignment' | 'project' | 'quiz'
  id: number
  name: string
  date: string
  marks_obtained: number
  max_marks: number
  percentage: number
}

interface QuestionAnalysisItem {
  question_id: number
  question_no: string
  marks: number
  bloom_level: 1 | 2 | 3 | 4 | 5 | 6
  difficulty: 'easy' | 'medium' | 'hard'
  avg_marks_obtained: number
  success_rate: number
  co_mappings: Array<{
    co_id: number
    co_code: string
    weight_pct: number
  }>
}
```

**Usage**: For CO-PO attainment dashboards and question analysis reports.

#### Query and Filter Types

```typescript
interface QueryParams {
  skip?: number
  limit?: number
  [key: string]: string | number | boolean | undefined
}

interface FilterParams {
  is_active?: boolean
  department_id?: number
  semester_id?: number
  academic_year_id?: number
  batch_instance_id?: number
  subject_id?: number
  [key: string]: string | number | boolean | undefined  // More specific than any
}
```

**Usage**: For typed API queries and filtering operations.

## Migration Guide

### Common Pattern Replacements

#### Error Handling

**Before:**
```typescript
const { mutate } = useMutation({
  mutationFn: createDepartment,
  onError: (error: any) => {
    console.error('Failed to create department:', error)
  }
})
```

**After:**
```typescript
import type { AxiosErrorResponse } from '../types'

const { mutate } = useMutation({
  mutationFn: createDepartment,
  onError: (error: AxiosErrorResponse) => {
    console.error('Failed to create department:', error.response?.data.detail)
  }
})
```

#### API Payloads

**Before:**
```typescript
const createDepartment = async (data: any) => {
  return api.post('/departments', data)
}
```

**After:**
```typescript
import type { DepartmentCreateRequest } from '../types/api'

const createDepartment = async (data: DepartmentCreateRequest) => {
  return api.post('/departments', data)
}
```

#### Array Mappings

**Before:**
```typescript
const departmentNames = departments.map((dept: any) => dept.name)
```

**After:**
```typescript
import type { Department } from '../types/api'

const departmentNames = departments.map((dept: Department) => dept.name)
```

#### Component Props

**Before:**
```typescript
interface ReportCardProps {
  icon: any
  onChange: (value: any) => void
}
```

**After:**
```typescript
import type { React.ComponentType } from 'react'

interface ReportCardProps {
  icon: React.ComponentType<{ className?: string }>
  onChange: (value: string | number) => void
}
```

### Contract Mapper Changes

**Before:**
```typescript
export function mapExamResponse(backendExam: any): any {
  return {
    id: backendExam.id,
    name: backendExam.name,
    // ...
  }
}
```

**After:**
```typescript
import type { Exam, ExamCreateRequest } from '../types/api'

export function mapExamResponse(backendExam: Exam): Exam {
  return backendExam // Assuming 1:1 mapping
}

export function mapExamRequest(frontendExam: Partial<Exam>): ExamCreateRequest {
  return {
    name: frontendExam.name!,
    exam_type: frontendExam.exam_type!,
    subject_assignment_id: frontendExam.subject_assignment_id!,
    total_marks: frontendExam.total_marks!,
    exam_date: frontendExam.exam_date,
    duration_minutes: frontendExam.duration_minutes,
    instructions: frontendExam.instructions
  }
}
```

### Generic Debounce Hook Pattern

**Before:**
```typescript
const useDebounce = (value: any, delay: number) => {
  // implementation
}
```

**After:**
```typescript
const useDebounce = <T,>(value: T, delay: number): T => {
  // implementation
}
```

## Best Practices

### When to Use `unknown` vs Specific Types

- Use `unknown` for truly dynamic data where you need to perform type guards
- Use specific types when the structure is known
- Prefer discriminated unions for polymorphic data

```typescript
// Good: Use unknown for external data
const handleApiResponse = (data: unknown) => {
  if (typeof data === 'object' && data !== null && 'type' in data) {
    // Type guard logic
  }
}

// Better: Use specific types when possible
const handleDepartmentResponse = (data: Department) => {
  console.log(data.name) // TypeScript knows this exists
}
```

### Handling Dynamic Data

Use discriminated unions for data that can be one of several shapes:

```typescript
type NotificationData = 
  | { type: 'success'; message: string }
  | { type: 'error'; message: string; code: number }
  | { type: 'warning'; message: string; details?: string }
```

### Typing Third-Party Library Responses

For libraries like Axios, create wrapper types:

```typescript
interface AxiosResponse<T> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
}
```

### Utility Types Usage

- `Partial<T>`: For optional updates (e.g., `DepartmentUpdateRequest`)
- `Pick<T, K>`: For selecting specific properties
- `Omit<T, K>`: For excluding specific properties

```typescript
type DepartmentSummary = Pick<Department, 'id' | 'name' | 'code'>
type DepartmentWithoutTimestamps = Omit<Department, 'created_at' | 'updated_at'>
```

## Troubleshooting

### Common TypeScript Errors

#### "Type 'X' is not assignable to type 'Y'"

**Cause**: Type mismatch in assignments or function calls.

**Fix**: Check the expected type and ensure your data matches. Use type assertions only as a last resort.

#### "Property 'X' does not exist on type 'Y'"

**Cause**: Accessing a property that doesn't exist on the type.

**Fix**: Either extend the type or use optional chaining (`?.`).

#### "Cannot invoke an object which is possibly 'undefined'"

**Cause**: Calling a method on a potentially undefined value.

**Fix**: Add null checks or use optional chaining.

### Handling Legacy Code

For code that can't be migrated immediately:

```typescript
// Temporary escape hatch (use sparingly)
const legacyData: any = fetchLegacyData()
// Gradually migrate by adding type guards
if (typeof legacyData === 'object' && 'expectedProp' in legacyData) {
  // Safe to use
}
```

### Gradual Migration Strategy

1. Start with leaf components (no dependencies)
2. Move up the dependency chain (utilities → hooks → components)
3. Use feature flags to enable typed versions
4. Run `tsc --noEmit` frequently to catch issues

## Testing

### Verifying Type Safety

Run the TypeScript compiler in check mode:

```bash
npx tsc --noEmit
```

This will catch all type errors without generating output files.

### Testing Error Handling

```typescript
import type { AxiosErrorResponse } from '../types'

describe('Error Handling', () => {
  it('handles validation errors', () => {
    const mockError: AxiosErrorResponse = {
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ['name'], msg: 'Required', type: 'missing' }
          ]
        }
      },
      message: 'Validation failed'
    }
    
    const handler = jest.fn()
    handleError(mockError, handler)
    expect(handler).toHaveBeenCalledWith(mockError)
  })
})
```

### Mocking Typed API Responses

```typescript
import type { Department } from '../types/api'

const mockDepartment: Department = {
  id: 1,
  name: 'Computer Science',
  code: 'CS',
  description: 'Computer Science Department',
  hod_id: 123,
  is_active: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

// Use in tests
jest.mock('../api', () => ({
  getDepartment: jest.fn().mockResolvedValue(mockDepartment)
}))
```

## Future Improvements

### Runtime Validation with Zod

Consider using Zod for runtime type validation:

```typescript
import { z } from 'zod'

const DepartmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  // ...
})

type Department = z.infer<typeof DepartmentSchema>
```

### Generating Types from OpenAPI

Use tools like `openapi-typescript` to generate types from backend API specs:

```bash
npx openapi-typescript /path/to/openapi.json --output types.ts
```

### Exhaustive Pattern Matching with ts-pattern

For complex conditional logic:

```typescript
import { match } from 'ts-pattern'

const result = match(notification)
  .with({ type: 'success' }, (n) => `Success: ${n.message}`)
  .with({ type: 'error' }, (n) => `Error: ${n.message} (${n.code})`)
  .with({ type: 'warning' }, (n) => `Warning: ${n.message}`)
  .exhaustive()