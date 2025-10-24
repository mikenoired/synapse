import { test, expect, describe, afterAll } from 'bun:test'
import { ThumbnailTestUtils } from './test-utils.js'

describe('Thumbnail Service Integration Tests', () => {
  let executionTimes: number[] = []

  afterAll(() => {
    if (executionTimes.length > 0) {
      const averageTime = ThumbnailTestUtils.formatAverageTime(executionTimes)
      console.log(`Average execution time: ${averageTime}`)
    }
  })

  test('should connect to thumbnail service', async () => {
    const testBuffer = ThumbnailTestUtils.loadTestFile('test-image.jpeg')

    const response = await ThumbnailTestUtils.getImageDimensions(testBuffer, 'image/jpeg')
    executionTimes.push(response.executionTime)

    expect(response.success).toBe(true)
    expect(response.width).toBeGreaterThan(0)
    expect(response.height).toBeGreaterThan(0)
  })

  test('should handle basic image processing workflow', async () => {
    const testBuffer = ThumbnailTestUtils.loadTestFile('test-image.jpeg')

    const dimensions = await ThumbnailTestUtils.getImageDimensions(testBuffer, 'image/jpeg')
    executionTimes.push(dimensions.executionTime)
    expect(dimensions.success).toBe(true)

    const thumbnail = await ThumbnailTestUtils.generateThumbnail(testBuffer, 'image/jpeg', {
      width: 20,
      height: 0,
      quality: 40,
    })
    executionTimes.push(thumbnail.executionTime)
    expect(thumbnail.success).toBe(true)
  })

  test('should validate service health', async () => {
    const testBuffer = ThumbnailTestUtils.loadTestFile('test-image.jpeg')

    const operations = [
      () => ThumbnailTestUtils.getImageDimensions(testBuffer, 'image/jpeg'),
      () => ThumbnailTestUtils.generateThumbnail(testBuffer, 'image/jpeg', { width: 10, quality: 40 }),
      () => ThumbnailTestUtils.generateThumbnail(testBuffer, 'image/jpeg', { width: 50, quality: 40 })
    ]

    const results = await Promise.all(operations.map(op => op()))

    results.forEach((response) => {
      executionTimes.push(response.executionTime)
      expect(response.success).toBe(true)
    })

    const averageTime = ThumbnailTestUtils.formatAverageTime(results.map(r => r.executionTime))
    console.log(`Service health check: ${results.length} operations - Average: ${averageTime}`)
  })
})
