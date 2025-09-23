import { createContentSchema, updateContentSchema, contentListItemSchema, contentDetailSchema, parseMediaJson } from '@/shared/lib/schemas'
import type { Content } from '@/shared/lib/schemas'
import type { Tables } from '@/shared/types/database'
import { handleSupabaseError, handleSupabaseNotFound } from '@/shared/lib/utils'
import { z } from 'zod'
import { protectedProcedure, router } from '../trpc'
import { deleteFile } from '@/shared/api/minio'

const TAGS_CACHE_TTL_MS = Number(process.env.TAGS_CACHE_TTL_MS ?? 30000)

type CacheEntry<T> = { data: T; expires: number }

const tagsCache = new Map<string, CacheEntry<Array<{ id: string; title: string }>>>()
const tagsWithContentCache = new Map<string, CacheEntry<Array<{ id: string; title: string; items: Content[] }>>>()

function getFromCache<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const hit = map.get(key)
  if (!hit) return undefined
  if (Date.now() > hit.expires) { map.delete(key); return undefined }
  return hit.data
}

function setCache<T>(map: Map<string, CacheEntry<T>>, key: string, data: T) {
  map.set(key, { data, expires: Date.now() + TAGS_CACHE_TTL_MS })
}

function invalidateUserTags(userId: string) {
  tagsCache.delete(userId)
  tagsWithContentCache.delete(userId)
}

function extractObjectNameFromApiUrl(url?: string | null): string | null {
  if (!url) return null
  try {
    const prefix = '/api/files/'
    if (url.startsWith(prefix)) return url.slice(prefix.length)
    const idx = url.indexOf('/api/files/')
    if (idx >= 0) return url.slice(idx + '/api/files/'.length)
  } catch {
    // ignore
  }
  return null
}

