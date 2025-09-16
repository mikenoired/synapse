import { createContext } from '@/server/context'
import { appRouter } from '@/server/routers/_app'
import TagsClient from './page.client'

export default async function TagsPage() {
  const ctx = await createContext({})
  if (!ctx.user) return <TagsClient initial={[]} />

  const caller = appRouter.createCaller(ctx)
  const tagsWithContent = await caller.content.getTagsWithContent()

  return <TagsClient initial={tagsWithContent} />
}