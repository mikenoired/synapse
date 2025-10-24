import { test, expect, describe, beforeAll, afterAll } from 'bun:test'
import { ThumbnailTestUtils } from './test-utils.js'

describe('PNG Image Processing', () => {
  let pngBuffer
  let executionTimes: number[] = []

  beforeAll(() => {
    pngBuffer = ThumbnailTestUtils.loadTestFile('test-image.png')
  })

  afterAll(() => {
    if (executionTimes.length > 0) {
      const averageTime = ThumbnailTestUtils.formatAverageTime(executionTimes)
      console.log(`Average execution time: ${averageTime}`)
    }
  })

  test('should get PNG image dimensions', async () => {
    const response = await ThumbnailTestUtils.getImageDimensions(pngBuffer, 'image/png')
    executionTimes.push(response.executionTime)

    const validation = ThumbnailTestUtils.validateDimensionsResponse(response)

    expect(validation.success).toBe(true)
    expect(validation.hasDimensions).toBe(true)
    expect(validation.hasSize).toBe(true)
    expect(validation.width).toBeGreaterThan(0)
    expect(validation.height).toBeGreaterThan(0)
    expect(validation.sizeBytes).toBeGreaterThan(0)
  })

  test('should generate PNG thumbnail (converted to JPEG)', async () => {
    const response = await ThumbnailTestUtils.generateThumbnail(pngBuffer, 'image/png', {
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

  test('should handle PNG with transparency', async () => {
    const response = await ThumbnailTestUtils.generateThumbnail(pngBuffer, 'image/png', {
      width: 20,
      height: 0,
      quality: 40,
    })
    executionTimes.push(response.executionTime)

    const validation = ThumbnailTestUtils.validateThumbnailResponse(response)

    expect(validation.success).toBe(true)
    expect(validation.hasBase64).toBe(true)
    expect(validation.mimeType).toBe('image/jpeg')
  })
})
