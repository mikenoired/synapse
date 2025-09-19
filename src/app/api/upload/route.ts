import { getPublicUrl, uploadFile } from '@/shared/api/minio'
import { createSupabaseClient } from '@/shared/api/supabase-client'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { unlink, writeFile } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import { tmpdir } from 'os'
import { join } from 'path'
import { generateThumbnail, getImageDimensions } from '../../../server/lib/generate-thumbnail'

async function resolveTagTitlesToIds(supabase: ReturnType<typeof createSupabaseClient>, titles: string[]): Promise<string[]> {
  const unique = Array.from(new Set((titles || []).filter(Boolean)))
  if (unique.length === 0) return []
  const { data: existing } = await supabase.from('tags').select('id, title').in('title', unique)
  const byTitle = new Map((existing || []).map(t => [t.title, t.id]))
  const missing = unique.filter(t => !byTitle.has(t))
  if (missing.length) {
    const { data: inserted } = await supabase.from('tags').insert(missing.map(title => ({ title }))).select('id, title')
    for (const t of inserted || []) byTitle.set(t.title, t.id)
  }
  const ids = unique.map(t => byTitle.get(t))
  return ids.filter((v): v is string => typeof v === 'string' && v.length > 0)
}

async function getOrCreateContentNode(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  params: { contentId: string; title?: string; type: string }
) {
  const { data: existing } = await supabase
    .from('nodes')
    .select('id')
    .eq('user_id', userId)
    .contains('metadata', { content_id: params.contentId })
    .maybeSingle()
  if (existing?.id) return existing.id as string
  const { data, error } = await supabase
    .from('nodes')
    .insert([{ content: params.title ?? '', type: params.type, user_id: userId, metadata: { content_id: params.contentId } }])
    .select('id')
    .single()
  if (error) throw error
  return (data as { id: string }).id
}

async function getOrCreateTagNodeIds(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  tagIds: string[]
): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const tagId of Array.from(new Set(tagIds))) {
    const { data: existing } = await supabase
      .from('nodes')
      .select('id')
      .eq('user_id', userId)
      .contains('metadata', { tag_id: tagId })
      .maybeSingle()
    if (existing?.id) {
      out[tagId] = existing.id as string
      continue
    }
    const { data: tag } = await supabase.from('tags').select('title').eq('id', tagId).single()
    const { data: created, error } = await supabase
      .from('nodes')
      .insert([{ content: tag?.title ?? '', type: 'tag', user_id: userId, metadata: { tag_id: tagId } }])
      .select('id')
      .single()
    if (error) throw error
    out[tagId] = (created as { id: string }).id
  }
  return out
}

