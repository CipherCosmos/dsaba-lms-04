import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { examAPI } from '../../services/api'
import { logger } from '../../core/utils/logger'

interface Question {
  id: number
  question_number: string
  question_text: string
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

export const fetchExams = createAsyncThunk('exams/fetchExams', async (forceRefresh?: boolean) => {
  logger.debug('Fetching exams', forceRefresh ? '(force refresh)' : '')
  const response = await examAPI.getAll(0, 100, undefined, forceRefresh || false)
  return response
})

export const createExam = createAsyncThunk(
  'exams/createExam',
  async (exam: Omit<Exam, 'id' | 'created_at'>, { rejectWithValue }) => {
    try {
      const response = await examAPI.create(exam)
      return response
    } catch (error: any) {
      logger.error('Create exam error:', error)
      return rejectWithValue(error.response?.data?.detail || 'Failed to create exam')
    }
  }
)

export const updateExam = createAsyncThunk(
  'exams/updateExam',
  async ({ id, ...exam }: Partial<Exam> & { id: number }, { rejectWithValue }) => {
    try {
      const response = await examAPI.update(id, exam)
      return response
    } catch (error: any) {
      logger.error('Update exam error:', error)
      return rejectWithValue(error.response?.data?.detail || 'Failed to update exam')
    }
  }
)

export const deleteExam = createAsyncThunk(
  'exams/deleteExam',
  async (id: number, { rejectWithValue }) => {
    try {
      await examAPI.delete(id)
      return id
    } catch (error: any) {
      logger.error('Delete exam error:', error)
      return rejectWithValue(error.response?.data?.detail || 'Failed to delete exam')
    }
  }
)

const examSlice = createSlice({
  name: 'exams',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearExams: (state) => {
      state.exams = []
      state.loading = false
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
        // Backend returns ExamListResponse with items array (standardized)
        const payload = action.payload
        state.exams = Array.isArray(payload) ? payload : (payload?.items || payload?.exams || payload?.data || [])
        logger.debug('Exams loaded:', state.exams.length)
      })
      .addCase(fetchExams.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch exams'
      })
      .addCase(createExam.fulfilled, (state, action) => {
        state.exams.push(action.payload)
        logger.info('Exam created and added to state')
      })
      .addCase(updateExam.fulfilled, (state, action) => {
        const index = state.exams.findIndex(e => e.id === action.payload.id)
        if (index !== -1) {
          state.exams[index] = action.payload
          logger.info('Exam updated in state')
        } else {
          state.exams.push(action.payload)
          logger.debug('Exam not found in state, adding')
        }
      })
      .addCase(deleteExam.fulfilled, (state, action) => {
        state.exams = state.exams.filter(e => e.id !== action.payload)
        logger.info('Exam deleted from state')
      })
      .addCase(createExam.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string || 'Failed to create exam'
      })
      .addCase(updateExam.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string || 'Failed to update exam'
      })
      .addCase(deleteExam.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string || 'Failed to delete exam'
      })
  },
})

export const { clearError, clearExams } = examSlice.actions
export default examSlice.reducer