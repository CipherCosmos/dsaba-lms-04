import { QueryClient } from '@tanstack/react-query'

/**
 * React Query Client Configuration
 * Optimized for performance and user experience
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache time: how long unused/inactive cache data remains in memory
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
      
      // Stale time: how long data is considered fresh
      staleTime: 1000 * 60 * 1, // 1 minute
      
      // Retry failed requests
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus
      refetchOnWindowFocus: false,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Refetch on mount
      refetchOnMount: true,
    },
    mutations: {
      // Retry failed mutations
      retry: 1,
    },
  },
})

