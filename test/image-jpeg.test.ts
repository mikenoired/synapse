import { test, expect, describe, beforeAll, afterAll } from 'bun:test'
import { ThumbnailTestUtils } from './test-utils.js'

describe('JPEG Image Processing', () => {
  let jpegBuffer
  let executionTimes: number[] = []

  beforeAll(() => {
    jpegBuffer = ThumbnailTestUtils.loadTestFile('test-image.jpeg')
  })

  afterAll(() => {
    if (executionTimes.length > 0) {
      const averageTime = ThumbnailTestUtils.formatAverageTime(executionTimes)
      console.log(`Average execution time: ${averageTime}`)
    }
  })

  test('should get JPEG image dimensions', async () => {
    const response = await ThumbnailTestUtils.getImageDimensions(jpegBuffer, 'image/jpeg')
    executionTimes.push(response.executionTime)

    const validation = ThumbnailTestUtils.validateDimensionsResponse(response)

    expect(validation.success).toBe(true)
    expect(validation.hasDimensions).toBe(true)
    expect(validation.hasSize).toBe(true)
    expect(validation.width).toBeGreaterThan(0)
    expect(validation.height).toBeGreaterThan(0)
    expect(validation.sizeBytes).toBeGreaterThan(0)
  })

  test('should generate JPEG thumbnail', async () => {
    const response = await ThumbnailTestUtils.generateThumbnail(jpegBuffer, 'image/jpeg', {
      width: 20,
      height: 0,
      quality: 40,
    })
    executionTimes.push(response.executionTime)

    const validation = ThumbnailTestUtils.validateThumbnailResponse(response)

    expect(validation.success).toBe(true)
    expect(validation.hasBase64).toBe(true)
    expect(validation.hasDimensions).toBe(true)
    expect(validation.hasSize).toBe(true)
    expect(validation.hasMimeType).toBe(true)
    expect(validation.mimeType).toBe('image/jpeg')
    expect(validation.width).toBeGreaterThan(0)
    expect(validation.height).toBeGreaterThan(0)
    expect(validation.sizeBytes).toBeGreaterThan(0)
    expect(validation.base64Length).toBeGreaterThan(0)
  })

  test('should generate JPEG thumbnail with different sizes', async () => {
    const sizes = [10, 50, 100]

    for (const size of sizes) {
      const response = await ThumbnailTestUtils.generateThumbnail(jpegBuffer, 'image/jpeg', {
        width: size,
        height: 0,
        quality: 40,
      })
      executionTimes.push(response.executionTime)

      const validation = ThumbnailTestUtils.validateThumbnailResponse(response)

      expect(validation.success).toBe(true)
      expect(validation.hasBase64).toBe(true)
      expect(validation.width).toBeLessThanOrEqual(size)
    }
  })

  test('should handle different JPEG quality settings', async () => {
    const qualities = [40, 40, 40, 40, 40]

    for (const quality of qualities) {
      const response = await ThumbnailTestUtils.generateThumbnail(jpegBuffer, 'image/jpeg', {
        width: 50,
        height: 0,
        quality,
      })
      executionTimes.push(response.executionTime)

      const validation = ThumbnailTestUtils.validateThumbnailResponse(response)

      expect(validation.success).toBe(true)
      expect(validation.hasBase64).toBe(true)
    }
  })
})
