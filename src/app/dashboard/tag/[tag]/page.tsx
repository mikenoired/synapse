import { createContext } from '@/server/context'
import { appRouter } from '@/server/routers/_app'
import TagClient from './page.client'

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const decodedTag = decodeURIComponent(tag)

  const ctx = await createContext({})
  if (!ctx.user) {
    return (
      <TagClient tag={decodedTag} initial={{ items: [], nextCursor: undefined }} />
    )
  }

  const caller = appRouter.createCaller(ctx)
  const initial = await caller.content.getAll({ tags: [decodedTag], limit: 20 })

  return <TagClient tag={decodedTag} initial={initial} />
}