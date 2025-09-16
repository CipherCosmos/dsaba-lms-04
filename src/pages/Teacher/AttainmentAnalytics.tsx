import React, { useState } from 'react'
import AttainmentAnalyticsEnhanced from './AttainmentAnalyticsEnhanced'
import AdvancedAttainmentAnalytics from './AdvancedAttainmentAnalytics'
import { BarChart3, TrendingUp } from 'lucide-react'

const AttainmentAnalytics: React.FC = () => {
  const [viewMode, setViewMode] = useState<'basic' | 'advanced'>('basic')

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attainment Analytics</h1>
            <p className="text-gray-600">Comprehensive CO/PO attainment analysis and insights</p>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('basic')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'basic'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Basic Analysis</span>
            </button>
            <button
              onClick={() => setViewMode('advanced')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'advanced'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Advanced Analysis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'basic' ? (
        <AttainmentAnalyticsEnhanced />
      ) : (
        <AdvancedAttainmentAnalytics />
      )}
    </div>
  )
}

export default AttainmentAnalytics