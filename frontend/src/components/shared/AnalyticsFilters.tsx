import React from 'react'
import { Search } from 'lucide-react'

export interface FilterOption {
  value: string | number
  label: string
}

export interface AnalyticsFiltersProps {
  searchTerm?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: {
    [key: string]: {
      value: string | number | null
      options: FilterOption[]
      placeholder: string
      onChange: (value: string | number | null) => void
    }
  }
  className?: string
}

const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = {},
  className = ''
}) => {
  return (
    <div className={`card mb-6 ${className}`}>
      <div className="flex flex-col md:flex-row gap-4">
        {onSearchChange && (
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {Object.entries(filters).map(([key, filter]) => (
          <select
            key={key}
            value={filter.value || ''}
            onChange={(e) => filter.onChange(e.target.value ? (typeof filter.value === 'number' ? Number(e.target.value) : e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{filter.placeholder}</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  )
}

export default AnalyticsFilters