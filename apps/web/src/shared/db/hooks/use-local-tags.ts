import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/shared/lib/auth-context'
import { LocalContentRepository } from '../storage/content.repository'
import { LocalTagRepository } from '../storage/tag.repository'
import { ensureDB } from './use-local-db'

const tagRepo = new LocalTagRepository()
const contentRepo = new LocalContentRepository()

export function useLocalTags() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['local-tags'],
    queryFn: async () => {
      if (!user)
        return []

      await ensureDB()
      const tags = await tagRepo.getAll(user.id)

      return tags.map(tag => ({
        id: tag.id,
        title: tag.title,
      }))
    },
    enabled: !!user,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useLocalTagById(id: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['local-tag', id],
    queryFn: async () => {
      if (!user)
        return null

      await ensureDB()
      return await tagRepo.getById(id, user.id)
    },
    enabled: !!user && !!id,
    staleTime: 0, // Always refetch to get latest local data
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useLocalTagsWithContent() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['local-tags-with-content'],
    queryFn: async () => {
      if (!user)
        return []

      await ensureDB()

      // Get recent content
      const items = await contentRepo.getAll(user.id, undefined, undefined, undefined, 100)

      if (!items.length)
        return []

      // Get tags for content
      const contentIds = items.map(item => item.id)
      const contentTags = await contentRepo.getContentTags(contentIds)

      // Build map
      const tagsMap = new Map<string, { id: string, title: string, items: any[] }>()

      for (const ct of contentTags) {
        if (!tagsMap.has(ct.tag_id)) {
          tagsMap.set(ct.tag_id, {
            id: ct.tag_id,
            title: ct.tag_title,
            items: [],
          })
        }

        const tag = tagsMap.get(ct.tag_id)!
        const content = items.find(item => item.id === ct.content_id)

        if (content && tag.items.length < 3) {
          tag.items.push({
            id: content.id,
            user_id: content.user_id,
            type: content.type,
            title: content.title,
            content: content.content,
            tags: [],
            tag_ids: [],
            created_at: new Date(content.created_at).toISOString(),
            updated_at: new Date(content.updated_at).toISOString(),
          })
        }
      }

      return Array.from(tagsMap.values())
    },
    enabled: !!user,
    staleTime: 0, // Always refetch to get latest local data
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}
