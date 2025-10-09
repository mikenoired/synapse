/* eslint-disable no-console */
import './thumbnail-worker'

console.log('🚀 Worker process started')

process.on('SIGTERM', () => {
  console.log('👋 Worker shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('👋 Worker interrupted')
  process.exit(0)
})
