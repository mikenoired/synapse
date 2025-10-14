import type z from 'zod'
import type { Context } from '../context'
import type { content as contentTable } from '../db/schema'
import type { Content, createContentSchema, updateContentSchema } from '@/shared/lib/schemas'
import { deleteFile, getFileMetadata } from '@/shared/api/minio'
import { contentDetailSchema, contentListItemSchema, parseAudioJson, parseMediaJson } from '@/shared/lib/schemas'
import ContentRepository from '../repositories/content.repository'

type ContentRow = typeof contentTable.$inferSelect

const tagsCache = new Map<string, CacheEntry<Array<{ id: string, title: string }>>>()
const tagsWithContentCache = new Map<string, CacheEntry<Array<{ id: string, title: string, items: Content[] }>>>()

interface CacheEntry<T> { data: T, expires: number }

const TAGS_CACHE_TTL_MS = Number(process.env.TAGS_CACHE_TTL_MS ?? 30000)

export default class ContentService {
  private repo: ContentRepository
  private ctx: Context

  constructor(ctx: Context) {
    this.repo = new ContentRepository(ctx)
    this.ctx = ctx
  }

  async getAll(
    search: string | undefined,
    type: 'note' | 'media' | 'link' | 'todo' | 'audio' | 'doc' | 'pdf' | 'docx' | 'epub' | 'xlsx' | 'csv' | undefined,
    tagIds: string[] | undefined,
    cursor: string | undefined,
    limit: number,
    includeTags: boolean,
  ) {
    if (tagIds && tagIds.length) {
      return await this.getContentWithTagFilter(tagIds, limit, search, type, cursor, includeTags)
    }
    const data = await this.repo.getAll(search, type, cursor, limit)

    const contentRows = (data || []) as ContentRow[]
    const last = contentRows[contentRows.length - 1]
    const nextCursor = last ? `${last.createdAt}|${last.id}` : undefined

    const items = includeTags
      ? await this.attachTagsToContent(contentRows)
      : contentRows.map(r => this.mapContentRow(r, this.ctx.user!.id))

    return {
      items: items.map(i => contentListItemSchema.parse(i)),
      nextCursor,
    }
  }

  async getById(id: string) {
    const data = await this.repo.getById(id)
    return contentDetailSchema.parse(this.mapContentRow(data as ContentRow, this.ctx.user!.id))
  }

  private async getContentWithTagFilter(tagIds: string[], limit: number, search: string | undefined, type: 'note' | 'media' | 'link' | 'todo' | 'audio' | 'doc' | 'pdf' | 'docx' | 'epub' | 'xlsx' | 'csv' | undefined, cursor: string | undefined, includeTags: boolean) {
    const data = await this.repo.getWithTagFilter(tagIds, limit, search, type, cursor)

    const contentMap = new Map<string, ContentRow>()
    for (const row of data || []) {
      if (!contentMap.has(row.id)) {
        contentMap.set(row.id, row)
      }
    }

    const contentRows = Array.from(contentMap.values())
    const last = contentRows[contentRows.length - 1]
    const nextCursor = last ? `${last.createdAt}|${last.id}` : undefined

    const items = includeTags
      ? await this.attachTagsToContent(contentRows)
      : contentRows.map(r => this.mapContentRow(r, this.ctx.user!.id))

    return {
      items: items.map(i => contentListItemSchema.parse(i)),
      nextCursor,
    }
  }

  async create(createContentData: z.infer<typeof createContentSchema>) {
    const { tag_ids: inputTagIds, tags: legacyTagTitles, ...contentData } = createContentData

    const data = await this.repo.create(createContentData)

    const contentId = (data as ContentRow).id

    const contentNodeId = await this.repo.getOrCreateContentNode({
      content_id: contentId,
      title: contentData.title,
      type: contentData.type,
    })

    const tagIds = inputTagIds as string[] | undefined
    const tagTitles = legacyTagTitles as string[] | undefined
    if (tagIds && tagIds.length) {
      const tagNodeIds = await this.repo.getOrCreateTagNodeIds(tagIds)
      await this.upsertContentTags(contentId, tagIds, contentNodeId, tagNodeIds)
    }
    else if (tagTitles && tagTitles.length) {
      const ids = await this.resolveTagTitlesToIds(tagTitles)
      if (ids.length) {
        const tagNodeIds = await this.repo.getOrCreateTagNodeIds(ids)
        await this.upsertContentTags(contentId, ids, contentNodeId, tagNodeIds)
      }
    }

    const [withTags] = await this.attachTagsToContent([data as ContentRow])
    this.invalidateUserTags()
    return contentDetailSchema.parse(withTags)
  }

