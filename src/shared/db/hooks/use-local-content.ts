import type { Content } from '@/shared/lib/schemas'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/shared/lib/auth-context'
import { LocalContentRepository } from '../storage/content.repository'
import { LocalGraphRepository } from '../storage/graph.repository'
import { LocalTagRepository } from '../storage/tag.repository'
import { ensureDB } from './use-local-db'

const contentRepo = new LocalContentRepository()
const tagRepo = new LocalTagRepository()
const graphRepo = new LocalGraphRepository()

export function useLocalContent(options?: {
  search?: string
  tagIds?: string[]
  type?: 'note' | 'media' | 'link' | 'todo' | 'audio'
  limit?: number
}) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['local-content', options],
    queryFn: async () => {
      if (!user)
        return { items: [], nextCursor: undefined }

      await ensureDB()

      let items: any[]

      if (options?.tagIds?.length) {
        items = await contentRepo.getByTagIds(
          user.id,
          options.tagIds,
          options.search,
          options.type,
          options.limit ?? 20,
        )
      }
      else {
        items = await contentRepo.getAll(
          user.id,
          options?.search,
          options?.type,
          undefined,
          options?.limit ?? 12,
        )
      }

      // Attach tags to content
      const contentIds = items.map(item => item.id)
      const contentTags = await contentRepo.getContentTags(contentIds)

      const tagMap = new Map<string, { ids: string[], titles: string[] }>()
      for (const ct of contentTags) {
        if (!tagMap.has(ct.content_id)) {
          tagMap.set(ct.content_id, { ids: [], titles: [] })
        }
        const entry = tagMap.get(ct.content_id)!
        entry.ids.push(ct.tag_id)
        entry.titles.push(ct.tag_title)
      }

      const mappedItems: Content[] = items.map(item => ({
        id: item.id,
        user_id: item.user_id,
        type: item.type as Content['type'],
        title: item.title,
        content: item.content,
        tags: tagMap.get(item.id)?.titles ?? [],
        tag_ids: tagMap.get(item.id)?.ids ?? [],
        created_at: new Date(item.created_at).toISOString(),
        updated_at: new Date(item.updated_at).toISOString(),
      }))

      return { items: mappedItems, nextCursor: undefined }
    },
    enabled: !!user,
    staleTime: Number.POSITIVE_INFINITY, // Local data is always fresh
    gcTime: Number.POSITIVE_INFINITY,
  })
}

export function useLocalContentById(id: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['local-content', id],
    queryFn: async () => {
      if (!user)
        return null

      await ensureDB()
      const item = await contentRepo.getById(id, user.id)

      if (!item)
        return null

      const contentTags = await contentRepo.getContentTags([id])

      return {
        id: item.id,
        user_id: item.user_id,
        type: item.type as Content['type'],
        title: item.title,
        content: item.content,
        tags: contentTags.map(ct => ct.tag_title),
        tag_ids: contentTags.map(ct => ct.tag_id),
        created_at: new Date(item.created_at).toISOString(),
        updated_at: new Date(item.updated_at).toISOString(),
      } as Content
    },
    enabled: !!user && !!id,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useCreateLocalContent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      type: string
      content: string
      title?: string
      tag_ids?: string[]
      tags?: string[]
    }) => {
      if (!user)
        throw new Error('User not authenticated')

      await ensureDB()

      const id = crypto.randomUUID()
      const contentData = {
        id,
        type: data.type,
        content: data.content,
        title: data.title,
        user_id: user.id,
      }

      const created = await contentRepo.create(contentData, user.id)

      // Handle tags
      const tagIds: string[] = []

      if (data.tag_ids?.length) {
        tagIds.push(...data.tag_ids)
      }
      else if (data.tags?.length) {
        // Create tags if they don't exist
        for (const tagTitle of data.tags) {
          let tag = await tagRepo.getByTitle(tagTitle, user.id)
          if (!tag) {
            const tagId = crypto.randomUUID()
            tag = await tagRepo.create({ id: tagId, title: tagTitle, user_id: user.id }, user.id)
          }
          tagIds.push(tag.id)
        }
      }

      // Add content tags
      for (const tagId of tagIds) {
        await tagRepo.addContentTag(id, tagId, user.id)
      }

      // Create graph node
      const nodeId = crypto.randomUUID()
      await graphRepo.createNode({
        id: nodeId,
        type: 'content',
        content: data.title,
        metadata: JSON.stringify({ content_id: id }),
        user_id: user.id,
      }, user.id)

      // Create edges to tags
      for (const tagId of tagIds) {
        const tagNode = await graphRepo.getNodeByContentId(tagId, user.id)
        if (tagNode) {
          const edgeId = crypto.randomUUID()
          await graphRepo.createEdge({
            id: edgeId,
            from_node: nodeId,
            to_node: tagNode.id,
            relation_type: 'content_tag',
            user_id: user.id,
          }, user.id)
        }
      }

      return created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-content'] })
      queryClient.invalidateQueries({ queryKey: ['local-tags'] })
    },
  })
}

export function useUpdateLocalContent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      id: string
      type?: string
      content?: string
      title?: string
      tag_ids?: string[]
      tags?: string[]
    }) => {
      if (!user)
        throw new Error('User not authenticated')

      await ensureDB()

      const { id, tag_ids, tags, ...updateData } = data

      // Update content
      await contentRepo.update(id, updateData, user.id)

      // Handle tag updates if provided
      if (tag_ids || tags) {
        const tagIds: string[] = []

        if (tag_ids?.length) {
          tagIds.push(...tag_ids)
        }
        else if (tags?.length) {
          for (const tagTitle of tags) {
            let tag = await tagRepo.getByTitle(tagTitle, user.id)
            if (!tag) {
              const tagId = crypto.randomUUID()
              tag = await tagRepo.create({ id: tagId, title: tagTitle, user_id: user.id }, user.id)
            }
            tagIds.push(tag.id)
          }
        }

        await tagRepo.replaceContentTags(id, tagIds, user.id)

        // Update graph edges
        const contentNode = await graphRepo.getNodeByContentId(id, user.id)
        if (contentNode) {
          await graphRepo.deleteEdgesByContentNode(contentNode.id, user.id)

          for (const tagId of tagIds) {
            const tagNode = await graphRepo.getNodeByContentId(tagId, user.id)
            if (tagNode) {
              const edgeId = crypto.randomUUID()
              await graphRepo.createEdge({
                id: edgeId,
                from_node: contentNode.id,
                to_node: tagNode.id,
                relation_type: 'content_tag',
                user_id: user.id,
              }, user.id)
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-content'] })
      queryClient.invalidateQueries({ queryKey: ['local-tags'] })
    },
  })
}

export function useDeleteLocalContent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user)
        throw new Error('User not authenticated')

      await ensureDB()

      // Delete graph edges and node
      const contentNode = await graphRepo.getNodeByContentId(id, user.id)
      if (contentNode) {
        await graphRepo.deleteEdgesByContentNode(contentNode.id, user.id)
        await graphRepo.deleteNode(contentNode.id, user.id)
      }

      // Delete content (will cascade to content_tags)
      await contentRepo.delete(id, user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-content'] })
      queryClient.invalidateQueries({ queryKey: ['local-tags'] })
    },
  })
}
