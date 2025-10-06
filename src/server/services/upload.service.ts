import type { Context } from '../context'
import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { and, eq, inArray, sql } from 'drizzle-orm'
import * as mm from 'music-metadata'
import sharp from 'sharp'
import { getPublicUrl, uploadFile } from '@/shared/api/minio'
import { content, contentTags, edges, nodes, tags } from '../db/schema'
import { getImageDimensions } from '../lib/generate-thumbnail'
import { thumbnailQueue } from '../lib/queue'

interface UploadedFileInfo {
  objectName: string
  url: string
  fileName: string
  size: number
  type: string
  thumbnailBase64?: string
  thumbnail?: string
  cover?: string
}

interface UploadOutcome {
  files: UploadedFileInfo[]
  errors: string[]
}

interface ProcessOutcome {
  result?: UploadedFileInfo
  errors?: string[]
}

interface UploadRequestFile {
  name: string
  type: string
  size: number
  content: string
}

export interface UploadRequest {
  files: UploadRequestFile[]
  title?: string | null
  tags?: string[] | null
  makeTrack?: boolean
}

interface FilePayload {
  name: string
  type: string
  size: number
  buffer: Buffer
}

export default class UploadService {
  constructor(private readonly ctx: Context) { }

  async handleUpload(payload: UploadRequest): Promise<UploadOutcome> {
    const userId = this.requireUserId()

    const files = payload.files || []
    const titleRaw = payload.title?.trim()
    const tags = this.normalizeTags(payload.tags)
    const makeTrack = Boolean(payload.makeTrack)

    const uploadResults: UploadedFileInfo[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        const buffer = Buffer.from(file.content, 'base64')
        const payloadFile: FilePayload = {
          name: file.name,
          type: file.type,
          size: file.size,
          buffer,
        }
        let outcome: ProcessOutcome | undefined

        if (payloadFile.type.startsWith('image/')) {
          outcome = await this.processImage(payloadFile, { userId, title: titleRaw, tags })
        }
        else if (payloadFile.type.startsWith('video/')) {
          outcome = await this.processVideo(payloadFile, { userId, title: titleRaw, tags })
        }
        else if (payloadFile.type.startsWith('audio/')) {
          outcome = await this.processAudio(payloadFile, { userId, title: titleRaw, tags, makeTrack })
        }
        else {
          errors.push(`File "${file.name}" is not an image, video, or audio`)
          continue
        }

        if (outcome?.errors?.length)
          errors.push(...outcome.errors)

        if (outcome?.result)
          uploadResults.push(outcome.result)
      }
      catch (error) {
        console.error('Upload error for file:', file.name, error)
        errors.push(`Failed to upload "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      files: uploadResults,
      errors,
    }
  }

  private normalizeTags(tags?: string[] | null): string[] {
    if (!Array.isArray(tags))
      return []
    return tags.map(t => t.trim()).filter(Boolean)
  }

  private async processImage(file: FilePayload, params: { userId: string, title?: string | null, tags: string[] }): Promise<ProcessOutcome> {
    if (file.size > 10 * 1024 * 1024)
      return { errors: [`File "${file.name}" is too large (max 10MB)`] }

    const buffer = file.buffer

    const uploadResult = await uploadFile(buffer, file.name, file.type, params.userId)

    const errors: string[] = []
    if (!uploadResult.validation.isValid)
      errors.push(`File "${file.name}" is not valid: ${uploadResult.validation.errors.join(', ')}`)

    if (!uploadResult.success || !uploadResult.objectName) {
      errors.push(`Failed to upload file "${file.name}"`)
      return { errors }
    }

    const objectName = uploadResult.objectName
    const publicUrl = getPublicUrl(objectName)

    let imageDimensions: { width: number, height: number } | undefined
    try {
      imageDimensions = await getImageDimensions(buffer)
    }
    catch (error) {
      console.error('Error getting image dimensions:', error)
    }

    await this.ctx.cache.addFile(this.ctx.user!.id, uploadResult.fileSize || 0)

    const mediaJson = {
      media: {
        object: objectName,
        url: publicUrl,
        type: 'image' as const,
        width: imageDimensions?.width,
        height: imageDimensions?.height,
      },
    }

    const [inserted] = await this.ctx.db.insert(content).values({
      userId: params.userId,
      type: 'media',
      content: JSON.stringify(mediaJson),
      title: params.title || undefined,
    }).returning({ id: content.id })

    if (inserted?.id) {
      await this.attachTags(inserted.id, params.tags, 'media', params.title || undefined)

      await thumbnailQueue.add('generate-thumbnail', {
        contentId: inserted.id,
        objectName,
        mimeType: file.type,
        type: 'image',
      })
    }

    return {
      result: {
        objectName,
        url: publicUrl,
        fileName: file.name,
        size: file.size,
        type: file.type,
      },
      errors,
    }
  }

  private async processVideo(file: FilePayload, params: { userId: string, title?: string | null, tags: string[] }): Promise<ProcessOutcome> {
    const tempVideoPath = join(tmpdir(), `${randomUUID()}-${file.name}`)
    const tempThumbPath = join(tmpdir(), `${randomUUID()}.jpg`)
    const compressedPath = join(tmpdir(), `${randomUUID()}-compressed.mp4`)

    const cleanup = async () => {
      await Promise.allSettled([
        unlink(tempVideoPath),
        unlink(compressedPath),
        unlink(tempThumbPath),
      ])
    }

    const errors: string[] = []

    try {
      await writeFile(tempVideoPath, file.buffer)

      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i',
          tempVideoPath,
          '-c:v',
          'copy',
          '-c:a',
          'copy',
          compressedPath,
        ])

        let stderr = ''
        ffmpeg.stderr?.on('data', (data) => {
          stderr += data.toString()
        })

        ffmpeg.on('error', (error) => {
          console.error('ffmpeg process error:', error)
          reject(new Error(`ffmpeg process error: ${error.message}`))
        })

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve()
          }
          else {
            console.error('ffmpeg compress failed with code', code, 'stderr:', stderr)
            reject(new Error(`ffmpeg compress failed with code ${code}: ${stderr.slice(-500)}`))
          }
        })
      })

      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i',
          tempVideoPath,
          '-ss',
          '00:00:01.000',
          '-vframes',
          '1',
          tempThumbPath,
        ])

        let stderr = ''
        ffmpeg.stderr?.on('data', (data) => {
          stderr += data.toString()
        })

        ffmpeg.on('error', (error) => {
          console.error('ffmpeg thumbnail process error:', error)
          reject(new Error(`ffmpeg thumbnail process error: ${error.message}`))
        })

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve()
          }
          else {
            console.error('ffmpeg thumbnail failed with code', code, 'stderr:', stderr)
            reject(new Error(`ffmpeg thumbnail failed with code ${code}: ${stderr.slice(-500)}`))
          }
        })
      })

      const compressedBuffer = await readFile(compressedPath)
      const thumbBuffer = await readFile(tempThumbPath)

      const videoUpload = await uploadFile(compressedBuffer, file.name.replace(/\.[^.]+$/, '.mp4'), 'video/mp4', params.userId, 'media')
      const thumbUpload = await uploadFile(thumbBuffer, file.name.replace(/\.[^.]+$/, '.jpg'), 'image/jpeg', params.userId, 'media-thumbs')

      if (!videoUpload.validation.isValid)
        errors.push(`File "${file.name}" is not valid: ${videoUpload.validation.errors.join(', ')}`)
      if (!thumbUpload.validation.isValid)
        errors.push(`Thumbnail for "${file.name}" is not valid: ${thumbUpload.validation.errors.join(', ')}`)

      if (!videoUpload.success || !videoUpload.objectName || !thumbUpload.success || !thumbUpload.objectName) {
        errors.push(`Failed to upload video or thumbnail for "${file.name}"`)
        return { errors }
      }

      let videoDimensions: { width: number, height: number } | undefined
      try {
        videoDimensions = await getImageDimensions(thumbBuffer)
      }
      catch (error) {
        console.error('Error getting video dimensions:', error)
      }

      await Promise.all([
        this.ctx.cache.addFile(this.ctx.user!.id, videoUpload.fileSize || 0),
        this.ctx.cache.addFile(this.ctx.user!.id, thumbUpload.fileSize || 0, false),
      ])

      const mediaJsonVideo = {
        media: {
          object: videoUpload.objectName,
          url: getPublicUrl(videoUpload.objectName),
          type: 'video' as const,
          width: videoDimensions?.width,
          height: videoDimensions?.height,
          thumbnailUrl: getPublicUrl(thumbUpload.objectName),
        },
      }

      const [inserted] = await this.ctx.db.insert(content).values({
        userId: params.userId,
        type: 'media',
        content: JSON.stringify(mediaJsonVideo),
        title: params.title || undefined,
      }).returning({ id: content.id })

      if (inserted?.id) {
        await this.attachTags(inserted.id, params.tags, 'media', params.title || undefined)

        await thumbnailQueue.add('generate-thumbnail', {
          contentId: inserted.id,
          objectName: videoUpload.objectName,
          mimeType: 'video/mp4',
          type: 'video',
        })
      }

      return {
        result: {
          objectName: videoUpload.objectName,
          url: getPublicUrl(videoUpload.objectName),
          thumbnail: getPublicUrl(thumbUpload.objectName),
          fileName: file.name,
          size: file.size,
          type: file.type,
        },
        errors,
      }
    }
    finally {
      await cleanup()
    }
  }

  private async processAudio(file: FilePayload, params: { userId: string, title?: string | null, tags: string[], makeTrack: boolean }): Promise<ProcessOutcome> {
    if (file.size > 50 * 1024 * 1024)
      return { errors: [`File "${file.name}" is too large (max 50MB)`] }

    const buffer = file.buffer

    let metadata: mm.IAudioMetadata | null = null
    try {
      metadata = await mm.parseBuffer(buffer, { mimeType: file.type, size: buffer.length })
    }
    catch (error) {
      console.warn('Failed to parse audio metadata:', error)
    }

    const audioUpload = await uploadFile(buffer, file.name, file.type, params.userId, 'audio', { maxFileSize: 50 * 1024 * 1024 })
    const errors: string[] = []

    if (!audioUpload.validation.isValid)
      errors.push(`File "${file.name}" is not valid: ${audioUpload.validation.errors.join(', ')}`)

    if (!audioUpload.success || !audioUpload.objectName) {
      errors.push(`Failed to upload file "${file.name}"`)
      return { errors }
    }

    const audioUrl = getPublicUrl(audioUpload.objectName)

    let coverUrl: string | undefined
    let coverObject: string | undefined
    let coverDims: { width: number, height: number } | undefined
    let coverFileSize: number | undefined

    const picture = metadata?.common.picture?.[0]
    if (picture && picture.data?.length) {
      try {
        const jpeg = await sharp(picture.data).jpeg({ quality: 85 }).toBuffer()
        const coverUpload = await uploadFile(jpeg, file.name.replace(/\.[^.]+$/, '.jpg'), 'image/jpeg', params.userId, 'audio-covers')

        if (!coverUpload.validation.isValid)
          errors.push(`Cover for "${file.name}" is not valid: ${coverUpload.validation.errors.join(', ')}`)

        if (coverUpload.success && coverUpload.objectName) {
          coverObject = coverUpload.objectName
          coverUrl = getPublicUrl(coverUpload.objectName)
          coverFileSize = coverUpload.fileSize || 0
          try {
            coverDims = await getImageDimensions(jpeg)
          }
          catch (err) {
            console.warn('Error getting image dimensions:', err)
          }
        }
      }
      catch (error) {
        console.warn('Failed to process cover:', error)
      }
    }

    await Promise.all([
      this.ctx.cache.addFile(this.ctx.user!.id, audioUpload.fileSize || 0),
      this.ctx.cache.addFile(this.ctx.user!.id, coverFileSize || 0, false),
    ])

    const audioJson = {
      audio: {
        object: audioUpload.objectName,
        url: audioUrl,
        mimeType: file.type,
        durationSec: metadata?.format.duration ? Math.round(metadata.format.duration) : undefined,
        bitrateKbps: metadata?.format.bitrate ? Math.round((metadata.format.bitrate || 0) / 1000) : undefined,
        sampleRateHz: metadata?.format.sampleRate || undefined,
        channels: metadata?.format.numberOfChannels || undefined,
        sizeBytes: buffer.length,
      },
      track: {
        isTrack: params.makeTrack || Boolean(
          metadata?.common.artist || metadata?.common.album || metadata?.common.title || metadata?.common.genre?.length,
        ),
        title: metadata?.common.title || params.title || undefined,
        artist: metadata?.common.artist || undefined,
        album: metadata?.common.album || undefined,
        year: metadata?.common.year || undefined,
        genre: metadata?.common.genre || undefined,
        trackNumber: metadata?.common.track?.no || undefined,
        diskNumber: metadata?.common.disk?.no || undefined,
        lyrics: metadata?.common.lyrics?.join('\n') || undefined,
      },
      cover: coverUrl
        ? {
          object: coverObject,
          url: coverUrl,
          width: coverDims?.width,
          height: coverDims?.height,
        }
        : undefined,
    }

    const [inserted] = await this.ctx.db.insert(content).values({
      userId: params.userId,
      type: 'audio',
      content: JSON.stringify(audioJson),
      title: params.title || metadata?.common.title || undefined,
    }).returning({ id: content.id })

    if (inserted?.id) {
      await this.attachTags(inserted.id, params.tags, 'audio', params.title || metadata?.common.title || undefined)

      if (coverObject) {
        await thumbnailQueue.add('generate-thumbnail', {
          contentId: inserted.id,
          objectName: coverObject,
          mimeType: 'image/jpeg',
          type: 'audio-cover',
        })
      }
    }

    return {
      result: {
        objectName: audioUpload.objectName,
        url: audioUrl,
        fileName: file.name,
        size: file.size,
        type: file.type,
        cover: coverUrl,
      },
      errors,
    }
  }

  private async attachTags(contentId: string, tags: string[], type: 'media' | 'audio', title?: string) {
    if (!tags.length)
      return

    const ids = await this.resolveTagTitlesToIds(tags)
    if (!ids.length)
      return

    const contentNodeId = await this.getOrCreateContentNode({ contentId, title, type })
    const tagNodeIds = await this.getOrCreateTagNodeIds(ids)
    await this.upsertContentTags(contentId, ids, contentNodeId, tagNodeIds)
  }

  private async resolveTagTitlesToIds(titles: string[]): Promise<string[]> {
    const unique = Array.from(new Set((titles || []).filter(Boolean)))
    if (!unique.length)
      return []

    const existing = await this.ctx.db.query.tags.findMany({
      where: inArray(tags.title, unique),
      columns: {
        id: true,
        title: true,
      },
    })

    const byTitle = new Map(existing.map(t => [t.title, t.id]))
    const missing = unique.filter(t => !byTitle.has(t))

    if (missing.length) {
      const inserted = await this.ctx.db.insert(tags)
        .values(missing.map(title => ({ title })))
        .returning({ id: tags.id, title: tags.title })

      for (const t of inserted)
        byTitle.set(t.title, t.id)
    }

    const ids = unique.map(t => byTitle.get(t))
    return ids.filter((v): v is string => typeof v === 'string' && v.length > 0)
  }

  private async getOrCreateContentNode(params: { contentId: string, title?: string, type: string }) {
    const existing = await this.ctx.db.query.nodes.findFirst({
      where: and(
        eq(nodes.userId, this.requireUserId()),
        sql`${nodes.metadata}->>'content_id' = ${params.contentId}`,
      ),
      columns: {
        id: true,
      },
    })

    if (existing?.id)
      return existing.id

    const [data] = await this.ctx.db.insert(nodes)
      .values({
        content: params.title ?? '',
        type: params.type,
        userId: this.requireUserId(),
        metadata: { content_id: params.contentId },
      })
      .returning({ id: nodes.id })

    return data.id
  }

  private async getOrCreateTagNodeIds(tagIds: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {}
    const uniqueIds = Array.from(new Set(tagIds))
    if (!uniqueIds.length)
      return result

    const existingNodes = await this.ctx.db.query.nodes.findMany({
      where: and(
        eq(nodes.userId, this.requireUserId()),
        eq(nodes.type, 'tag'),
        inArray(sql`${nodes.metadata}->>'tag_id'`, uniqueIds),
      ),
    })

    for (const row of existingNodes) {
      const meta = row.metadata as { tag_id?: string } | null
      const tagId = meta?.tag_id
      if (tagId)
        result[tagId] = row.id
    }

    const missing = uniqueIds.filter(id => !result[id])
    if (!missing.length)
      return result

    const tagsList = await this.ctx.db.query.tags.findMany({
      where: inArray(tags.id, missing),
    })

    const rows = tagsList.map(t => ({
      content: t.title ?? '',
      type: 'tag',
      userId: this.requireUserId(),
      metadata: { tag_id: t.id },
    }))

    if (rows.length) {
      const created = await this.ctx.db.insert(nodes)
        .values(rows)
        .returning()

      for (const row of created) {
        const meta = row.metadata as { tag_id?: string } | null
        const tagId = meta?.tag_id
        if (tagId)
          result[tagId] = row.id
      }
    }

    return result
  }

  private async upsertContentTags(contentId: string, tagIds: string[], contentNodeId: string, tagNodeIdByTagId: Record<string, string>) {
    if (!tagIds.length)
      return

    const uniqueTagIds = Array.from(new Set(tagIds))

    await this.ctx.db.insert(contentTags).values(
      uniqueTagIds.map(id => ({ contentId, tagId: id, userId: this.requireUserId() })),
    )

    const edgeRows = uniqueTagIds
      .map(tagId => ({
        fromNode: contentNodeId,
        toNode: tagNodeIdByTagId[tagId],
        relationType: 'content_tag',
        userId: this.requireUserId(),
      }))
      .filter(r => !!r.toNode)

    if (edgeRows.length)
      await this.ctx.db.insert(edges).values(edgeRows)
  }

  private requireUserId(): string {
    if (!this.ctx.user?.id)
      throw new Error('Unauthorized')
    return this.ctx.user.id
  }
}