async function upsertContentTags(
  supabase: ReturnType<typeof createSupabaseClient>,
  contentId: string,
  tagIds: string[],
  contentNodeId: string,
  tagNodeIdByTagId: Record<string, string>
) {
  if (!tagIds.length) return
  await supabase.from('content_tags').insert(tagIds.map(id => ({ content_id: contentId, tag_id: id })))
  const edgeRows = tagIds
    .map(tagId => ({ from_node: contentNodeId, to_node: tagNodeIdByTagId[tagId], relation_type: 'content_tag' }))
    .filter(r => !!r.to_node)
  if (edgeRows.length) await supabase.from('edges').insert(edgeRows)
}

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
    const titleRaw = formData.get('title')?.toString()?.trim()
    const tagsRaw = formData.get('tags')?.toString()
    let tags: string[] = []
    if (tagsRaw) {
      try {
        const parsed = JSON.parse(tagsRaw)
        if (Array.isArray(parsed)) {
          tags = parsed.filter((t) => typeof t === 'string')
        }
      } catch {
        // ignore malformed tags
      }
    }

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

          let thumbnailBase64: string | undefined = undefined
          try {
            thumbnailBase64 = await generateThumbnail(buffer, file.type)
          } catch (error) {
            console.error('Error generating thumbnail:', error)
          }

          let imageDimensions: { width: number; height: number } | undefined = undefined
          try {
            imageDimensions = await getImageDimensions(buffer)
          } catch (error) {
            console.error('Error getting image dimensions:', error)
          }

          const mediaJson = {
            media: {
              object: objectName,
              url: publicUrl,
              type: 'image' as const,
              width: imageDimensions?.width,
              height: imageDimensions?.height,
              thumbnailBase64,
            }
          }
          const { data: inserted } = await supabase.from('content').insert([{
            user_id: user.id,
            type: 'media',
            content: JSON.stringify(mediaJson),
            title: titleRaw || undefined,
          }]).select('id').single()

          if (inserted?.id) {
            const contentNodeId = await getOrCreateContentNode(supabase, user.id, { contentId: inserted.id, title: titleRaw || undefined, type: 'media' })
            if (tags.length) {
              const ids = await resolveTagTitlesToIds(supabase, tags)
              const tagNodeIds = await getOrCreateTagNodeIds(supabase, user.id, ids)
              await upsertContentTags(supabase, inserted.id, ids, contentNodeId, tagNodeIds)
            }
          }

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
          const tempVideoPath = join(tmpdir(), `${randomUUID()}-${file.name}`)
          const tempThumbPath = join(tmpdir(), `${randomUUID()}.jpg`)
          const bytes = await file.arrayBuffer()
          await writeFile(tempVideoPath, Buffer.from(bytes))
          console.log('Video written to temp:', tempVideoPath)
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
          const compressedBuffer = await import('fs').then(fs => fs.readFileSync(compressedPath))
          const thumbBuffer = await import('fs').then(fs => fs.readFileSync(tempThumbPath))
          const { objectName: videoObject } = await uploadFile(compressedBuffer, file.name.replace(/\.[^.]+$/, '.mp4'), 'video/mp4', user.id, 'media')
          const { objectName: thumbObject } = await uploadFile(thumbBuffer, file.name.replace(/\.[^.]+$/, '.jpg'), 'image/jpeg', user.id, 'media-thumbs')
          await unlink(tempVideoPath)
          await unlink(compressedPath)
          await unlink(tempThumbPath)
          if (!videoObject || !thumbObject) {
            errors.push(`Failed to upload video or thumbnail for "${file.name}"`)
            continue
          }
          let thumbnailBase64: string | undefined = undefined
          try {
            thumbnailBase64 = await generateThumbnail(compressedBuffer, 'video/mp4')
          } catch (error) {
            console.error('Error generating video blur thumbnail:', error)
          }

          let videoDimensions: { width: number; height: number } | undefined = undefined
          try {
            videoDimensions = await getImageDimensions(thumbBuffer)
          } catch (error) {
            console.error('Error getting video dimensions:', error)
          }

          console.log('Insert video to content:', videoObject)
          const mediaJsonVideo = {
            media: {
              object: videoObject,
              url: getPublicUrl(videoObject),
              type: 'video' as const,
              width: videoDimensions?.width,
              height: videoDimensions?.height,
              thumbnailUrl: getPublicUrl(thumbObject),
              thumbnailBase64,
            }
          }
          const { data: insertedVideo } = await supabase.from('content').insert([{
            user_id: user.id,
            type: 'media',
            content: JSON.stringify(mediaJsonVideo),
            title: titleRaw || undefined,
          }]).select('id').single()
          if (insertedVideo?.id) {
            const contentNodeId = await getOrCreateContentNode(supabase, user.id, { contentId: insertedVideo.id, title: titleRaw || undefined, type: 'media' })
            if (tags.length) {
              const ids = await resolveTagTitlesToIds(supabase, tags)
              const tagNodeIds = await getOrCreateTagNodeIds(supabase, user.id, ids)
              await upsertContentTags(supabase, insertedVideo.id, ids, contentNodeId, tagNodeIds)
            }
          }
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