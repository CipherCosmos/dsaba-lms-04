import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import { authAPI } from '../../services/api'
import { queryKeys } from './queryKeys'
import { login, logout } from '../../store/slices/authSlice'
import { AppDispatch } from '../../store/store'
import toast from 'react-hot-toast'
import type { AxiosErrorResponse } from '../types'

/**
 * Hook to get current user
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: authAPI.getCurrentUser,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook for login mutation
 */
export function useLogin() {
  const dispatch = useDispatch<AppDispatch>()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authAPI.login,
    onSuccess: (response) => {
      localStorage.setItem('token', response.access_token)
      // Create fulfilled action manually
      dispatch({ type: 'auth/login/fulfilled', payload: response.user } as any)
      queryClient.setQueryData(queryKeys.auth.me(), response.user)
      toast.success('Login successful')
    },
    onError: (error: AxiosErrorResponse) => {
      toast.error(error.response?.data?.detail || 'Login failed')
    },
  })
}

/**
 * Hook for logout mutation
 */
export function useLogout() {
  const dispatch = useDispatch<AppDispatch>()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Call logout API if available
      try {
        await authAPI.logout?.()
      } catch (e) {
        // Ignore logout errors
      }
    },
    onSuccess: () => {
      localStorage.removeItem('token')
      dispatch({ type: 'auth/logout/fulfilled' } as any)
      queryClient.clear()
      toast.success('Logged out successfully')
    },
    onError: () => {
      // Even if logout fails, clear local state
      localStorage.removeItem('token')
      dispatch({ type: 'auth/logout/fulfilled' } as any)
      queryClient.clear()
    },
  })
}

