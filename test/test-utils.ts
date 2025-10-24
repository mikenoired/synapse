import fs from 'node:fs'
import path from 'node:path'
import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'

const PROTO_PATH = path.join(__dirname, '../services/thumbnail-service/proto/thumbnail.proto')
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
})

const thumbnailProto = grpc.loadPackageDefinition(packageDefinition).thumbnail as any
const client = new thumbnailProto.ThumbnailService('localhost:50051', grpc.credentials.createInsecure(), {
  'grpc.max_receive_message_length': 100 * 1024 * 1024, // 100MB
  'grpc.max_send_message_length': 100 * 1024 * 1024,    // 100MB
})

export class ThumbnailTestUtils {
  static async checkServiceHealth(timeout = 5000) {
    try {
      const testBuffer = Buffer.from('test')

      const response = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Service health check timeout'))
        }, timeout)

        client.GetImageDimensions({
          image_data: testBuffer,
          mime_type: 'image/jpeg',
        }, (error, response) => {
          clearTimeout(timer)
          if (error) {
            reject(error)
          } else {
            resolve(response)
          }
        })
      })

      return {
        available: true,
        response
      }
    } catch (error) {
      return {
        available: false,
        error: error.message
      }
    }
  }

  static async waitForService(maxAttempts = 10, delay = 2000) {
    console.log('🔍 Checking thumbnail service availability...')

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const health = await this.checkServiceHealth(3000)

      if (health.available) {
        console.log(`✅ Service is available`)
        return true
      }

      console.log(`⏳ Attempt ${attempt}/${maxAttempts}: Service not available (${health.error})`)

      if (attempt < maxAttempts) {
        console.log(`⏱️  Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    console.log('❌ Service is not available after all attempts')
    return false
  }
  static async getImageDimensions(imageBuffer: Buffer, mimeType: string, timeout = 10000) {
    const startTime = performance.now()

    const response = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`GetImageDimensions timeout after ${timeout}ms`))
      }, timeout)

      client.GetImageDimensions({
        image_data: imageBuffer,
        mime_type: mimeType,
      }, (error, response) => {
        clearTimeout(timer)
        if (error) reject(error)
        else resolve(response)
      })
    })

    const endTime = performance.now()
    const executionTime = endTime - startTime

    return {
      ...(response as any),
      executionTime
    }
  }

  static async generateThumbnail(imageBuffer: Buffer, mimeType: string, options: { width?: number, height?: number, quality?: number } = {}, timeout = 15000) {
    const {
      width = 20,
      height = 0,
      quality = 40,
    } = options

    const startTime = performance.now()

    const response = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`GenerateThumbnail timeout after ${timeout}ms`))
      }, timeout)

      client.GenerateImageThumbnail({
        image_data: imageBuffer,
        mime_type: mimeType,
        width,
        height,
        quality,
      }, (error, response) => {
        clearTimeout(timer)
        if (error) reject(error)
        else resolve(response)
      })
    })

    const endTime = performance.now()
    const executionTime = endTime - startTime

    return {
      ...(response as any),
      executionTime
    }
  }

  static async generateVideoThumbnail(videoBuffer: Buffer, mimeType: string, options: { width?: number, height?: number, quality?: number, timestamp?: string } = {}, timeout = 30000) {
    const {
      width = 20,
      height = 0,
      quality = 40,
      timestamp = '00:00:01.000'
    } = options

    const startTime = performance.now()

    const response = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`GenerateVideoThumbnail timeout after ${timeout}ms`))
      }, timeout)

      client.GenerateVideoThumbnail({
        video_data: videoBuffer,
        mime_type: mimeType,
        width,
        height,
        quality,
        timestamp,
      }, (error, response) => {
        clearTimeout(timer)
        if (error) reject(error)
        else resolve(response)
      })
    })

    const endTime = performance.now()
    const executionTime = endTime - startTime

    return {
      ...(response as any),
      executionTime
    }
  }

  static loadTestFile(filename: string) {
    const filePath = path.join(__dirname, 'assets', filename)
    if (!fs.existsSync(filePath)) {
      throw new Error(`Test file not found: ${filePath}`)
    }
    return fs.readFileSync(filePath)
  }

  static formatTime(ms: number) {
    return `${ms.toFixed(2)}ms`
  }

  static calculateAverageTime(times: number[]) {
    if (times.length === 0) return 0
    const sum = times.reduce((acc, time) => acc + time, 0)
    return sum / times.length
  }

  static formatAverageTime(times: number[]) {
    const average = this.calculateAverageTime(times)
    return `${average.toFixed(2)}ms`
  }

  static validateThumbnailResponse(response: any) {
    return {
      success: response.success === true,
      hasBase64: !!response.thumbnail_base64 && response.thumbnail_base64.length > 0,
      hasDimensions: !!(response.width && response.height),
      hasSize: !!response.size_bytes,
      hasMimeType: !!response.mime_type,
      mimeType: response.mime_type,
      width: parseInt(response.width) || 0,
      height: parseInt(response.height) || 0,
      sizeBytes: parseInt(response.size_bytes) || 0,
      base64Length: response.thumbnail_base64?.length || 0
    }
  }

  static validateDimensionsResponse(response: any) {
    return {
      success: response.success === true,
      hasDimensions: !!(response.width && response.height),
      hasSize: !!response.size_bytes,
      width: parseInt(response.width) || 0,
      height: parseInt(response.height) || 0,
      sizeBytes: parseInt(response.size_bytes) || 0
    }
  }
}
