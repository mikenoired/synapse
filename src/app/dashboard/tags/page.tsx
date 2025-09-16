import { createContext } from '@/server/context'
import { getServerCaller } from '@/server/trpc'
import TagsClient from './page.client'

export default async function TagsPage() {
  const ctx = await createContext({})
  if (!ctx.user) return <TagsClient initial={[]} />

  const caller = await getServerCaller()
  const tagsWithContent = await caller.content.getTagsWithContent()

  return <TagsClient initial={tagsWithContent} />
}