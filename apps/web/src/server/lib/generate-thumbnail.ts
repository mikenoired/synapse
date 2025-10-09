import type { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'

/**
 * Get image dimensions from buffer
 * @param buffer - image buffer
 * @returns object with width and height
 */
export async function getImageDimensions(buffer: Buffer): Promise<{ width: number, height: number }> {
  const metadata = await sharp(buffer).metadata()
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  }
}

/**
 * Generate thumbnail (base64-blur) for image or video.
 * @param buffer - original file (Buffer)
 * @param type - MIME type of the file (image/* or video/*)
 * @returns base64-string of the thumbnail
 */
export async function generateThumbnail(buffer: Buffer, type: string): Promise<string> {
  const fileType = type.split('/')[0]

  const generateImageThumb = async () => {
    const thumb = await sharp(buffer)
      .resize(20, null, { fit: 'inside' })
      .blur()
      .toFormat('jpeg', { quality: 40 })
      .toBuffer()
    return `data:image/jpeg;base64,${thumb.toString('base64')}`
  }

  const generateVideoThumb = async () => {
    const tempVideoPath = join(tmpdir(), `${randomUUID()}.mp4`)
    const tempFramePath = join(tmpdir(), `${randomUUID()}.jpg`)
    try {
      await writeFile(tempVideoPath, buffer)
      await new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i',
          tempVideoPath,
          '-ss',
          '00:00:01.000',
          '-vframes',
          '1',
          tempFramePath,
        ])
        ffmpeg.on('close', code => code === 0 ? resolve(0) : reject(new Error('ffmpeg frame error')))
      })
      const frameBuffer = await import('node:fs').then(fs => fs.readFileSync(tempFramePath))
      const thumb = await sharp(frameBuffer)
        .resize(20, null, { fit: 'inside' })
        .blur()
        .toFormat('jpeg', { quality: 40 })
        .toBuffer()
      return `data:image/jpeg;base64,${thumb.toString('base64')}`
    }
    finally {
      await unlink(tempVideoPath).catch(() => { })
      await unlink(tempFramePath).catch(() => { })
    }
  }

  switch (fileType) {
    case 'image':
      return await generateImageThumb()
    case 'video':
      return await generateVideoThumb()
    default:
      throw new Error('Unsupported file type for thumbnail generation')
  }
}
