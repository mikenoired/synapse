import type z from 'zod'
import type { Context } from '../context'
import type { createContentSchema, updateContentSchema } from '@/shared/lib/schemas'
import { handleSupabaseError, handleSupabaseNotFound } from '@/shared/lib/utils'

export default class ContentRepository {
  constructor(private readonly ctx: Context) { }

  async getAll(search: string | undefined, type: 'note' | 'media' | 'link' | 'todo' | 'audio' | undefined, cursor: string | undefined, limit: number) {
    let query = this.ctx.supabase
      .from('content')
      .select('*')
      .order('created_at', { ascending: false, nullsFirst: false })
      .eq('user_id', this.ctx.user!.id)

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`
      query = query.or(`title.ilike.${term},content.ilike.${term}`)
    }

    if (type)
      query = query.eq('type', type)

    if (cursor) {
      const [ts, id] = cursor.split('|')
      if (ts && id) {
        query = query.lt('created_at', ts).or(`created_at.eq.${ts},id.lt.${id}`)
      }
    }

    const { data, error } = await query.limit(limit)

    if (error)
      handleSupabaseError(error)
    return data
  }

  async getWithTagFilter(tagIds: string[], limit: number, search: string | undefined, type: 'note' | 'media' | 'link' | 'todo' | 'audio' | undefined, cursor: string | undefined) {
    let query = this.ctx.supabase
      .from('content')
      .select(`
      *,
      content_tags!inner(tag_id)
    `)
      .order('created_at', { ascending: false, nullsFirst: false })
      .eq('user_id', this.ctx.user!.id)
      .in('content_tags.tag_id', tagIds)

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`
      query = query.or(`title.ilike.${term},content.ilike.${term}`)
    }

    if (type)
      query = query.eq('type', type)

    if (cursor) {
      const [ts, id] = cursor.split('|')
      if (ts && id) {
        query = query.lt('created_at', ts).or(`created_at.eq.${ts},id.lt.${id}`)
      }
    }

    const { data, error } = await query.limit(limit)

    if (error)
      handleSupabaseError(error)

