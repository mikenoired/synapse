import { Buffer } from 'node:buffer'
import path from 'node:path'

export class ThumbnailClient {
  private grpcClient: any
  private isConnected = false
  private initPromise: Promise<void>

  constructor(private endpoint: string = 'localhost:50051') {
    this.initPromise = this.initializeClient()
  }

  private async initializeClient() {
    try {
      const grpc = await import('@grpc/grpc-js')
      const protoLoader = await import('@grpc/proto-loader')

      const protoPath = path.resolve(
        process.cwd(),
        '../../services/thumbnail-service/proto/thumbnail.proto'
      )

      const packageDefinition = protoLoader.loadSync(
        protoPath,
        {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        }
      )

      const thumbnailProto = grpc.loadPackageDefinition(packageDefinition).thumbnail as any

      this.grpcClient = new thumbnailProto.ThumbnailService(
        this.endpoint,
        grpc.credentials.createInsecure()
      )

      this.isConnected = true
      console.log('✅ Thumbnail gRPC client connected')
    } catch (error) {
      console.error('❌ Failed to initialize thumbnail gRPC client:', error)
      this.isConnected = false
    }
  }

  private async ensureConnected() {
    await this.initPromise
    if (!this.isConnected) {
      throw new Error('Thumbnail service is not connected')
    }
  }

  async generateImageThumbnail(
    imageData: Buffer,
    mimeType: string,
    options: {
      width?: number
      height?: number
      quality?: number
      blur?: boolean
    } = {}
  ): Promise<{
    success: boolean
    thumbnailBase64?: string
    width?: number
    height?: number
    sizeBytes?: number
    errorMessage?: string
  }> {
    await this.ensureConnected()

    return new Promise((resolve, reject) => {
      const request = {
        image_data: imageData,
        mime_type: mimeType,
        width: options.width || 0,
        height: options.height || 0,
        quality: options.quality || 40,
        blur: options.blur !== false,
      }

      this.grpcClient.GenerateImageThumbnail(request, (error: any, response: any) => {
        if (error) {
          reject(new Error(`gRPC error: ${error.message}`))
          return
        }

        resolve({
          success: response.success,
          thumbnailBase64: response.thumbnail_base64,
          width: response.width,
          height: response.height,
          sizeBytes: response.size_bytes,
          errorMessage: response.error_message,
        })
      })
    })
  }

  async generateVideoThumbnail(
    videoData: Buffer,
    mimeType: string,
    options: {
      width?: number
      height?: number
      quality?: number
      blur?: boolean
      timestamp?: string
    } = {}
  ): Promise<{
    success: boolean
    thumbnailBase64?: string
    width?: number
    height?: number
    sizeBytes?: number
    errorMessage?: string
  }> {
    await this.ensureConnected()

    return new Promise((resolve, reject) => {
      const request = {
        video_data: videoData,
        mime_type: mimeType,
        width: options.width || 0,
        height: options.height || 0,
        quality: options.quality || 40,
        blur: options.blur !== false,
        timestamp: options.timestamp || '00:00:01.000',
      }

      this.grpcClient.GenerateVideoThumbnail(request, (error: any, response: any) => {
        if (error) {
          reject(new Error(`gRPC error: ${error.message}`))
          return
        }

        resolve({
          success: response.success,
          thumbnailBase64: response.thumbnail_base64,
          width: response.width,
          height: response.height,
          sizeBytes: response.size_bytes,
          errorMessage: response.error_message,
        })
      })
    })
  }

  async getImageDimensions(
    imageData: Buffer,
    mimeType: string
  ): Promise<{
    success: boolean
    width?: number
    height?: number
    sizeBytes?: number
    errorMessage?: string
  }> {
    await this.ensureConnected()

    return new Promise((resolve, reject) => {
      const request = {
        image_data: imageData,
        mime_type: mimeType,
      }

      this.grpcClient.GetImageDimensions(request, (error: any, response: any) => {
        if (error) {
          reject(new Error(`gRPC error: ${error.message}`))
          return
        }

        resolve({
          success: response.success,
          width: response.width,
          height: response.height,
          sizeBytes: response.size_bytes,
          errorMessage: response.error_message,
        })
      })
    })
  }

  isServiceConnected(): boolean {
    return this.isConnected
  }

  close(): void {
    if (this.grpcClient) {
      this.grpcClient.close()
      this.isConnected = false
    }
  }
}

let thumbnailClient: ThumbnailClient | null = null

export function getThumbnailClient(): ThumbnailClient {
  if (!thumbnailClient) {
    const endpoint = process.env.THUMBNAIL_SERVICE_ENDPOINT || 'localhost:50051'
    thumbnailClient = new ThumbnailClient(endpoint)
  }
  return thumbnailClient
}
