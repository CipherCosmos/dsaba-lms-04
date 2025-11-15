import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { classAPI } from '../../services/api'

interface Class {
  id: number
  name: string
  department_id: number
  semester: number
  section: string
  created_at: string
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

export const fetchClasses = createAsyncThunk('classes/fetchClasses', async () => {
  const response = await classAPI.getAll()
  // Backend returns BatchListResponse with items array (standardized)
  return response.items || response.batches || response || []
})

export const createClass = createAsyncThunk(
  'classes/createClass',
  async (classData: Omit<Class, 'id' | 'created_at'>) => {
    const response = await classAPI.create(classData)
    return response
  }
)

export const updateClass = createAsyncThunk(
  'classes/updateClass',
  async ({ id, ...classData }: Partial<Class> & { id: number }) => {
    const response = await classAPI.update(id, classData)
    return response
  }
)

export const deleteClass = createAsyncThunk(
  'classes/deleteClass',
  async (id: number) => {
    await classAPI.delete(id)
    return id
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
      .addCase(createClass.fulfilled, (state, action) => {
        state.classes.push(action.payload)
      })
      .addCase(updateClass.fulfilled, (state, action) => {
        const index = state.classes.findIndex(c => c.id === action.payload.id)
        if (index !== -1) {
          state.classes[index] = action.payload
        }
      })
      .addCase(deleteClass.fulfilled, (state, action) => {
        state.classes = state.classes.filter(c => c.id !== action.payload)
      })
  },
})

export const { clearError } = classSlice.actions
export default classSlice.reducer