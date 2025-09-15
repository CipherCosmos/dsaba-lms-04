import { useState, useEffect } from 'react'
import { Wifi, WifiOff, CheckCircle, AlertCircle } from 'lucide-react'

const PWAStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isPWA, setIsPWA] = useState(false)
  const [swStatus, setSwStatus] = useState<'loading' | 'registered' | 'error' | 'unsupported'>('loading')

  useEffect(() => {
    // Check if running as PWA
    const checkPWA = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsPWA(true)
        return
      }
      
      if ((window.navigator as any).standalone === true) {
        setIsPWA(true)
        return
      }
      
      setIsPWA(false)
    }

    checkPWA()

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check service worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => {
          setSwStatus('registered')
        })
        .catch(() => {
          setSwStatus('error')
        })
    } else {
      setSwStatus('unsupported')
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isPWA) return null

  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
        {/* Online Status */}
        <div className="flex items-center space-x-1">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* PWA Status */}
        <div className="flex items-center space-x-1">
          <CheckCircle className="h-4 w-4 text-blue-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            PWA
          </span>
        </div>

        {/* Service Worker Status */}
        <div className="flex items-center space-x-1">
          {swStatus === 'registered' && <CheckCircle className="h-4 w-4 text-green-500" />}
          {swStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
          {swStatus === 'loading' && <div className="h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />}
          <span className="text-xs text-gray-600 dark:text-gray-400">
            SW
          </span>
        </div>
      </div>
    </div>
  )
}

export default PWAStatus
