import { createContentSchema, updateContentSchema, contentListItemSchema, contentDetailSchema } from '@/shared/lib/schemas'
import type { Content } from '@/shared/lib/schemas'
import type { Tables } from '@/shared/types/database'
import { handleSupabaseError, handleSupabaseNotFound } from '@/shared/lib/utils'
import { z } from 'zod'
import { protectedProcedure, router } from '../trpc'

export const contentRouter = router({
  getAll: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      tagIds: z.array(z.string()).optional(),
      type: z.enum(['note', 'media', 'link', 'todo']).optional(),
      cursor: z.number().optional(),
      limit: z.number().min(1).max(100).optional().default(20),
    }))
    .query(async ({ input, ctx }) => {
      const from = input.cursor ?? 0
      const to = from + (input.limit ?? 20) - 1

      let query = ctx.supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false, nullsFirst: false })
        .eq('user_id', ctx.user.id)

      if (input.search && input.search.trim().length > 0) {
        const term = `%${input.search.trim()}%`
        query = query.or(`title.ilike.${term},content.ilike.${term}`)
      }

      if (input.tagIds && input.tagIds.length) {
        const { data: ctRows, error: ctError } = await ctx.supabase
          .from('content_tags')
          .select('content_id, tag_id')
          .in('tag_id', input.tagIds)
        if (ctError) handleSupabaseError(ctError)
        const allowedIds = Array.from(new Set((ctRows || []).map(r => r.content_id)))
        if (allowedIds.length === 0) {
          return { items: [], nextCursor: undefined }
        }
        query = query.in('id', allowedIds)
      }
      if (input.type) query = query.eq('type', input.type)

      const { data, error } = await query.range(from, to)

      if (error) handleSupabaseError(error)

      const nextCursor = data && data.length === (input.limit ?? 20) ? to + 1 : undefined
      const items = await attachTagsToContent(ctx, (data || []) as Tables<'content'>[])

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
      // Manage tag relations
      const tagIds = inputTagIds as string[] | undefined
      const tagTitles = legacyTagTitles as string[] | undefined
      if (tagIds && tagIds.length) {
        await upsertContentTags(ctx, contentId, tagIds)
      } else if (tagTitles && tagTitles.length) {
        const ids = await resolveTagTitlesToIds(ctx, tagTitles)
        if (ids.length) await upsertContentTags(ctx, contentId, ids)
      }

      const [withTags] = await attachTagsToContent(ctx, [data as Tables<'content'>])
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

      // Update tag relations if provided
      const tagIds = inputTagIds as string[] | undefined
      const tagTitles = legacyTagTitles as string[] | undefined
      if (tagIds) {
        await replaceContentTags(ctx, id, tagIds)
      } else if (tagTitles) {
        const ids = await resolveTagTitlesToIds(ctx, tagTitles)
        await replaceContentTags(ctx, id, ids)
      }

      const [withTags] = await attachTagsToContent(ctx, [data as Tables<'content'>])
      return contentDetailSchema.parse(withTags)
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { error } = await ctx.supabase
        .from('content')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      if (error) handleSupabaseError(error)

      return { success: true }
    }),

  getTags: protectedProcedure
    .query(async ({ ctx }) => {
      // Get all content ids for user
      const { data: contents, error: cErr } = await ctx.supabase
        .from('content')
        .select('id')
        .eq('user_id', ctx.user.id)
      if (cErr) handleSupabaseError(cErr)
      const ids = (contents || []).map(c => c.id)
      if (ids.length === 0) return []
      const { data: ctRows, error: ctErr } = await ctx.supabase
        .from('content_tags')
        .select('tag_id, content_id')
        .in('content_id', ids)
      if (ctErr) handleSupabaseError(ctErr)
      const tagIds = Array.from(new Set((ctRows || []).map(r => r.tag_id)))
      if (tagIds.length === 0) return []
      const { data: tags, error: tErr } = await ctx.supabase
        .from('tags')
        .select('id, title')
        .in('id', tagIds)
      if (tErr) handleSupabaseError(tErr)
      return (tags || []).map(t => ({ id: t.id, title: t.title }))
    }),

  getTagsWithContent: protectedProcedure
    .query(async ({ ctx }) => {
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

      return Array.from(tagsMap.values())
    }),
})

async function attachTagsToContent(ctx: any, rows: Tables<'content'>[]): Promise<Content[]> {
  const items = rows.map(r => mapContentRow(r, ctx.user.id))
  if (items.length === 0) return items
  const ids = rows.map(r => r.id)
  const { data: ctRows, error: ctErr } = await ctx.supabase
    .from('content_tags')
    .select('content_id, tag_id')
    .in('content_id', ids)
  if (ctErr) handleSupabaseError(ctErr)
  const tagIds = Array.from(new Set((ctRows || []).map(r => r.tag_id)))
  const { data: tags, error: tErr } = await ctx.supabase
    .from('tags')
    .select('id, title')
    .in('id', tagIds)
  if (tErr) handleSupabaseError(tErr)
  const idToTitle: Map<string, string> = new Map(
    ((tags || []) as Array<{ id: string; title: string }>).map(t => [t.id, t.title])
  )
  const byContent = new Map<string, string[]>()
  for (const r of ctRows || []) {
    const arr = byContent.get(r.content_id) || []
    arr.push(r.tag_id)
    byContent.set(r.content_id, arr)
  }
  return items.map(i => {
    const tids = byContent.get(i.id) || []
    return {
      ...i,
      tag_ids: tids,
      tags: tids.map(id => idToTitle.get(id) ?? ''),
    }
  })
}

async function resolveTagTitlesToIds(ctx: any, titles: string[]): Promise<string[]> {
  if (titles.length === 0) return []
  const { data: existing } = await ctx.supabase
    .from('tags')
    .select('id, title')
    .in('title', titles)
  const existingMap = new Map((existing || []).map(t => [t.title, t.id]))
  const missing = titles.filter(t => !existingMap.has(t))
  if (missing.length) {
    const { data: inserted } = await ctx.supabase
      .from('tags')
      .insert(missing.map(title => ({ title })))
      .select('id, title')
    for (const t of inserted || []) existingMap.set(t.title, t.id)
  }
  const ids = titles.map(t => existingMap.get(t))
  return ids.filter((v): v is string => typeof v === 'string' && v.length > 0)
}

async function upsertContentTags(ctx: any, contentId: string, tagIds: string[]) {
  if (!tagIds.length) return
  await ctx.supabase.from('content_tags').insert(tagIds.map(id => ({ content_id: contentId, tag_id: id })))
}

async function replaceContentTags(ctx: any, contentId: string, tagIds: string[]) {
  await ctx.supabase.from('content_tags').delete().eq('content_id', contentId)
  await upsertContentTags(ctx, contentId, tagIds)
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
    reminder_at: row.reminder_at ?? undefined,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    media_url: row.media_url ?? undefined,
    url: row.url ?? undefined,
    media_type: (row.media_type as Content['media_type']) ?? undefined,
    thumbnail_url: row.thumbnail_url ?? undefined,
    thumbnail_base64: row.thumbnail_base64 ?? undefined,
    media_width: row.media_width ?? undefined,
    media_height: row.media_height ?? undefined,
  }
}