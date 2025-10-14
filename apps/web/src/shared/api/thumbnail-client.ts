import { Buffer } from 'node:buffer'

// gRPC клиент для thumbnail-service
export class ThumbnailClient {
  private grpcClient: any
  private isConnected = false

  constructor(private endpoint: string = 'localhost:50051') {
    this.initializeClient()
  }

  private async initializeClient() {
    try {
      // Динамический импорт gRPC клиента
      const grpc = await import('@grpc/grpc-js')
      const protoLoader = await import('@grpc/proto-loader')

      // Загружаем proto файл
      const packageDefinition = protoLoader.loadSync(
        require.resolve('../../../../services/thumbnail-service/proto/thumbnail.proto'),
        {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        }
      )

      const thumbnailProto = grpc.loadPackageDefinition(packageDefinition).thumbnail as any

      // Создаем клиент
      this.grpcClient = new thumbnailProto.ThumbnailService(
        this.endpoint,
        grpc.credentials.createInsecure()
      )

      this.isConnected = true
      console.log('Thumbnail gRPC client connected')
    } catch (error) {
      console.error('Failed to initialize thumbnail gRPC client:', error)
      this.isConnected = false
    }
  }

  /**
   * Генерирует превью для изображения
   */
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
    if (!this.isConnected) {
      throw new Error('Thumbnail service is not connected')
    }

    return new Promise((resolve, reject) => {
      const request = {
        imageData: imageData,
        mimeType,
        width: options.width || 0,
        height: options.height || 0,
        quality: options.quality || 40,
        blur: options.blur !== false, // по умолчанию true
      }

      this.grpcClient.GenerateImageThumbnail(request, (error: any, response: any) => {
        if (error) {
          reject(new Error(`gRPC error: ${error.message}`))
          return
        }

        resolve({
          success: response.success,
          thumbnailBase64: response.thumbnailBase64,
          width: response.width,
          height: response.height,
          sizeBytes: response.sizeBytes,
          errorMessage: response.errorMessage,
        })
      })
    })
  }

  /**
   * Генерирует превью для видео
   */
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
    if (!this.isConnected) {
      throw new Error('Thumbnail service is not connected')
    }

    return new Promise((resolve, reject) => {
      const request = {
        videoData: videoData,
        mimeType,
        width: options.width || 0,
        height: options.height || 0,
        quality: options.quality || 40,
        blur: options.blur !== false, // по умолчанию true
        timestamp: options.timestamp || '00:00:01.000',
      }

      this.grpcClient.GenerateVideoThumbnail(request, (error: any, response: any) => {
        if (error) {
          reject(new Error(`gRPC error: ${error.message}`))
          return
        }

        resolve({
          success: response.success,
          thumbnailBase64: response.thumbnailBase64,
          width: response.width,
          height: response.height,
          sizeBytes: response.sizeBytes,
          errorMessage: response.errorMessage,
        })
      })
    })
  }

  /**
   * Получает размеры изображения
   */
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
    if (!this.isConnected) {
      throw new Error('Thumbnail service is not connected')
    }

    return new Promise((resolve, reject) => {
      const request = {
        imageData: imageData,
        mimeType,
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
          sizeBytes: response.sizeBytes,
          errorMessage: response.errorMessage,
        })
      })
    })
  }

  /**
   * Проверяет подключение к сервису
   */
  isServiceConnected(): boolean {
    return this.isConnected
  }

  /**
   * Закрывает соединение
   */
  close(): void {
    if (this.grpcClient) {
      this.grpcClient.close()
      this.isConnected = false
    }
  }
}

// Синглтон экземпляр клиента
let thumbnailClient: ThumbnailClient | null = null

export function getThumbnailClient(): ThumbnailClient {
  if (!thumbnailClient) {
    const endpoint = process.env.THUMBNAIL_SERVICE_ENDPOINT || 'localhost:50051'
    thumbnailClient = new ThumbnailClient(endpoint)
  }
  return thumbnailClient
}
