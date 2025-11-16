import React, { createContext, useContext, ReactNode } from 'react'
import { useCurrentAcademicYear } from '../core/hooks'
import { LoadingFallback } from '../modules/shared/components/LoadingFallback'

interface AcademicYear {
  id: number
  start_year: number
  end_year: number
  display_name: string
  is_current: boolean
  status: string
  start_date?: string
  end_date?: string
}

interface AcademicYearContextType {
  currentAcademicYear: AcademicYear | null
  academicYearId: number | null
  isLoading: boolean
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined)

export const useAcademicYearContext = () => {
  const context = useContext(AcademicYearContext)
  if (context === undefined) {
    throw new Error('useAcademicYearContext must be used within an AcademicYearProvider')
  }
  return context
}

interface AcademicYearProviderProps {
  children: ReactNode
}

export const AcademicYearProvider: React.FC<AcademicYearProviderProps> = ({ children }) => {
  const { data: currentAcademicYear, isLoading } = useCurrentAcademicYear()

  const value: AcademicYearContextType = {
    currentAcademicYear: currentAcademicYear || null,
    academicYearId: currentAcademicYear?.id || null,
    isLoading,
  }

  if (isLoading) {
    return <LoadingFallback />
  }

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  )
}

