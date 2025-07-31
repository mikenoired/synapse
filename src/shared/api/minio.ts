import * as Minio from 'minio'

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT?.split(':')[0] || 'localhost',
  port: parseInt(process.env.MINIO_ENDPOINT?.split(':')[1] || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
})

const bucketName = process.env.MINIO_BUCKET_NAME || 'opi-files'

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

