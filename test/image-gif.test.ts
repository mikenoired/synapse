import { test, expect, describe, beforeAll, afterAll } from 'bun:test'
import { ThumbnailTestUtils } from './test-utils.js'

describe('GIF Image Processing', () => {
  let gifBuffer
  let executionTimes: number[] = []

  beforeAll(() => {
    gifBuffer = ThumbnailTestUtils.loadTestFile('test-image.gif')
  })

  afterAll(() => {
    if (executionTimes.length > 0) {
      const averageTime = ThumbnailTestUtils.formatAverageTime(executionTimes)
      console.log(`Average execution time: ${averageTime}`)
    }
  })

  test('should get GIF image dimensions', async () => {
    const response = await ThumbnailTestUtils.getImageDimensions(gifBuffer, 'image/gif')
    executionTimes.push(response.executionTime)

    const validation = ThumbnailTestUtils.validateDimensionsResponse(response)

    expect(validation.success).toBe(true)
    expect(validation.hasDimensions).toBe(true)
    expect(validation.hasSize).toBe(true)
    expect(validation.width).toBeGreaterThan(0)
    expect(validation.height).toBeGreaterThan(0)
    expect(validation.sizeBytes).toBeGreaterThan(0)
  })

  test('should generate GIF thumbnail (converted to JPEG)', async () => {
    const response = await ThumbnailTestUtils.generateThumbnail(gifBuffer, 'image/gif', {
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
    expect(validation.mimeType).toBe('image/jpeg') // GIF должен конвертироваться в JPEG
    expect(validation.width).toBeGreaterThan(0)
    expect(validation.height).toBeGreaterThan(0)
    expect(validation.sizeBytes).toBeGreaterThan(0)
    expect(validation.base64Length).toBeGreaterThan(0)
  })

  test('should handle animated GIF (first frame)', async () => {
    const response = await ThumbnailTestUtils.generateThumbnail(gifBuffer, 'image/gif', {
      width: 25,
      height: 25,
      quality: 40,
    })
    executionTimes.push(response.executionTime)

    const validation = ThumbnailTestUtils.validateThumbnailResponse(response)

    expect(validation.success).toBe(true)
    expect(validation.hasBase64).toBe(true)
    expect(validation.mimeType).toBe('image/jpeg')
  })
})
