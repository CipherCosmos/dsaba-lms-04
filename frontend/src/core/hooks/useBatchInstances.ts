import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { batchInstanceAPI } from '../../services/api'
import { logger } from '../utils/logger'

export interface BatchInstance {
  id: number
  academic_year_id: number
  department_id: number
  batch_id: number
  admission_year: number
  current_semester: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Section {
  id: number
  batch_instance_id: number
  section_name: string
  capacity?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BatchInstanceListResponse {
  items: BatchInstance[]
  total: number
  skip: number
  limit: number
}

export interface SectionListResponse {
  items: Section[]
  total: number
}

// Hooks for Batch Instances
export const useBatchInstances = (
  skip: number = 0,
  limit: number = 100,
  filters?: {
    academic_year_id?: number
    department_id?: number
    batch_id?: number
    is_active?: boolean
  }
) => {
  return useQuery<BatchInstanceListResponse>({
    queryKey: ['batch-instances', skip, limit, filters],
    queryFn: async () => {
      const response = await batchInstanceAPI.getAll(skip, limit, filters)
      return response
    },
    staleTime: 30000, // 30 seconds
  })
}

export const useBatchInstance = (batchInstanceId: number | null) => {
  return useQuery<BatchInstance>({
    queryKey: ['batch-instance', batchInstanceId],
    queryFn: async () => {
      if (!batchInstanceId) throw new Error('Batch instance ID is required')
      const response = await batchInstanceAPI.getById(batchInstanceId)
      return response
    },
    enabled: !!batchInstanceId,
    staleTime: 30000,
  })
}

export const useCreateBatchInstance = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      academic_year_id: number
      department_id: number
      batch_id: number
      admission_year: number
      sections?: string[]
    }) => {
      return await batchInstanceAPI.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-instances'] })
      logger.info('Batch instance created successfully')
    },
    onError: (error: any) => {
      logger.error('Failed to create batch instance:', error)
      throw error
    },
  })
}

export const useActivateBatchInstance = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (batchInstanceId: number) => {
      return await batchInstanceAPI.activate(batchInstanceId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-instances'] })
      logger.info('Batch instance activated successfully')
    },
  })
}

export const useDeactivateBatchInstance = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (batchInstanceId: number) => {
      return await batchInstanceAPI.deactivate(batchInstanceId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-instances'] })
      logger.info('Batch instance deactivated successfully')
    },
  })
}

// Hooks for Sections
export const useSections = (batchInstanceId: number | null) => {
  return useQuery<SectionListResponse>({
    queryKey: ['sections', batchInstanceId],
    queryFn: async () => {
      if (!batchInstanceId) throw new Error('Batch instance ID is required')
      const response = await batchInstanceAPI.getSections(batchInstanceId)
      return response
    },
    enabled: !!batchInstanceId,
    staleTime: 30000,
  })
}

export const useSection = (sectionId: number | null) => {
  return useQuery<Section>({
    queryKey: ['section', sectionId],
    queryFn: async () => {
      if (!sectionId) throw new Error('Section ID is required')
      const response = await batchInstanceAPI.getSection(sectionId)
      return response
    },
    enabled: !!sectionId,
    staleTime: 30000,
  })
}

export const useCreateSection = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      batch_instance_id: number
      section_name: string
      capacity?: number
    }) => {
      return await batchInstanceAPI.createSection(data.batch_instance_id, {
        section_name: data.section_name,
        capacity: data.capacity,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sections', variables.batch_instance_id] })
      queryClient.invalidateQueries({ queryKey: ['batch-instances'] })
      logger.info('Section created successfully')
    },
    onError: (error: any) => {
      logger.error('Failed to create section:', error)
      throw error
    },
  })
}

export const useUpdateSection = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      section_id: number
      section_name?: string
      capacity?: number
      is_active?: boolean
    }) => {
      return await batchInstanceAPI.updateSection(data.section_id, {
        section_name: data.section_name,
        capacity: data.capacity,
        is_active: data.is_active,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      queryClient.invalidateQueries({ queryKey: ['batch-instances'] })
      logger.info('Section updated successfully')
    },
    onError: (error: any) => {
      logger.error('Failed to update section:', error)
      throw error
    },
  })
}

// Batch Promotion Hook
export const usePromoteBatch = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      batch_instance_id: number
      notes?: string
    }) => {
      return await batchInstanceAPI.promote(data.batch_instance_id, data.notes)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['batch-instances'] })
      queryClient.invalidateQueries({ queryKey: ['student-enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      logger.info('Batch promoted successfully')
    },
    onError: (error: any) => {
      logger.error('Failed to promote batch:', error)
      throw error
    },
  })
}

