'use client'

import { useEffect, useState } from 'react'

export default function MediaTab() {
  const totalSpace = 1000 // GB
  const usedSpace = 900 // GB
  const freeSpace = totalSpace - usedSpace
  const totalFiles = 45672
  const usagePercentage = (usedSpace / totalSpace) * 100

  const [loading, setLoading] = useState(true)
  const [animatedPercent, setAnimatedPercent] = useState(0)

  useEffect(() => {
    setTimeout(() => setLoading(false), 500)
  }, [])

  useEffect(() => {
    if (!loading) {
      const duration = 700
      const startValue = 0
      const endValue = usagePercentage
      const startTime = performance.now()
      function animate(now: number) {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = easeInOutCubic(progress)
        const current = startValue + (endValue - startValue) * eased
        setAnimatedPercent(current)
        if (progress < 1)
          requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }
    else {
      setAnimatedPercent(0)
    }
  }, [loading, usagePercentage])

  function getRingColor(percent: number) {
    if (percent < 60)
      return '#22c55e'
    if (percent < 85)
      return '#eab308'
    return '#ef4444'
  }

  function easeInOutCubic(t: number) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - (-2 * t + 2) ** 3 / 2
  }

  const formatSize = (sizeInGB: number) => {
    if (sizeInGB >= 1000) {
      return `${(sizeInGB / 1000).toFixed(1)} TB`
    }
    return `${sizeInGB} GB`
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  return (
    <div className="p-6 space-y-4 bg-muted">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Storage Usage</h2>
        <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
          {usagePercentage.toFixed(1)}
          % used
        </span>
      </div>
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex justify-center w-full max-w-[220px] mx-auto">
          {loading
            ? (
                <div className="animate-pulse w-[180px] h-[180px] rounded-full bg-muted/60" />
              )
            : (
                <svg
                  width="180"
                  height="180"
                  viewBox="0 0 180 180"
                  style={{ maxWidth: 220, display: 'block' }}
                >
                  <circle
                    cx="90"
                    cy="90"
                    r="80"
                    fill="none"
                    stroke="var(--muted)"
                    strokeWidth="18"
                  />
                  <circle
                    cx="90"
                    cy="90"
                    r="80"
                    fill="none"
                    stroke={getRingColor(animatedPercent)}
                    strokeWidth="18"
                    strokeDasharray={2 * Math.PI * 80}
                    strokeDashoffset={2 * Math.PI * 80 * (1 - animatedPercent / 100)}
                    strokeLinecap="round"
                    style={{
                      filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))',
                    }}
                  />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="2.2rem"
                    fontWeight="bold"
                    fill="var(--foreground)"
                  >
                    {Math.round(animatedPercent)}
                    %
                  </text>
                </svg>
              )}
        </div>

        <div className="space-y-4 flex-1">
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Used Space</span>
            <div className="h-px w-full bg-border flex-1"></div>
            <span className="font-semibold text-foreground">
              {formatSize(usedSpace)}
              {' '}
              /
              {formatSize(totalSpace)}
            </span>
          </div>

          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Free Space</span>
            <div className="h-px w-full bg-border flex-1"></div>
            <span className="font-semibold text-green-600">
              {formatSize(freeSpace)}
            </span>
          </div>

          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Total Files</span>
            <div className="h-px w-full bg-border flex-1"></div>
            <span className="font-semibold text-foreground">
              {formatNumber(totalFiles)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