export const contentRouter = router({
  getAll: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      tagIds: z.array(z.string()).optional(),
      type: z.enum(['note', 'media', 'link', 'todo', 'audio']).optional(),
      cursor: z.string().optional(), // keyset: `${created_at}|${id}`
      limit: z.number().min(1).max(100).optional().default(20),
      includeTags: z.boolean().optional().default(true),
    }))
    .query(async ({ input, ctx }) => {
      const limit = input.limit ?? 20

      if (input.tagIds && input.tagIds.length) {
        return await getContentWithTagFilter(ctx, input, limit)
      }

      let query = ctx.supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false, nullsFirst: false })
        .eq('user_id', ctx.user.id)

      if (input.search && input.search.trim().length > 0) {
        const term = `%${input.search.trim()}%`
        query = query.or(`title.ilike.${term},content.ilike.${term}`)
      }

      if (input.type) query = query.eq('type', input.type)

      if (input.cursor) {
        const [ts, id] = input.cursor.split('|')
        if (ts && id) {
          query = query.lt('created_at', ts).or(`created_at.eq.${ts},id.lt.${id}`)
        }
      }

      const { data, error } = await query.limit(limit)

      if (error) handleSupabaseError(error)

      const contentRows = (data || []) as Tables<'content'>[]
      const last = contentRows[contentRows.length - 1]
      const nextCursor = last ? `${last.created_at}|${last.id}` : undefined

      const items = input.includeTags
        ? await attachTagsToContent(ctx, contentRows)
        : contentRows.map(r => mapContentRow(r, ctx.user.id))

      return {
        items: items.map(i => contentListItemSchema.parse(i)),
        nextCursor,
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabase
        .from('content')
        .select('*')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      if (error) handleSupabaseNotFound(error, 'Контент не найден')

      return contentDetailSchema.parse(mapContentRow(data as Tables<'content'>, ctx.user.id))
    }),

  create: protectedProcedure
    .input(createContentSchema)
    .mutation(async ({ input, ctx }) => {
      const { tag_ids: inputTagIds, tags: legacyTagTitles, ...contentData } = input as any

      const { data, error } = await ctx.supabase
        .from('content')
        .insert([{
          ...contentData,
          user_id: ctx.user.id,
          thumbnail_base64: contentData.thumbnail_base64,
        }])
        .select()
        .single()

      if (error) handleSupabaseError(error)

      const contentId = (data as Tables<'content'>).id

      const contentNodeId = await getOrCreateContentNode(ctx, {
        content_id: contentId,
        title: contentData.title,
        type: contentData.type,
      })

      const tagIds = inputTagIds as string[] | undefined
      const tagTitles = legacyTagTitles as string[] | undefined
      if (tagIds && tagIds.length) {
        const tagNodeIds = await getOrCreateTagNodeIds(ctx, tagIds)
        await upsertContentTags(ctx, contentId, tagIds, contentNodeId, tagNodeIds, ctx.user.id)
      } else if (tagTitles && tagTitles.length) {
        const ids = await resolveTagTitlesToIds(ctx, tagTitles)
        if (ids.length) {
          const tagNodeIds = await getOrCreateTagNodeIds(ctx, ids)
          await upsertContentTags(ctx, contentId, ids, contentNodeId, tagNodeIds, ctx.user.id)
        }
      }

      const [withTags] = await attachTagsToContent(ctx, [data as Tables<'content'>])
      invalidateUserTags(ctx.user.id)
      return contentDetailSchema.parse(withTags)
    }),

  update: protectedProcedure
    .input(updateContentSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, tag_ids: inputTagIds, tags: legacyTagTitles, ...updateData } = input as any

      const { data, error } = await ctx.supabase
        .from('content')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          thumbnail_base64: updateData.thumbnail_base64,
        })
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      if (error) handleSupabaseError(error)

      const tagIds = inputTagIds as string[] | undefined
      const tagTitles = legacyTagTitles as string[] | undefined
      const contentNodeId = await getOrCreateContentNode(ctx, { content_id: id, title: updateData.title, type: updateData.type })
      if (tagIds) {
        const tagNodeIds = await getOrCreateTagNodeIds(ctx, tagIds)
        await replaceContentTags(ctx, id, tagIds, contentNodeId, tagNodeIds, ctx.user.id)
      } else if (tagTitles) {
        const ids = await resolveTagTitlesToIds(ctx, tagTitles)
        const tagNodeIds = await getOrCreateTagNodeIds(ctx, ids)
        await replaceContentTags(ctx, id, ids, contentNodeId, tagNodeIds, ctx.user.id)
      }

      const [withTags] = await attachTagsToContent(ctx, [data as Tables<'content'>])
      invalidateUserTags(ctx.user.id)
      return contentDetailSchema.parse(withTags)
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { data: contentRow, error: loadErr } = await ctx.supabase
        .from('content')
        .select('*')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()
      if (loadErr) handleSupabaseNotFound(loadErr, 'Контент не найден')

      const { data: nodeRow } = await ctx.supabase
        .from('nodes')
        .select('id')
        .eq('user_id', ctx.user.id)
        .contains('metadata', { content_id: input.id })
        .maybeSingle()

      const contentNodeId = (nodeRow as { id: string } | null)?.id

      await ctx.supabase.from('content_tags').delete().eq('content_id', input.id)
      if (contentNodeId) {
        await ctx.supabase
          .from('edges')
          .delete()
          .or(`from_node.eq.${contentNodeId},to_node.eq.${contentNodeId}`)
        await ctx.supabase
          .from('nodes')
          .delete()
          .eq('id', contentNodeId)
          .eq('user_id', ctx.user.id)
      }

      const { error: delErr } = await ctx.supabase
        .from('content')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
      if (delErr) handleSupabaseError(delErr)

      if ((contentRow as any)?.type === 'media') {
        const mediaJson = parseMediaJson((contentRow as any).content)
        const mainObject = mediaJson?.media?.object || extractObjectNameFromApiUrl(mediaJson?.media?.url)
        const thumbObject = extractObjectNameFromApiUrl(mediaJson?.media?.thumbnailUrl)
        try { if (mainObject) await deleteFile(mainObject) } catch { /* ignore */ }
        try { if (thumbObject) await deleteFile(thumbObject) } catch { /* ignore */ }
      } else if ((contentRow as any)?.type === 'audio') {
        try {
          const parsed = JSON.parse((contentRow as any).content)
          const audioObj = parsed?.audio?.object || extractObjectNameFromApiUrl(parsed?.audio?.url)
          const coverObj = parsed?.cover?.object || extractObjectNameFromApiUrl(parsed?.cover?.url)
          if (audioObj) await deleteFile(audioObj)
          if (coverObj) await deleteFile(coverObj)
        } catch {
          // ignore
        }
      }

      invalidateUserTags(ctx.user.id)
      return { success: true }
    }),

  getTags: protectedProcedure
    .query(async ({ ctx }) => {
      const cacheKey = ctx.user.id
      const cached = getFromCache(tagsCache, cacheKey)
      if (cached) return cached

      const { data: ctRows, error: ctErr } = await ctx.supabase
        .from('content_tags')
        .select('tag_id, content_id')
      if (ctErr) handleSupabaseError(ctErr)
      const tagIds = Array.from(new Set((ctRows || []).map((r: any) => r.tag_id)))
      if (tagIds.length === 0) return []
      const { data: tags, error: tErr } = await ctx.supabase
        .from('tags')
        .select('id, title')
        .in('id', tagIds)
      if (tErr) handleSupabaseError(tErr)
      const result = (tags || []).map(t => ({ id: t.id, title: t.title }))
      setCache(tagsCache, cacheKey, result)
      return result
    }),

  getTagById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const { data: tag, error } = await ctx.supabase
        .from('tags')
        .select('id, title')
        .eq('id', input.id)
        .single()

      if (error) handleSupabaseError(error)
      return tag
    }),

  getTagsWithContent: protectedProcedure
    .query(async ({ ctx }) => {
      const cacheKey = ctx.user.id
      const cached = getFromCache(tagsWithContentCache, cacheKey)
      if (cached) return cached
      const { data: content, error } = await ctx.supabase
        .from('content')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false, nullsFirst: false });

      if (error) handleSupabaseError(error)
      if (!content) return [];

      const items = await attachTagsToContent(ctx, content as Tables<'content'>[])
      const tagsMap = new Map<string, { id: string; title: string; items: Content[] }>();

      for (const item of items) {
        item.tag_ids.forEach((tid, idx) => {
          const tTitle = item.tags[idx] || ''
          if (!tagsMap.has(tid)) tagsMap.set(tid, { id: tid, title: tTitle, items: [] })
          const bucket = tagsMap.get(tid)!
          if (bucket.items.length < 3) bucket.items.push(item)
        })
      }

      const result = Array.from(tagsMap.values())
      setCache(tagsWithContentCache, cacheKey, result)
      return result
    }),
})