    return data
  }

  async contentTagsWithTitles(ids: string[]) {
    const { data, error } = await this.ctx.supabase
      .from('content_tags')
      .select('content_id, tag_id, tags!inner(id, title)')
      .in('content_id', ids)

    if (error)
      handleSupabaseError(error)

    return data
  }

  async getById(id: string) {
    const { data, error } = await this.ctx.supabase
      .from('content')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.ctx.user!.id)
      .single()

    if (error)
      handleSupabaseNotFound(error, 'Контент не найден')
    return data
  }

  async getNodeByContentId(id: string) {
    const { data, error } = await this.ctx.supabase
      .from('nodes')
      .select('id')
      .eq('user_id', this.ctx.user!.id)
      .contains('metadata', { content_id: id })
      .maybeSingle()

    if (error)
      handleSupabaseNotFound(error, 'Контент не найден')
    return data
  }

  async create(contentData: z.infer<typeof createContentSchema>) {
    const { data, error } = await this.ctx.supabase
      .from('content')
      .insert([{
        ...contentData,
        user_id: this.ctx.user!.id,
        thumbnail_base64: contentData.thumbnail_base64,
      }])
      .select()
      .single()

    if (error)
      handleSupabaseError(error)

    return data
  }

  async getOrCreateTagNodeIds(tagIds: string[]): Promise<Record<string, string>> {
    const out: Record<string, string> = {}
    for (const tagId of Array.from(new Set(tagIds))) {
      const { data: existing } = await this.ctx.supabase
        .from('nodes')
        .select('id')
        .eq('user_id', this.ctx.user!.id)
        .contains('metadata', { tag_id: tagId })
        .maybeSingle()
      if (existing?.id) {
        out[tagId] = existing.id as string
        continue
      }
      const { data: tag } = await this.ctx.supabase.from('tags').select('title').eq('id', tagId).single()
      const { data: created, error } = await this.ctx.supabase
        .from('nodes')
        .insert([{ content: tag?.title ?? '', type: 'tag', user_id: this.ctx.user!.id, metadata: { tag_id: tagId } }])
        .select('id')
        .single()
      if (error)
        handleSupabaseError(error)
      out[tagId] = (created as { id: string }).id
    }
    return out
  }

  async getOrCreateContentNode(params: { content_id: string, title?: string, type: string }) {
    const { data: existing } = await this.ctx.supabase
      .from('nodes')
      .select('id')
      .eq('user_id', this.ctx.user!.id)
      .contains('metadata', { content_id: params.content_id })
      .maybeSingle()
    if (existing?.id)
      return existing.id as string
    const { data, error } = await this.ctx.supabase
      .from('nodes')
      .insert([{ content: params.title ?? '', type: params.type, user_id: this.ctx.user!.id, metadata: { content_id: params.content_id } }])
      .select('id')
      .single()
    if (error)
      handleSupabaseError(error)
    return (data as { id: string }).id
  }

  async createContentTags(tagIds: string[], contentId: string) {
    const { data, error } = await this.ctx.supabase.from('content_tags').insert(tagIds.map(id => ({ content_id: contentId, tag_id: id })))
    if (error)
      handleSupabaseError(error)
    return data
  }

  async createEdges(edgeRows: {
    from_node: string
    to_node: string
    relation_type: string
    user_id: string
  }[]) {
    const { data, error } = await this.ctx.supabase.from('edges').insert(edgeRows)
    if (error)
      handleSupabaseError(error)
    return data
  }

  async createNode(content: string) {
    const { data, error } = await this.ctx.supabase.from('nodes').insert([{
      content,
      type: 'tag',
      user_id: this.ctx.user!.id,
    }]).select().single()
    if (error)
      handleSupabaseError(error)
    return data
  }

  async getTagsByTitle(titles: string[]) {
    const { data, error } = await this.ctx.supabase
      .from('tags')
      .select('id, title')
      .in('title', titles)

    if (error)
      handleSupabaseError(error)
    return data
  }

  async getTagById(id: string) {
    const { data, error } = await this.ctx.supabase
      .from('tags')
      .select('id, title')
      .eq('id', id)
      .single()

    if (error)
      handleSupabaseError(error)
    return data
  }

  async getTags(ids: string[]) {
    const { data, error } = await this.ctx.supabase
      .from('tags')
      .select('id, title')
      .in('id', ids)

    if (error)
      handleSupabaseError(error)
    return data
  }

  async createTags(titles: { title: string }[]) {
    const { data, error } = await this.ctx.supabase
      .from('tags')
      .insert(titles)
      .select('id, title')
    if (error)
      handleSupabaseError(error)
    return data
  }

  async updateContent(updData: z.infer<typeof updateContentSchema>) {
    const { data, error } = await this.ctx.supabase
      .from('content')
      .update({
        ...updData,
        updated_at: new Date().toISOString(),
        thumbnail_base64: updData.thumbnail_base64,
      })
      .eq('id', updData.id)
      .eq('user_id', this.ctx.user!.id)
      .select()
      .single()

    if (error)
      handleSupabaseError(error)
    return data
  }

  async deleteEdge(contentNodeId: string) {
    const { error } = await this.ctx.supabase
      .from('edges')
      .delete()
      .or(`from_node.eq.${contentNodeId},to_node.eq.${contentNodeId}`)

    if (error)
      handleSupabaseError(error)
  }

  async deleteNode(contentNodeId: string) {
    const { error } = await this.ctx.supabase
      .from('nodes')
      .delete()
      .eq('id', contentNodeId)
      .eq('user_id', this.ctx.user!.id)

    if (error)
      handleSupabaseError(error)
  }

  async getContentTags() {
    const { data, error } = await this.ctx.supabase
      .from('content_tags')
      .select('tag_id, content_id')

    if (error)
      handleSupabaseError(error)
    return data
  }

  async deleteContent(id: string) {
    const { error } = await this.ctx.supabase
      .from('content')
      .delete()
      .eq('id', id)
      .eq('user_id', this.ctx.user!.id)

    if (error)
      handleSupabaseError(error)
  }

  async deleteTagEdge(contentNodeId: string) {
    const { error } = await this.ctx.supabase.from('edges').delete().eq('from_node', contentNodeId).eq('relation_type', 'content_tag').eq('user_id', this.ctx.user!.id)
    if (error)
      handleSupabaseError(error)
  }

  async deleteContentTag(contentId: string) {
    const { error } = await this.ctx.supabase.from('content_tags').delete().eq('content_id', contentId)
    if (error)
      handleSupabaseError(error)
  }
}
