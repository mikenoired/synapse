import type Stream from 'node:stream'
import type { FileValidationConfig, ValidationResult } from '@/server/middleware/file-middleware'
import { Buffer } from 'node:buffer'
import * as Minio from 'minio'
import { sanitizeFileName, validateFile } from '@/server/middleware/file-middleware'

const {
  MINIO_ENDPOINT,
  MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY,
  MINIO_BUCKET_NAME = 'synapse',
  MINIO_USE_SSL = 'false',
} = process.env

if (!MINIO_ENDPOINT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
  throw new Error('MinIO configuration is missing required environment variables')
}

const [host, portStr] = MINIO_ENDPOINT.split(':')

const minioClient = new Minio.Client({
  endPoint: host,
  port: portStr ? Number.parseInt(portStr, 10) : undefined,
  useSSL: MINIO_USE_SSL === 'true',
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
})

const bucketName = MINIO_BUCKET_NAME

export async function ensureBucketExists() {
  try {
    const exists = await minioClient.bucketExists(bucketName)
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1')
    }
  }
  catch (error) {
    console.error('Error creating bucket:', error)
  }
}

export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string,
  userId: string,
  folder: string = 'images',
  validationConfig?: Partial<FileValidationConfig>,
): Promise<{ success: boolean, objectName?: string, validation: ValidationResult, fileSize?: number }> {
  const validation = await validateFile(file, fileName, contentType, userId, validationConfig)

  if (!validation.isValid) {
    return {
      success: false,
      validation,
    }
  }

  if (validation.warnings.length > 0)
    console.warn('File upload warnings:', validation.warnings)

  try {
    const sanitizedFileName = sanitizeFileName(fileName)
    const objectName = `${folder}/${userId}/${Date.now()}-${sanitizedFileName}`

    await minioClient.putObject(
      bucketName,
      objectName,
      file,
      file.length,
      {
        'Content-Type': contentType,
        'x-amz-meta-user-id': userId,
      },
    )

    return {
      success: true,
      objectName,
      validation,
      fileSize: file.length,
    }
  }
  catch (error) {
    return {
      success: false,
      validation: {
        ...validation,
        errors: [...validation.errors, `Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      },
    }
  }
}

export function getPublicUrl(objectName: string): string {
  // В реальном приложении здесь может быть более сложная логика,
  // например, генерация presigned URL или использование CDN.
  // Сейчас мы просто формируем прямой URL к нашему локальному API-роуту.
  return `/api/files/${objectName}`
}

export async function getFile(objectName: string): Promise<{ stream: Stream.Readable, contentType?: string }> {
  const stream = await minioClient.getObject(bucketName, objectName)

  const stat = await minioClient.statObject(bucketName, objectName)

  return {
    stream,
    contentType: stat.metaData?.['content-type'],
  }
}

export async function getFileBuffer(objectName: string) {
  try {
    const chunks: Uint8Array[] = []
    const stream = await minioClient.getObject(bucketName, objectName)

    return new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk: Uint8Array) => chunks.push(chunk))
      stream.on('end', () => resolve(Buffer.concat(chunks)))
      stream.on('error', err => reject(err))
    })
  }
  catch (error) {
    console.error('Error getting file buffer:', error)
    return null
  }
}

export async function getFileMetadata(objectName: string) {
  try {
    const stat = await minioClient.statObject(bucketName, objectName)
    return {
      size: stat.size,
      contentType: stat.metaData?.['content-type'],
      userId: stat.metaData?.['x-amz-meta-user-id'],
      lastModified: stat.lastModified,
    }
  }
  catch (error) {
    console.error('Error getting file metadata:', error)
    return null
  }
}

export async function deleteFile(objectName: string): Promise<void> {
  try {
    await minioClient.removeObject(bucketName, objectName)
  }
  catch (error) {
    console.error('Error deleting file:', error)
  }
}

export async function getPresignedUrl(objectName: string, expirySeconds: number = 3600): Promise<string> {
  return await minioClient.presignedGetObject(bucketName, objectName, expirySeconds)
}

export { bucketName, minioClient }