  async update(input: z.infer<typeof updateContentSchema>) {
    const data = await this.repo.updateContent(input)

    const { id, tag_ids: inputTagIds, tags: legacyTagTitles, ...updateData } = input

    const tagIds = inputTagIds as string[] | undefined
    const tagTitles = legacyTagTitles as string[] | undefined
    const contentNodeId = await this.repo.getOrCreateContentNode({ content_id: id, title: updateData.title, type: updateData.type || 'note' })
    if (tagIds) {
      const tagNodeIds = await this.repo.getOrCreateTagNodeIds(tagIds)
      await this.replaceContentTags(id, tagIds, contentNodeId, tagNodeIds)
    }
    else if (tagTitles) {
      const ids = await this.resolveTagTitlesToIds(tagTitles)
      const tagNodeIds = await this.repo.getOrCreateTagNodeIds(ids)
      await this.replaceContentTags(id, ids, contentNodeId, tagNodeIds)
    }

    const [withTags] = await this.attachTagsToContent([data as ContentRow])
    this.invalidateUserTags()
    return contentDetailSchema.parse(withTags)
  }

  async delete(id: string) {
    const content = await this.repo.getById(id)
    const node = await this.repo.getNodeByContentId(id)

    const contentNodeId = (node as { id: string } | null)?.id

    await this.repo.deleteContentTag(id)
    if (contentNodeId) {
      await this.repo.deleteEdge(contentNodeId)
      await this.repo.deleteNode(contentNodeId)
    }

    await this.repo.deleteContent(id)

    let totalFileSize = 0

    if (content.type === 'media') {
      const mediaJson = parseMediaJson(content.content)
      const mainObject = mediaJson?.media?.object || this.extractObjectNameFromApiUrl(mediaJson?.media?.url)
      const thumbObject = this.extractObjectNameFromApiUrl(mediaJson?.media?.thumbnailUrl)

      try {
        if (mainObject) {
          const metadata = await getFileMetadata(mainObject)
          if (metadata?.size)
            totalFileSize += metadata.size
          await deleteFile(mainObject)
        }
      }
      catch { /* ignore */ }

      if (mediaJson?.media?.type === 'image') {
        const thumbnailBase64 = mediaJson?.media?.thumbnailBase64
        if (thumbnailBase64) {
          totalFileSize += thumbnailBase64.length
        }
      }
      else {
        try {
          if (thumbObject) {
            const metadata = await getFileMetadata(thumbObject)
            if (metadata?.size)
              totalFileSize += metadata.size
            await deleteFile(thumbObject)
          }
        }
        catch { /* ignore */ }
      }
    }

    else if (content.type === 'audio') {
      try {
        const audioJson = parseAudioJson(content.content)
        const audioObj = audioJson?.audio?.object || this.extractObjectNameFromApiUrl(audioJson?.audio?.url)
        const coverObj = audioJson?.cover?.object || this.extractObjectNameFromApiUrl(audioJson?.cover?.url)

        if (audioJson?.audio?.sizeBytes) {
          totalFileSize += audioJson.audio.sizeBytes
        }
        else if (audioObj) {
          const metadata = await getFileMetadata(audioObj)
          if (metadata?.size)
            totalFileSize += metadata.size
        }

        if (audioObj)
          await deleteFile(audioObj)

        if (coverObj) {
          const metadata = await getFileMetadata(coverObj)
          if (metadata?.size)
            totalFileSize += metadata.size
          await deleteFile(coverObj)
        }
        else if (audioJson?.cover?.thumbnailBase64) {
          totalFileSize += audioJson.cover.thumbnailBase64.length
        }
      }
      catch {
        // ignore
      }
    }

    if (totalFileSize > 0) {
      try {
        await this.ctx.cache.removeFile(this.ctx.user!.id, totalFileSize)
      }
      catch (error) {
        console.error('Error updating cache on file deletion:', error as Error)
      }
    }

    this.invalidateUserTags()
    return { success: true }
  }

  async getTags() {
    const cacheKey = this.ctx.user!.id
    const cached = this.getFromCache(tagsCache, cacheKey)
    if (cached)
      return cached

    const contentTags = await this.repo.getContentTags()
    const tagIds = Array.from(new Set((contentTags || []).map((r: any) => r.tag_id)))
    if (!tagIds.length)
      return []

    const tags = await this.repo.getTags(tagIds)
    const result = (tags || []).map(t => ({ id: t.id, title: t.title }))
    this.setCache(tagsCache, cacheKey, result)
    return result
  }

  async getTagById(id: string) {
    return await this.repo.getTagById(id)
  }

