import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { marksAPI } from '../../services/api'

interface Mark {
  id: number
  exam_id: number
  student_id: number
  question_id: number
  marks_obtained: number
  created_at: string
}

interface MarksState {
  marks: Mark[]
  loading: boolean
  error: string | null
}

const initialState: MarksState = {
  marks: [],
  loading: false,
  error: null,
}

export const fetchMarksByExam = createAsyncThunk(
  'marks/fetchMarksByExam',
  async (examId: number) => {
    const response = await marksAPI.getByExam(examId, 0, 1000)
    // Backend returns MarkListResponse with marks array
    return response.marks || response || []
  }
)

export const saveMarks = createAsyncThunk(
  'marks/saveMarks',
  async ({ examId, marks }: { examId: number; marks: any[] }) => {
    const response = await marksAPI.bulkCreate(examId, marks)
    return response
  }
)

export const updateMark = createAsyncThunk(
  'marks/updateMark',
  async ({ id, marks_obtained }: { id: number; marks_obtained: number }) => {
    const response = await marksAPI.update(id, { marks_obtained })
    return response
  }
)

const marksSlice = createSlice({
  name: 'marks',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMarksByExam.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMarksByExam.fulfilled, (state, action) => {
        state.loading = false
        state.marks = action.payload
      })
      .addCase(fetchMarksByExam.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch marks'
      })
      .addCase(saveMarks.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(saveMarks.fulfilled, (state, action) => {
        state.loading = false
        state.marks = action.payload
      })
      .addCase(saveMarks.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to save marks'
      })
      .addCase(updateMark.fulfilled, (state, action) => {
        const index = state.marks.findIndex(m => m.id === action.payload.id)
        if (index !== -1) {
          state.marks[index] = action.payload
        }
      })
  },
})

export const { clearError } = marksSlice.actions
export default marksSlice.reducer