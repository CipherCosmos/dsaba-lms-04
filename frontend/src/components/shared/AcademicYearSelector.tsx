import React from 'react'
import { useAcademicYears, useCurrentAcademicYear } from '../../core/hooks'
import { useAcademicYearContext } from '../../contexts/AcademicYearContext'

interface AcademicYearSelectorProps {
  value?: number | null
  onChange: (academicYearId: number | null) => void
  required?: boolean
  label?: string
  showCurrentBadge?: boolean
  className?: string
  disabled?: boolean
}

/**
 * Reusable Academic Year Selector Component
 * Automatically defaults to current academic year if value is not provided
 */
export const AcademicYearSelector: React.FC<AcademicYearSelectorProps> = ({
  value,
  onChange,
  required = false,
  label = 'Academic Year',
  showCurrentBadge = true,
  className = '',
  disabled = false,
}) => {
  const { currentAcademicYear } = useAcademicYearContext()
  const { data: academicYearsData } = useAcademicYears(0, 200)
  const academicYears = academicYearsData?.items || []

  // Default to current academic year if value is not set
  const selectedValue = value ?? currentAcademicYear?.id ?? null

  // Update parent when current academic year is available and value is not set
  React.useEffect(() => {
    if (!value && currentAcademicYear?.id && selectedValue !== currentAcademicYear.id) {
      onChange(currentAcademicYear.id)
    }
  }, [value, currentAcademicYear?.id, onChange, selectedValue])

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        value={selectedValue || ''}
        onChange={(e) => {
          const newValue = e.target.value ? parseInt(e.target.value) : null
          onChange(newValue)
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        required={required}
        disabled={disabled}
      >
        <option value="">Select Academic Year</option>
        {academicYears.map((ay: any) => (
          <option key={ay.id} value={ay.id}>
            {ay.display_name}
            {showCurrentBadge && ay.is_current && ' (Current)'}
            {ay.status === 'archived' && ' (Archived)'}
          </option>
        ))}
      </select>
      {currentAcademicYear && !value && (
        <p className="text-xs text-gray-500 mt-1">
          Defaulting to current academic year: {currentAcademicYear.display_name}
        </p>
      )}
    </div>
  )
}

