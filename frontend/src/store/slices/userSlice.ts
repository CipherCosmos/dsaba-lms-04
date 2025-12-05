import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { userAPI } from '../../services/api'
import { mapUserResponse } from '../../core/utils/contractMapper'

interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: string  // Primary role from roles array
  roles: string[]
  department_ids: number[]
  is_active: boolean
  email_verified: boolean
  phone_number?: string
  avatar_url?: string
  bio?: string
  created_at: string
  updated_at?: string
  // Note: class_id removed - students are associated via StudentEnrollments (semester-based)
}

interface UserState {
  users: User[]
  loading: boolean
  error: string | null
}

const initialState: UserState = {
  users: [],
  loading: false,
  error: null,
}

export const fetchUsers = createAsyncThunk('users/fetchUsers', async (filters?: { is_active?: boolean; email_verified?: boolean }) => {
  const response = await userAPI.getAll(0, 100, filters)
  // Backend returns UserListResponse with items array
  const users = response.items || []
  return users.map((user: any) => mapUserResponse(user))
})

export const createUser = createAsyncThunk(
  'users/createUser',
  async (user: Omit<User, 'id' | 'created_at'> & { password: string }) => {
    // Transform roles array to backend format
    const backendUser = {
      ...user,
      roles: user.roles.map(role => ({ role, department_id: user.department_ids[0] }))
    }
    const response = await userAPI.create(backendUser as any)
    return response
  }
)

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, ...user }: Partial<User> & { id: number }) => {
    const response = await userAPI.update(id, user)
    return response
  }
)

export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (id: number) => {
    await userAPI.delete(id)
    return id
  }
)

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false
        state.users = action.payload
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch users'
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.users.push(mapUserResponse(action.payload) as any)
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.users.findIndex(u => u.id === action.payload.id)
        const mappedUser = mapUserResponse(action.payload)
        if (index !== -1) {
          state.users[index] = mappedUser as any
        }
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(u => u.id !== action.payload)
      })
  },
})

export const { clearError } = userSlice.actions
export default userSlice.reducer