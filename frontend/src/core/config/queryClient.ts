import { QueryClient } from '@tanstack/react-query'

/**
 * React Query Client Configuration
 * Optimized for performance and user experience
 * 
 * Performance optimizations:
 * - Increased cache time for stable data
 * - Disabled refetch on window focus to reduce unnecessary requests
 * - Optimized retry strategy
 * - Per-hook cache settings override these defaults
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache time: how long unused/inactive cache data remains in memory
      gcTime: 1000 * 60 * 10, // 10 minutes (increased from 5 for better performance)
      
      // Stale time: how long data is considered fresh
      staleTime: 1000 * 60 * 2, // 2 minutes (increased from 1 for better performance)
      
      // Retry failed requests
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus - disabled for better performance
      refetchOnWindowFocus: false,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Refetch on mount - only if data is stale
      refetchOnMount: 'always', // Changed to always to ensure fresh data when needed
      
      // Structural sharing - enabled by default, improves performance
      structuralSharing: true,
    },
    mutations: {
      // Retry failed mutations
      retry: 1,
      // Optimistic updates disabled by default (can be enabled per mutation)
      retryDelay: 1000,
    },
  },
})

