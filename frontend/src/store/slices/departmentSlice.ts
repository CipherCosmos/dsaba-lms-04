import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { departmentAPI } from '../../services/api'

interface Department {
  id: number
  name: string
  code: string
  hod_id?: number
  created_at: string
}

interface DepartmentState {
  departments: Department[]
  loading: boolean
  error: string | null
}

const initialState: DepartmentState = {
  departments: [],
  loading: false,
  error: null,
}

export const fetchDepartments = createAsyncThunk('departments/fetchDepartments', async (filters?: { is_active?: boolean; has_hod?: boolean }) => {
  const response = await departmentAPI.getAll(0, 100, filters)
  // Backend returns DepartmentListResponse with departments array
  return response.departments || response || []
})

export const createDepartment = createAsyncThunk(
  'departments/createDepartment',
  async (department: Omit<Department, 'id' | 'created_at'>) => {
    const response = await departmentAPI.create(department)
    return response
  }
)

export const updateDepartment = createAsyncThunk(
  'departments/updateDepartment',
  async ({ id, ...department }: Partial<Department> & { id: number }) => {
    const response = await departmentAPI.update(id, department)
    return response
  }
)

export const deleteDepartment = createAsyncThunk(
  'departments/deleteDepartment',
  async (id: number) => {
    await departmentAPI.delete(id)
    return id
  }
)

const departmentSlice = createSlice({
  name: 'departments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDepartments.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.loading = false
        state.departments = action.payload
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch departments'
      })
      .addCase(createDepartment.fulfilled, (state, action) => {
        state.departments.push(action.payload)
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        const index = state.departments.findIndex(d => d.id === action.payload.id)
        if (index !== -1) {
          state.departments[index] = action.payload
        }
      })
      .addCase(deleteDepartment.fulfilled, (state, action) => {
        state.departments = state.departments.filter(d => d.id !== action.payload)
      })
  },
})

export const { clearError } = departmentSlice.actions
export default departmentSlice.reducer