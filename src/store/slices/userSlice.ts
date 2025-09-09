import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { userAPI } from '../../services/api'

interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'hod' | 'teacher' | 'student'
  department_id?: number
  class_id?: number
  is_active: boolean
  created_at: string
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

export const fetchUsers = createAsyncThunk('users/fetchUsers', async () => {
  const response = await userAPI.getAll()
  return response
})

export const createUser = createAsyncThunk(
  'users/createUser',
  async (user: Omit<User, 'id' | 'created_at'> & { password: string }) => {
    const response = await userAPI.create(user)
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
        state.users.push(action.payload)
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.users.findIndex(u => u.id === action.payload.id)
        if (index !== -1) {
          state.users[index] = action.payload
        }
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(u => u.id !== action.payload)
      })
  },
})

export const { clearError } = userSlice.actions
export default userSlice.reducer