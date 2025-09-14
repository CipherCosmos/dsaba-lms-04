import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { examAPI } from '../../services/api'

interface Question {
  id: number
  question_number: string
  max_marks: number
  co_weights: Array<{
    co_id: number
    co_code: string
    weight_pct: number
  }>
  section: 'A' | 'B' | 'C'
  blooms_level: string
  difficulty: 'easy' | 'medium' | 'hard'
  exam_id: number
}

interface Exam {
  id: number
  name: string
  subject_id: number
  exam_type: 'internal1' | 'internal2' | 'final'
  exam_date?: string
  duration?: number
  total_marks: number
  questions: Question[]
  created_at: string
}

interface ExamState {
  exams: Exam[]
  loading: boolean
  error: string | null
}

const initialState: ExamState = {
  exams: [],
  loading: false,
  error: null,
}

export const fetchExams = createAsyncThunk('exams/fetchExams', async () => {
  const response = await examAPI.getAll()
  return response
})

export const createExam = createAsyncThunk(
  'exams/createExam',
  async (exam: Omit<Exam, 'id' | 'created_at'>) => {
    const response = await examAPI.create(exam)
    return response
  }
)

export const updateExam = createAsyncThunk(
  'exams/updateExam',
  async ({ id, ...exam }: Partial<Exam> & { id: number }) => {
    const response = await examAPI.update(id, exam)
    return response
  }
)

export const deleteExam = createAsyncThunk(
  'exams/deleteExam',
  async (id: number) => {
    await examAPI.delete(id)
    return id
  }
)

const examSlice = createSlice({
  name: 'exams',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExams.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchExams.fulfilled, (state, action) => {
        state.loading = false
        state.exams = action.payload
      })
      .addCase(fetchExams.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch exams'
      })
      .addCase(createExam.fulfilled, (state, action) => {
        state.exams.push(action.payload)
      })
      .addCase(updateExam.fulfilled, (state, action) => {
        const index = state.exams.findIndex(e => e.id === action.payload.id)
        if (index !== -1) {
          state.exams[index] = action.payload
        }
      })
      .addCase(deleteExam.fulfilled, (state, action) => {
        state.exams = state.exams.filter(e => e.id !== action.payload)
      })
  },
})

export const { clearError } = examSlice.actions
export default examSlice.reducer