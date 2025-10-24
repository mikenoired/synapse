import type { Buffer } from 'node:buffer'
import { getThumbnailClient } from './thumbnail-client'

export async function getImageDimensions(buffer: Buffer, mimeType?: string): Promise<{ width: number, height: number }> {
  const client = getThumbnailClient()
  const result = await client.getImageDimensions(buffer, mimeType || 'image/jpeg')

  if (!result.success) {
    throw new Error(result.errorMessage || 'Failed to get image dimensions')
  }

  return {
    width: result.width || 0,
    height: result.height || 0,
  }
}

export async function generateThumbnail(buffer: Buffer, type: string): Promise<string> {
  const fileType = type.split('/')[0]
  const client = getThumbnailClient()

  let result

  if (fileType === 'image') {
    result = await client.generateImageThumbnail(buffer, type, {
      width: 20,
      height: 0,
      quality: 40,
      blur: true,
    })
  } else if (fileType === 'video') {
    result = await client.generateVideoThumbnail(buffer, type, {
      width: 20,
      height: 0,
      quality: 40,
      blur: true,
      timestamp: '00:00:01.000',
    })
  } else {
    throw new Error(`Unsupported file type: ${fileType}`)
  }

  if (!result.success) {
    throw new Error(result.errorMessage || 'Failed to generate thumbnail')
  }

  if (!result.thumbnailBase64) {
    throw new Error('No thumbnail generated')
  }

  return result.thumbnailBase64
}