async function attachTagsToContent(ctx: any, rows: Tables<'content'>[]): Promise<Content[]> {
  const items = rows.map(r => mapContentRow(r, ctx.user.id))
  if (items.length === 0) return items

  const ids = rows.map(r => r.id)

  const { data: contentTagsWithTitles, error } = await ctx.supabase
    .from('content_tags')
    .select('content_id, tag_id, tags!inner(id, title)')
    .in('content_id', ids)

  if (error) handleSupabaseError(error)

  const byContent = new Map<string, { ids: string[], titles: string[] }>()

  for (const r of contentTagsWithTitles || []) {
    const existing = byContent.get(r.content_id) || { ids: [], titles: [] }
    existing.ids.push(r.tag_id)
    existing.titles.push((r.tags as any).title)
    byContent.set(r.content_id, existing)
  }

  return items.map(i => {
    const tags = byContent.get(i.id)
    return {
      ...i,
      tag_ids: tags?.ids || [],
      tags: tags?.titles || [],
    }
  })
}

async function getContentWithTagFilter(ctx: any, input: any, limit: number) {
  let query = ctx.supabase
    .from('content')
    .select(`
      *,
      content_tags!inner(tag_id)
    `)
    .order('created_at', { ascending: false, nullsFirst: false })
    .eq('user_id', ctx.user.id)
    .in('content_tags.tag_id', input.tagIds)

  if (input.search && input.search.trim().length > 0) {
    const term = `%${input.search.trim()}%`
    query = query.or(`title.ilike.${term},content.ilike.${term}`)
  }

  if (input.type) query = query.eq('type', input.type)

  if (input.cursor) {
    const [ts, id] = input.cursor.split('|')
    if (ts && id) {
      query = query.lt('created_at', ts).or(`created_at.eq.${ts},id.lt.${id}`)
    }
  }

  const { data, error } = await query.limit(limit)

  if (error) handleSupabaseError(error)

  const contentMap = new Map<string, Tables<'content'>>()
  for (const row of data || []) {
    if (!contentMap.has(row.id)) {
      contentMap.set(row.id, row)
    }
  }

  const contentRows = Array.from(contentMap.values())
  const last = contentRows[contentRows.length - 1]
  const nextCursor = last ? `${last.created_at}|${last.id}` : undefined

  const items = input.includeTags
    ? await attachTagsToContent(ctx, contentRows)
    : contentRows.map(r => mapContentRow(r, ctx.user.id))

  return {
    items: items.map(i => contentListItemSchema.parse(i)),
    nextCursor,
  }
}

