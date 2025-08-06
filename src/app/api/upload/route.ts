import { getPublicUrl, uploadFile } from '@/shared/api/minio'
import { createSupabaseClient } from '@/shared/api/supabase-client'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { unlink, writeFile } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import { tmpdir } from 'os'
import { join } from 'path'
import { generateThumbnail } from '../../../server/lib/generate-thumbnail'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseClient(token)

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('file') as File[]

    if (!files || !files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const uploadResults = []
    const errors = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        if (file.type.startsWith('image/')) {
          if (!file.type.startsWith('image/')) {
            errors.push(`File "${file.name}" is not an image`)
            continue
          }

          if (file.size > 10 * 1024 * 1024) {
            errors.push(`File "${file.name}" is too large (max 10MB)`)
            continue
          }

          const bytes = await file.arrayBuffer()
          const buffer = Buffer.from(bytes)

          const { objectName, validation } = await uploadFile(buffer, file.name, file.type, user.id)

          if (!validation.isValid) {
            errors.push(`File "${file.name}" is not valid: ${validation.errors.join(', ')}`)
          }

          if (!objectName) {
            errors.push(`Failed to upload file "${file.name}"`)
            continue
          }

          const publicUrl = getPublicUrl(objectName)

          // Генерируем миниатюру (base64-blur)
          let thumbnailBase64: string | undefined = undefined
          try {
            thumbnailBase64 = await generateThumbnail(buffer, file.type)
          } catch { }

          // Сохраняем в таблицу content
          await supabase.from('content').insert([{
            user_id: user.id,
            type: 'media',
            content: objectName,
            media_url: publicUrl,
            media_type: 'image',
            thumbnail_base64: thumbnailBase64,
            // можно добавить другие поля
          }])

          uploadResults.push({
            objectName,
            url: publicUrl,
            fileName: file.name,
            size: file.size,
            type: file.type,
            thumbnailBase64
          })
        } else if (file.type.startsWith('video/')) {
          console.log('Start processing video:', file.name)
          // Сохраняем видео во временный файл
          const tempVideoPath = join(tmpdir(), `${randomUUID()}-${file.name}`)
          const tempThumbPath = join(tmpdir(), `${randomUUID()}.jpg`)
          const bytes = await file.arrayBuffer()
          await writeFile(tempVideoPath, Buffer.from(bytes))
          console.log('Video written to temp:', tempVideoPath)
          // ffmpeg: компрессия без потерь (копируем кодеки)
          const compressedPath = join(tmpdir(), `${randomUUID()}-compressed.mp4`)
          console.log('Start ffmpeg compress:', compressedPath)
          await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
              '-i', tempVideoPath,
              '-c:v', 'copy',
              '-c:a', 'copy',
              compressedPath
            ])
            ffmpeg.on('close', code => {
              console.log('ffmpeg compress close:', code)
              code === 0 ? resolve(0) : reject(new Error('ffmpeg compress error'))
            })
          })
          // ffmpeg: миниатюра (берём кадр с 1-й секунды)
          console.log('Start ffmpeg thumbnail:', tempThumbPath)
          await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
              '-i', tempVideoPath,
              '-ss', '00:00:01.000',
              '-vframes', '1',
              tempThumbPath
            ])
            ffmpeg.on('close', code => {
              console.log('ffmpeg thumbnail close:', code)
              code === 0 ? resolve(0) : reject(new Error('ffmpeg thumbnail error'))
            })
          })
          // Загружаем видео и миниатюру в Minio
          const compressedBuffer = await import('fs').then(fs => fs.readFileSync(compressedPath))
          const thumbBuffer = await import('fs').then(fs => fs.readFileSync(tempThumbPath))
          const { objectName: videoObject, validation: videoValidation } = await uploadFile(compressedBuffer, file.name.replace(/\.[^.]+$/, '.mp4'), 'video/mp4', user.id, 'media')
          const { objectName: thumbObject, validation: thumbValidation } = await uploadFile(thumbBuffer, file.name.replace(/\.[^.]+$/, '.jpg'), 'image/jpeg', user.id, 'media-thumbs')
          // Удаляем временные файлы
          await unlink(tempVideoPath)
          await unlink(compressedPath)
          await unlink(tempThumbPath)
          if (!videoObject || !thumbObject) {
            errors.push(`Failed to upload video or thumbnail for "${file.name}"`)
            continue
          }
          // Генерируем миниатюру (base64-blur) для видео
          let thumbnailBase64: string | undefined = undefined
          try {
            thumbnailBase64 = await generateThumbnail(compressedBuffer, 'video/mp4')
          } catch (err) {
            console.error('Error generating video blur thumbnail:', err)
          }
          // Сохраняем в таблицу content
          console.log('Insert video to content:', videoObject)
          await supabase.from('content').insert([{
            user_id: user.id,
            type: 'media',
            content: videoObject,
            media_url: getPublicUrl(videoObject),
            media_type: 'video',
            thumbnail_url: getPublicUrl(thumbObject),
            thumbnail_base64: thumbnailBase64,
          }])
          console.log('Inserted video to content:', videoObject)
          uploadResults.push({
            objectName: videoObject,
            url: getPublicUrl(videoObject),
            thumbnail: getPublicUrl(thumbObject),
            fileName: file.name,
            size: file.size,
            type: file.type,
            thumbnailBase64
          })
        } else {
          errors.push(`File "${file.name}" is not an image or video`)
          continue
        }
      } catch (error) {
        console.error('Upload error for file:', file.name, error)
        errors.push(`Failed to upload "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (uploadResults.length > 0) {
      return NextResponse.json({
        success: true,
        files: uploadResults,
        errors: errors.length > 0 ? errors : undefined
      })
    } else {
      return NextResponse.json({
        error: 'No files uploaded successfully',
        details: errors
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
} 