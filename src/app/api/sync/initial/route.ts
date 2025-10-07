import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createContext } from '@/server/context'
import ContentRepository from '@/server/repositories/content.repository'
import GraphRepository from '@/server/repositories/graph.repository'
import ContentService from '@/server/services/content.service'

export async function POST(req: NextRequest) {
  try {
    const ctx = await createContext({ req })

    if (!ctx.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentService = new ContentService(ctx)
    const contentRepo = new ContentRepository(ctx)
    const graphRepo = new GraphRepository(ctx)

    // Get all user data
    const content = await contentService.getAll('', undefined, undefined, undefined, 1000, true)

    // Get tags safely - may return empty array if no content tags
    let tags: any[] = []
    try {
      tags = await contentService.getTags() || []
    }
    catch (error) {
      console.warn('[Sync] Failed to get tags:', error)
      tags = []
    }

    // Get content tags
    const contentTags = await contentRepo.getContentTags()

    // Get graph data
    let nodes: any[] = []
    let edges: any[] = []

    try {
      nodes = await graphRepo.getNodes() || []
      edges = await graphRepo.getEdges() || []
    }
    catch (error) {
      console.warn('[Sync] Failed to get graph data:', error)
    }

    // Convert to format suitable for local DB
    const data = {
      content: (content?.items || []).map((item: any) => ({
        id: item.id,
        type: item.type,
        content: item.content,
        title: item.title,
        thumbnail_base64: item.thumbnailBase64,
        created_at: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
        updated_at: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
        user_id: ctx.user!.id,
      })),
      tags: tags.map((tag: any) => ({
        id: tag.id,
        title: tag.title,
        user_id: ctx.user!.id,
      })),
      content_tags: (contentTags || [])
        .filter((ct: any) => ct.content_id && ct.tag_id)
        .map((ct: any) => ({
          content_id: ct.content_id,
          tag_id: ct.tag_id,
          user_id: ctx.user!.id,
        })),
      nodes: nodes.map((node: any) => ({
        id: node.id,
        type: node.type,
        content: node.content,
        metadata: node.metadata ? JSON.stringify(node.metadata) : null,
        user_id: ctx.user!.id,
      })),
      edges: edges.map((edge: any) => ({
        id: edge.id,
        from_node: edge.fromNode,
        to_node: edge.toNode,
        relation_type: edge.relationType,
        user_id: ctx.user!.id,
      })),
    }

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[Sync] Initial sync data:', {
        content: data.content.length,
        tags: data.tags.length,
        content_tags: data.content_tags.length,
        nodes: data.nodes.length,
        edges: data.edges.length,
      })
    }

    return NextResponse.json({ data })
  }
  catch (error) {
    console.error('[Sync] Initial sync failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
