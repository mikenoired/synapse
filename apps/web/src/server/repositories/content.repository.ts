import type z from 'zod'
import type { Context } from '../context'
import type { createContentSchema, updateContentSchema } from '@/shared/lib/schemas'
import { TRPCError } from '@trpc/server'
import { and, desc, eq, ilike, inArray, lt, or, sql } from 'drizzle-orm'
import { content, contentTags, edges, nodes, tags } from '../db/schema'

export default class ContentRepository {
  constructor(private readonly ctx: Context) { }

  async getAll(search: string | undefined, type: 'note' | 'media' | 'link' | 'todo' | 'audio' | undefined, cursor: string | undefined, limit: number) {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    const conditions = [eq(content.userId, this.ctx.user.id)]

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`
      conditions.push(
        or(
          ilike(content.title, term),
          ilike(content.content, term),
        )!,
      )
    }

    if (type)
      conditions.push(eq(content.type, type))

    if (cursor) {
      const [ts, id] = cursor.split('|')
      if (ts && id) {
        conditions.push(
          or(
            lt(content.createdAt, new Date(ts)),
            and(eq(content.createdAt, new Date(ts)), lt(content.id, id))!,
          )!,
        )
      }
    }

    const data = await this.ctx.db
      .select()
      .from(content)
      .where(and(...conditions))
      .orderBy(desc(content.createdAt))
      .limit(limit)

    return data
  }

  async getWithTagFilter(tagIds: string[], limit: number, search: string | undefined, type: 'note' | 'media' | 'link' | 'todo' | 'audio' | undefined, cursor: string | undefined) {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    const conditions = [
      eq(content.userId, this.ctx.user.id),
      inArray(contentTags.tagId, tagIds),
    ]

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`
      conditions.push(
        or(
          ilike(content.title, term),
          ilike(content.content, term),
        )!,
      )
    }

    if (type)
      conditions.push(eq(content.type, type))

    if (cursor) {
      const [ts, id] = cursor.split('|')
      if (ts && id) {
        conditions.push(
          or(
            lt(content.createdAt, new Date(ts)),
            and(eq(content.createdAt, new Date(ts)), lt(content.id, id))!,
          )!,
        )
      }
    }

    const data = await this.ctx.db
      .select({
        id: content.id,
        type: content.type,
        content: content.content,
        title: content.title,
        thumbnailBase64: content.thumbnailBase64,
        createdAt: content.createdAt,
        updatedAt: content.updatedAt,
        userId: content.userId,
      })
      .from(content)
      .innerJoin(contentTags, eq(content.id, contentTags.contentId))
      .where(and(...conditions))
      .orderBy(desc(content.createdAt))
      .limit(limit)

