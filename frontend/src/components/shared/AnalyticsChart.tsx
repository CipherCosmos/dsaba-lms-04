import React from 'react'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export type ChartType = 'bar' | 'doughnut' | 'line' | 'pie'

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
    borderWidth?: number
  }[]
}

export interface AnalyticsChartProps {
  type: ChartType
  data: ChartData
  title?: string
  height?: number
  options?: any
  className?: string
}

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  type,
  data,
  title,
  height = 300,
  options = {},
  className = ''
}) => {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: type !== 'bar',
        position: 'bottom' as const,
      },
      title: {
        display: !!title,
        text: title,
      },
    },
    scales: type === 'bar' ? {
      y: {
        beginAtZero: true,
      },
    } : undefined,
    ...options,
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return <Bar data={data} options={defaultOptions} />
      case 'doughnut':
        return <Doughnut data={data} options={defaultOptions} />
      case 'line':
        return <Line data={data} options={defaultOptions} />
      case 'pie':
        return <Pie data={data} options={defaultOptions} />
      default:
        return <Bar data={data} options={defaultOptions} />
    }
  }

  return (
    <div className={`card ${className}`}>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <div style={{ height: `${height}px` }}>
        {renderChart()}
      </div>
    </div>
  )
}

export default AnalyticsChart