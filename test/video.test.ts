import { test, expect, describe, beforeAll, afterAll } from 'bun:test'
import { ThumbnailTestUtils } from './test-utils.js'

describe('Video Processing', () => {
  let videoBuffer
  let executionTimes: number[] = []

  beforeAll(() => {
    videoBuffer = ThumbnailTestUtils.loadTestFile('test-video.mp4')
  })

  afterAll(() => {
    if (executionTimes.length > 0) {
      const averageTime = ThumbnailTestUtils.formatAverageTime(executionTimes)
      console.log(`Average execution time: ${averageTime}`)
    }
  })

  test('should generate video thumbnail from MP4', async () => {
    const response = await ThumbnailTestUtils.generateVideoThumbnail(videoBuffer, 'video/mp4', {
      width: 10,
      height: 10,
      quality: 40,
      timestamp: '00:00:01.000'
    })
    executionTimes.push(response.executionTime)

    const validation = ThumbnailTestUtils.validateThumbnailResponse(response)

    expect(validation.success).toBe(true)
    expect(validation.hasBase64).toBe(true)
    expect(validation.hasDimensions).toBe(true)
    expect(validation.hasSize).toBe(true)
    expect(validation.hasMimeType).toBe(true)
    expect(validation.mimeType).toBe('image/jpeg') // Видео должно конвертироваться в JPEG
    expect(validation.width).toBeGreaterThan(0)
    expect(validation.height).toBeGreaterThan(0)
    expect(validation.sizeBytes).toBeGreaterThan(0)
    expect(validation.base64Length).toBeGreaterThan(0)
  })

  test('should generate video thumbnail with different timestamps', async () => {
    const timestamps = ['00:00:00.500', '00:00:01.000', '00:00:02.000', '00:00:05.000']

    for (const timestamp of timestamps) {
      const response = await ThumbnailTestUtils.generateVideoThumbnail(videoBuffer, 'video/mp4', {
        width: 30,
        height: 30,
        quality: 40,
        timestamp
      })
      executionTimes.push(response.executionTime)

      const validation = ThumbnailTestUtils.validateThumbnailResponse(response)

      expect(validation.success).toBe(true)
      expect(validation.hasBase64).toBe(true)
      expect(validation.mimeType).toBe('image/jpeg')
    }
  })

  test('should handle different video formats', async () => {
    const formats = ['video/mp4', 'video/avi', 'video/mov', 'video/webm']

    for (const format of formats) {
      const response = await ThumbnailTestUtils.generateVideoThumbnail(videoBuffer, format, {
        width: 25,
        height: 25,
        quality: 40,
        timestamp: '00:00:01.000'
      })
      executionTimes.push(response.executionTime)

      const validation = ThumbnailTestUtils.validateThumbnailResponse(response)

      expect(validation.success).toBe(true)
      expect(validation.hasBase64).toBe(true)
      expect(validation.mimeType).toBe('image/jpeg')
    }
  })

  test('should handle different video thumbnail sizes', async () => {
    const sizes = [10, 50, 100, 200]

    for (const size of sizes) {
      const response = await ThumbnailTestUtils.generateVideoThumbnail(videoBuffer, 'video/mp4', {
        width: size,
        height: 0,
        quality: 40,
        timestamp: '00:00:01.000'
      })
      executionTimes.push(response.executionTime)

      const validation = ThumbnailTestUtils.validateThumbnailResponse(response)

      expect(validation.success).toBe(true)
      expect(validation.hasBase64).toBe(true)
      expect(validation.width).toBeLessThanOrEqual(size)
    }
  })
})
