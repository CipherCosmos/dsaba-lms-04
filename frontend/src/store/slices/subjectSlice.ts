import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { subjectAPI } from '../../services/api'
import { mapSubjectResponse } from '../../core/utils/contractMapper'

export interface Subject {
  id: number
  name: string
  code: string
  department_id: number
  credits: number
  max_internal: number  // Backend always includes this
  max_external: number  // Backend always includes this
  total_marks: number  // Backend always includes this (computed)
  is_active: boolean  // Backend always includes this
  created_at: string
  updated_at: string  // Backend always includes this
  // Optional fields that may come from API transformations or subject assignments
  teacher_id?: number | null  // Not in backend SubjectResponse, comes from subject assignments
  cos?: string[]  // Not in backend SubjectResponse, fetched separately
  pos?: string[]  // Not in backend SubjectResponse, fetched separately
  // Note: class_id removed - subjects are assigned to classes via SubjectAssignments
}

interface SubjectState {
  subjects: Subject[]
  loading: boolean
  error: string | null
}

const initialState: SubjectState = {
  subjects: [],
  loading: false,
  error: null,
}

export const fetchSubjects = createAsyncThunk('subjects/fetchSubjects', async (filters?: { department_id?: number; is_active?: boolean }) => {
  const response = await subjectAPI.getAll(0, 100, filters)
  // Backend returns SubjectListResponse with items array (standardized)
  const subjects = response.items || []
  // Map each subject from backend format to frontend format
  return subjects.map((subject: any) => mapSubjectResponse(subject))
})

export const createSubject = createAsyncThunk(
  'subjects/createSubject',
  async (subject: Omit<Subject, 'id' | 'created_at'>) => {
    const response = await subjectAPI.create(subject)
    return response
  }
)

export const updateSubject = createAsyncThunk(
  'subjects/updateSubject',
  async ({ id, ...subject }: Partial<Subject> & { id: number }) => {
    const response = await subjectAPI.update(id, subject)
    return response
  }
)

export const deleteSubject = createAsyncThunk(
  'subjects/deleteSubject',
  async (id: number) => {
    await subjectAPI.delete(id)
    return id
  }
)

const subjectSlice = createSlice({
  name: 'subjects',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubjects.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSubjects.fulfilled, (state, action) => {
        state.loading = false
        state.subjects = action.payload
      })
      .addCase(fetchSubjects.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch subjects'
      })
      .addCase(createSubject.fulfilled, (state, action) => {
        state.subjects.push(mapSubjectResponse(action.payload))
      })
      .addCase(updateSubject.fulfilled, (state, action) => {
        const index = state.subjects.findIndex(s => s.id === action.payload.id)
        const mappedSubject = mapSubjectResponse(action.payload)
        if (index !== -1) {
          state.subjects[index] = mappedSubject
        }
      })
      .addCase(deleteSubject.fulfilled, (state, action) => {
        state.subjects = state.subjects.filter(s => s.id !== action.payload)
      })
  },
})

export const { clearError } = subjectSlice.actions
export default subjectSlice.reducer