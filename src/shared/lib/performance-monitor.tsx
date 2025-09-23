'use client'

import { useEffect } from 'react'

export function PerformanceMonitor() {
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn(`⚠️ Long task detected: ${entry.duration}ms`, {
              name: entry.name,
              startTime: entry.startTime,
              duration: entry.duration
            })
          }
        }
      })

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] })
      } catch {
        // longtask is not supported in all browsers
      }

      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 0.1) { // Significant layout shifts
            console.warn(`⚠️ Layout shift detected: ${entry.duration}`, {
              sources: (entry as any).sources?.map((source: any) => ({
                node: source.node,
                previousRect: source.previousRect,
                currentRect: source.currentRect
              }))
            })
          }
        }
      })

      try {
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] })
      } catch {
        // layout-shift is not supported in all browsers
      }

      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming

          if (resource.duration > 1000) {
            console.warn(`🐌 Slow resource: ${resource.name}`, {
              duration: resource.duration,
              size: resource.transferSize,
              type: resource.initiatorType
            })
          }

          if (resource.transferSize && resource.transferSize > 500 * 1024) {
            console.warn(`📦 Large resource: ${resource.name}`, {
              size: `${(resource.transferSize / 1024).toFixed(2)}KB`,
              duration: resource.duration
            })
          }
        }
      })

      try {
        resourceObserver.observe({ entryTypes: ['resource'] })
      } catch {
        // resource timing not supported
      }

      return () => {
        longTaskObserver.disconnect()
        layoutShiftObserver.disconnect()
        resourceObserver.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    const checkMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usedMB = memory.usedJSHeapSize / 1048576
        const totalMB = memory.totalJSHeapSize / 1048576
        const limitMB = memory.jsHeapSizeLimit / 1048576

        if (usedMB > 50) {
          console.warn(`🧠 High memory usage: ${usedMB.toFixed(2)}MB / ${totalMB.toFixed(2)}MB (limit: ${limitMB.toFixed(2)}MB)`)
        }
      }
    }

    const memoryInterval = setInterval(checkMemoryUsage, 10000) // Check every 10 seconds

    return () => clearInterval(memoryInterval)
  }, [])

  return null
}

export function measureRenderTime(componentName: string) {
  const start = performance.now()

  return () => {
    const end = performance.now()
    const duration = end - start

    if (duration > 16) {
      console.warn(`⏱️ Slow render: ${componentName} took ${duration.toFixed(2)}ms`)
    }
  }
}

export function useMountTime(componentName: string) {
  useEffect(() => {
    const endMeasure = measureRenderTime(componentName)
    return endMeasure
  }, [componentName])
}
