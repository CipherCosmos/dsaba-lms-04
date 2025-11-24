import React, { useState } from 'react'
import COPOMatrixVisualization from './COPOMatrixVisualization'
import BulkCOPOMapping from './BulkCOPOMapping'
import EnhancedThresholdConfiguration from './EnhancedThresholdConfiguration'
import {
  Grid3X3,
  Zap,
  Gauge,
  BarChart3,
  Settings,
  Target,
  Layers,
  TrendingUp,
  ChevronRight
} from 'lucide-react'

interface COPOManagementDashboardProps {
  className?: string
}

type TabType = 'matrix' | 'bulk' | 'thresholds' | 'analytics'

interface Tab {
  id: TabType
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  component: React.ComponentType<any>
}

const COPOManagementDashboard: React.FC<COPOManagementDashboardProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<TabType>('matrix')

  const tabs: Tab[] = [
    {
      id: 'matrix',
      label: 'CO-PO Matrix',
      icon: Grid3X3,
      description: 'Interactive visualization of CO-PO mappings with real-time editing',
      component: COPOMatrixVisualization
    },
    {
      id: 'bulk',
      label: 'Bulk Operations',
      icon: Zap,
      description: 'Perform bulk mapping operations efficiently across multiple COs and POs',
      component: BulkCOPOMapping
    },
    {
      id: 'thresholds',
      label: 'Threshold Configuration',
      icon: Gauge,
      description: 'Configure attainment thresholds with validation and visual feedback',
      component: EnhancedThresholdConfiguration
    },
    {
      id: 'analytics',
      label: 'Analytics & Insights',
      icon: BarChart3,
      description: 'View mapping analytics, attainment trends, and performance insights',
      component: () => <div>Analytics component coming soon...</div>
    }
  ]

  const activeTabData = tabs.find(tab => tab.id === activeTab)
  const ActiveComponent = activeTabData?.component || COPOMatrixVisualization

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">CO-PO Management Dashboard</h1>
                <p className="text-gray-600">Comprehensive Course Outcome to Program Outcome mapping and attainment management</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Management Tools</h2>
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-start space-x-3 p-3 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-50 border border-blue-200 text-blue-900'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className={`h-5 w-5 mt-0.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm">{tab.label}</div>
                          <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                            {tab.description}
                          </div>
                        </div>
                        {isActive && (
                          <ChevronRight className="h-4 w-4 text-blue-600 mt-0.5" />
                        )}
                      </button>
                    )
                  })}
                </nav>
              </div>

              {/* Quick Stats */}
              <div className="px-6 pb-6">
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Overview</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Active Mappings</span>
                      <span className="text-xs font-medium text-gray-900">--</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">CO Coverage</span>
                      <span className="text-xs font-medium text-gray-900">--%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">PO Coverage</span>
                      <span className="text-xs font-medium text-gray-900">--%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Avg Attainment</span>
                      <span className="text-xs font-medium text-gray-900">--%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <div className="flex items-center space-x-2 mb-2">
                <Settings className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Getting Started</span>
              </div>
              <div className="text-xs text-blue-800 space-y-2">
                <p>1. <strong>Matrix View:</strong> Click cells to set mapping strengths</p>
                <p>2. <strong>Bulk Operations:</strong> Perform multiple mappings at once</p>
                <p>3. <strong>Thresholds:</strong> Configure attainment levels with validation</p>
                <p>4. <strong>Analytics:</strong> Monitor mapping effectiveness</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Tab Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  {activeTabData && <activeTabData.icon className="h-6 w-6 text-blue-600" />}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{activeTabData?.label}</h2>
                    <p className="text-sm text-gray-600">{activeTabData?.description}</p>
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                <ActiveComponent />
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                    <Grid3X3 className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Interactive Matrix</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Visual CO-PO mapping with click-to-edit functionality and real-time statistics.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Bulk Operations</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Efficiently manage multiple CO-PO mappings with batch operations and previews.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                    <Gauge className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Smart Validation</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Intelligent threshold validation with visual feedback and error prevention.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Layers className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                CO-PO Framework Management System
              </span>
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>v2.0 Enhanced</span>
              <span>•</span>
              <span>Real-time Validation</span>
              <span>•</span>
              <span>Bulk Operations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default COPOManagementDashboard