async function resolveTagTitlesToIds(ctx: any, titles: string[]): Promise<string[]> {
  if (titles.length === 0) return []
  const { data: existing } = await ctx.supabase
    .from('tags')
    .select('id, title')
    .in('title', titles)
  const existingMap = new Map((existing || []).map((t: any) => [t.title, t.id]))
  const missing = titles.filter(t => !existingMap.has(t))
  if (missing.length) {
    const { data: inserted } = await ctx.supabase
      .from('tags')
      .insert(missing.map(title => ({ title })))
      .select('id, title')
    for (const t of inserted || []) {
      await ctx.supabase.from('nodes').insert([{
        content: t.title,
        type: 'tag',
        user_id: ctx.user.id,
      }]).select().single()
      existingMap.set(t.title, t.id)
    }
  }
  const ids = titles.map(t => existingMap.get(t))
  return ids.filter((v): v is string => typeof v === 'string' && v.length > 0)
}

async function upsertContentTags(ctx: any, contentId: string, tagIds: string[], contentNodeId: string, tagNodeIdByTagId: Record<string, string>, user_id: string) {
  if (!tagIds.length) return
  await ctx.supabase.from('content_tags').insert(tagIds.map(id => ({ content_id: contentId, tag_id: id })))
  const edgeRows = tagIds
    .map(tagId => ({ from_node: contentNodeId, to_node: tagNodeIdByTagId[tagId], relation_type: 'content_tag', user_id }))
    .filter(r => !!r.to_node)
  if (edgeRows.length) await ctx.supabase.from('edges').insert(edgeRows)
}

async function replaceContentTags(ctx: any, contentId: string, tagIds: string[], contentNodeId: string, tagNodeIdByTagId: Record<string, string>, user_id: string) {
  await ctx.supabase.from('content_tags').delete().eq('content_id', contentId)
  await ctx.supabase.from('edges').delete().eq('from_node', contentNodeId).eq('relation_type', 'content_tag').eq('user_id', user_id)
  await upsertContentTags(ctx, contentId, tagIds, contentNodeId, tagNodeIdByTagId, user_id)
}

async function getOrCreateContentNode(ctx: any, params: { content_id: string; title?: string; type: string }) {
  const { data: existing } = await ctx.supabase
    .from('nodes')
    .select('id')
    .eq('user_id', ctx.user.id)
    .contains('metadata', { content_id: params.content_id })
    .maybeSingle()
  if (existing?.id) return existing.id as string
  const { data, error } = await ctx.supabase
    .from('nodes')
    .insert([{ content: params.title ?? '', type: params.type, user_id: ctx.user.id, metadata: { content_id: params.content_id } }])
    .select('id')
    .single()
  if (error) handleSupabaseError(error)
  return (data as { id: string }).id
}

async function getOrCreateTagNodeIds(ctx: any, tagIds: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const tagId of Array.from(new Set(tagIds))) {
    const { data: existing } = await ctx.supabase
      .from('nodes')
      .select('id')
      .eq('user_id', ctx.user.id)
      .contains('metadata', { tag_id: tagId })
      .maybeSingle()
    if (existing?.id) {
      out[tagId] = existing.id as string
      continue
    }
    const { data: tag } = await ctx.supabase.from('tags').select('title').eq('id', tagId).single()
    const { data: created, error } = await ctx.supabase
      .from('nodes')
      .insert([{ content: tag?.title ?? '', type: 'tag', user_id: ctx.user.id, metadata: { tag_id: tagId } }])
      .select('id')
      .single()
    if (error) handleSupabaseError(error)
    out[tagId] = (created as { id: string }).id
  }
  return out
}

function mapContentRow(row: Tables<'content'>, fallbackUserId: string): Content {
  return {
    id: row.id,
    user_id: row.user_id ?? fallbackUserId,
    type: (row.type as Content['type']),
    title: row.title ?? undefined,
    content: row.content,
    tags: [],
    tag_ids: [],
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    media_url: row.media_url ?? undefined,
    url: row.url ?? undefined,
    media_type: (row.media_type as Content['media_type']) ?? undefined,
    thumbnail_base64: row.thumbnail_base64 ?? undefined,
    media_width: row.media_width ?? undefined,
    media_height: row.media_height ?? undefined,
  }
}
