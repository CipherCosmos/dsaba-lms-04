import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { subjectAPI } from '../../services/api'

interface Subject {
  id: number
  name: string
  code: string
  class_id: number
  teacher_id?: number
  cos: string[]
  pos: string[]
  credits: number
  created_at: string
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

export const fetchSubjects = createAsyncThunk('subjects/fetchSubjects', async () => {
  const response = await subjectAPI.getAll()
  return response
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
        state.subjects.push(action.payload)
      })
      .addCase(updateSubject.fulfilled, (state, action) => {
        const index = state.subjects.findIndex(s => s.id === action.payload.id)
        if (index !== -1) {
          state.subjects[index] = action.payload
        }
      })
      .addCase(deleteSubject.fulfilled, (state, action) => {
        state.subjects = state.subjects.filter(s => s.id !== action.payload)
      })
  },
})

export const { clearError } = subjectSlice.actions
export default subjectSlice.reducer