    return data
  }

  async contentTagsWithTitles(ids: string[]) {
    const data = await this.ctx.db
      .select({
        content_id: contentTags.contentId,
        tag_ids: sql<string[]>`array_agg(${contentTags.tagId})`.as('tag_ids'),
        tag_titles: sql<string[]>`array_agg(${tags.title})`.as('tag_titles'),
      })
      .from(contentTags)
      .innerJoin(tags, eq(contentTags.tagId, tags.id))
      .where(inArray(contentTags.contentId, ids))
      .groupBy(contentTags.contentId)

    return data
  }

  async getById(id: string) {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    const data = await this.ctx.db.query.content.findFirst({
      where: and(
        eq(content.id, id),
        eq(content.userId, this.ctx.user.id),
      ),
    })

    if (!data)
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Content not found' })

    return data
  }

  async getNodeByContentId(id: string) {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    const data = await this.ctx.db.query.nodes.findFirst({
      where: and(
        eq(nodes.userId, this.ctx.user.id),
        sql`${nodes.metadata}->>'content_id' = ${id}`,
      ),
      columns: {
        id: true,
      },
    })

    return data
  }

  async create(contentData: z.infer<typeof createContentSchema>) {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    const [data] = await this.ctx.db.insert(content).values({
      ...contentData,
      userId: this.ctx.user.id,
      thumbnailBase64: contentData.thumbnail_base64,
    }).returning()

    if (!data)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Content creation error' })

    return data
  }

  async getOrCreateTagNodeIds(tagIds: string[]): Promise<Record<string, string>> {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    const result: Record<string, string> = {}
    const uniqueIds = Array.from(new Set(tagIds))
    if (uniqueIds.length === 0)
      return result

    const existingNodes = await this.ctx.db.query.nodes.findMany({
      where: and(
        eq(nodes.userId, this.ctx.user.id),
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
      userId: this.ctx.user!.id,
      metadata: { tag_id: t.id },
    }))

    if (rows.length) {
      const created = await this.ctx.db.insert(nodes).values(rows).returning()

      for (const row of created) {
        const meta = row.metadata as { tag_id?: string } | null
        const tagId = meta?.tag_id
        if (tagId)
          result[tagId] = row.id
      }
    }

    return result
  }

  async getOrCreateContentNode(params: { content_id: string, title?: string, type: string }) {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    const existing = await this.ctx.db.query.nodes.findFirst({
      where: and(
        eq(nodes.userId, this.ctx.user.id),
        sql`${nodes.metadata}->>'content_id' = ${params.content_id}`,
      ),
      columns: {
        id: true,
      },
    })

    if (existing?.id)
      return existing.id

    const [data] = await this.ctx.db.insert(nodes).values({
      content: params.title ?? '',
      type: params.type,
      userId: this.ctx.user.id,
      metadata: { content_id: params.content_id },
    }).returning({ id: nodes.id })

    if (!data)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Node creation error' })

    return data.id
  }

  async createContentTags(tagIds: string[], contentId: string) {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    const data = await this.ctx.db.insert(contentTags).values(
      tagIds.map(id => ({ contentId, tagId: id, userId: this.ctx.user!.id })),
    )

    return data
  }

  async createEdges(edgeRows: {
    from_node: string
    to_node: string
    relation_type: string
    user_id: string
  }[]) {
    const data = await this.ctx.db.insert(edges).values(
      edgeRows.map(row => ({
        fromNode: row.from_node,
        toNode: row.to_node,
        relationType: row.relation_type,
        userId: row.user_id,
      })),
    )

    return data
  }

  async createNode(content: string) {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    const [data] = await this.ctx.db.insert(nodes).values({
      content,
      type: 'tag',
      userId: this.ctx.user.id,
    }).returning()

    if (!data)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Node creation error' })

    return data
  }

  async getTagsByTitle(titles: string[]) {
    const data = await this.ctx.db.query.tags.findMany({
      where: inArray(tags.title, titles),
      columns: {
        id: true,
        title: true,
      },
    })

    return data
  }

  async getTagById(id: string) {
    const data = await this.ctx.db.query.tags.findFirst({
      where: eq(tags.id, id),
      columns: {
        id: true,
        title: true,
      },
    })

    if (!data)
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Tag not found' })

    return data
  }

  async getTags(ids: string[]) {
    const data = await this.ctx.db.query.tags.findMany({
      where: inArray(tags.id, ids),
      columns: {
        id: true,
        title: true,
      },
    })

    return data
  }

  async createTags(titles: { title: string }[]) {
    const data = await this.ctx.db.insert(tags).values(titles).returning({
      id: tags.id,
      title: tags.title,
    })

    return data
  }

  async updateContent(updData: z.infer<typeof updateContentSchema>) {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    const [data] = await this.ctx.db.update(content).set({
      ...updData,
      updatedAt: new Date(),
      thumbnailBase64: updData.thumbnail_base64,
    }).where(
      and(
        eq(content.id, updData.id),
        eq(content.userId, this.ctx.user.id),
      ),
    ).returning()

    if (!data)
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Content not found' })

    return data
  }

  async deleteEdge(contentNodeId: string) {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    await this.ctx.db.delete(edges).where(
      and(
        or(
          eq(edges.fromNode, contentNodeId),
          eq(edges.toNode, contentNodeId),
        )!,
        eq(edges.userId, this.ctx.user.id),
      ),
    )
  }

  async deleteNode(contentNodeId: string) {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    await this.ctx.db.delete(nodes).where(
      and(
        eq(nodes.id, contentNodeId),
        eq(nodes.userId, this.ctx.user.id),
      ),
    )
  }

  async getContentTags() {
    const data = await this.ctx.db.select({
      tag_id: contentTags.tagId,
      content_id: contentTags.contentId,
    }).from(contentTags)

    return data
  }

  async deleteContent(id: string) {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    await this.ctx.db.delete(content).where(
      and(
        eq(content.id, id),
        eq(content.userId, this.ctx.user.id),
      ),
    )
  }

  async deleteTagEdge(contentNodeId: string) {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    await this.ctx.db.delete(edges).where(
      and(
        eq(edges.fromNode, contentNodeId),
        eq(edges.relationType, 'content_tag'),
        eq(edges.userId, this.ctx.user.id),
      ),
    )
  }

  async deleteContentTag(contentId: string) {
    await this.ctx.db.delete(contentTags).where(
      eq(contentTags.contentId, contentId),
    )
  }
}
