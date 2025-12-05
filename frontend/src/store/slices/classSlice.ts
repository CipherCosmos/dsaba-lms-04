import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { batchInstanceAPI } from '../../services/api'

// Define the Class interface based on BatchInstanceResponse
export interface Class {
  id: number
  department_id: number
  batch_id: number
  admission_year: number
  current_year: number
  expected_graduation_year: number
  is_active: boolean
  sections?: any[]
  created_at?: string
  updated_at?: string
}

interface ClassState {
  classes: Class[]
  loading: boolean
  error: string | null
}

const initialState: ClassState = {
  classes: [],
  loading: false,
  error: null,
}

export const fetchClasses = createAsyncThunk(
  'classes/fetchClasses',
  async (filters?: {
    academic_year_id?: number
    department_id?: number
    batch_id?: number
    is_active?: boolean
  }) => {
    const response = await batchInstanceAPI.getAll(0, 100, filters)
    return response.items || []
  }
)

export const fetchClassById = createAsyncThunk(
  'classes/fetchClassById',
  async (id: number) => {
    const response = await batchInstanceAPI.getById(id)
    return response
  }
)

export const createClass = createAsyncThunk(
  'classes/createClass',
  async (data: {
    academic_year_id: number
    department_id: number
    batch_id: number
    admission_year: number
    sections?: string[]
  }) => {
    const response = await batchInstanceAPI.create(data)
    return response
  }
)

const classSlice = createSlice({
  name: 'classes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClasses.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchClasses.fulfilled, (state, action) => {
        state.loading = false
        state.classes = action.payload
      })
      .addCase(fetchClasses.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch classes'
      })
      .addCase(fetchClassById.fulfilled, (state, action) => {
        const index = state.classes.findIndex(c => c.id === action.payload.id)
        if (index !== -1) {
          state.classes[index] = action.payload
        } else {
          state.classes.push(action.payload)
        }
      })
      .addCase(createClass.fulfilled, (state, action) => {
        state.classes.push(action.payload)
      })
  },
})

export const { clearError } = classSlice.actions
export default classSlice.reducer
