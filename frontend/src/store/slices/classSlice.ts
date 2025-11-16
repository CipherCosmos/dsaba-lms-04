import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { batchInstanceAPI } from '../../services/api'

// View model representing a class-like entity mapped from batch instances
interface Class {
  id: number
  name: string
  department_id: number
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
  const response = await batchInstanceAPI.getAll(0, 500)
  const items = response.items || []
  // Map batch instances to class-like view models for backward UI compatibility
  const mapped: Class[] = items.map((bi: any) => ({
    id: bi.id,
    name: `${bi.department?.code || bi.department_id}-${bi.batch?.name || bi.batch_id}-${bi.admission_year}`,
    department_id: bi.department_id,
    created_at: bi.created_at,
  }))
  return mapped
})

// Deprecated flows (create/update/delete) were tied to legacy class API.
// Keep no-ops to prevent UI breakage; creation is handled via CreateClassWizard.
export const createClass = createAsyncThunk(
  'classes/createClass',
  async (_classData: Omit<Class, 'id' | 'created_at'>) => {
    // Trigger a refresh instead
    const response = await batchInstanceAPI.getAll(0, 1)
    return (response.items && response.items[0]) || null
  }
)

export const updateClass = createAsyncThunk(
  'classes/updateClass',
  async ({ id }: Partial<Class> & { id: number }) => {
    // Toggle active via batchInstanceAPI activate/deactivate could be implemented in component via hooks
    const refreshed = await batchInstanceAPI.getById(id)
    return {
      id: refreshed.id,
      name: `${refreshed.department?.code || refreshed.department_id}-${refreshed.batch?.name || refreshed.batch_id}-${refreshed.admission_year}`,
      department_id: refreshed.department_id,
      created_at: refreshed.created_at,
    } as Class
  }
)

export const deleteClass = createAsyncThunk(
  'classes/deleteClass',
  async (id: number) => {
    // Deactivation should be used instead of deletion in new model
    // Return id to remove from local list if UI requests it
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