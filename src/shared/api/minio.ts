import * as Minio from 'minio'

const {
  MINIO_ENDPOINT,
  MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY,
  MINIO_BUCKET_NAME = 'opi-files',
  MINIO_USE_SSL = 'false',
} = process.env

if (!MINIO_ENDPOINT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
  throw new Error('MinIO configuration is missing required environment variables')
}

const [host, portStr] = MINIO_ENDPOINT.split(':')

const minioClient = new Minio.Client({
  endPoint: host,
  port: portStr ? parseInt(portStr, 10) : undefined,
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
  } catch (error) {
    console.error('Ошибка создания bucket:', error)
  }
}

export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string,
  userId: string,
  folder: string = 'images'
): Promise<string> {
  await ensureBucketExists()

  const objectName = `${folder}/${userId}/${Date.now()}-${fileName}`

  await minioClient.putObject(bucketName, objectName, file, file.length, {
    'Content-Type': contentType,
    'x-amz-meta-user-id': userId,
  })

  return objectName
}

export function getPublicUrl(objectName: string): string {
  // В реальном приложении здесь может быть более сложная логика, 
  // например, генерация presigned URL или использование CDN.
  // Сейчас мы просто формируем прямой URL к нашему локальному API-роуту.
  return `/api/files/${objectName}`
}

export async function getFile(objectName: string): Promise<{ stream: NodeJS.ReadableStream, contentType?: string }> {
  const stream = await minioClient.getObject(bucketName, objectName)

  const stat = await minioClient.statObject(bucketName, objectName)

  return {
    stream,
    contentType: stat.metaData?.['content-type']
  }
}

export async function getFileMetadata(objectName: string) {
  try {
    const stat = await minioClient.statObject(bucketName, objectName)
    return {
      size: stat.size,
      contentType: stat.metaData?.['content-type'],
      userId: stat.metaData?.['x-amz-meta-user-id'],
      lastModified: stat.lastModified
    }
  } catch (error) {
    return null
  }
}

export async function deleteFile(objectName: string): Promise<void> {
  try {
    await minioClient.removeObject(bucketName, objectName)
  } catch (error) {
    console.error('Ошибка удаления файла:', error)
  }
}

export { bucketName, minioClient }

