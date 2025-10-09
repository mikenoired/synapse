/* eslint-disable no-console */
'use client'

import { useReportWebVitals } from 'next/web-vitals'

function sendToAnalytics(metric: any) {
  const { name, value, rating, delta, id, navigationType } = metric

  console.group(`📊 Web Vital: ${name}`)
  console.log(`Value: ${value}ms`)
  console.log(`Rating: ${rating}`)
  console.log(`Delta: ${delta}ms`)
  console.log(`ID: ${id}`)
  console.log(`Navigation: ${navigationType}`)

  const thresholds = {
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    CLS: { good: 0.1, poor: 0.25 },
    FID: { good: 100, poor: 300 },
    TTFB: { good: 800, poor: 1800 },
    INP: { good: 200, poor: 500 },
  }

  const threshold = thresholds[name as keyof typeof thresholds]
  if (threshold) {
    if (name === 'CLS') {
      if (value <= threshold.good) {
        console.log('✅ Excellent CLS score!')
      }
      else if (value <= threshold.poor) {
        console.log('⚠️ CLS needs improvement')
      }
      else {
        console.log('❌ Poor CLS - check for layout shifts')
      }
    }
    else {
      if (value <= threshold.good) {
        console.log('✅ Excellent performance!')
      }
      else if (value <= threshold.poor) {
        console.log('⚠️ Performance needs improvement')
      }
      else {
        console.log('❌ Poor performance - requires optimization')
      }
    }
  }

  if (name === 'TTFB' && value > 1000) {
    console.log('💡 Consider: Server-side caching, CDN, database optimization')
  }
  if (name === 'FCP' && value > 2000) {
    console.log('💡 Consider: Code splitting, font optimization, critical CSS')
  }
  if (name === 'LCP' && value > 3000) {
    console.log('💡 Consider: Image optimization, lazy loading, resource prioritization')
  }

  console.groupEnd()
}

export function WebVitals() {
  useReportWebVitals(sendToAnalytics)
  return null
}