  async getTagsWithContent() {
    const cacheKey = this.ctx.user!.id
    const cached = this.getFromCache(tagsWithContentCache, cacheKey)
    if (cached)
      return cached

    const content = await this.repo.getAll('', undefined, undefined, 4)
    if (!content)
      return []
    const items = await this.attachTagsToContent(content as ContentRow[])
    const tagsMap = new Map<string, { id: string, title: string, items: Content[] }>()
    for (const item of items) {
      item.tag_ids.forEach((tid, idx) => {
        const tTitle = item.tags[idx] || ''
        if (!tagsMap.has(tid))
          tagsMap.set(tid, { id: tid, title: tTitle, items: [] })
        const bucket = tagsMap.get(tid)!
        if (bucket.items.length < 3)
          bucket.items.push(item)
      })
    }

    const result = Array.from(tagsMap.values())
    this.setCache(tagsWithContentCache, cacheKey, result)
    return result
  }

  private extractObjectNameFromApiUrl(url?: string | null): string | null {
    if (!url)
      return null
    try {
      const prefix = '/api/files/'
      if (url.startsWith(prefix))
        return url.slice(prefix.length)
      const idx = url.indexOf('/api/files/')
      if (idx >= 0)
        return url.slice(idx + '/api/files/'.length)
    }
    catch {
      // ignore
    }
    return null
  }

  private async replaceContentTags(contentId: string, tagIds: string[], contentNodeId: string, tagNodeIdByTagId: Record<string, string>) {
    await this.repo.deleteContentTag(contentId)
    await this.repo.deleteTagEdge(contentId)
    await this.upsertContentTags(contentId, tagIds, contentNodeId, tagNodeIdByTagId)
  }

  private async invalidateUserTags() {
    tagsCache.delete(this.ctx.user!.id)
    tagsWithContentCache.delete(this.ctx.user!.id)
  }

  private getFromCache<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
    const hit = map.get(key)
    if (!hit)
      return undefined
    if (Date.now() > hit.expires) {
      map.delete(key)
      return undefined
    }
    return hit.data
  }

  private setCache<T>(map: Map<string, CacheEntry<T>>, key: string, data: T) {
    map.set(key, { data, expires: Date.now() + TAGS_CACHE_TTL_MS })
  }

  private async attachTagsToContent(rows: ContentRow[]): Promise<Content[]> {
    const items = rows.map(r => this.mapContentRow(r, this.ctx.user!.id))
    if (!items.length)
      return items

    const ids = rows.map(r => r.id)
    const contentTagsWithTitles = await this.repo.contentTagsWithTitles(ids)
    const byContent = new Map<string, { ids: string[], titles: string[] }>()

    for (const r of contentTagsWithTitles || []) {
      byContent.set(r.content_id, {
        ids: r.tag_ids || [],
        titles: r.tag_titles || [],
      })
    }

    return items.map((i) => {
      const tags = byContent.get(i.id)
      return {
        ...i,
        tag_ids: tags?.ids || [],
        tags: tags?.titles || [],
      }
    })
  }

  private async resolveTagTitlesToIds(titles: string[]): Promise<string[]> {
    if (titles.length === 0)
      return []
    const existing = await this.repo.getTagsByTitle(titles)
    const existingMap = new Map((existing || []).map(t => [t.title, t.id]))
    const missing = titles.filter(t => !existingMap.has(t))
    if (missing.length) {
      const inserted = await this.repo.createTags(missing.map(title => ({ title })))
      for (const t of inserted || []) {
        await this.repo.createNode(t.title)
        existingMap.set(t.title, t.id)
      }
    }
    const ids = titles.map(t => existingMap.get(t))
    return ids.filter((v): v is string => typeof v === 'string' && v.length > 0)
  }

  private async upsertContentTags(contentId: string, tagIds: string[], contentNodeId: string, tagNodeIdByTagId: Record<string, string>) {
    if (!tagIds.length)
      return
    await this.repo.createContentTags(tagIds, contentId)
    const edgeRows = tagIds
      .map(tagId => ({ from_node: contentNodeId, to_node: tagNodeIdByTagId[tagId], relation_type: 'content_tag', user_id: this.ctx.user!.id }))
      .filter(r => !!r.to_node)
    if (edgeRows.length)
      await this.repo.createEdges(edgeRows)
  }

  private mapContentRow(row: ContentRow, fallbackUserId: string): Content {
    return {
      id: row.id,
      user_id: row.userId ?? fallbackUserId,
      type: (row.type as Content['type']),
      title: row.title ?? undefined,
      content: row.content,
      tags: [],
      tag_ids: [],
      created_at: row.createdAt?.toISOString() ?? new Date().toISOString(),
      updated_at: row.updatedAt?.toISOString() ?? row.createdAt?.toISOString() ?? new Date().toISOString(),
      thumbnail_base64: row.thumbnailBase64 ?? undefined,
      document_images: Array.isArray(row.documentImages) ? row.documentImages : undefined,
    }
  }
}
